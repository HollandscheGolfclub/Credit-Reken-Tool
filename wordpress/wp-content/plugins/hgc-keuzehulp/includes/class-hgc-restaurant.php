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
    private const WARMUP_HOOK = 'hgc_restaurant_warmup';
    private const WARMUP_INTERVAL = 'hgc_five_minutes';

    /**
     * Enige acties die de proxy mag doorsturen naar Connect. `action` komt
     * rechtstreeks uit het request; zonder deze allowlist zou de widget als
     * open doorgeefluik naar willekeurige Connect-acties werken.
     */
    private const PUBLIC_ACTIONS = array(
        'publicInfo', 'availability', 'createPublic', 'getPublic', 'updatePublic', 'cancelPublic',
        'eventPublicInfo', 'eventCreatePublic', 'eventGetPublic', 'eventUpdatePublic', 'eventCancelPublic',
    );

    /** Acties die daadwerkelijk iets aanmaken/wijzigen: krijgen een striktere limiet. */
    private const MUTATING_ACTIONS = array('createPublic', 'updatePublic', 'cancelPublic', 'eventCreatePublic', 'eventUpdatePublic', 'eventCancelPublic');

    /** Acties die op een reserveringsnummer + token zoeken: gevoelig voor het raden van tokens. */
    private const LOOKUP_ACTIONS = array('getPublic', 'eventGetPublic');

    /**
     * Foutcodes die de front-end al kent en zelf vertaalt (zie labels in
     * reservation.js). Voor elke andere code sturen we Connects eigen
     * berichttekst niet door, om te voorkomen dat interne details lekken.
     */
    private const SAFE_ERROR_CODES = array('SLOT_UNAVAILABLE', 'LOCATION_CLOSED', 'EVENT_CLOSED', 'PARTY_TOO_LARGE', 'TOO_SOON', 'MISSING_FIELD', 'UNKNOWN_LOCATION');

    /** Ruim genoeg voor een reserveringsformulier (incl. aangepaste vragen), klein genoeg tegen misbruik. */
    private const MAX_BODY_BYTES = 20000;

    public function __construct()
    {
        add_action('init', array($this, 'register_block'));
        add_shortcode('hgc_restaurant_reserveren', array($this, 'shortcode'));
        add_shortcode('hgc_restaurant_kiezer', array($this, 'selector_shortcode'));
        add_shortcode('hgc_event_aanmelden', array($this, 'event_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_action('wp_ajax_hgc_restaurant_api', array($this, 'ajax'));
        add_action('wp_ajax_nopriv_hgc_restaurant_api', array($this, 'ajax'));
        add_action('admin_post_hgc_restaurant_save', array($this, 'save'));
        add_filter('cron_schedules', array($this, 'register_cron_interval'));
        add_action(self::WARMUP_HOOK, array($this, 'warmup_ping'));
        add_action('init', array($this, 'ensure_warmup_scheduled'));
    }

    /**
     * De Connect-functie (Base44) is serverless en valt na een tijdje stil
     * ("koude start"), waardoor de eerste bezoeker daarna tot enkele
     * seconden op de widget moet wachten. Door elke 5 minuten zelf een
     * goedkoop, leesalleen verzoek te sturen, blijft de functie warm zodat
     * een echte bezoeker dat wachten niet meer merkt.
     */
    public function register_cron_interval(array $schedules): array
    {
        $schedules[self::WARMUP_INTERVAL] = array(
            'interval' => 5 * MINUTE_IN_SECONDS,
            'display' => 'Elke 5 minuten (HGC restaurant warmhoud-ping)',
        );
        return $schedules;
    }

    public function ensure_warmup_scheduled(): void
    {
        if (!wp_next_scheduled(self::WARMUP_HOOK)) {
            wp_schedule_event(time(), self::WARMUP_INTERVAL, self::WARMUP_HOOK);
        }
    }

    public function warmup_ping(): void
    {
        $settings = self::settings();
        if (!$settings['api_url'] || !$settings['locations']) {
            return;
        }
        foreach (array_keys($settings['locations']) as $park) {
            wp_remote_post(esc_url_raw($settings['api_url']), array(
                'timeout' => 8,
                'blocking' => false,
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode(array('action' => 'publicInfo', 'slug' => $park)),
            ));
        }
    }

    public static function deactivate_cleanup(): void
    {
        $timestamp = wp_next_scheduled(self::WARMUP_HOOK);
        if ($timestamp) {
            wp_unschedule_event($timestamp, self::WARMUP_HOOK);
        }
    }

    public static function settings(): array
    {
        $settings = wp_parse_args(get_option(self::OPTION, array()), array(
            'api_url' => '',
            'park' => '',
            'event' => '',
            'accent' => '#7cb63a',
            'privacy_url' => '',
            'club_logo' => '',
            'park_logo' => '',
            'phone' => '',
            'address' => '',
            'hours_note' => '',
            'locations' => array(),
        ));

        $locations = self::sanitize_locations($settings['locations']);
        $legacy_park = sanitize_title($settings['park']);
        if (!$locations && $legacy_park !== '') {
            $locations[$legacy_park] = array(
                'slug' => $legacy_park,
                'name' => ucwords(str_replace('-', ' ', $legacy_park)),
                'park_logo' => esc_url_raw($settings['park_logo']),
                'phone' => sanitize_text_field($settings['phone']),
                'address' => sanitize_text_field($settings['address']),
                'hours_note' => sanitize_text_field($settings['hours_note']),
            );
        }
        if ($legacy_park === '' || !isset($locations[$legacy_park])) {
            $legacy_park = (string) array_key_first($locations);
        }
        $settings['park'] = $legacy_park;
        $settings['event'] = sanitize_title($settings['event']);
        $settings['locations'] = $locations;
        return $settings;
    }

    /**
     * Normaliseert locatieprofielen. De sleutel is bewust gelijk aan de slug
     * die HGC Connect verwacht, zodat lookup en warmhoud-pings niet
     * uiteenlopen.
     */
    private static function sanitize_locations($raw): array
    {
        if (!is_array($raw)) {
            return array();
        }
        $locations = array();
        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }
            $slug = sanitize_title($item['slug'] ?? $item['code'] ?? '');
            if ($slug === '' || isset($locations[$slug])) {
                continue;
            }
            $name = sanitize_text_field($item['name'] ?? '');
            $locations[$slug] = array(
                'slug' => $slug,
                'name' => $name !== '' ? $name : ucwords(str_replace('-', ' ', $slug)),
                'park_logo' => esc_url_raw($item['park_logo'] ?? ''),
                'phone' => sanitize_text_field($item['phone'] ?? ''),
                'address' => sanitize_text_field($item['address'] ?? ''),
                'hours_note' => sanitize_text_field($item['hours_note'] ?? ''),
            );
        }
        return $locations;
    }

    public function register_assets(): void
    {
        $base = HGC_CALCULATOR_URL . 'assets/restaurant/';
        wp_register_style(
            'hgc-restaurant-font',
            'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
            array(),
            null
        );
        wp_register_style('hgc-restaurant', $base . 'reservation.css', array('hgc-restaurant-font'), HGC_CALCULATOR_VERSION);
        wp_register_script('hgc-restaurant', $base . 'reservation.js', array(), HGC_CALCULATOR_VERSION, true);
        wp_register_script('hgc-restaurant-selector', $base . 'selector.js', array(), HGC_CALCULATOR_VERSION, true);
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
        $settings = self::settings();
        wp_localize_script('hgc-restaurant-block', 'HGCRestaurantBlock', array(
            'locations' => array_values(array_map(static function (array $location): array {
                return array('value' => $location['slug'], 'label' => $location['name']);
            }, $settings['locations'])),
            'defaultPark' => $settings['park'],
            'defaultEvent' => $settings['event'],
        ));
        register_block_type('hgc/restaurant-reserveren', array(
            'api_version' => 2,
            'editor_script' => 'hgc-restaurant-block',
            'attributes' => array('park' => array('type' => 'string', 'default' => '')),
            'render_callback' => function (array $attributes): string {
                return $this->render(array('park' => $attributes['park'] ?? ''), 'restaurant');
            },
        ));
        register_block_type('hgc/restaurant-kiezer', array(
            'api_version' => 2,
            'editor_script' => 'hgc-restaurant-block',
            'render_callback' => array($this, 'selector_shortcode'),
        ));
        register_block_type('hgc/event-aanmelden', array(
            'api_version' => 2,
            'editor_script' => 'hgc-restaurant-block',
            'attributes' => array('event' => array('type' => 'string', 'default' => '')),
            'render_callback' => function (array $attributes): string {
                return $this->render(array('event' => $attributes['event'] ?? ''), 'event');
            },
        ));
    }

    public function shortcode($atts): string
    {
        return $this->render(shortcode_atts(array('park' => ''), $atts, 'hgc_restaurant_reserveren'), 'restaurant');
    }

    public function event_shortcode($atts): string
    {
        return $this->render(shortcode_atts(array('event' => ''), $atts, 'hgc_event_aanmelden'), 'event');
    }

    /**
     * Toont eerst alle ingestelde locaties. Pas na een keuze wordt het
     * reserveringsscherm geladen, zodat een pagina met veel locaties geen
     * onnodige API-verzoeken uitvoert.
     */
    public function selector_shortcode($atts = array()): string
    {
        $settings = self::settings();
        if (!$settings['locations']) {
            return current_user_can('manage_options')
                ? '<p>Voeg eerst restaurantlocaties toe bij Instellingen &rarr; HGC Interne WebsiteTechniek.</p>'
                : '';
        }

        $selected = isset($_GET['hgc_restaurant'])
            ? sanitize_title(wp_unslash($_GET['hgc_restaurant']))
            : '';
        $selected = isset($settings['locations'][$selected]) ? $selected : '';
        $selector_id = wp_unique_id('hgc-restaurant-kiezer-');
        $base_url = remove_query_arg(array('hgc_restaurant', 'ref', 'token'));

        wp_enqueue_style('hgc-restaurant');

        if ($selected !== '') {
            $location = $settings['locations'][$selected];
            ob_start();
            ?>
            <section class="hgc-location-selected" id="<?php echo esc_attr($selector_id); ?>" style="--hgc-accent:<?php echo esc_attr($settings['accent']); ?>">
                <div>
                    <span>Gekozen locatie</span>
                    <strong><?php echo esc_html($location['name']); ?></strong>
                </div>
                <a href="<?php echo esc_url($base_url . '#' . $selector_id); ?>">Andere locatie kiezen</a>
            </section>
            <?php
            echo $this->render(array('park' => $selected), 'restaurant'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            return (string) ob_get_clean();
        }

        wp_enqueue_script('hgc-restaurant-selector');
        ob_start();
        ?>
        <section class="hgc-location-selector" id="<?php echo esc_attr($selector_id); ?>" style="--hgc-accent:<?php echo esc_attr($settings['accent']); ?>" data-hgc-location-selector>
            <header class="hgc-location-selector__header">
                <p class="hgc-kicker">Restaurant reserveren</p>
                <h2>Kies een locatie</h2>
                <p>Selecteer het restaurant waar je een tafel wilt reserveren.</p>
            </header>
            <?php if (count($settings['locations']) > 4) : ?>
                <div class="hgc-location-selector__tools" role="search">
                    <label>
                        <span class="screen-reader-text">Restaurantlocaties doorzoeken</span>
                        <input type="search" placeholder="Zoek op naam, plaats of adres&hellip;" autocomplete="off" data-hgc-location-search />
                    </label>
                    <span data-hgc-location-count aria-live="polite"><?php echo esc_html(count($settings['locations']) . ' locaties'); ?></span>
                </div>
            <?php endif; ?>
            <div class="hgc-location-grid" data-hgc-location-list>
                <?php foreach ($settings['locations'] as $location) : ?>
                    <?php
                    $search_text = implode(' ', array($location['name'], $location['slug'], $location['address'], $location['hours_note']));
                    $location_url = add_query_arg('hgc_restaurant', $location['slug'], $base_url) . '#' . $selector_id;
                    ?>
                    <article class="hgc-location-card" data-hgc-location-card data-search="<?php echo esc_attr($search_text); ?>">
                        <div class="hgc-location-card__logo">
                            <?php if ($location['park_logo']) : ?>
                                <img src="<?php echo esc_url($location['park_logo']); ?>" alt="" loading="lazy" />
                            <?php else : ?>
                                <span aria-hidden="true"><?php echo esc_html(strtoupper(substr($location['name'], 0, 1))); ?></span>
                            <?php endif; ?>
                        </div>
                        <div class="hgc-location-card__body">
                            <h3><?php echo esc_html($location['name']); ?></h3>
                            <?php if ($location['address']) : ?><p><?php echo esc_html($location['address']); ?></p><?php endif; ?>
                            <?php if ($location['hours_note']) : ?><small><?php echo esc_html($location['hours_note']); ?></small><?php endif; ?>
                        </div>
                        <a class="hgc-button" href="<?php echo esc_url($location_url); ?>" aria-label="Reserveren bij <?php echo esc_attr($location['name']); ?>">Kies locatie</a>
                    </article>
                <?php endforeach; ?>
            </div>
            <p class="hgc-location-selector__empty" data-hgc-location-empty hidden>Geen locaties gevonden. Probeer een andere zoekopdracht.</p>
        </section>
        <?php
        return (string) ob_get_clean();
    }

    private function render(array $atts, string $mode = 'restaurant'): string
    {
        $settings = self::settings();
        $slug = $mode === 'event'
            ? sanitize_title($atts['event'] ?? '' ?: $settings['event'])
            : sanitize_title($atts['park'] ?? '' ?: $settings['park']);
        if ($slug === '') {
            if (!current_user_can('manage_options')) {
                return '';
            }
            return $mode === 'event'
                ? '<p>Stel eerst een evenementcode in bij Instellingen → HGC Interne WebsiteTechniek.</p>'
                : '<p>Stel eerst een parkcode in bij Instellingen → HGC Interne WebsiteTechniek.</p>';
        }
        wp_enqueue_style('hgc-restaurant');
        wp_enqueue_script('hgc-restaurant');
        // JSON_HEX_*: voorkomt dat een admin-ingevuld veld (adres, logo-URL, telefoonnummer)
        // met bijvoorbeeld "</script>" erin uit deze inline <script>-tag zou kunnen breken.
        wp_add_inline_script(
            'hgc-restaurant',
            'window.HGCRestaurant = ' . wp_json_encode(array(
    'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('hgc_restaurant'),
                'privacyUrl' => esc_url_raw($settings['privacy_url']),
                'clubLogo' => esc_url_raw($settings['club_logo']),
                'grasUrl' => HGC_CALCULATOR_URL . 'assets/restaurant/img/hgc-gras.png',
                'fallbackProfile' => isset($settings['locations'][$settings['park']]) ? array(
                    'name' => $settings['locations'][$settings['park']]['name'],
                    'parkLogo' => $settings['locations'][$settings['park']]['park_logo'],
                    'phone' => $settings['locations'][$settings['park']]['phone'],
                    'address' => $settings['locations'][$settings['park']]['address'],
                    'hoursNote' => $settings['locations'][$settings['park']]['hours_note'],
                ) : array(),
                'locations' => array_map(static function (array $location): array {
                    return array(
                        'name' => $location['name'],
                        'parkLogo' => $location['park_logo'],
                        'phone' => $location['phone'],
                        'address' => $location['address'],
                        'hoursNote' => $location['hours_note'],
                    );
                }, $settings['locations']),
            ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';',
            'before'
        );

        $ref = isset($_GET['ref']) ? sanitize_text_field(wp_unslash($_GET['ref'])) : '';
        $token = isset($_GET['token']) ? sanitize_text_field(wp_unslash($_GET['token'])) : '';

        ob_start();
        ?>
        <div class="hgc-reservation" data-mode="<?php echo esc_attr($mode); ?>" data-slug="<?php echo esc_attr($slug); ?>" data-park="<?php echo esc_attr($mode === 'restaurant' ? $slug : ''); ?>" data-ref="<?php echo esc_attr($ref); ?>" data-token="<?php echo esc_attr($token); ?>" style="--hgc-accent:<?php echo esc_attr($settings['accent']); ?>">
            <div class="hgc-reservation__loading" role="status">
                <span class="hgc-spinner" aria-hidden="true"></span>
                <span><?php echo $mode === 'event' ? 'Evenement laden…' : 'Beschikbaarheid laden…'; ?></span>
            </div>
            <div class="hgc-reservation__app" hidden></div>
            <noscript><p><?php echo $mode === 'event' ? 'JavaScript is nodig om je aan te melden. Neem telefonisch contact op.' : 'JavaScript is nodig om direct beschikbaarheid te controleren. Neem telefonisch contact op met het restaurant om te reserveren.'; ?></p></noscript>
        </div>
        <?php
        return (string) ob_get_clean();
    }

    public function ajax(): void
    {
        // Een nonce bewijst alleen dat het verzoek van een pagina met deze widget komt; het is
        // geen autorisatie. Alle daadwerkelijke beslissingen (beschikbaarheid, prijs, wie een
        // reservering mag wijzigen) blijven hieronder en in Connect zelf gecontroleerd.
        check_ajax_referer('hgc_restaurant', 'nonce');
        $settings = self::settings();
        if (!$settings['api_url']) {
            wp_send_json_error(array('message' => 'De reserveringskoppeling is nog niet ingesteld.'), 503);
        }

        $ip = sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');

        // Grove limiet op alle acties samen (ook goedkope, zoals beschikbaarheid opvragen).
        if (self::is_rate_limited('all:' . $ip, 45, MINUTE_IN_SECONDS)) {
            wp_send_json_error(array('message' => 'Te veel aanvragen. Probeer het over een minuut opnieuw.', 'code' => 'RATE_LIMITED'), 429);
        }

        $raw_body = (string) file_get_contents('php://input');
        if (strlen($raw_body) > self::MAX_BODY_BYTES) {
            self::log('warning', sprintf('Aanvraag geweigerd: body te groot (%d bytes) vanaf %s.', strlen($raw_body), $ip));
            wp_send_json_error(array('message' => 'Aanvraag is te groot.', 'code' => 'PAYLOAD_TOO_LARGE'), 413);
        }

        $raw = json_decode($raw_body, true);
        $payload = is_array($raw) ? $this->sanitize_payload($raw) : array();

        // `action` bepaalt welke Connect-operatie wordt uitgevoerd; zonder allowlist zou deze
        // proxy elke stringwaarde blind doorsturen naar de externe backend.
        $action = (string) ($payload['action'] ?? '');
        if (!in_array($action, self::PUBLIC_ACTIONS, true)) {
            wp_send_json_error(array('message' => 'Onbekende actie.', 'code' => 'UNKNOWN_ACTION'), 400);
        }

        // Honeypotveld: onzichtbaar voor mensen, alleen scripts die elk veld invullen raken dit.
        if (!empty($payload['website'])) {
            self::log('warning', sprintf('Honeypot geraakt (actie: %s, ip: %s).', $action, $ip));
            wp_send_json_error(array('message' => 'Aanvraag kon niet worden verwerkt.', 'code' => 'API_ERROR'), 400);
        }

        $slug = sanitize_title($payload['slug'] ?? '');
        if ($slug === '') {
            $is_event = strpos($action, 'event') === 0;
            wp_send_json_error(array(
                'message' => $is_event ? 'Dit evenement is niet geconfigureerd.' : 'Dit restaurant is niet geconfigureerd.',
                'code' => 'UNKNOWN_LOCATION',
            ), 400);
        }
        $payload['slug'] = $slug;

        // Acties die daadwerkelijk iets aanmaken/wijzigen krijgen een striktere limiet, zowel per
        // IP als per e-mailadres (een IP is triviaal te wisselen, een formulier met steeds
        // hetzelfde e-mailadres nog niet).
        if (in_array($action, self::MUTATING_ACTIONS, true)) {
            if (self::is_rate_limited('mutate:' . $ip, 10, 10 * MINUTE_IN_SECONDS)) {
                self::log('warning', sprintf('Limiet (mutatie/ip) bereikt: %s vanaf %s.', $action, $ip));
                wp_send_json_error(array('message' => 'Te veel aanvragen. Probeer het over een paar minuten opnieuw.', 'code' => 'RATE_LIMITED'), 429);
            }
            $email = strtolower((string) ($payload['email'] ?? ''));
            if ($email !== '' && self::is_rate_limited('mutate_email:' . $email, 5, HOUR_IN_SECONDS)) {
                self::log('warning', sprintf('Limiet (mutatie/e-mail) bereikt: %s voor %s.', $action, $email));
                wp_send_json_error(array('message' => 'Te veel aanvragen voor dit e-mailadres. Probeer het later opnieuw.', 'code' => 'RATE_LIMITED'), 429);
            }
        } elseif (in_array($action, self::LOOKUP_ACTIONS, true)) {
            // getPublic/eventGetPublic zoeken op reservationNumber+token: een lagere limiet
            // maakt het raden van geldige tokens onaantrekkelijk zonder legitieme bezoekers te hinderen.
            if (self::is_rate_limited('lookup:' . $ip, 20, 10 * MINUTE_IN_SECONDS)) {
                self::log('warning', sprintf('Limiet (opzoeken) bereikt vanaf %s.', $ip));
                wp_send_json_error(array('message' => 'Te veel aanvragen. Probeer het over een paar minuten opnieuw.', 'code' => 'RATE_LIMITED'), 429);
            }
        }

        if (stripos($settings['api_url'], 'https://') !== 0) {
            self::log('error', 'Connect API-URL is niet HTTPS; verzoek geweigerd.');
            wp_send_json_error(array('message' => 'De reserveringskoppeling is onjuist ingesteld.'), 500);
        }

        $response = wp_remote_post(esc_url_raw($settings['api_url']), array(
            'timeout' => 15,
            'headers' => array('Content-Type' => 'application/json', 'Accept' => 'application/json'),
            'body' => wp_json_encode($payload),
        ));
        if (is_wp_error($response)) {
            self::log('error', 'Connect onbereikbaar: ' . $response->get_error_message());
            wp_send_json_error(array('message' => 'Connect is tijdelijk niet bereikbaar. Probeer het later opnieuw.'), 502);
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        $status = wp_remote_retrieve_response_code($response);
        if ($status >= 400 || isset($body['error'])) {
            $code = is_string($body['code'] ?? null) ? sanitize_key($body['code']) : 'API_ERROR';
            // Connects eigen foutmelding blijft in het serverlog; naar de bezoeker gaat alleen
            // tekst voor codes die de front-end al kent, zodat interne details nooit lekken.
            self::log('warning', sprintf(
                'Connect-fout (actie: %s, status: %d, code: %s): %s',
                $action,
                $status,
                $code,
                sanitize_text_field((string) ($body['error'] ?? ''))
            ));
            wp_send_json_error(array(
                'message' => in_array($code, self::SAFE_ERROR_CODES, true)
                    ? sanitize_text_field((string) ($body['error'] ?? 'Aanvraag kon niet worden verwerkt.'))
                    : 'Aanvraag kon niet worden verwerkt.',
                'code' => $code,
            ), $status ?: 500);
        }

        if (in_array($action, self::MUTATING_ACTIONS, true)) {
            self::log('info', sprintf('%s geslaagd (slug: %s).', $action, $slug));
        }

        wp_send_json_success($body);
    }

    /**
     * Simpele, herbruikbare transient-gebaseerde rate limiter: maximaal $limit
     * aanroepen per $windowSeconds voor een gegeven sleutel (bv. per IP of
     * per e-mailadres). Geen vervanging voor een WAF tegen gedistribueerd
     * misbruik, maar voorkomt eenvoudig scripten van de widget.
     */
    private static function is_rate_limited(string $key, int $limit, int $windowSeconds): bool
    {
        $bucket = 'hgc_rl_' . md5($key . '|' . $windowSeconds . '|' . (int) floor(time() / $windowSeconds));
        $count = (int) get_transient($bucket);
        if ($count >= $limit) {
            return true;
        }
        set_transient($bucket, $count + 1, $windowSeconds + 5);
        return false;
    }

    /**
     * Schrijft naar het PHP-errorlog (dus zichtbaar via WP_DEBUG_LOG/serverlogging),
     * nooit naar de bezoeker. Log bewust geen tokens of volledige payloads.
     */
    private static function log(string $level, string $message): void
    {
        error_log(sprintf('[HGC Restaurant] [%s] %s', strtoupper($level), $message));
    }

    /**
     * Vaste, bekende velden voor zowel restaurant- als event-acties. `telefoon`/`dieetwensen`/
     * `gelegenheid` zijn de systeemvelden uit de formulierbuilder (zelfde sleutels voor
     * restaurant en events); welke ervan daadwerkelijk zichtbaar/verplicht zijn bepaalt Connect.
     * Eigen, door de admin in Connect samengestelde vragen komen los binnen via `antwoorden`.
     */
    private function sanitize_payload(array $input): array
    {
        $allowed = array('action', 'slug', 'date', 'time', 'zittingId', 'partySize', 'name', 'email', 'telefoon', 'dieetwensen', 'gelegenheid', 'privacyAccepted', 'website', 'reservationNumber', 'token', 'reason');
        // Vrije-vorm ID's (van Connect zelf, of door de bezoeker onbewust bewerkt): ruim genoeg
        // voor een echte waarde, klein genoeg om geen onnodig grote payloads door te laten.
        $id_max_length = 200;
        $out = array();
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $input)) {
                continue;
            }
            if ($key === 'partySize') {
                // Server-side geclampt: de browser mag nooit zelf een (onzinnig groot) aantal
                // personen doordrukken. De echte, geldende grenzen per locatie bepaalt Connect.
                $out[$key] = max(1, min(50, absint($input[$key])));
            } elseif ($key === 'privacyAccepted') {
                $out[$key] = rest_sanitize_boolean($input[$key]);
            } elseif ($key === 'email') {
                $email = sanitize_email($input[$key]);
                $out[$key] = is_email($email) ? $email : '';
            } elseif ($key === 'date') {
                $out[$key] = (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $input[$key]) ? $input[$key] : '';
            } elseif ($key === 'time') {
                $out[$key] = (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $input[$key]) ? $input[$key] : '';
            } elseif (in_array($key, array('zittingId', 'reservationNumber', 'token'), true)) {
                $out[$key] = substr(sanitize_text_field((string) $input[$key]), 0, $id_max_length);
            } elseif (in_array($key, array('dieetwensen', 'gelegenheid', 'reason'), true)) {
                $out[$key] = sanitize_textarea_field($input[$key]);
            } else {
                $out[$key] = sanitize_text_field($input[$key]);
            }
        }
        if (isset($input['antwoorden']) && is_array($input['antwoorden'])) {
            $answers = array();
            $i = 0;
            foreach ($input['antwoorden'] as $key => $value) {
                if (++$i > 20) {
                    break;
                }
                $safe_key = preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $key));
                if ($safe_key === '') {
                    continue;
                }
                $answers[$safe_key] = is_bool($value) ? $value : substr(sanitize_textarea_field((string) $value), 0, 2000);
            }
            $out['antwoorden'] = $answers;
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
        $submitted_locations = isset($raw['locations']) && is_array($raw['locations']) ? $raw['locations'] : array();
        $seen = array();
        foreach ($submitted_locations as $location) {
            if (!is_array($location)) {
                continue;
            }
            $slug = sanitize_title($location['slug'] ?? $location['code'] ?? '');
            if ($slug === '') {
                continue;
            }
            if (isset($seen[$slug])) {
                wp_safe_redirect(add_query_arg('restaurant_error', 'duplicate', admin_url('options-general.php?page=hgc-calculator')) . '#hgc-restaurant');
                exit;
            }
            $seen[$slug] = true;
        }
        $locations = self::sanitize_locations($raw['locations'] ?? array());
        $park = sanitize_title($raw['park'] ?? '');
        if ($park === '' || !isset($locations[$park])) {
            $park = (string) array_key_first($locations);
        }
        $legacy = $locations[$park] ?? array('park_logo' => '', 'phone' => '', 'address' => '', 'hours_note' => '');
        // Alle communicatie met Connect moet via HTTPS; een http(s)-onveilige URL wordt genegeerd
        // in plaats van opgeslagen, zodat reserveringsgegevens nooit onversleuteld verstuurd worden.
        $api_url = esc_url_raw($raw['api_url'] ?? '');
        if ($api_url !== '' && stripos($api_url, 'https://') !== 0) {
            $api_url = '';
        }
        update_option(self::OPTION, array(
            'api_url' => $api_url,
            'park' => $park,
            'event' => sanitize_title($raw['event'] ?? ''),
            'accent' => sanitize_hex_color($raw['accent'] ?? '') ?: '#95c11f',
            'privacy_url' => esc_url_raw($raw['privacy_url'] ?? ''),
            'club_logo' => esc_url_raw($raw['club_logo'] ?? ''),
            // Legacy-spiegels houden oudere code/pluginversies functioneel.
            'park_logo' => $legacy['park_logo'],
            'phone' => $legacy['phone'],
            'address' => $legacy['address'],
            'hours_note' => $legacy['hours_note'],
            'locations' => array_values($locations),
        ), false);

        wp_safe_redirect(add_query_arg('restaurant_updated', '1', admin_url('options-general.php?page=hgc-calculator')) . '#hgc-restaurant');
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
        <section class="hgc-admin-panel" id="hgc-restaurant" data-hgc-restaurant-section>
            <h2>Restaurant reserveren</h2>
            <p class="hgc-admin-hint">Koppelt aan de reserveringsfunctie van HGC Connect. De plugin bewaart zelf geen reserveringen; alle data en capaciteitsregels blijven centraal in Connect.</p>
            <?php if (isset($_GET['restaurant_updated'])) : ?>
                <div class="notice notice-success is-dismissible"><p>De restaurantinstellingen zijn opgeslagen.</p></div>
            <?php endif; ?>
            <?php if (($_GET['restaurant_error'] ?? '') === 'duplicate') : ?>
                <div class="notice notice-error"><p>Elke restaurantlocatie moet een unieke parkcode hebben. Er is niets opgeslagen.</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="hgc_restaurant_save" />
                <?php wp_nonce_field('hgc_restaurant_save'); ?>
                <div class="hgc-admin-grid hgc-admin-grid--two">
                    <label class="hgc-admin-field"><span>Connect API-URL</span><input class="large-text code" type="url" name="restaurant[api_url]" value="<?php echo esc_attr($s['api_url']); ?>" required /></label>
                    <label class="hgc-admin-field"><span>Standaard restaurant</span><select name="restaurant[park]" data-hgc-restaurant-default>
                        <option value="">Eerste restaurant in de lijst</option>
                        <?php foreach ($s['locations'] as $location) : ?>
                            <option value="<?php echo esc_attr($location['slug']); ?>" <?php selected($s['park'], $location['slug']); ?>><?php echo esc_html($location['name']); ?> (<?php echo esc_html($location['slug']); ?>)</option>
                        <?php endforeach; ?>
                    </select></label>
                    <label class="hgc-admin-field"><span>Standaard evenementcode</span><input type="text" name="restaurant[event]" value="<?php echo esc_attr($s['event']); ?>" placeholder="wildavond-2026" /></label>
                    <label class="hgc-admin-field"><span>Accentkleur</span><input type="color" name="restaurant[accent]" value="<?php echo esc_attr($s['accent']); ?>" /></label>
                    <label class="hgc-admin-field"><span>Privacyverklaring</span><input class="large-text" type="url" name="restaurant[privacy_url]" value="<?php echo esc_attr($s['privacy_url']); ?>" /></label>
                    <label class="hgc-admin-field"><span>Clublogo (afbeeldings-URL)</span><input class="large-text code" type="url" name="restaurant[club_logo]" value="<?php echo esc_attr($s['club_logo']); ?>" placeholder="https://.../hgc-logo.png" /></label>
                </div>
                <p class="hgc-admin-hint">De publieke URL van de Base44-functie <code>restaurantApi</code> (gebruikt voor zowel tafelreserveringen als event-aanmeldingen).</p>
                <p class="hgc-admin-hint">De plugin stuurt elke 5 minuten automatisch een klein, gratis verzoek naar deze koppeling om de functie "warm" te houden, zodat bezoekers niet hoeven te wachten op een koude start.</p>
                <p class="hgc-admin-hint">Gebruik <code>[hgc_restaurant_reserveren park="almkreek"]</code> of het blok "HGC Restaurant Reserveren" voor tafelreserveringen, en <code>[hgc_event_aanmelden event="wildavond-2026"]</code> of het blok "HGC Event Aanmelden" voor een evenement (bv. een wildavond). Het evenement, de zittingen en eventuele aanvullende vragen op het formulier stel je samen in Connect.</p>
                <h3 style="margin:24px 0 8px">Boekingsschermen per restaurant</h3>
                <p class="hgc-admin-hint">Iedere locatie krijgt een eigen parkcode, naam, logo en contactgegevens. De algemene API, accentkleur, privacyverklaring en het clublogo gelden voor alle locaties.</p>
                <div class="hgc-admin-heading hgc-restaurant-heading">
                    <div><h3>Restaurants en banen</h3><p class="hgc-admin-hint">Voeg zoveel locaties toe als nodig. De parkcode moet exact overeenkomen met de slug in HGC Connect.</p></div>
                    <button type="button" class="button button-secondary" data-hgc-add-restaurant>Restaurant toevoegen</button>
                </div>
                <div class="hgc-restaurant-toolbar" role="search" aria-label="Restaurantlocaties doorzoeken">
                    <label class="hgc-course-search"><span class="screen-reader-text">Zoek een restaurantlocatie</span><input type="search" placeholder="Zoek op naam, parkcode of adres…" autocomplete="off" data-hgc-restaurant-search /></label>
                    <div class="hgc-course-toolbar__actions">
                        <button class="button" type="button" data-hgc-expand-restaurants>Alles openen</button>
                        <button class="button" type="button" data-hgc-collapse-restaurants>Alles sluiten</button>
                    </div>
                </div>
                <p class="hgc-course-count" data-hgc-restaurant-count aria-live="polite"><?php echo esc_html(count($s['locations']) . ' locaties ingesteld'); ?></p>
                <div class="hgc-course-list" data-hgc-restaurant-list>
                    <?php foreach (array_values($s['locations']) as $index => $location) : ?>
                        <?php $this->render_location_fields($location, (string) $index); ?>
                    <?php endforeach; ?>
                </div>
                <template data-hgc-restaurant-template><?php $this->render_location_fields(array(), '__INDEX__'); ?></template>
                <p class="hgc-admin-hint">Gebruik een afbeelding die al op de juiste grootte staat (bijv. via de mediabibliotheek geüpload en daar de URL van gekopieerd) — de plugin schaalt zelf niet.</p>
                <div class="hgc-admin-actions">
                    <?php submit_button('Restaurantinstellingen opslaan', 'primary', 'submit', false); ?>
                </div>
            </form>
        </section>
        <?php
    }

    private function render_location_fields(array $location, string $index): void
    {
        $location = wp_parse_args($location, array('slug' => '', 'name' => '', 'park_logo' => '', 'phone' => '', 'address' => '', 'hours_note' => ''));
        $base = 'restaurant[locations][' . $index . ']';
        ?>
        <article class="hgc-course-card" data-hgc-restaurant-row>
            <div class="hgc-course-card__header">
                <button class="hgc-course-card__toggle" type="button" data-hgc-toggle-restaurant aria-expanded="true">
                    <span class="hgc-course-card__chevron" aria-hidden="true"></span>
                    <span class="hgc-course-card__title"><strong data-hgc-location-title><?php echo esc_html($location['name'] ?: 'Nieuw restaurant'); ?></strong><small data-hgc-location-summary><?php echo esc_html(implode(' · ', array_filter(array($location['slug'], $location['address'])))); ?></small></span>
                </button>
                <button type="button" class="button-link-delete" data-hgc-remove-restaurant>Verwijderen</button>
            </div>
            <div class="hgc-course-card__body">
                <div class="hgc-admin-grid hgc-admin-grid--two">
                    <label class="hgc-admin-field"><span>Parkcode / slug</span><input type="text" name="<?php echo esc_attr($base); ?>[slug]" value="<?php echo esc_attr($location['slug']); ?>" placeholder="almkreek" data-hgc-location-slug required /></label>
                    <label class="hgc-admin-field"><span>Naam</span><input type="text" name="<?php echo esc_attr($base); ?>[name]" value="<?php echo esc_attr($location['name']); ?>" placeholder="Golfpark Almkreek" data-hgc-location-name required /></label>
                    <label class="hgc-admin-field"><span>Parklogo (afbeeldings-URL)</span><input class="large-text code" type="url" name="<?php echo esc_attr($base); ?>[park_logo]" value="<?php echo esc_attr($location['park_logo']); ?>" placeholder="https://.../parklogo.png" /></label>
                    <label class="hgc-admin-field"><span>Telefoonnummer</span><input type="text" name="<?php echo esc_attr($base); ?>[phone]" value="<?php echo esc_attr($location['phone']); ?>" placeholder="0183 40 30 30" /></label>
                    <label class="hgc-admin-field"><span>Adres</span><input type="text" name="<?php echo esc_attr($base); ?>[address]" value="<?php echo esc_attr($location['address']); ?>" placeholder="Almweg 2, Almkerk" /></label>
                    <label class="hgc-admin-field"><span>Openingstijden (vrije tekst)</span><input type="text" name="<?php echo esc_attr($base); ?>[hours_note]" value="<?php echo esc_attr($location['hours_note']); ?>" placeholder="Keuken open van 12:00 tot 21:00" /></label>
                </div>
            </div>
        </article>
        <?php
    }
}
