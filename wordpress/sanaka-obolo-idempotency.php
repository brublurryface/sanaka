<?php
/**
 * Plugin Name: Sanaka — idempotência dos óbolos
 * Description: Complemento do endpoint existente; instalar antes do frontend com Idempotency-Key.
 * Version: 1.0.0
 * Requires PHP: 8.3
 */
defined('ABSPATH') || exit;

function sanaka_obolo_operations_table(): string
{
    global $wpdb;
    return $wpdb->prefix . 'sanaka_obolo_operations';
}

function sanaka_obolo_operations_install(): void
{
    if (get_option('sanaka_obolo_operations_version') === '1') {
        return;
    }
    global $wpdb;
    $totals = $wpdb->prefix . 'sanaka_obolos';
    $engine = $wpdb->get_var($wpdb->prepare(
        'SELECT ENGINE FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s', $totals
    ));
    if ($engine !== 'InnoDB') {
        return;
    }
    $operations = sanaka_obolo_operations_table();
    $collation = $wpdb->get_charset_collate();
    $created = $wpdb->query("CREATE TABLE IF NOT EXISTS {$operations} (
        operation_key char(64) NOT NULL,
        character_slug varchar(100) NOT NULL,
        completed_total bigint(20) unsigned DEFAULT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY (operation_key)
    ) ENGINE=InnoDB {$collation}");
    if ($created !== false) {
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$operations} WHERE operation_key <> 'capacity'");
        if ($count === null || $wpdb->query($wpdb->prepare(
            "INSERT INTO {$operations} (operation_key, character_slug, completed_total, created_at)
             VALUES ('capacity', '', %d, %s) ON DUPLICATE KEY UPDATE operation_key = operation_key",
            (int) $count, current_time('mysql', true)
        )) === false) {
            return;
        }
        update_option('sanaka_obolo_operations_version', '1', false);
    }
}

function sanaka_obolo_operations_error(): WP_Error
{
    return new WP_Error('sanaka_obolo_operation_unavailable', 'Não foi possível confirmar a operação. Tente novamente com a mesma chave.', ['status' => 503]);
}

function sanaka_obolo_operations_offer(WP_REST_Request $request)
{
    global $wpdb;
    $key = strtolower(trim((string) $request->get_header('Idempotency-Key')));
    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/D', $key) !== 1) {
        return new WP_Error('sanaka_obolo_invalid_operation', 'A chave da operação é inválida.', ['status' => 400]);
    }
    if (get_option('sanaka_obolo_operations_version') !== '1' || !function_exists('sanaka_obolos_character_exists')) {
        return sanaka_obolo_operations_error();
    }
    $slug = (string) ($request->get_url_params()['character_slug'] ?? '');
    if (preg_match('/^[a-z0-9-]{1,100}$/D', $slug) !== 1 || !sanaka_obolos_character_exists($slug)) {
        return new WP_Error('sanaka_character_not_found', 'A personagem solicitada não possui um óbolo publicado.', ['status' => 404]);
    }
    $totals = $wpdb->prefix . 'sanaka_obolos';
    $operations = sanaka_obolo_operations_table();
    $engines = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (%s, %s) AND ENGINE = 'InnoDB'", $totals, $operations
    ));
    if ((int) $engines !== 2 || $wpdb->query('START TRANSACTION') === false) {
        return sanaka_obolo_operations_error();
    }
    try {
        // Limita registros sem apagar recibos necessários a retentativas tardias.
        $capacity = $wpdb->get_var("SELECT completed_total FROM {$operations} WHERE operation_key = 'capacity' FOR UPDATE");
        $limit = apply_filters('sanaka_obolo_operation_limit', 50000);
        if ($capacity === null || !is_int($limit) || $limit < 1) {
            throw new RuntimeException('Operation capacity unavailable.');
        }
        $hash = hash('sha256', $key);
        $now = current_time('mysql', true);
        if ($wpdb->query($wpdb->prepare(
            "INSERT INTO {$operations} (operation_key, character_slug, completed_total, created_at) VALUES (%s, %s, NULL, %s)
             ON DUPLICATE KEY UPDATE operation_key = operation_key", $hash, $slug, $now
        )) === false) {
            throw new RuntimeException('Operation claim failed.');
        }
        $operation = $wpdb->get_row($wpdb->prepare(
            "SELECT character_slug, completed_total FROM {$operations} WHERE operation_key = %s FOR UPDATE", $hash
        ), ARRAY_A);
        if (!is_array($operation)) {
            throw new RuntimeException('Operation unavailable.');
        }
        if ($operation['character_slug'] !== $slug) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('sanaka_obolo_operation_conflict', 'A chave já pertence a outra personagem.', ['status' => 409]);
        }
        $total = $operation['completed_total'];
        if ($total === null) {
            if ((int) $capacity >= $limit || $wpdb->query("UPDATE {$operations} SET completed_total = completed_total + 1 WHERE operation_key = 'capacity'") === false) {
                throw new RuntimeException('Operation capacity reached.');
            }
            if ($wpdb->query($wpdb->prepare(
                "INSERT INTO {$totals} (character_slug, total, updated_at) VALUES (%s, 1, %s)
                 ON DUPLICATE KEY UPDATE total = total + 1, updated_at = %s", $slug, $now, $now
            )) === false) {
                throw new RuntimeException('Counter update failed.');
            }
            $total = $wpdb->get_var($wpdb->prepare("SELECT total FROM {$totals} WHERE character_slug = %s", $slug));
            if ($total === null || $wpdb->query($wpdb->prepare(
                "UPDATE {$operations} SET completed_total = %d WHERE operation_key = %s", (int) $total, $hash
            )) === false) {
                throw new RuntimeException('Operation completion failed.');
            }
        }
        if ($wpdb->query('COMMIT') === false) {
            throw new RuntimeException('Commit confirmation unavailable.');
        }
        $response = rest_ensure_response(['characterSlug' => $slug, 'total' => (int) $total]);
        $response->header('Cache-Control', 'no-store');
        return $response;
    } catch (Throwable $error) {
        $wpdb->query('ROLLBACK');
        return sanaka_obolo_operations_error();
    }
}

/** Mantém permissões, validadores e os demais hooks de despacho do WordPress. */
function sanaka_obolo_operations_endpoints(array $endpoints): array
{
    $route = '/sanaka/v1/obolos/(?P<character_slug>[a-z0-9-]+)';
    if (!isset($endpoints[$route])) {
        return $endpoints;
    }
    foreach ($endpoints[$route] as &$handler) {
        if (!is_array($handler) || !isset($handler['callback'])) {
            continue;
        }
        $methods = $handler['methods'] ?? [];
        $isPost = is_array($methods) ? (!empty($methods['POST']) || in_array('POST', $methods, true)) : in_array('POST', explode(',', str_replace(' ', '', $methods)), true);
        if ($isPost) {
            $legacy = $handler['callback'];
            $handler['callback'] = static function (WP_REST_Request $request) use ($legacy) {
                return trim((string) $request->get_header('Idempotency-Key')) === '' ? call_user_func($legacy, $request) : sanaka_obolo_operations_offer($request);
            };
        }
    }
    return $endpoints;
}

function sanaka_obolo_operations_cors(array $headers, WP_REST_Request $request): array
{
    if (preg_match('#^/sanaka/v1/obolos/[a-z0-9-]{1,100}$#D', $request->get_route()) === 1) {
        $headers[] = 'Idempotency-Key';
    }
    return array_values(array_unique($headers));
}

add_action('init', 'sanaka_obolo_operations_install');
add_filter('rest_endpoints', 'sanaka_obolo_operations_endpoints');
add_filter('rest_allowed_cors_headers', 'sanaka_obolo_operations_cors', 10, 2);
