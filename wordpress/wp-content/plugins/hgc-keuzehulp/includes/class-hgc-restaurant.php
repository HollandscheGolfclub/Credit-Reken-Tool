<?php

defined('ABSPATH') || exit;

/**
 * Restaurantreservering, oorspronkelijk een losse plugin (HGC Restaurant
 * Reserveren), samengevoegd in de keuzehulp: één plugin, één versienummer,
 * één auto-updater en een gedeelde instellingenpagina. De reserveringsdata
 * zelf blijft buiten WordPress; deze klasse doet alleen het formulier, het
 * blok en een dunne AJAX-proxy naar de Connect-koppeling.
 */
final class HGC_Restaurant
{
    private const OPTION = 'hgc_restaurant_settings';

    public function __construct()
    {
        add_action('init', array($this, 'register_block'));
        add_shortcode('hgc_restaurant_reserveren', array($this, 'shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_action('wp_ajax_hgc_restaurant_api', array($this, 'ajax'));
        add_action('wp_ajax_nopriv_hgc_restaurant_api', array($this, 'ajax'));
        add_action('admin_post_hgc_restaurant_save', array($this, 'save'));
    }

    public static function settings(): array
    {
        return wp_parse_args(get_option(self::OPTION, array()), array(
            'api_url' => '',
            'park' => '',
            'accent' => '#95c11f',
            'privacy_url' => '',
        ));
    }

    public function register_assets(): void
    {
        $base = HGC_CALCULATOR_URL . 'assets/restaurant/';
        wp_register_style('hgc-restaurant', $base . 'reservation.css', array(), HGC_CALCULATOR_VERSION);
        wp_register_script('hgc-restaurant', $base . 'reservation.js', array(), HGC_CALCULATOR_VERSION, true);
    }

    public function register_block(): void
    {
        wp_register_script(
            'hgc-restaurant-block',
            HGC_CALCULATOR_URL . 'assets/restaurant/block.js',
            array('wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor'),
            HGC_CALCULATOR_VERSION,
            true
        );
        register_block_type('hgc/restaurant-reserveren', array(
            'api_version' => 2,
            'editor_script' => 'hgc-restaurant-block',
            'attributes' => array('park' => array('type' => 'string', 'default' => '')),
            'render_callback' => function (array $attributes): string {
                return $this->render(array('park' => $attributes['park'] ?? ''));
            },
        ));
    }

    public function shortcode($atts): string
    {
        return $this->render(shortcode_atts(array('park' => ''), $atts, 'hgc_restaurant_reserveren'));
    }

    private function render(array $atts): string
    {
        $settings = self::settings();
        $park = sanitize_title($atts['park'] ?: $settings['park']);
        if ($park === '') {
            return current_user_can('manage_options')
                ? '<p>Stel eerst een parkcode in bij Instellingen → Hollandsche Golfclub Calculator.</p>'
                : '';
        }

        wp_enqueue_style('hgc-restaurant');
        wp_enqueue_script('hgc-restaurant');
        wp_add_inline_script(
            'hgc-restaurant',
            'window.HGCRestaurant = ' . wp_json_encode(array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('hgc_restaurant'),
                'privacyUrl' => esc_url_raw($settings['privacy_url']),
            )) . ';',
            'before'
        );

        $ref = isset($_GET['ref']) ? sanitize_text_field(wp_unslash($_GET['ref'])) : '';
        $token = isset($_GET['token']) ? sanitize_text_field(wp_unslash($_GET['token'])) : '';

        ob_start();
        ?>
        <div class="hgc-reservation" data-park="<?php echo esc_attr($park); ?>" data-ref="<?php echo esc_attr($ref); ?>" data-token="<?php echo esc_attr($token); ?>" style="--hgc-accent:<?php echo esc_attr($settings['accent']); ?>">
            <div class="hgc-reservation__loading" role="status">Beschikbaarheid laden…</div>
            <div class="hgc-reservation__app" hidden></div>
            <noscript><p>JavaScript is nodig om direct beschikbaarheid te controleren. Neem telefonisch contact op met het restaurant om te reserveren.</p></noscript>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public function ajax(): void
    {
        check_ajax_referer('hgc_restaurant', 'nonce');
        $settings = self::settings();
        if (!$settings['api_url']) {
            wp_send_json_error(array('message' => 'De reserveringskoppeling is nog niet ingesteld.'), 503);
        }

        $ip = sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $rate_key = 'hgc_rest_' . md5($ip . gmdate('YmdHi'));
        $count = (int) get_transient($rate_key);
        if ($count >= 45) {
            wp_send_json_error(array('message' => 'Te veel aanvragen. Probeer het over een minuut opnieuw.', 'code' => 'RATE_LIMITED'), 429);
        }
        set_transient($rate_key, $count + 1, 90);

        $raw = json_decode(file_get_contents('php://input'), true);
        $payload = is_array($raw) ? $this->sanitize_payload($raw) : array();

        $response = wp_remote_post(esc_url_raw($settings['api_url']), array(
            'timeout' => 15,
            'headers' => array('Content-Type' => 'application/json', 'Accept' => 'application/json'),
            'body' => wp_json_encode($payload),
        ));
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => 'Connect is tijdelijk niet bereikbaar. Probeer het later opnieuw.'), 502);
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        $status = wp_remote_retrieve_response_code($response);
        if ($status >= 400 || isset($body['error'])) {
            wp_send_json_error(array(
                'message' => sanitize_text_field($body['error'] ?? 'Reservering kon niet worden verwerkt.'),
                'code' => sanitize_key($body['code'] ?? 'API_ERROR'),
            ), $status ?: 500);
        }
        wp_send_json_success($body);
    }

    private function sanitize_payload(array $input): array
    {
        $allowed = array('action', 'slug', 'date', 'time', 'partySize', 'name', 'email', 'phone', 'dietary', 'occasion', 'privacyAccepted', 'website', 'reservationNumber', 'token', 'reason');
        $out = array();
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $input)) {
                continue;
            }
            if ($key === 'partySize') {
                $out[$key] = absint($input[$key]);
            } elseif ($key === 'privacyAccepted') {
                $out[$key] = rest_sanitize_boolean($input[$key]);
            } elseif ($key === 'email') {
                $out[$key] = sanitize_email($input[$key]);
            } elseif (in_array($key, array('dietary', 'occasion', 'reason'), true)) {
                $out[$key] = sanitize_textarea_field($input[$key]);
            } else {
                $out[$key] = sanitize_text_field($input[$key]);
            }
        }
        return $out;
    }

    public function save(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Je hebt geen toestemming om deze instellingen te wijzigen.');
        }
        check_admin_referer('hgc_restaurant_save');

        $raw = isset($_POST['restaurant']) && is_array($_POST['restaurant']) ? wp_unslash($_POST['restaurant']) : array();
        update_option(self::OPTION, array(
            'api_url' => esc_url_raw($raw['api_url'] ?? ''),
            'park' => sanitize_title($raw['park'] ?? ''),
            'accent' => sanitize_hex_color($raw['accent'] ?? '') ?: '#95c11f',
            'privacy_url' => esc_url_raw($raw['privacy_url'] ?? ''),
        ), false);

        wp_safe_redirect(add_query_arg('restaurant_updated', '1', admin_url('options-general.php?page=hgc-calculator')));
        exit;
    }

    /**
     * Wordt vanuit HGC_Calculator_Admin::render_page() aangeroepen, zodat
     * dit op dezelfde instellingenpagina staat als de rest van de keuzehulp.
     */
    public function render_admin_section(): void
    {
        $s = self::settings();
        ?>
        <section class="hgc-admin-panel">
            <h2>Restaurant reserveren</h2>
            <p class="hgc-admin-hint">Koppelt aan de reserveringsfunctie van HGC Connect. De plugin bewaart zelf geen reserveringen; alle data en capaciteitsregels blijven centraal in Connect.</p>
            <?php if (isset($_GET['restaurant_updated'])) : ?>
                <div class="notice notice-success is-dismissible"><p>De restaurantinstellingen zijn opgeslagen.</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="hgc_restaurant_save" />
                <?php wp_nonce_field('hgc_restaurant_save'); ?>
                <div class="hgc-admin-grid hgc-admin-grid--two">
                    <label class="hgc-admin-field"><span>Connect API-URL</span><input class="large-text code" type="url" name="restaurant[api_url]" value="<?php echo esc_attr($s['api_url']); ?>" required /></label>
                    <label class="hgc-admin-field"><span>Standaard parkcode</span><input type="text" name="restaurant[park]" value="<?php echo esc_attr($s['park']); ?>" placeholder="almkreek" /></label>
                    <label class="hgc-admin-field"><span>Accentkleur</span><input type="color" name="restaurant[accent]" value="<?php echo esc_attr($s['accent']); ?>" /></label>
                    <label class="hgc-admin-field"><span>Privacyverklaring</span><input class="large-text" type="url" name="restaurant[privacy_url]" value="<?php echo esc_attr($s['privacy_url']); ?>" /></label>
                </div>
                <p class="hgc-admin-hint">De publieke URL van de Base44-functie <code>restaurantApi</code>.</p>
                <div class="hgc-admin-actions">
                    <?php submit_button('Restaurantinstellingen opslaan', 'primary', 'submit', false); ?>
                </div>
            </form>
        </section>
        <?php
    }
}
