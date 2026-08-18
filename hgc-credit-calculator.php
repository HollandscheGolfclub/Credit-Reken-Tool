<?php
/**
 * Plugin Name: HGC Credit Calculator
 * Plugin URI: https://github.com/HollandscheGolfclub/Credit-Reken-Tool
 * Description: Besparingscalculator voor speelrechten, LoyalTee en HGC-handicapregistratie.
 * Version: 1.0.0
 * Author: Hollandsche Golfclub
 * Author URI: https://www.hollandschegolfclub.nl/
 * Update URI: https://github.com/HollandscheGolfclub/Credit-Reken-Tool
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: hgc-credit-calculator
 */

defined('ABSPATH') || exit;

define('HGC_CALCULATOR_VERSION', '1.0.0');
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
    return is_array($saved) ? $saved : hgc_calculator_default_config();
}

if (is_admin()) {
    require_once HGC_CALCULATOR_DIR . 'includes/class-hgc-calculator-admin.php';
    new HGC_Calculator_Admin();
}

/**
 * Laadt de assets pas zodra de shortcode daadwerkelijk op een pagina staat.
 */
function hgc_calculator_shortcode(): string
{
    static $rendered = false;

    if ($rendered) {
        return '';
    }
    $rendered = true;

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
    wp_enqueue_script(
        'hgc-calculator',
        HGC_CALCULATOR_URL . 'calculator.js',
        array('hgc-calculator-config'),
        (string) filemtime(HGC_CALCULATOR_DIR . 'calculator.js'),
        true
    );

    ob_start();
    include HGC_CALCULATOR_DIR . 'templates/calculator.php';
    return (string) ob_get_clean();
}
add_shortcode('hgc_calculator', 'hgc_calculator_shortcode');

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
    private const SLUG = 'hgc-credit-calculator';
    private const ASSET_NAME = 'hgc-credit-calculator.zip';
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

        $release = $this->get_release();
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
        $information->name = 'HGC Credit Calculator';
        $information->slug = self::SLUG;
        $information->version = $release['version'];
        $information->author = '<a href="https://www.hollandschegolfclub.nl/">Hollandsche Golfclub</a>';
        $information->homepage = 'https://github.com/' . self::REPOSITORY;
        $information->requires = '6.0';
        $information->requires_php = '7.4';
        $information->download_link = $release['package'];
        $information->sections = array(
            'description' => 'Bereken en vergelijk HGC-speelrechten, LoyalTee en handicapregistratie.',
            'changelog' => nl2br(esc_html($release['notes'] ?: 'Bekijk de GitHub Release voor de wijzigingen.')),
        );

        return $information;
    }

    private function get_release(): ?array
    {
        $cached = get_site_transient(self::CACHE_KEY);
        if (is_array($cached)) {
            return $cached;
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
            return null;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($data) || empty($data['tag_name'])) {
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
