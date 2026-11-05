<?php
/** Teste de integração isolado; usa somente sanaka_obolo_test em MySQL local. */
define('ABSPATH', __DIR__ . '/');
define('ARRAY_A', 'ARRAY_A');
mysqli_report(MYSQLI_REPORT_OFF);
$host = getenv('SANAKA_TEST_DB_HOST') ?: '127.0.0.1';
$database = getenv('SANAKA_TEST_DB_NAME') ?: 'sanaka_obolo_test';
if (!in_array($host, ['127.0.0.1', 'localhost'], true) || $database !== 'sanaka_obolo_test') {
    throw new RuntimeException('Only the isolated local test database is allowed.');
}
$connection = new mysqli($host, getenv('SANAKA_TEST_DB_USER') ?: 'root', getenv('SANAKA_TEST_DB_PASSWORD') ?: 'root', $database);
if ($connection->connect_errno) {
    throw new RuntimeException('Test database unavailable.');
}
$connection->set_charset('utf8mb4');

class WP_Error
{
    public function __construct(public string $code, public string $message, public array $data) {}
}
class TestResponse
{
    public array $headers = [];
    public function __construct(public array $data) {}
    public function header(string $name, string $value): void { $this->headers[$name] = $value; }
}
class WP_REST_Request
{
    public function __construct(public string $slug, public string $key = '') {}
    public function get_header(string $name): string { return $this->key; }
    public function get_route(): string { return '/sanaka/v1/obolos/' . $this->slug; }
    public function get_url_params(): array { return ['character_slug' => $this->slug]; }
}
class TestWpdb
{
    public string $prefix = 'wp_audit_';
    public function __construct(public mysqli $connection, public string $failure = '') {}
    public function get_charset_collate(): string { return 'DEFAULT CHARSET=utf8mb4'; }
    public function prepare(string $query, ...$values): string
    {
        $index = 0;
        return preg_replace_callback('/%[sd]/', function ($match) use (&$index, $values) {
            $value = $values[$index++];
            return $match[0] === '%d' ? (string) (int) $value : "'" . $this->connection->real_escape_string((string) $value) . "'";
        }, $query);
    }
    public function query(string $query)
    {
        if ($this->failure === 'before-increment' && str_starts_with(ltrim($query), 'INSERT INTO wp_audit_sanaka_obolos ')) {
            $this->failure = '';
            return false;
        }
        $result = $this->connection->query($query);
        if ($this->failure === 'after-commit' && $query === 'COMMIT') {
            $this->failure = '';
            return false; // O banco confirmou; a confirmação ao chamador foi perdida.
        }
        return $result;
    }
    public function get_var(string $query)
    {
        $result = $this->connection->query($query);
        return $result instanceof mysqli_result ? ($result->fetch_row()[0] ?? null) : null;
    }
    public function get_row(string $query, string $format)
    {
        $result = $this->connection->query($query);
        return $result instanceof mysqli_result ? $result->fetch_assoc() : null;
    }
}
$options = ($argv[1] ?? '') === 'worker' ? ['sanaka_obolo_operations_version' => '1'] : [];
function get_option($key) { global $options; return $options[$key] ?? false; }
function update_option($key, $value, $autoload): void { global $options; $options[$key] = $value; }
function current_time($format, $gmt): string { return gmdate('Y-m-d H:i:s'); }
function sanaka_obolos_character_exists($slug): bool { return in_array($slug, ['nandini', 'samvit'], true); }
function rest_ensure_response($data): TestResponse { return new TestResponse($data); }
function add_action(...$args): void {}
function add_filter(...$args): void {}
function apply_filters($name, $value) { return getenv('SANAKA_TEST_OPERATION_LIMIT') !== false ? (int) getenv('SANAKA_TEST_OPERATION_LIMIT') : $value; }
$wpdb = new TestWpdb($connection, $argv[4] ?? '');
require __DIR__ . '/../sanaka-obolo-idempotency.php';

if (($argv[1] ?? '') === 'worker') {
    $result = sanaka_obolo_operations_offer(new WP_REST_Request($argv[2], $argv[3]));
    echo json_encode($result instanceof WP_Error ? ['status' => $result->data['status'], 'code' => $result->code] : ['status' => 200, 'data' => $result->data, 'headers' => $result->headers]);
    exit;
}
$checks = 0;
function check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
}
function keyFor(int $number): string { return sprintf('00000000-0000-4000-8000-%012d', $number); }
function worker(string $slug, string $key, string $failure = ''): array
{
    $process = proc_open([PHP_BINARY, __FILE__, 'worker', $slug, $key, $failure], [['pipe','r'],['pipe','w'],['pipe','w']], $pipes);
    fclose($pipes[0]);
    return [$process, $pipes];
}
function result(array $worker): array
{
    [$process, $pipes] = $worker;
    $output = stream_get_contents($pipes[1]); $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]); fclose($pipes[2]);
    check(proc_close($process) === 0, 'Worker failed: ' . $errors);
    return json_decode($output, true, 512, JSON_THROW_ON_ERROR);
}
function total(): int { global $wpdb; return (int) $wpdb->get_var("SELECT total FROM wp_audit_sanaka_obolos WHERE character_slug = 'nandini'"); }

$wpdb->query('DROP TABLE IF EXISTS wp_audit_sanaka_obolo_operations');
$wpdb->query('DROP TABLE IF EXISTS wp_audit_sanaka_obolos');
check($wpdb->query('CREATE TABLE wp_audit_sanaka_obolos (character_slug varchar(100) NOT NULL PRIMARY KEY, total bigint unsigned NOT NULL DEFAULT 0, updated_at datetime NOT NULL) ENGINE=InnoDB') !== false, 'Counter setup failed.');
sanaka_obolo_operations_install();
check(get_option('sanaka_obolo_operations_version') === '1', 'Operations schema not installed.');

$workers = [];
for ($i=0; $i<20; $i++) { $workers[] = worker('nandini', keyFor(1)); }
foreach ($workers as $process) {
    $response = result($process);
    check($response['status'] === 200 && $response['data']['total'] === 1, 'Concurrent replay changed its receipt.');
    check($response['headers']['Cache-Control'] === 'no-store', 'Mutable receipt must not be cached.');
}
check(total() === 1, 'Same operation was counted twice.');

$workers = [];
for ($i=2; $i<=21; $i++) { $workers[] = worker('nandini', keyFor($i)); }
foreach ($workers as $process) { check(result($process)['status'] === 200, 'Independent concurrent offer failed.'); }
check(total() === 21, 'Independent offers lost increments.');
check(result(worker('nandini', keyFor(1)))['data']['total'] === 1 && total() === 21, 'Late replay must return its original receipt without another increment.');

check(result(worker('nandini', keyFor(22), 'after-commit'))['status'] === 503, 'Lost commit confirmation not simulated.');
check(total() === 22, 'Commit should have completed before response loss.');
check(result(worker('nandini', keyFor(22)))['data']['total'] === 22 && total() === 22, 'Retry after lost response duplicated an offer.');
check(result(worker('nandini', keyFor(23), 'before-increment'))['status'] === 503 && total() === 22, 'Failed write must roll back.');
check(result(worker('nandini', keyFor(23)))['data']['total'] === 23 && total() === 23, 'Rolled-back operation could not be retried.');
check(result(worker('nandini', 'invalid'))['status'] === 400 && total() === 23, 'Invalid key changed the counter.');
check(result(worker('unknown', keyFor(24)))['status'] === 404, 'Unknown character accepted.');
check(result(worker('samvit', keyFor(1)))['status'] === 409, 'Same key changed character.');
putenv('SANAKA_TEST_OPERATION_LIMIT=2');
check(result(worker('nandini', keyFor(25)))['status'] === 503 && total() === 23, 'Capacity must fail closed for new operations.');
check(result(worker('nandini', keyFor(1)))['status'] === 200 && total() === 23, 'Capacity must not block a completed replay.');
putenv('SANAKA_TEST_OPERATION_LIMIT');

$route = '/sanaka/v1/obolos/(?P<character_slug>[a-z0-9-]+)';
$endpoints = [$route => [['methods'=>['GET'=>true], 'callback'=>'legacy-get'], ['methods'=>['POST'=>true], 'callback'=>static fn($r) => 'legacy-post', 'permission_callback'=>'existing-permission', 'args'=>['unchanged'=>true]]]];
$wrapped = sanaka_obolo_operations_endpoints($endpoints);
check($wrapped[$route][0] === $endpoints[$route][0], 'GET handler changed.');
check($wrapped[$route][1]['permission_callback'] === 'existing-permission' && $wrapped[$route][1]['args'] === ['unchanged'=>true], 'Permissions or arguments changed.');
check($wrapped[$route][1]['callback'](new WP_REST_Request('nandini')) === 'legacy-post', 'Legacy requests no longer work.');
check(in_array('Idempotency-Key', sanaka_obolo_operations_cors(['Content-Type'], new WP_REST_Request('nandini')), true), 'CORS header missing.');
$wpdb->query('ALTER TABLE wp_audit_sanaka_obolos ENGINE=MyISAM');
check(result(worker('nandini', keyFor(24)))['status'] === 503 && total() === 23, 'Nontransactional engine must fail closed.');
$wpdb->query('ALTER TABLE wp_audit_sanaka_obolos ENGINE=InnoDB');
echo "Passed {$checks} assertions: concurrent replay, independent offers, lost commit response, rollback, validation, engine guard and legacy dispatch.\n";
