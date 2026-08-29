<?php

declare(strict_types=1);

define('ABSPATH', __DIR__);

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

fwrite(STDOUT, "Restaurantinstellingen: migratie, onbeperkte locaties en unieke slugs geslaagd.\n");
