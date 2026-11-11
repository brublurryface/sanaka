<?php
defined('ABSPATH') || exit;
const SANAKA_OBOLO_ADMIN_PAGE_SIZE = 20;

function sanaka_obolo_admin_unavailable(): WP_Error
{
    return new WP_Error('sanaka_obolo_admin_unavailable', 'A consulta dos óbolos não está disponível agora.', ['status' => 503]);
}

function sanaka_obolo_admin_select(string $sql, bool $scalar = false)
{
    global $wpdb;
    $previous = $wpdb->suppress_errors(true);
    try {
        $wpdb->last_error = '';
        $result = $scalar ? $wpdb->get_var($sql) : $wpdb->get_results($sql, ARRAY_A);
        return $wpdb->last_error !== '' ? sanaka_obolo_admin_unavailable() : $result;
    } finally {
        $wpdb->suppress_errors($previous);
    }
}

function sanaka_obolo_admin_sql(string $sql, array $values = [], bool $scalar = false)
{
    global $wpdb;
    return sanaka_obolo_admin_select($values === [] ? $sql : $wpdb->prepare($sql, ...$values), $scalar);
}

function sanaka_obolo_admin_install_indexes(): void
{
    if (get_option('sanaka_obolo_admin_indexes_version') === '1' || get_option('sanaka_obolo_operations_version') !== '1') {
        return;
    }
    global $wpdb;
    $table = sanaka_obolo_operations_table();
    $rows = sanaka_obolo_admin_select("SHOW INDEX FROM {$table}");
    if (is_wp_error($rows) || !is_array($rows)) {
        return;
    }
    $names = array_column($rows, 'Key_name');
    $previous = $wpdb->suppress_errors(true);
    try {
        foreach ([
            'sanaka_created' => '(created_at, operation_key)',
            'sanaka_character_created' => '(character_slug, created_at, operation_key)',
        ] as $name => $columns) {
            if (!in_array($name, $names, true) && $wpdb->query("ALTER TABLE {$table} ADD INDEX {$name} {$columns}") === false) {
                return;
            }
        }
        update_option('sanaka_obolo_admin_indexes_version', '1', false);
    } finally {
        $wpdb->suppress_errors($previous);
    }
}

function sanaka_obolo_admin_ready(): bool
{
    if (get_option('sanaka_obolos_db_version') !== '1' || get_option('sanaka_obolo_operations_version') !== '1') {
        return false;
    }
    global $wpdb;
    $engines = sanaka_obolo_admin_sql(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (%s, %s) AND ENGINE = 'InnoDB'",
        [sanaka_obolo_totals_table(), sanaka_obolo_operations_table()], true
    );
    return !is_wp_error($engines) && (int) $engines === 2;
}

/** Published posts and their existing metadata are the only character registry. */
function sanaka_obolo_admin_character_source(string $where = ''): string
{
    global $wpdb;
    return "FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id = p.ID
        WHERE p.post_type = 'post' AND p.post_status = 'publish'
        AND m.meta_key = 'sanaka_character_slug'
        AND m.meta_value REGEXP '^[a-z0-9-]{1,100}";
}

function sanaka_obolo_admin_overview()
{
    if (!sanaka_obolo_admin_ready()) {
        return sanaka_obolo_admin_unavailable();
    }
    $limit = sanaka_obolo_operation_limit();
    if (!is_int($limit) || $limit < 1) {
        return sanaka_obolo_admin_unavailable();
    }
    $totals = sanaka_obolo_totals_table();
    $operations = sanaka_obolo_operations_table();
    $source = sanaka_obolo_admin_character_source();
    $rows = sanaka_obolo_admin_select("SELECT
        (SELECT COALESCE(SUM(total), 0) FROM {$totals}) AS offers,
        (SELECT COUNT(DISTINCT m.meta_value) {$source}) AS characters,
        (SELECT COUNT(*) FROM {$operations} WHERE operation_key <> 'capacity' AND completed_total IS NOT NULL) AS receipts,
        (SELECT completed_total FROM {$operations} WHERE operation_key = 'capacity') AS allocated,
        (SELECT MIN(created_at) FROM {$operations} WHERE operation_key <> 'capacity' AND completed_total IS NOT NULL) AS first_receipt");
    if (is_wp_error($rows) || !is_array($rows) || !isset($rows[0]) || $rows[0]['allocated'] === null) {
        return sanaka_obolo_admin_unavailable();
    }
    $row = $rows[0];
    return [
        'offers' => (int) $row['offers'],
        'characters' => (int) $row['characters'],
        'receipts' => (int) $row['receipts'],
        'allocated' => (int) $row['allocated'],
        'capacity' => $limit,
        'firstReceipt' => $row['first_receipt'],
        'capacityMismatch' => (int) $row['allocated'] !== (int) $row['receipts'],
        'version' => SANAKA_OBOLO_VERSION,
    ];
}

function sanaka_obolo_admin_page(int $requested, int $total): array
{
    $pages = max(1, (int) ceil($total / SANAKA_OBOLO_ADMIN_PAGE_SIZE));
    $page = max(1, min($requested, $pages));
    return ['page' => $page, 'pages' => $pages, 'total' => $total, 'perPage' => SANAKA_OBOLO_ADMIN_PAGE_SIZE];
}

/** Project only three metadata keys in a single query, never full post bodies or all postmeta. */
function sanaka_obolo_admin_hydrate_characters(array $rows)
{
    if ($rows === []) {
        return [];
    }
    global $wpdb;
    $ids = array_values(array_unique(array_map(static fn($row): int => (int) $row['ID'], $rows)));
    $placeholders = implode(',', array_fill(0, count($ids), '%d'));
    $meta = sanaka_obolo_admin_sql(
        "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta}
         WHERE post_id IN ({$placeholders})
         AND meta_key IN ('sanaka_character_name', 'sanaka_obolo_front', 'sanaka_obolo_back')
         ORDER BY meta_id ASC", $ids
    );
    if (is_wp_error($meta) || !is_array($meta)) {
        return sanaka_obolo_admin_unavailable();
    }
    $values = [];
    foreach ($meta as $field) {
        $id = (int) $field['post_id'];
        if (!array_key_exists($field['meta_key'], $values[$id] ?? [])) {
            $raw = $field['meta_value'];
            $value = is_serialized($raw) ? @unserialize($raw, ['allowed_classes' => false]) : $raw;
            $values[$id][$field['meta_key']] = is_scalar($value) ? (string) $value : '';
        }
    }
    return array_map(static function ($row) use ($values): array {
        $id = (int) $row['ID'];
        $fields = $values[$id] ?? [];
        $fallback = wp_strip_all_tags(html_entity_decode((string) $row['post_title'], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $name = sanitize_text_field((string) ($fields['sanaka_character_name'] ?? ''));
        return [
            'id' => $id,
            'slug' => (string) $row['character_slug'],
            'name' => $name !== '' ? $name : ($fallback !== '' ? $fallback : (string) $row['character_slug']),
            'front' => esc_url_raw((string) ($fields['sanaka_obolo_front'] ?? ''), ['http', 'https']),
            'back' => esc_url_raw((string) ($fields['sanaka_obolo_back'] ?? ''), ['http', 'https']),
            'total' => (int) $row['total'],
        ];
    }, $rows);
}

function sanaka_obolo_admin_character_rows(string $where, array $values, int $limit, int $offset = 0)
{
    global $wpdb;
    $source = sanaka_obolo_admin_character_source($where);
    $totals = sanaka_obolo_totals_table();
    // One canonical published post per character; duplicates cannot inflate pagination.
    $rows = sanaka_obolo_admin_sql(
        "SELECT p.ID, p.post_title, c.character_slug, COALESCE(t.total, 0) AS total
         FROM (SELECT MIN(p.ID) AS ID, m.meta_value AS character_slug {$source} GROUP BY m.meta_value) c
         JOIN {$wpdb->posts} p ON p.ID = c.ID
         LEFT JOIN {$totals} t ON t.character_slug = c.character_slug
         ORDER BY p.post_title ASC, p.ID ASC, c.character_slug ASC LIMIT %d OFFSET %d",
        [...$values, $limit, $offset]
    );
    return is_wp_error($rows) || !is_array($rows) ? sanaka_obolo_admin_unavailable() : sanaka_obolo_admin_hydrate_characters($rows);
}

function sanaka_obolo_admin_characters(int $requested = 1, string $search = '')
{
    if (!sanaka_obolo_admin_ready()) {
        return sanaka_obolo_admin_unavailable();
    }
    if (strlen($search) > 200) {
        return new WP_Error('sanaka_obolo_invalid_filter', 'A busca é muito longa.', ['status' => 400]);
    }
    global $wpdb;
    $where = '';
    $values = [];
    if ($search !== '') {
        $like = '%' . $wpdb->esc_like($search) . '%';
        $where = " AND (p.post_title LIKE %s OR m.meta_value LIKE %s OR EXISTS (
            SELECT 1 FROM {$wpdb->postmeta} n WHERE n.post_id = p.ID
            AND n.meta_key = 'sanaka_character_name' AND n.meta_value LIKE %s))";
        $values = [$like, $like, $like];
    }
    $source = sanaka_obolo_admin_character_source($where);
    $total = sanaka_obolo_admin_sql("SELECT COUNT(DISTINCT m.meta_value) {$source}", $values, true);
    if (is_wp_error($total)) {
        return $total;
    }
    $pagination = sanaka_obolo_admin_page($requested, (int) $total);
    $rows = sanaka_obolo_admin_character_rows($where, $values, $pagination['perPage'], ($pagination['page'] - 1) * $pagination['perPage']);
    return is_wp_error($rows) ? $rows : $pagination + ['items' => $rows];
}

function sanaka_obolo_admin_receipts(int $requested = 1, string $character = '')
{
    if (!sanaka_obolo_admin_ready()) {
        return sanaka_obolo_admin_unavailable();
    }
    if ($character !== '' && preg_match('/^[a-z0-9-]{1,100}$/D', $character) !== 1) {
        return new WP_Error('sanaka_obolo_invalid_filter', 'A personagem informada não é válida.', ['status' => 400]);
    }
    global $wpdb;
    $table = sanaka_obolo_operations_table();
    $where = "WHERE operation_key <> 'capacity' AND completed_total IS NOT NULL";
    $values = [];
    if ($character !== '') {
        $where .= ' AND character_slug = %s';
        $values[] = $character;
    }
    $total = sanaka_obolo_admin_sql("SELECT COUNT(*) FROM {$table} {$where}", $values, true);
    if (is_wp_error($total)) {
        return $total;
    }
    $pagination = sanaka_obolo_admin_page($requested, (int) $total);
    $rows = sanaka_obolo_admin_sql(
        "SELECT operation_key, character_slug, completed_total, created_at FROM {$table} {$where}
         ORDER BY created_at DESC, operation_key DESC LIMIT %d OFFSET %d",
        [...$values, $pagination['perPage'], ($pagination['page'] - 1) * $pagination['perPage']]
    );
    if (is_wp_error($rows) || !is_array($rows)) {
        return sanaka_obolo_admin_unavailable();
    }
    $slugs = array_values(array_unique(array_column($rows, 'character_slug')));
    $characters = [];
    if ($slugs !== []) {
        $placeholders = implode(',', array_fill(0, count($slugs), '%s'));
        $lookup = sanaka_obolo_admin_character_rows(" AND m.meta_value IN ({$placeholders})", $slugs, count($slugs));
        if (is_wp_error($lookup)) {
            return $lookup;
        }
        $characters = array_column($lookup, null, 'slug');
    }
    $items = array_map(static function ($row) use ($characters): array {
        $slug = (string) $row['character_slug'];
        return [
            'receipt' => (string) $row['operation_key'],
            'characterSlug' => $slug,
            'characterName' => $characters[$slug]['name'] ?? $slug,
            'confirmedTotal' => (int) $row['completed_total'],
            'createdAt' => (string) $row['created_at'],
        ];
    }, $rows);
    $currentTotal = null;
    if ($character !== '') {
        $totals = sanaka_obolo_totals_table();
        $currentTotal = sanaka_obolo_admin_sql("SELECT total FROM {$totals} WHERE character_slug = %s", [$character], true);
        if (is_wp_error($currentTotal)) {
            return $currentTotal;
        }
        $currentTotal = (int) $currentTotal;
    }
    return $pagination + [
        'items' => $items,
        'characterSlug' => $character,
        'currentTotal' => $currentTotal,
    ];
}

        AND BINARY m.meta_value = BINARY LOWER(m.meta_value) {$where}";
}

function sanaka_obolo_admin_overview()
{
    if (!sanaka_obolo_admin_ready()) {
        return sanaka_obolo_admin_unavailable();
    }
    $limit = sanaka_obolo_operation_limit();
    if (!is_int($limit) || $limit < 1) {
        return sanaka_obolo_admin_unavailable();
    }
    $totals = sanaka_obolo_totals_table();
    $operations = sanaka_obolo_operations_table();
    $source = sanaka_obolo_admin_character_source();
    $rows = sanaka_obolo_admin_select("SELECT
        (SELECT COALESCE(SUM(total), 0) FROM {$totals}) AS offers,
        (SELECT COUNT(DISTINCT m.meta_value) {$source}) AS characters,
        (SELECT COUNT(*) FROM {$operations} WHERE operation_key <> 'capacity' AND completed_total IS NOT NULL) AS receipts,
        (SELECT completed_total FROM {$operations} WHERE operation_key = 'capacity') AS allocated,
        (SELECT MIN(created_at) FROM {$operations} WHERE operation_key <> 'capacity' AND completed_total IS NOT NULL) AS first_receipt");
    if (is_wp_error($rows) || !is_array($rows) || !isset($rows[0]) || $rows[0]['allocated'] === null) {
        return sanaka_obolo_admin_unavailable();
    }
    $row = $rows[0];
    return [
        'offers' => (int) $row['offers'],
        'characters' => (int) $row['characters'],
        'receipts' => (int) $row['receipts'],
        'allocated' => (int) $row['allocated'],
        'capacity' => $limit,
        'firstReceipt' => $row['first_receipt'],
        'capacityMismatch' => (int) $row['allocated'] !== (int) $row['receipts'],
        'version' => SANAKA_OBOLO_VERSION,
    ];
}

function sanaka_obolo_admin_page(int $requested, int $total): array
{
    $pages = max(1, (int) ceil($total / SANAKA_OBOLO_ADMIN_PAGE_SIZE));
    $page = max(1, min($requested, $pages));
    return ['page' => $page, 'pages' => $pages, 'total' => $total, 'perPage' => SANAKA_OBOLO_ADMIN_PAGE_SIZE];
}

/** Project only three metadata keys in a single query, never full post bodies or all postmeta. */
function sanaka_obolo_admin_hydrate_characters(array $rows)
{
    if ($rows === []) {
        return [];
    }
    global $wpdb;
    $ids = array_values(array_unique(array_map(static fn($row): int => (int) $row['ID'], $rows)));
    $placeholders = implode(',', array_fill(0, count($ids), '%d'));
    $meta = sanaka_obolo_admin_sql(
        "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta}
         WHERE post_id IN ({$placeholders})
         AND meta_key IN ('sanaka_character_name', 'sanaka_obolo_front', 'sanaka_obolo_back')
         ORDER BY meta_id ASC", $ids
    );
    if (is_wp_error($meta) || !is_array($meta)) {
        return sanaka_obolo_admin_unavailable();
    }
    $values = [];
    foreach ($meta as $field) {
        $id = (int) $field['post_id'];
        if (!array_key_exists($field['meta_key'], $values[$id] ?? [])) {
            $raw = $field['meta_value'];
            $value = is_serialized($raw) ? @unserialize($raw, ['allowed_classes' => false]) : $raw;
            $values[$id][$field['meta_key']] = is_scalar($value) ? (string) $value : '';
        }
    }
    return array_map(static function ($row) use ($values): array {
        $id = (int) $row['ID'];
        $fields = $values[$id] ?? [];
        $fallback = wp_strip_all_tags(html_entity_decode((string) $row['post_title'], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $name = sanitize_text_field((string) ($fields['sanaka_character_name'] ?? ''));
        return [
            'id' => $id,
            'slug' => (string) $row['character_slug'],
            'name' => $name !== '' ? $name : ($fallback !== '' ? $fallback : (string) $row['character_slug']),
            'front' => esc_url_raw((string) ($fields['sanaka_obolo_front'] ?? ''), ['http', 'https']),
            'back' => esc_url_raw((string) ($fields['sanaka_obolo_back'] ?? ''), ['http', 'https']),
            'total' => (int) $row['total'],
        ];
    }, $rows);
}

function sanaka_obolo_admin_character_rows(string $where, array $values, int $limit, int $offset = 0)
{
    global $wpdb;
    $source = sanaka_obolo_admin_character_source($where);
    $totals = sanaka_obolo_totals_table();
    // One canonical published post per character; duplicates cannot inflate pagination.
    $rows = sanaka_obolo_admin_sql(
        "SELECT p.ID, p.post_title, c.character_slug, COALESCE(t.total, 0) AS total
         FROM (SELECT MIN(p.ID) AS ID, m.meta_value AS character_slug {$source} GROUP BY m.meta_value) c
         JOIN {$wpdb->posts} p ON p.ID = c.ID
         LEFT JOIN {$totals} t ON t.character_slug = c.character_slug
         ORDER BY p.post_title ASC, p.ID ASC, c.character_slug ASC LIMIT %d OFFSET %d",
        [...$values, $limit, $offset]
    );
    return is_wp_error($rows) || !is_array($rows) ? sanaka_obolo_admin_unavailable() : sanaka_obolo_admin_hydrate_characters($rows);
}

function sanaka_obolo_admin_characters(int $requested = 1, string $search = '')
{
    if (!sanaka_obolo_admin_ready()) {
        return sanaka_obolo_admin_unavailable();
    }
    if (strlen($search) > 200) {
        return new WP_Error('sanaka_obolo_invalid_filter', 'A busca é muito longa.', ['status' => 400]);
    }
    global $wpdb;
    $where = '';
    $values = [];
    if ($search !== '') {
        $like = '%' . $wpdb->esc_like($search) . '%';
        $where = " AND (p.post_title LIKE %s OR m.meta_value LIKE %s OR EXISTS (
            SELECT 1 FROM {$wpdb->postmeta} n WHERE n.post_id = p.ID
            AND n.meta_key = 'sanaka_character_name' AND n.meta_value LIKE %s))";
        $values = [$like, $like, $like];
    }
    $source = sanaka_obolo_admin_character_source($where);
    $total = sanaka_obolo_admin_sql("SELECT COUNT(DISTINCT m.meta_value) {$source}", $values, true);
    if (is_wp_error($total)) {
        return $total;
    }
    $pagination = sanaka_obolo_admin_page($requested, (int) $total);
    $rows = sanaka_obolo_admin_character_rows($where, $values, $pagination['perPage'], ($pagination['page'] - 1) * $pagination['perPage']);
    return is_wp_error($rows) ? $rows : $pagination + ['items' => $rows];
}

function sanaka_obolo_admin_receipts(int $requested = 1, string $character = '')
{
    if (!sanaka_obolo_admin_ready()) {
        return sanaka_obolo_admin_unavailable();
    }
    if ($character !== '' && preg_match('/^[a-z0-9-]{1,100}$/D', $character) !== 1) {
        return new WP_Error('sanaka_obolo_invalid_filter', 'A personagem informada não é válida.', ['status' => 400]);
    }
    global $wpdb;
    $table = sanaka_obolo_operations_table();
    $where = "WHERE operation_key <> 'capacity' AND completed_total IS NOT NULL";
    $values = [];
    if ($character !== '') {
        $where .= ' AND character_slug = %s';
        $values[] = $character;
    }
    $total = sanaka_obolo_admin_sql("SELECT COUNT(*) FROM {$table} {$where}", $values, true);
    if (is_wp_error($total)) {
        return $total;
    }
    $pagination = sanaka_obolo_admin_page($requested, (int) $total);
    $rows = sanaka_obolo_admin_sql(
        "SELECT operation_key, character_slug, completed_total, created_at FROM {$table} {$where}
         ORDER BY created_at DESC, operation_key DESC LIMIT %d OFFSET %d",
        [...$values, $pagination['perPage'], ($pagination['page'] - 1) * $pagination['perPage']]
    );
    if (is_wp_error($rows) || !is_array($rows)) {
        return sanaka_obolo_admin_unavailable();
    }
    $slugs = array_values(array_unique(array_column($rows, 'character_slug')));
    $characters = [];
    if ($slugs !== []) {
        $placeholders = implode(',', array_fill(0, count($slugs), '%s'));
        $lookup = sanaka_obolo_admin_character_rows(" AND m.meta_value IN ({$placeholders})", $slugs, count($slugs));
        if (is_wp_error($lookup)) {
            return $lookup;
        }
        $characters = array_column($lookup, null, 'slug');
    }
    $items = array_map(static function ($row) use ($characters): array {
        $slug = (string) $row['character_slug'];
        return [
            'receipt' => (string) $row['operation_key'],
            'characterSlug' => $slug,
            'characterName' => $characters[$slug]['name'] ?? $slug,
            'confirmedTotal' => (int) $row['completed_total'],
            'createdAt' => (string) $row['created_at'],
        ];
    }, $rows);
    $currentTotal = null;
    if ($character !== '') {
        $totals = sanaka_obolo_totals_table();
        $currentTotal = sanaka_obolo_admin_sql("SELECT total FROM {$totals} WHERE character_slug = %s", [$character], true);
        if (is_wp_error($currentTotal)) {
            return $currentTotal;
        }
        $currentTotal = (int) $currentTotal;
    }
    return $pagination + [
        'items' => $items,
        'characterSlug' => $character,
        'currentTotal' => $currentTotal,
    ];
}
