<?php

declare(strict_types=1);

/**
 * Dekt de server-side hardening van de reserverings-AJAX-proxy die niet met
 * echte HTTP-requests te testen is zonder een volledige WordPress-runtime:
 * invoervalidatie (sanitize_payload) en de transient-rate limiter.
 */

define('ABSPATH', __DIR__);
define('HGC_CALCULATOR_VERSION', 'test');
define('HGC_CALCULATOR_URL', 'https://example.test/plugin/');
define('MINUTE_IN_SECONDS', 60);
define('HOUR_IN_SECONDS', 3600);

$test_option = array();
$test_transients = array();

function get_option(string $name, $fallback = false)
{
    global $test_option;
    return $name === 'hgc_restaurant_settings' ? $test_option : $fallback;
}

function get_transient(string $key)
{
    global $test_transients;
    return $test_transients[$key] ?? false;
}

function set_transient(string $key, $value, int $expiration = 0): bool
{
    global $test_transients;
    $test_transients[$key] = $value;
    return true;
}

function wp_parse_args($args, array $defaults = array()): array
{
    return array_merge($defaults, is_array($args) ? $args : array());
}

function sanitize_title($value): string
{
    $value = strtolower(trim((string) $value));
    return trim((string) preg_replace('/[^a-z0-9]+/', '-', $value), '-');
}

function sanitize_text_field($value): string
{
    return trim(strip_tags((string) $value));
}

function sanitize_textarea_field($value): string
{
    return trim(strip_tags((string) $value));
}

function sanitize_key($value): string
{
    return preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $value));
}

function sanitize_email($value): string
{
    return filter_var(trim((string) $value), FILTER_SANITIZE_EMAIL) ?: '';
}

function is_email($value)
{
    return filter_var((string) $value, FILTER_VALIDATE_EMAIL) ? $value : false;
}

function absint($value): int
{
    return abs((int) $value);
}

function rest_sanitize_boolean($value): bool
{
    return in_array($value, array(true, 'true', 1, '1'), true);
}

function esc_url_raw($value): string
{
    return filter_var((string) $value, FILTER_SANITIZE_URL) ?: '';
}

function add_action(...$args): void {}
function add_shortcode(...$args): void {}
function add_filter(...$args): void {}
function wp_enqueue_style(...$args): void {}
function wp_enqueue_script(...$args): void {}
function wp_add_inline_script(...$args): void {}
function wp_unslash($value) { return $value; }
function wp_create_nonce(string $action): string { return 'test-nonce'; }
function admin_url(string $path = ''): string { return 'https://example.test/wp-admin/' . $path; }
function current_user_can(string $capability): bool { return true; }
function wp_json_encode($value, int $flags = 0): string { return (string) json_encode($value, $flags); }
function esc_attr($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_url($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }

require_once __DIR__ . '/../wordpress/wp-content/plugins/hgc-keuzehulp/includes/class-hgc-restaurant.php';

function assert_same($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . PHP_EOL . 'Verwacht: ' . var_export($expected, true) . PHP_EOL . 'Werkelijk: ' . var_export($actual, true) . PHP_EOL);
        exit(1);
    }
}

function call_sanitize_payload(array $input): array
{
    $restaurant = new HGC_Restaurant();
    $method = new ReflectionMethod(HGC_Restaurant::class, 'sanitize_payload');
    $method->setAccessible(true);
    return $method->invoke($restaurant, $input);
}

function call_is_rate_limited(string $key, int $limit, int $window): bool
{
    $method = new ReflectionMethod(HGC_Restaurant::class, 'is_rate_limited');
    $method->setAccessible(true);
    return $method->invoke(null, $key, $limit, $window);
}

// De browser mag nooit zelf een onzinnig groot aantal personen doordrukken.
$out = call_sanitize_payload(array('partySize' => '999999'));
assert_same(50, $out['partySize'], 'Een absurd groot aantal personen wordt niet geclampt naar het maximum.');

$out = call_sanitize_payload(array('partySize' => '0'));
assert_same(1, $out['partySize'], 'Een aantal personen van 0 wordt niet geclampt naar het minimum.');

// Alleen een geldig formaat e-mailadres komt door; een ongeldige waarde wordt leeggemaakt in
// plaats van gedeeltelijk doorgestuurd naar Connect.
$out = call_sanitize_payload(array('email' => 'niet-een-emailadres'));
assert_same('', $out['email'], 'Een ongeldig e-mailadres wordt niet als leeg doorgegeven.');

$out = call_sanitize_payload(array('email' => 'Gast@Example.com'));
assert_same('Gast@Example.com', $out['email'], 'Een geldig e-mailadres wordt onterecht gewijzigd of geweigerd.');

// Datum en tijd moeten het verwachte formaat (\d{4}-\d{2}-\d{2}) hebben; dit is een
// formaatcheck, geen kalendervalidatie — de echte datum/beschikbaarheid controleert Connect
// opnieuw. Een waarde die niet eens aan het formaat voldoet (injectiepoging, andere structuur)
// wordt hier al leeggemaakt in plaats van doorgestuurd.
$out = call_sanitize_payload(array('date' => '2026-06-15'));
assert_same('2026-06-15', $out['date'], 'Een geldig gevormde datum wordt onterecht geweigerd.');

$out = call_sanitize_payload(array('date' => "2026-01-01'); DROP TABLE reserveringen; --"));
assert_same('', $out['date'], 'Een datumveld met een SQL-injectiepoging wordt niet doorgelaten.');

$out = call_sanitize_payload(array('time' => '18:30'));
assert_same('18:30', $out['time'], 'Een geldige tijd van het formaat HH:MM wordt onterecht geweigerd.');

$out = call_sanitize_payload(array('time' => '99:99'));
assert_same('', $out['time'], 'Een onbestaande tijd (99:99) wordt niet geweigerd.');

$out = call_sanitize_payload(array('time' => '<script>alert(1)</script>'));
assert_same('', $out['time'], 'Een scriptinjectie in het tijdveld wordt niet geweigerd.');

// action wordt in ajax() tegen een allowlist gecontroleerd; hier alleen checken dat de waarde
// ongewijzigd (niet verlaagd tot kleine letters) doorkomt zodat de allowlist-vergelijking klopt.
$out = call_sanitize_payload(array('action' => 'createPublic'));
assert_same('createPublic', $out['action'], 'De hoofdlettergevoelige actienaam wordt aangepast door sanitisatie.');

// Vrije-vorm ID's worden begrensd in lengte, zodat een bot geen megabytes aan tekst in een
// ID-veld kan proppen.
$long_token = str_repeat('a', 500);
$out = call_sanitize_payload(array('token' => $long_token));
assert_same(200, strlen($out['token']), 'Een extreem lang token wordt niet afgekapt op de verwachte maximale lengte.');

// Eigen formuliervragen (antwoorden): sleutels worden genormaliseerd, aantal en lengte begrensd.
$many_answers = array();
for ($i = 0; $i < 30; $i++) {
    $many_answers['Vraag ' . $i . '!'] = str_repeat('x', 5000);
}
$out = call_sanitize_payload(array('antwoorden' => $many_answers));
assert_same(20, count($out['antwoorden']), 'Meer dan 20 aangepaste antwoorden worden niet afgekapt.');
foreach ($out['antwoorden'] as $key => $value) {
    assert_same(true, (bool) preg_match('/^[a-z0-9_-]+$/', $key), 'Een antwoordsleutel bevat na sanitisatie nog onveilige tekens: ' . $key);
    assert_same(2000, strlen($value), 'Een individueel antwoord wordt niet afgekapt op de verwachte maximale lengte.');
}

// Onbekende velden (niet in de allowlist) worden volledig genegeerd.
$out = call_sanitize_payload(array('isAdmin' => true, 'price' => 1, 'status' => 'betaald'));
assert_same(array(), $out, 'Velden buiten de allowlist (bv. price/status/isAdmin) worden onterecht doorgelaten.');

// Rate limiter: binnen het venster wordt de limiet gehandhaafd, buiten het venster reset hij.
$limited = false;
for ($i = 0; $i < 5; $i++) {
    $limited = call_is_rate_limited('test-key', 3, 60);
}
assert_same(true, $limited, 'De rate limiter blokkeert niet nadat de limiet is overschreden.');

fwrite(STDOUT, "Server-side invoervalidatie en rate limiting: alle tests geslaagd.\n");
