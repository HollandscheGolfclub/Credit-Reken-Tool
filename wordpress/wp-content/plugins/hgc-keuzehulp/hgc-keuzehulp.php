<?php
/**
 * Plugin Name: HGC - Interne WebsiteTechniek
 * Plugin URI: https://www.hollandschegolfclub.nl/
 * Description: Speelrechtkeuzehulp op basis van credits van de Hollandsche Golfclub, met restaurantreservering via HGC Connect.
 * Version: 2.4.1
 * Author: Jesse Weevers | Hollandsche Golfclub
 * Author URI: https://www.hollandschegolfclub.nl/
 * Update URI: https://github.com/HollandscheGolfclub/Credit-Reken-Tool
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: hgc-keuzehulp
 */

defined('ABSPATH') || exit;

define('HGC_CALCULATOR_VERSION', '2.4.1');
define('HGC_CALCULATOR_FILE', __FILE__);
define('HGC_CALCULATOR_DIR', plugin_dir_path(__FILE__));
define('HGC_CALCULATOR_URL', plugin_dir_url(__FILE__));

function hgc_calculator_default_config(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }

    $json = file_get_contents(HGC_CALCULATOR_DIR . 'hgc-config.json');
    $decoded = json_decode((string) $json, true);
    $config = is_array($decoded) ? $decoded : array();
    return $config;
}

function hgc_calculator_config(): array
{
    $saved = get_option('hgc_calculator_config');
    if (!is_array($saved)) {
        return hgc_calculator_default_config();
    }

    // Vul nieuwe velden uit de GitHub-standaard aan zonder bestaande
    // beheerdersinstellingen te overschrijven.
    $defaults = hgc_calculator_default_config();
    $default_courses = array();
    foreach (($defaults['courses'] ?? array()) as $course) {
        $default_courses[$course['id'] ?? ''] = $course;
    }
    foreach (($saved['courses'] ?? array()) as $index => $course) {
        $id = $course['id'] ?? '';
        foreach (array('shortGolfRate', 'greenFee', 'greenFeeFull', 'shortGreenFee', 'shortGreenFeeFull', 'caveat', 'caveatCourse') as $field) {
            if (!array_key_exists($field, $course)) {
                $saved['courses'][$index][$field] = $default_courses[$id][$field] ?? null;
            }
        }
    }
    // Een baan die na het opslaan is toegevoegd aan de GitHub-standaard stond
    // nog nergens in een bestaand opgeslagen config; die moet ook verschijnen,
    // niet alleen de velden van banen die al bekend waren.
    $saved_course_ids = array_column($saved['courses'] ?? array(), 'id');
    foreach (($defaults['courses'] ?? array()) as $course) {
        if (!in_array($course['id'] ?? '', $saved_course_ids, true)) {
            $saved['courses'][] = $course;
        }
    }
    foreach (($defaults['settings'] ?? array()) as $key => $value) {
        if (!array_key_exists($key, $saved['settings'] ?? array())) {
            $saved['settings'][$key] = $value;
        }
    }
    foreach ($defaults as $key => $value) {
        if (!array_key_exists($key, $saved)) {
            $saved[$key] = $value;
        }
    }
    foreach (($defaults['handicapRegistration'] ?? array()) as $key => $value) {
        if (!array_key_exists($key, $saved['handicapRegistration'] ?? array())) {
            $saved['handicapRegistration'][$key] = $value;
        }
    }
    foreach (($defaults['loyalTee'] ?? array()) as $key => $value) {
        if (!array_key_exists($key, $saved['loyalTee'] ?? array())) {
            $saved['loyalTee'][$key] = $value;
        }
    }
    foreach (($defaults['links'] ?? array()) as $key => $value) {
        if (empty($saved['links'][$key]) && !empty($value)) {
            $saved['links'][$key] = $value;
        }
    }
    $saved = array_intersect_key($saved, $defaults);
    $saved['settings'] = array_intersect_key($saved['settings'] ?? array(), $defaults['settings'] ?? array());
    $saved['links'] = array_intersect_key($saved['links'] ?? array(), $defaults['links'] ?? array());
    $saved['handicapRegistration'] = array_intersect_key(
        $saved['handicapRegistration'] ?? array(),
        $defaults['handicapRegistration'] ?? array()
    );
    $saved['loyalTee'] = array_intersect_key($saved['loyalTee'] ?? array(), $defaults['loyalTee'] ?? array());
    $course_keys = array_flip(array('id', 'name', 'location', 'largeHoles', 'largeRate', 'shortRate', 'shortGolfRate', 'greenFee', 'greenFeeFull', 'shortGreenFee', 'shortGreenFeeFull', 'provisional', 'note', 'caveat', 'caveatCourse'));
    foreach (($saved['courses'] ?? array()) as $index => $course) {
        $saved['courses'][$index] = array_intersect_key($course, $course_keys);
    }
    return $saved;
}

if (is_admin()) {
    require_once HGC_CALCULATOR_DIR . 'includes/class-hgc-calculator-admin.php';
    new HGC_Calculator_Admin();

    require_once HGC_CALCULATOR_DIR . 'includes/class-hgc-bestandsbeheer.php';
    new HGC_Bestandsbeheer();
}

// Registreert shortcode, blok en AJAX-proxy voor beide bezoekers en
// beheerders, dus altijd laden, niet alleen binnen is_admin().
require_once HGC_CALCULATOR_DIR . 'includes/class-hgc-restaurant.php';
$GLOBALS['hgc_restaurant'] = new HGC_Restaurant();

/**
 * Laadt de assets pas zodra de shortcode daadwerkelijk op een pagina staat.
 */
function hgc_calculator_shortcode(array $atts = array()): string
{
    static $rendered_modes = array();

    $mode = 'choice';

    if (!empty($rendered_modes[$mode])) {
        return '';
    }
    $rendered_modes[$mode] = true;

    wp_enqueue_style(
        'hgc-calculator-font',
        'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
        array(),
        null
    );
    wp_enqueue_style(
        'hgc-calculator',
        HGC_CALCULATOR_URL . 'styles.css',
        array('hgc-calculator-font'),
        (string) filemtime(HGC_CALCULATOR_DIR . 'styles.css')
    );
    wp_enqueue_script(
        'hgc-calculator-config',
        HGC_CALCULATOR_URL . 'hgc-config.js',
        array(),
        (string) filemtime(HGC_CALCULATOR_DIR . 'hgc-config.js'),
        true
    );
    wp_add_inline_script(
        'hgc-calculator-config',
        'window.hgcConfig = ' . wp_json_encode(hgc_calculator_config(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ';',
        'after'
    );
    $scripts = array('calculator.js');
    $dependencies = array('hgc-calculator-config');
    foreach ($scripts as $script) {
        $handle = 'hgc-calculator-' . basename($script, '.js');
        wp_enqueue_script(
            $handle,
            HGC_CALCULATOR_URL . $script,
            $dependencies,
            (string) filemtime(HGC_CALCULATOR_DIR . $script),
            true
        );
        $dependencies = array($handle);
    }

    ob_start();
    include HGC_CALCULATOR_DIR . 'templates/calculator.php';
    return (string) ob_get_clean();
}
add_shortcode('hgc_calculator', 'hgc_calculator_shortcode');

function hgc_choice_helper_shortcode(array $atts = array()): string
{
    $atts['mode'] = 'keuzehulp';
    return hgc_calculator_shortcode($atts);
}

add_shortcode('hgc_keuzehulp', 'hgc_choice_helper_shortcode');
add_shortcode('hgc_besparingscalculator', 'hgc_choice_helper_shortcode');

/**
 * Maakt een blok beschikbaar in de klassieke editor en pagebuilders via de shortcode.
 */
function hgc_calculator_register_shortcode_hint(): void
{
    add_shortcode('hgc_rekentool', 'hgc_calculator_shortcode');
}
add_action('init', 'hgc_calculator_register_shortcode_hint');

final class HGC_Calculator_GitHub_Updater
{
    private const REPOSITORY = 'HollandscheGolfclub/Credit-Reken-Tool';
    private const SLUG = 'hgc-keuzehulp';
    private const ASSET_NAME = 'hgc-keuzehulp.zip';
    private const CACHE_KEY = 'hgc_calculator_github_release';

    private string $plugin_file;

    public function __construct()
    {
        $this->plugin_file = plugin_basename(HGC_CALCULATOR_FILE);
        add_filter('pre_set_site_transient_update_plugins', array($this, 'check_for_update'));
        add_filter('plugins_api', array($this, 'plugin_information'), 20, 3);
        add_action('admin_post_hgc_calculator_check_updates', array($this, 'manual_check'));
    }

    public function check_for_update($transient)
    {
        if (!is_object($transient)) {
            return $transient;
        }

        // Klikt een beheerder op "Opnieuw controleren", dan moet onze eigen cache
        // ook opzij; anders blijft WordPress tot zes uur de vorige release melden.
        $release = $this->get_release(!empty($_GET['force-check']));
        if (!$release || empty($release['version']) || empty($release['package'])) {
            return $transient;
        }

        if (version_compare(HGC_CALCULATOR_VERSION, $release['version'], '<')) {
            $update = new stdClass();
            $update->id = 'github.com/' . self::REPOSITORY;
            $update->slug = self::SLUG;
            $update->plugin = $this->plugin_file;
            $update->new_version = $release['version'];
            $update->url = $release['html_url'];
            $update->package = $release['package'];
            $update->icons = $this->plugin_icons();
            $update->tested = '';
            $update->requires_php = '7.4';
            $transient->response[$this->plugin_file] = $update;
        }

        return $transient;
    }

    public function plugin_information($result, string $action, $args)
    {
        if ($action !== 'plugin_information' || empty($args->slug) || $args->slug !== self::SLUG) {
            return $result;
        }

        $release = $this->get_release();
        if (!$release) {
            return $result;
        }

        $information = new stdClass();
        $information->name = 'HGC - Interne WebsiteTechniek';
        $information->slug = self::SLUG;
        $information->version = $release['version'];
        $information->author = '<a href="https://www.hollandschegolfclub.nl/">Hollandsche Golfclub</a>';
        $information->homepage = 'https://github.com/' . self::REPOSITORY;
        $information->requires = '6.0';
        $information->requires_php = '7.4';
        $information->download_link = $release['package'];
        $information->icons = $this->plugin_icons();
        $information->sections = array(
            'description' => 'Speelrechtkeuzehulp op basis van credits van de Hollandsche Golfclub.',
            'changelog' => nl2br(esc_html($release['notes'] ?: 'Bekijk de GitHub Release voor de wijzigingen.')),
        );

        return $information;
    }

    /**
     * Laat een beheerder vanuit onze eigen instellingenpagina de caches
     * overslaan en GitHub onmiddellijk opnieuw controleren.
     */
    public function manual_check(): void
    {
        if (!current_user_can('update_plugins')) {
            wp_die('Je hebt geen toestemming om pluginupdates te controleren.');
        }
        check_admin_referer('hgc_calculator_check_updates');

        delete_site_transient(self::CACHE_KEY);
        $release = $this->get_release(true);
        $status = 'error';
        $latest = '';

        if ($release && !empty($release['version']) && !empty($release['package'])) {
            $latest = sanitize_text_field($release['version']);
            $status = version_compare(HGC_CALCULATOR_VERSION, $latest, '<') ? 'available' : 'current';

            if (!function_exists('wp_update_plugins')) {
                require_once ABSPATH . 'wp-admin/includes/update.php';
            }
            wp_clean_plugins_cache(true);
            wp_update_plugins();
        }

        $url = add_query_arg(array(
            'page' => 'hgc-calculator',
            'hgc_update_check' => $status,
            'hgc_latest' => $latest,
        ), admin_url('options-general.php'));
        wp_safe_redirect($url . '#hgc-plugin-updates');
        exit;
    }

    /**
     * WordPress toont anders het grijze standaard-stekkericoon bij updates
     * van plugins die niet via WordPress.org worden aangeboden.
     */
    private function plugin_icons(): array
    {
        $icon_url = HGC_CALCULATOR_URL . 'assets/plugin-icon.png';
        return array(
            '1x' => $icon_url,
            '2x' => $icon_url,
            'default' => $icon_url,
        );
    }

    private function get_release(bool $force = false): ?array
    {
        $cached = get_site_transient(self::CACHE_KEY);
        if (!$force && is_array($cached)) {
            // Een mislukte poging bewaren we ook, maar dan als lege uitkomst.
            return empty($cached['version']) ? null : $cached;
        }

        $headers = array(
            'Accept' => 'application/vnd.github+json',
            'User-Agent' => 'HGC-Credit-Calculator-WordPress',
            'X-GitHub-Api-Version' => '2022-11-28',
        );

        if (defined('HGC_CALCULATOR_GITHUB_TOKEN') && HGC_CALCULATOR_GITHUB_TOKEN) {
            $headers['Authorization'] = 'Bearer ' . HGC_CALCULATOR_GITHUB_TOKEN;
        }

        $response = wp_remote_get(
            'https://api.github.com/repos/' . self::REPOSITORY . '/releases/latest',
            array('headers' => $headers, 'timeout' => 10)
        );

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            // Kort onthouden dat het misging, zodat een onbereikbaar GitHub niet bij
            // iedere controle een verzoek van tien seconden kost.
            set_site_transient(self::CACHE_KEY, array('failed' => true), 15 * MINUTE_IN_SECONDS);
            return null;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($data) || empty($data['tag_name'])) {
            set_site_transient(self::CACHE_KEY, array('failed' => true), 15 * MINUTE_IN_SECONDS);
            return null;
        }

        $package = '';
        foreach (($data['assets'] ?? array()) as $asset) {
            if (($asset['name'] ?? '') === self::ASSET_NAME) {
                $package = (string) ($asset['browser_download_url'] ?? '');
                break;
            }
        }

        $release = array(
            'version' => ltrim((string) $data['tag_name'], 'vV'),
            'html_url' => (string) ($data['html_url'] ?? 'https://github.com/' . self::REPOSITORY),
            'package' => $package,
            'notes' => (string) ($data['body'] ?? ''),
        );

        set_site_transient(self::CACHE_KEY, $release, 6 * HOUR_IN_SECONDS);
        return $release;
    }
}

new HGC_Calculator_GitHub_Updater();

register_activation_hook(__FILE__, static function (): void {
    delete_site_transient('hgc_calculator_github_release');
});

register_deactivation_hook(__FILE__, array('HGC_Restaurant', 'deactivate_cleanup'));
