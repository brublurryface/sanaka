<?php
/**
 * Real WordPress integration in an isolated CI installation, never the connected CMS.
 * Modes run in separate PHP processes to test loading order and removal of legacy code.
 */
$runner = getenv('RUNNER_TEMP');
$root = getenv('SANAKA_TEST_WP_ROOT') ?: $runner . '/sanaka-wordpress';
if (!$root || !$runner || realpath($root) !== realpath($runner . '/sanaka-wordpress') || !getenv('CI')) {
    throw new RuntimeException('Only the isolated runner WordPress directory is allowed.');
}
$mode = $argv[1] ?? '';
if (!in_array($mode, ['setup', 'legacy', 'standalone'], true)) {
    throw new RuntimeException('Choose setup, legacy or standalone.');
}
$repository = dirname(__DIR__);
$pluginPath = $root . '/wp-content/plugins/sanaka-obolo-idempotency';
if ($mode === 'setup') {
    mkdir($pluginPath, 0755, true);
    mkdir($root . '/wp-content/mu-plugins', 0755, true);
    $config = "<?php\ndefine('DB_NAME', 'sanaka_wordpress_test');\ndefine('DB_USER', 'root');\ndefine('DB_PASSWORD', 'root');\ndefine('DB_HOST', '127.0.0.1');\ndefine('DB_CHARSET', 'utf8mb4');\ndefine('DB_COLLATE', '');\n";
    $config .= "\$table_prefix = 'wp_integration_';\ndefine('WP_HTTP_BLOCK_EXTERNAL', true);\ndefine('DISABLE_WP_CRON', true);\ndefine('AUTOMATIC_UPDATER_DISABLED', true);\ndefine('WP_DEBUG', true);\ndefine('SAVEQUERIES', true);\n";
    $config .= "define('WP_HOME', 'http://localhost');\ndefine('WP_SITEURL', 'http://localhost');\n";
    foreach (['AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT'] as $key) {
        $config .= 'define(' . var_export($key, true) . ', ' . var_export(bin2hex(random_bytes(32)), true) . ");\n";
    }
    $config .= "define('ABSPATH', __DIR__ . '/');\nrequire_once ABSPATH . 'wp-settings.php';\n";
    file_put_contents($root . '/wp-config.php', $config);
    file_put_contents($root . '/wp-content/mu-plugins/sanaka-fixture.php', "<?php\nadd_filter('pre_wp_mail', '__return_true');\n\$fixture = getenv('SANAKA_TEST_SNIPPET');\nif (\$fixture && is_file(\$fixture)) { require \$fixture; }\n");
    $source = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($repository, FilesystemIterator::SKIP_DOTS));
    foreach ($source as $file) {
        $relative = substr($file->getPathname(), strlen($repository) + 1);
        if (!preg_match('#^(sanaka-obolo-idempotency\\.php|includes/.*\\.php|assets/.*\\.(css|js))$#', $relative)) {
            continue;
        }
        $destination = $pluginPath . '/' . $relative;
        if (!is_dir(dirname($destination))) { mkdir(dirname($destination), 0755, true); }
        copy($file->getPathname(), $destination);
    }
    define('WP_INSTALLING', true);
}
define('WP_ADMIN', true);
require $root . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/menu.php';
global $wpdb;
if (DB_NAME !== 'sanaka_wordpress_test' || DB_HOST !== '127.0.0.1' || $wpdb->prefix !== 'wp_integration_') {
    throw new RuntimeException('Refusing to use a non-test database.');
}
$checks = 0;
function verify(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
}
function request_obolo(string $method, string $slug, string $key = ''): WP_REST_Response
{
    $request = new WP_REST_Request($method, '/sanaka/v1/obolos/' . $slug);
    if ($key !== '') { $request->set_header('Idempotency-Key', $key); }
    return rest_do_request($request);
}
function render_panel(string $tab, array $filters = []): string
{
    $_GET = ['tab' => $tab] + $filters;
    ob_start();
    try {
        sanaka_obolo_admin_render();
        return (string) ob_get_contents();
    } finally {
        ob_end_clean();
    }
}
if ($mode === 'setup') {
    verify($wpdb->get_var("SHOW TABLES LIKE 'wp_integration_options'") === null, 'Test installation must start empty.');
    $installed = wp_install('Sanaka integration', 'sanaka-test', 'sanaka@example.invalid', false, '', bin2hex(random_bytes(24)));
    verify(!is_wp_error($installed), 'WordPress installation failed.');
    update_option('sanaka_test_admin', $installed['user_id']);
    $subscriber = wp_insert_user(['user_login' => 'reader-test', 'user_pass' => bin2hex(random_bytes(24)), 'user_email' => 'reader@example.invalid', 'role' => 'subscriber']);
    verify(!is_wp_error($subscriber), 'Subscriber fixture failed.');
    update_option('sanaka_test_subscriber', $subscriber);
    for ($i = 1; $i <= 25; $i++) {
        $slug = $i === 1 ? 'nandini' : sprintf('presence-%02d', $i);
        $id = wp_insert_post(['post_type' => 'post', 'post_status' => 'publish', 'post_title' => sprintf('Presence %02d', $i), 'post_content' => str_repeat('Unrelated body. ', 500)]);
        update_post_meta($id, 'sanaka_character_slug', $slug);
        update_post_meta($id, 'sanaka_character_name', $i === 1 ? 'Nandinī <script>alert(1)</script>' : sprintf('Presença %02d', $i));
        update_post_meta($id, 'sanaka_obolo_front', $i === 1 ? 'javascript:alert(1)' : 'https://example.invalid/front.png');
        update_post_meta($id, 'sanaka_obolo_back', 'https://example.invalid/back.png');
        update_post_meta($id, 'hover_text', 'Hover preservado');
        update_post_meta($id, 'sanakaverse_cover', 'https://example.invalid/cover.png');
        update_post_meta($id, '_unrelated_builder_fixture', str_repeat('Unrelated metadata. ', 500));
        if ($i === 1) { update_option('sanaka_test_character_id', $id); }
    }
    foreach ([
        ['nandini', 'publish'], ['draft-character', 'draft'], ['bad_slug', 'publish'], ['UPPERCASE', 'publish'],
    ] as [$slug, $status]) {
        $id = wp_insert_post(['post_type' => 'post', 'post_status' => $status, 'post_title' => 'Z duplicate or invalid']);
        update_post_meta($id, 'sanaka_character_slug', $slug);
    }
    $totals = $wpdb->prefix . 'sanaka_obolos';
    $operations = $wpdb->prefix . 'sanaka_obolo_operations';
    verify($wpdb->query("CREATE TABLE {$totals} (character_slug varchar(100) NOT NULL PRIMARY KEY, total bigint unsigned NOT NULL DEFAULT 0, updated_at datetime NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4") !== false, 'Totals fixture failed.');
    verify($wpdb->query("CREATE TABLE {$operations} (operation_key char(64) NOT NULL PRIMARY KEY, character_slug varchar(100) NOT NULL, completed_total bigint unsigned DEFAULT NULL, created_at datetime NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4") !== false, 'Receipt fixture failed.');
    $wpdb->insert($totals, ['character_slug' => 'nandini', 'total' => 7, 'updated_at' => '2026-01-01 00:00:00']);
    $wpdb->insert($operations, ['operation_key' => 'capacity', 'character_slug' => '', 'completed_total' => 1, 'created_at' => '2026-01-01 00:00:00']);
    $wpdb->insert($operations, ['operation_key' => str_repeat('a', 64), 'character_slug' => 'nandini', 'completed_total' => 7, 'created_at' => '2026-01-01 00:00:00']);
    update_option('sanaka_obolos_db_version', '1', false);
    update_option('sanaka_obolo_operations_version', '1', false);
    $before = $wpdb->get_results("SELECT * FROM {$operations} ORDER BY operation_key", ARRAY_A);
    $activated = activate_plugin('sanaka-obolo-idempotency/sanaka-obolo-idempotency.php');
    verify(!is_wp_error($activated), 'Plugin activation failed.');
    verify($wpdb->get_results("SELECT * FROM {$operations} ORDER BY operation_key", ARRAY_A) === $before, 'Activation changed an existing receipt.');
    verify((int) $wpdb->get_var("SELECT total FROM {$totals} WHERE character_slug='nandini'") === 7, 'Activation changed a historical total.');
    echo "Setup: {$checks} assertions; WordPress {$GLOBALS['wp_version']}.\n";
    exit;
}

verify(get_option('sanaka_obolo_admin_indexes_version') === '1', 'Indexes not installed.');
$indexes = $wpdb->get_results('SHOW INDEX FROM ' . sanaka_obolo_operations_table(), ARRAY_A);
verify(in_array('sanaka_created', array_column($indexes, 'Key_name'), true), 'Date index missing.');
verify(in_array('sanaka_character_created', array_column($indexes, 'Key_name'), true), 'Character/date index missing.');
verify(function_exists('sanaka_obolos_offer') === ($mode === 'legacy'), 'Legacy loading mode is wrong.');
$server = rest_get_server();
$route = $server->get_routes()['/sanaka/v1/obolos/(?P<character_slug>[a-z0-9-]+)'];
$post = array_values(array_filter($route, static fn($handler): bool => is_array($handler) && !empty($handler['methods']['POST'])));
verify(count($post) === 1 && $post[0]['callback'] === 'sanaka_obolo_offer', 'Plugin did not assume its REST route.');
$get = request_obolo('GET', 'nandini');
verify($get->get_status() === 200 && $get->get_headers()['Cache-Control'] === 'no-store', 'GET contract or cache changed.');
verify(request_obolo('GET', 'unknown')->get_status() === 404, 'Unknown character accepted.');
verify(request_obolo('POST', 'nandini', 'invalid')->get_status() === 400, 'Invalid operation accepted.');
$before = $get->get_data()['total'];
$key = $mode === 'legacy' ? '00000000-0000-4000-8000-000000000101' : '00000000-0000-4000-8000-000000000102';
$first = request_obolo('POST', 'nandini', $key);
$again = request_obolo('POST', 'nandini', $key);
verify($first->get_status() === 200 && $first->get_data()['total'] === $before + 1, 'Real REST offer failed.');
verify($again->get_data() === $first->get_data() && request_obolo('GET', 'nandini')->get_data()['total'] === $before + 1, 'REST retry incremented twice.');
verify(request_obolo('POST', 'presence-02', $key)->get_status() === 409, 'REST key/character conflict lost.');
$receiptCount = sanaka_obolo_admin_overview()['receipts'];
verify(request_obolo('POST', 'nandini')->get_status() === 200, 'Legacy no-key contract lost.');
verify(sanaka_obolo_admin_overview()['receipts'] === $receiptCount, 'No-key offer fabricated a receipt.');

$postRequest = new WP_REST_Request('GET', '/wp/v2/posts/' . get_option('sanaka_test_character_id'));
$postRequest->set_param('_fields', 'id,hover_text,sanakaverse_cover,sanaka_character_slug,sanaka_character_name,sanaka_obolo_front,sanaka_obolo_back');
$fields = rest_do_request($postRequest)->get_data();
verify($fields['hover_text'] === 'Hover preservado' && $fields['sanakaverse_cover'] === 'https://example.invalid/cover.png', 'Unrelated snippet fields changed.');
verify($fields['sanaka_character_slug'] === 'nandini' && $fields['sanaka_obolo_back'] === 'https://example.invalid/back.png', 'Character metadata contract changed.');

$characters = sanaka_obolo_admin_characters(1);
verify($characters['total'] === 25 && count($characters['items']) === 20 && $characters['pages'] === 2, 'Character pagination or deduplication failed.');
verify(sanaka_obolo_admin_characters(999)['page'] === 2 && count(sanaka_obolo_admin_characters(999)['items']) === 5, 'Last page was not clamped.');
verify(sanaka_obolo_admin_characters(1, 'Presença 25')['total'] === 1, 'Custom character name search failed.');
verify(sanaka_obolo_admin_characters(1, '%')['total'] === 0, 'LIKE wildcard was not escaped.');
verify(sanaka_obolo_admin_characters(1, "' OR 1=1 --")['total'] === 0, 'Search SQL injection changed results.');
verify(is_wp_error(sanaka_obolo_admin_characters(1, str_repeat('a', 201))), 'Oversized search accepted.');
verify(is_wp_error(sanaka_obolo_admin_receipts(1, "nandini' OR 1=1")), 'Invalid receipt filter accepted.');
$empty = sanaka_obolo_admin_receipts(1, 'presence-25');
verify($empty['total'] === 0 && $empty['currentTotal'] === 0, 'Empty history or total failed.');
verify(sanaka_obolo_admin_characters(1, 'nandini')['items'][0]['front'] === '', 'Unsafe coin URL survived normalization.');

$start = count($wpdb->queries);
sanaka_obolo_admin_characters(1);
$queries = array_slice($wpdb->queries, $start);
verify(count($queries) <= 4, 'Character lookup introduced per-row queries.');
foreach ($queries as $query) {
    verify(stripos($query[0], 'post_content') === false && stripos($query[0], 'SELECT *') === false, 'Character query loaded full bodies or full rows.');
}

wp_set_current_user((int) get_option('sanaka_test_subscriber'));
verify(!sanaka_obolo_admin_permission(), 'Subscriber has administrative access.');
add_filter('wp_die_handler', static fn() => static function ($message) { throw new RuntimeException('permission-denied'); });
try {
    render_panel('overview');
    throw new RuntimeException('Unauthorized panel rendered.');
} catch (RuntimeException $error) {
    verify($error->getMessage() === 'permission-denied', 'Panel permission check failed.');
}
$ability = wp_get_ability('sanaka-obolos/overview');
verify($ability !== null && is_wp_error($ability->execute([])), 'Ability bypassed permissions.');
wp_set_current_user((int) get_option('sanaka_test_admin'));
verify(sanaka_obolo_admin_permission(), 'Administrator was denied.');
verify(is_array($ability->execute([])), 'Administrator cannot consult the ability.');
verify(is_wp_error(wp_get_ability('sanaka-obolos/characters')->execute(['page' => 0])), 'Ability input schema was ignored.');
$overview = render_panel('overview');
verify(str_contains($overview, '1.1.0') && str_contains($overview, 'recibos retroativos'), 'Version or history explanation missing.');
$coinHtml = render_panel('characters', ['search' => 'nandini']);
verify(str_contains($coinHtml, 'tab=offers') && str_contains($coinHtml, 'character=nandini'), 'Character-to-offers navigation missing.');
verify(!str_contains($coinHtml, '<script>') && !str_contains($coinHtml, 'javascript:'), 'Unsafe character output rendered.');
$offerHtml = render_panel('offers', ['character' => 'nandini']);
verify(str_contains($offerHtml, 'tab=characters') && str_contains($offerHtml, 'search=nandini'), 'Offers-to-character navigation missing.');
verify(str_contains(render_panel('characters', ['search' => 'unfindable']), 'Nenhuma personagem'), 'Empty state missing.');
if ($mode === 'standalone') {
    for ($i = 1; $i <= 25; $i++) {
        $receipt = request_obolo('POST', 'presence-02', sprintf('00000000-0000-4000-8000-%012d', 200 + $i));
        verify($receipt->get_status() === 200, 'History pagination fixture failed.');
    }
    $history = sanaka_obolo_admin_receipts(1, 'presence-02');
    verify($history['total'] === 25 && count($history['items']) === 20 && $history['currentTotal'] === 25, 'Receipt filtering or total failed.');
    $last = sanaka_obolo_admin_receipts(2, 'presence-02');
    verify(count($last['items']) === 5 && !array_intersect(array_column($history['items'], 'receipt'), array_column($last['items'], 'receipt')), 'Receipt pages overlap.');
    $pagedHtml = render_panel('offers', ['character' => 'presence-02']);
    verify(str_contains($pagedHtml, 'character=presence-02') && str_contains($pagedHtml, 'obolo_page=2'), 'Pagination lost the character filter.');
    $allocated = sanaka_obolo_admin_overview();
    verify(!$allocated['capacityMismatch'] && $allocated['receipts'] === $allocated['allocated'], 'Capacity includes a fake history row.');
    $previous = $wpdb->postmeta;
    $wpdb->postmeta = 'wp_integration_missing_meta';
    $failure = sanaka_obolo_admin_characters();
    $wpdb->postmeta = $previous;
    verify(is_wp_error($failure) && !str_contains($failure->get_error_message(), 'SELECT'), 'Database failure was hidden or leaked SQL.');
    update_option('sanaka_obolo_operations_version', 'missing');
    verify(str_contains(render_panel('overview'), 'Consulta indisponível'), 'Unavailable panel state missing.');
    update_option('sanaka_obolo_operations_version', '1');
}
echo "{$mode}: {$checks} assertions passed.\n";
