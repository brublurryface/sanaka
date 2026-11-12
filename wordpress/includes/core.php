<?php
defined('ABSPATH') || exit;

function sanaka_obolo_totals_table(): string
{
    global $wpdb;
    return $wpdb->prefix . 'sanaka_obolos';
}

function sanaka_obolo_operation_limit()
{
    return apply_filters('sanaka_obolo_operation_limit', 50000);
}

function sanaka_obolo_install_totals(): void
{
    if (get_option('sanaka_obolos_db_version') === '1') {
        return;
    }
    global $wpdb;
    $table = sanaka_obolo_totals_table();
    $collation = $wpdb->get_charset_collate();
    if ($wpdb->query("CREATE TABLE IF NOT EXISTS {$table} (
        character_slug varchar(100) NOT NULL,
        total bigint(20) unsigned NOT NULL DEFAULT 0,
        updated_at datetime NOT NULL,
        PRIMARY KEY (character_slug)
    ) ENGINE=InnoDB {$collation}") !== false) {
        update_option('sanaka_obolos_db_version', '1', false);
    }
}

function sanaka_obolo_character_exists(string $slug): bool
{
    if (preg_match('/^[a-z0-9-]{1,100}$/D', $slug) !== 1) {
        return false;
    }
    return get_posts([
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => 1,
        'fields' => 'ids',
        'meta_key' => 'sanaka_character_slug',
        'meta_value' => $slug,
        'no_found_rows' => true,
        'ignore_sticky_posts' => true,
        'update_post_meta_cache' => false,
        'update_post_term_cache' => false,
    ]) !== [];
}

function sanaka_obolo_read_total(string $slug): int
{
    global $wpdb;
    $table = sanaka_obolo_totals_table();
    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT total FROM {$table} WHERE character_slug = %s", $slug
    ));
}

function sanaka_obolo_get(WP_REST_Request $request)
{
    $slug = (string) ($request->get_url_params()['character_slug'] ?? '');
    if (!sanaka_obolo_character_exists($slug)) {
        return new WP_Error('sanaka_character_not_found', 'A personagem solicitada não possui um óbolo publicado.', ['status' => 404]);
    }
    $response = rest_ensure_response(['characterSlug' => $slug, 'total' => sanaka_obolo_read_total($slug)]);
    $response->header('Cache-Control', 'no-store');
    return $response;
}

function sanaka_obolo_offer(WP_REST_Request $request)
{
    if (trim((string) $request->get_header('Idempotency-Key')) !== '') {
        return sanaka_obolo_operations_offer($request);
    }
    global $wpdb;
    $slug = (string) ($request->get_url_params()['character_slug'] ?? '');
    if (!sanaka_obolo_character_exists($slug)) {
        return new WP_Error('sanaka_character_not_found', 'A personagem solicitada não possui um óbolo publicado.', ['status' => 404]);
    }
    $table = sanaka_obolo_totals_table();
    $now = current_time('mysql', true);
    if ($wpdb->query($wpdb->prepare(
        "INSERT INTO {$table} (character_slug, total, updated_at) VALUES (%s, 1, %s)
         ON DUPLICATE KEY UPDATE total = total + 1, updated_at = %s", $slug, $now, $now
    )) === false) {
        return new WP_Error('sanaka_obolo_not_recorded', 'Não foi possível registrar o óbolo.', ['status' => 500]);
    }
    $response = rest_ensure_response(['characterSlug' => $slug, 'total' => sanaka_obolo_read_total($slug)]);
    $response->header('Cache-Control', 'no-store');
    return $response;
}

function sanaka_obolo_register_rest(): void
{
    $fields = [
        'sanaka_character_slug' => ['Identificador estável da personagem.', 'sanitize_title', null],
        'sanaka_character_name' => ['Nome editorial da personagem.', 'sanitize_text_field', null],
        'sanaka_obolo_front' => ['URL do anverso do óbolo.', 'esc_url_raw', 'uri'],
        'sanaka_obolo_back' => ['URL do reverso do óbolo.', 'esc_url_raw', 'uri'],
    ];
    foreach ($fields as $name => [$description, $sanitize, $format]) {
        $schema = ['description' => $description, 'type' => 'string', 'context' => ['view']];
        if ($format !== null) {
            $schema['format'] = $format;
        }
        register_rest_field('post', $name, [
            'get_callback' => static function (array $post) use ($name, $sanitize): string {
                $value = get_post_meta($post['id'], $name, true);
                return is_scalar($value) ? (string) $sanitize((string) $value) : '';
            },
            'schema' => $schema,
        ]);
    }
    $args = ['character_slug' => [
        'required' => true,
        'sanitize_callback' => 'sanitize_title',
        'validate_callback' => static fn($value): bool => is_string($value) && preg_match('/^[a-z0-9-]{1,100}$/D', $value) === 1,
    ]];
    // Override only this route after the legacy snippet; its unrelated fields stay intact.
    register_rest_route('sanaka/v1', '/obolos/(?P<character_slug>[a-z0-9-]+)', [
        ['methods' => WP_REST_Server::READABLE, 'callback' => 'sanaka_obolo_get', 'permission_callback' => '__return_true', 'args' => $args],
        ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'sanaka_obolo_offer', 'permission_callback' => '__return_true', 'args' => $args],
    ], true);
}

function sanaka_obolo_initialize(): void
{
    sanaka_obolo_install_totals();
    sanaka_obolo_operations_install();
    sanaka_obolo_admin_install_indexes();
}
