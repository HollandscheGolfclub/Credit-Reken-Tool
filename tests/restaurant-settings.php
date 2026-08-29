<?php

declare(strict_types=1);

define('ABSPATH', __DIR__);
define('HGC_CALCULATOR_VERSION', 'test');
define('HGC_CALCULATOR_URL', 'https://example.test/plugin/');

$test_option = array();

function get_option(string $name, $fallback = false)
{
    global $test_option;
    return $name === 'hgc_restaurant_settings' ? $test_option : $fallback;
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
function wp_json_encode($value): string { return (string) json_encode($value); }
function esc_attr($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_url($value): string { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function wp_unique_id(string $prefix = ''): string
{
    static $id = 0;
    return $prefix . ++$id;
}
function remove_query_arg($keys): string { return 'https://example.test/reserveren?bron=menu'; }
function add_query_arg(string $key, string $value, string $url): string
{
    return $url . (strpos($url, '?') !== false ? '&' : '?') . rawurlencode($key) . '=' . rawurlencode($value);
}

require_once __DIR__ . '/../wordpress/wp-content/plugins/hgc-keuzehulp/includes/class-hgc-restaurant.php';

function assert_same($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . PHP_EOL . 'Verwacht: ' . var_export($expected, true) . PHP_EOL . 'Werkelijk: ' . var_export($actual, true) . PHP_EOL);
        exit(1);
    }
}

// Een installatie van voor 2.1.0 had één vlak restaurantprofiel. Dat profiel
// moet zonder verlies als eerste locatie terugkomen.
$test_option = array(
    'api_url' => 'https://example.test/restaurantApi',
    'park' => 'almkreek',
    'accent' => '#95c11f',
    'privacy_url' => 'https://example.test/privacy',
    'club_logo' => 'https://example.test/club.png',
    'park_logo' => 'https://example.test/almkreek.png',
    'phone' => '0183 403 327',
    'address' => 'Hoekje 7b, Almkerk',
    'hours_note' => 'Keuken open van 12:00 tot 21:00',
);
$migrated = HGC_Restaurant::settings();
assert_same('almkreek', $migrated['park'], 'De bestaande standaardparkcode is niet behouden.');
assert_same('https://example.test/almkreek.png', $migrated['locations']['almkreek']['park_logo'], 'Het bestaande parklogo is niet gemigreerd.');
assert_same('0183 403 327', $migrated['locations']['almkreek']['phone'], 'Het bestaande telefoonnummer is niet gemigreerd.');
assert_same('Hoekje 7b, Almkerk', $migrated['locations']['almkreek']['address'], 'Het bestaande adres is niet gemigreerd.');
assert_same('Keuken open van 12:00 tot 21:00', $migrated['locations']['almkreek']['hours_note'], 'De bestaande openingstijden zijn niet gemigreerd.');

// De locatielijst is bewust onbeperkt: ook een zeventiende profiel moet
// volledig behouden blijven.
$locations = array();
for ($index = 1; $index <= 17; $index += 1) {
    $locations[] = array('slug' => 'park-' . $index, 'name' => 'Park ' . $index);
}
$test_option = array('locations' => $locations, 'park' => 'park-17');
$limited = HGC_Restaurant::settings();
assert_same(17, count($limited['locations']), 'De restaurantlocaties zijn onterecht begrensd.');
assert_same('park-17', $limited['park'], 'De zeventiende locatie kan niet als standaardlocatie worden gebruikt.');

// Dubbele slugs worden in de genormaliseerde uitvoer nooit dubbel opgenomen.
$test_option = array('locations' => array(
    array('slug' => 'De Purmer', 'name' => 'Eerste'),
    array('slug' => 'de-purmer', 'name' => 'Dubbel'),
));
$deduplicated = HGC_Restaurant::settings();
assert_same(1, count($deduplicated['locations']), 'Dubbele genormaliseerde parkcodes zijn niet verwijderd.');
assert_same('Eerste', $deduplicated['locations']['de-purmer']['name'], 'Bij een dubbele parkcode moet de eerste locatie behouden blijven.');

// De publieke restaurantkiezer toont alle profielen en laadt pas na een
// geldige keuze het reserveringsscherm van die ene locatie.
$test_option = array('locations' => $locations, 'park' => 'park-1');
$restaurant = new HGC_Restaurant();
$_GET = array();
$selector = $restaurant->selector_shortcode();
assert_same(17, substr_count($selector, 'data-hgc-location-card'), 'De restaurantkiezer toont niet alle ingestelde locaties.');
assert_same(true, strpos($selector, 'data-hgc-location-search') !== false, 'De zoekbalk ontbreekt bij een grotere locatielijst.');
assert_same(true, strpos($selector, 'hgc_restaurant=park-17') !== false, 'De laatste onbeperkte locatie is niet selecteerbaar.');

$_GET = array('hgc_restaurant' => 'park-3');
$booking = $restaurant->selector_shortcode();
assert_same(true, strpos($booking, 'Gekozen locatie') !== false, 'Na kiezen ontbreekt de bevestiging van de locatie.');
assert_same(true, strpos($booking, 'data-park="park-3"') !== false, 'Na kiezen wordt niet het juiste reserveringsscherm geladen.');
assert_same(false, strpos($booking, 'data-hgc-location-card') !== false, 'Na kiezen wordt de volledige locatielijst onnodig opnieuw getoond.');

fwrite(STDOUT, "Restaurantinstellingen en publieke locatiekiezer: alle tests geslaagd.\n");
