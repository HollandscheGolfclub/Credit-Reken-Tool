<?php
/**
 * Plugin Name: Hollandsche Golfclub Keuzehulp
 * Plugin URI: https://github.com/HollandscheGolfclub/Credit-Reken-Tool
 * Description: Speelrechtkeuzehulp op basis van credits van de Hollandsche Golfclub.
 * Version: 1.10.6
 * Author: Hollandsche Golfclub
 * Author URI: https://www.hollandschegolfclub.nl/
 * Update URI: https://github.com/HollandscheGolfclub/Credit-Reken-Tool
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: hgc-keuzehulp
 */

defined('ABSPATH') || exit;

define('HGC_CALCULATOR_VERSION', '1.10.6');
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
        foreach (array('shortGolfRate', 'greenFee') as $field) {
            if (!array_key_exists($field, $course)) {
                $saved['courses'][$index][$field] = $default_courses[$id][$field] ?? null;
            }
        }
    }
    foreach (($defaults['settings'] ?? array()) as $key => $value) {
        if (!array_key_exists($key, $saved['settings'] ?? array())) {
            $saved['settings'][$key] = $value;
        }
    }
    if (empty($saved['links']['playingRights']) && !empty($defaults['links']['playingRights'])) {
        $saved['links']['playingRights'] = $defaults['links']['playingRights'];
    }
    $saved = array_intersect_key($saved, $defaults);
    $saved['settings'] = array_intersect_key($saved['settings'] ?? array(), $defaults['settings'] ?? array());
    $saved['links'] = array_intersect_key($saved['links'] ?? array(), $defaults['links'] ?? array());
    $saved['handicapRegistration'] = array_intersect_key(
        $saved['handicapRegistration'] ?? array(),
        $defaults['handicapRegistration'] ?? array()
    );
    $course_keys = array_flip(array('id', 'name', 'location', 'largeHoles', 'largeRate', 'shortRate', 'shortGolfRate', 'greenFee', 'provisional', 'note'));
    foreach (($saved['courses'] ?? array()) as $index => $course) {
        $saved['courses'][$index] = array_intersect_key($course, $course_keys);
    }
    return $saved;
}

if (is_admin()) {
    require_once HGC_CALCULATOR_DIR . 'includes/class-hgc-calculator-admin.php';
    new HGC_Calculator_Admin();
}

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
        $information->name = 'Hollandsche Golfclub Keuzehulp';
        $information->slug = self::SLUG;
        $information->version = $release['version'];
        $information->author = '<a href="https://www.hollandschegolfclub.nl/">Hollandsche Golfclub</a>';
        $information->homepage = 'https://github.com/' . self::REPOSITORY;
        $information->requires = '6.0';
        $information->requires_php = '7.4';
        $information->download_link = $release['package'];
        $information->sections = array(
            'description' => 'Speelrechtkeuzehulp op basis van credits van de Hollandsche Golfclub.',
            'changelog' => nl2br(esc_html($release['notes'] ?: 'Bekijk de GitHub Release voor de wijzigingen.')),
        );

        return $information;
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
