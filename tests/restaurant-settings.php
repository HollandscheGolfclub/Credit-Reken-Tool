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
function sanitize_email($value): string { return trim((string) $value); }
function apply_filters(string $hook, $value, ...$args) { return $value; }
function has_action(...$args): bool { return false; }
function wp_parse_url(string $url, int $component = -1) { return parse_url($url, $component); }
function home_url(string $path = ''): string { return 'https://example.test' . $path; }
function is_front_page(): bool { return ($_SERVER['REQUEST_URI'] ?? '') === '/'; }
function get_queried_object() { return null; }
function shortcode_atts(array $pairs, $atts, string $tag = ""): array { return array_merge($pairs, array_intersect_key((array) $atts, $pairs)); }
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

// Zwevende tafelknop: alleen op de ingestelde pagina's, en met een eigen (verborgen)
// widget zolang de pagina er zelf geen heeft.
function capture_fab(HGC_Restaurant $restaurant): string
{
    ob_start();
    $restaurant->print_table_fab();
    return (string) ob_get_clean();
}
$test_option = array('locations' => $locations, 'park' => 'park-1', 'fab_pages' => "restaurant\nhttps://example.test/golfbaan/park-2/", 'fab_park' => 'park-2', 'fab_hide_cart' => true);
$_GET = array();
$_SERVER['REQUEST_URI'] = '/contact/';
assert_same('', capture_fab(new HGC_Restaurant()), 'De tafelknop verschijnt op een pagina die niet is ingesteld.');

$_SERVER['REQUEST_URI'] = '/golfbaan/park-2/?utm=x';
$fab = capture_fab(new HGC_Restaurant());
assert_same(true, strpos($fab, 'data-hgc-table-fab') !== false, 'De tafelknop ontbreekt op een pagina die als URL is ingesteld.');
assert_same(true, strpos($fab, 'data-hgc-table-modal') !== false && strpos($fab, 'data-park="park-2"') !== false, 'Achter de tafelknop staat niet de widget van het gekozen restaurant.');
assert_same(true, strpos($fab, '#hge-floating-cart{display:none!important}') !== false, 'Het winkelmandje wordt niet verborgen.');

$_SERVER['REQUEST_URI'] = '/restaurant';
$restaurant = new HGC_Restaurant();
$restaurant->shortcode(array('park' => 'park-4'));
$fab = capture_fab($restaurant);
assert_same(true, strpos($fab, 'data-hgc-table-fab') !== false, 'De tafelknop ontbreekt op een pagina die als slug is ingesteld.');
assert_same(false, strpos($fab, 'data-hgc-table-modal') !== false, 'Er komt een tweede widget bij terwijl de pagina er al een heeft.');

$_SERVER['REQUEST_URI'] = '/contact/';
$restaurant = new HGC_Restaurant();
$restaurant->fab_shortcode(array('park' => 'park-5'));
$fab = capture_fab($restaurant);
assert_same(true, strpos($fab, 'data-park="park-5"') !== false, '[hgc_tafelknop] zet de knop niet met het opgegeven restaurant.');

fwrite(STDOUT, "Restaurantinstellingen, publieke locatiekiezer en tafelknop: alle tests geslaagd.\n");
