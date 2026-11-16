<?php

defined('ABSPATH') || exit;

/**
 * Advies per mail. De bezoeker laat het advies uit de keuzehulp naar zijn
 * e-mailadres sturen, en kan met een apart vinkje (standaard uit) kiezen voor
 * opvolgmails. WordPress verstuurt zelf niets: deze klasse stuurt de aanvraag
 * naar HGC Connect (functie keuzehulpAdvies, Marketing › Keuzehulp). Connect
 * bewaart de aanvraag, bepaalt het moment van elke mail en meldt de bezoeker
 * daarvoor aan op de juiste Laposta-lijst. De teksten van de mails staan in
 * Laposta.
 *
 * Het advies in de mail bouwt deze klasse zelf op uit de prijzen van de
 * plugin. De browser stuurt alleen de invoer en welk speelrecht (soort en
 * aantal credits) het advies was; zo kan niemand via dit formulier eigen tekst
 * laten mailen.
 */
final class HGC_Advies_Mail
{
    private const OPTION = 'hgc_advies_mail_settings';
    private const QUEUE_OPTION = 'hgc_advies_mail_wachtrij';
    private const RETRY_HOOK = 'hgc_advies_mail_opnieuw';
    private const KEY_HEADER = 'x-hgc-keuzehulp-key';
    private const MAX_BODY_BYTES = 8000;
    private const MAX_TRIES = 5;
    private const MAX_QUEUE = 200;
    private const TRACK_COOKIE = 'hgc_kh';
    private const TRACK_DAYS = 60;

    public function __construct()
    {
        add_action('wp_ajax_hgc_advies_mail', array($this, 'ajax'));
        add_action('wp_ajax_nopriv_hgc_advies_mail', array($this, 'ajax'));
        add_action('admin_post_hgc_advies_mail_save', array($this, 'save'));
        add_action('admin_post_hgc_advies_mail_test', array($this, 'test'));
        add_action(self::RETRY_HOOK, array($this, 'retry_queue'));
        add_action('wp_ajax_hgc_advies_gedrag', array($this, 'ajax_behaviour'));
        add_action('wp_ajax_nopriv_hgc_advies_gedrag', array($this, 'ajax_behaviour'));
        add_action('wp_footer', array($this, 'print_tracker'), 50);
    }

    public static function defaults(): array
    {
        return array(
            'actief' => false,
            'connect_url' => '',
            'sleutel' => '',
            'privacy_url' => '',
            'titel' => 'Ontvang dit advies in je mail',
            'intro' => 'Handig om het rustig na te lezen of te bespreken. Je krijgt een link waarmee je dit advies later weer opent.',
            'vinkje' => 'Ik ontvang graag meer informatie, en blijf op de hoogte van het laatste nieuws.',
            'knop' => 'Mail mijn advies',
            'bedankt' => 'Gelukt! Je advies is onderweg naar je mailbox.',
        );
    }

    public static function settings(): array
    {
        $saved = get_option(self::OPTION, array());
        return wp_parse_args(is_array($saved) ? $saved : array(), self::defaults());
    }

    public static function is_ready(): bool
    {
        $s = self::settings();
        return !empty($s['actief']) && $s['connect_url'] !== '' && $s['sleutel'] !== '';
    }

    /**
     * Wat de keuzehulp in de browser nodig heeft. null = het formulier niet tonen.
     */
    public static function front_config(): ?array
    {
        if (!self::is_ready()) {
            return null;
        }
        $s = self::settings();
        $privacy = $s['privacy_url'];
        if ($privacy === '' && class_exists('HGC_Restaurant') && method_exists('HGC_Restaurant', 'settings')) {
            $privacy = (string) (HGC_Restaurant::settings()['privacy_url'] ?? '');
        }
        return array(
            'ajaxUrl' => admin_url('admin-ajax.php?action=hgc_advies_mail'),
            'privacyUrl' => esc_url_raw($privacy),
            'titel' => $s['titel'],
            'intro' => $s['intro'],
            'vinkje' => $s['vinkje'],
            'knop' => $s['knop'],
            'bedankt' => $s['bedankt'],
        );
    }

    // ------------------------------------------------------------------ aanvraag

    public function ajax(): void
    {
        if (!self::is_ready()) {
            wp_send_json_error(array('message' => 'Advies per mail is nu niet beschikbaar.'), 503);
        }

        // Geen nonce: de keuzehulp staat op pagina's die gecachet kunnen zijn, en
        // een verlopen nonce zou het formulier dan stilletjes breken. In plaats
        // daarvan: alleen verzoeken vanaf deze site, een honeypot en limieten.
        if (!self::same_origin()) {
            wp_send_json_error(array('message' => 'Aanvraag kon niet worden verwerkt.'), 403);
        }

        $ip = sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'] ?? ''));
        if (self::is_rate_limited('ip:' . $ip, 10, 10 * MINUTE_IN_SECONDS)) {
            wp_send_json_error(array('message' => 'Te veel aanvragen. Probeer het over een paar minuten opnieuw.'), 429);
        }

        $raw_body = (string) file_get_contents('php://input');
        if ($raw_body === '' || strlen($raw_body) > self::MAX_BODY_BYTES) {
            wp_send_json_error(array('message' => 'Aanvraag kon niet worden verwerkt.'), 400);
        }
        $input = json_decode($raw_body, true);
        if (!is_array($input)) {
            wp_send_json_error(array('message' => 'Aanvraag kon niet worden verwerkt.'), 400);
        }

        // Honeypot: onzichtbaar voor mensen.
        if (!empty($input['website'])) {
            wp_send_json_success(array('message' => self::settings()['bedankt']));
        }

        $email = sanitize_email((string) ($input['email'] ?? ''));
        if ($email === '' || !is_email($email)) {
            wp_send_json_error(array('message' => 'Vul een geldig e-mailadres in.', 'field' => 'email'), 400);
        }
        if (self::is_rate_limited('email:' . strtolower($email), 3, HOUR_IN_SECONDS)) {
            wp_send_json_error(array('message' => 'Je hebt dit advies net al aangevraagd. Kijk ook even in je map met ongewenste mail.'), 429);
        }

        $payload = self::build_payload($input, $email, $ip);
        if (is_wp_error($payload)) {
            wp_send_json_error(array('message' => $payload->get_error_message()), 400);
        }

        $result = self::send($payload);
        $answer = array('message' => self::settings()['bedankt'], 'volgToken' => $payload['volgToken'], 'volgDagen' => self::TRACK_DAYS);
        if ($result === 'ok') {
            wp_send_json_success($answer);
        }
        if ($result === 'later') {
            // Connect is even niet bereikbaar: bewaren en later opnieuw proberen.
            self::enqueue($payload);
            wp_send_json_success($answer);
        }
        wp_send_json_error(array('message' => 'Versturen lukte niet. Probeer het later nog eens.'), 502);
    }

    /**
     * Zet de invoer uit de browser om naar het bericht voor Connect. Alles wat
     * in de mail komt, komt uit de configuratie van de plugin.
     *
     * @return array|WP_Error
     */
    public static function build_payload(array $input, string $email, string $ip)
    {
        $config = hgc_calculator_config();
        $courses = array();
        foreach (($config['courses'] ?? array()) as $course) {
            $courses[(string) ($course['id'] ?? '')] = $course;
        }

        $invoer = is_array($input['invoer'] ?? null) ? $input['invoer'] : array();
        $large = max(0, min(400, (int) ($invoer['l'] ?? 0)));
        $small = max(0, min(400, (int) ($invoer['s'] ?? 0)));
        if ($large + $small < 1) {
            return new WP_Error('invoer', 'Er is nog geen advies om te versturen.');
        }
        $large_id = sanitize_title((string) ($invoer['lc'] ?? ''));
        $small_id = sanitize_title((string) ($invoer['sc'] ?? ''));
        if (($large > 0 && !isset($courses[$large_id])) || ($small > 0 && !isset($courses[$small_id]))) {
            return new WP_Error('invoer', 'Deze golfbaan kennen we niet.');
        }
        $youth = !empty($invoer['y']);
        $off_peak = !empty($invoer['op']);

        $plans = is_array($input['plannen'] ?? null) ? array_slice($input['plannen'], 0, 3) : array();
        $described = array();
        foreach ($plans as $plan) {
            if (!is_array($plan)) {
                continue;
            }
            $line = self::describe_plan($config, $plan, $youth);
            if ($line) {
                $described[] = $line;
            }
        }
        if (!$described) {
            return new WP_Error('advies', 'Dit advies kunnen we niet versturen. Probeer het opnieuw.');
        }
        $best = $described[0];
        $alternative = $described[1] ?? null;

        $page_url = self::own_url((string) ($input['paginaUrl'] ?? ''));
        $query = array(
            'hgc_l' => $large,
            'hgc_s' => $small,
            'hgc_lc' => $large > 0 ? $large_id : null,
            'hgc_sc' => $small > 0 ? $small_id : null,
            'hgc_y' => $youth ? 1 : null,
            'hgc_op' => $off_peak ? 1 : null,
            'utm_source' => 'laposta',
            'utm_medium' => 'email',
            'utm_campaign' => 'keuzehulp-advies',
        );
        $link_advies = add_query_arg(array_filter($query, static fn($value) => $value !== null), $page_url) . '#calculator';
        $webshop = (string) ($config['links']['webshop'] ?? home_url('/webshop/'));
        $link_webshop = add_query_arg(array('utm_source' => 'laposta', 'utm_medium' => 'email', 'utm_campaign' => 'keuzehulp-advies'), $webshop);

        $opgave = array();
        if ($large > 0) {
            $opgave[] = sprintf('%d %s op %s (grote baan)', $large, $large === 1 ? 'ronde' : 'rondes', $courses[$large_id]['name'] ?? $large_id);
        }
        if ($small > 0) {
            $opgave[] = sprintf('%d %s op %s (kleine baan)', $small, $small === 1 ? 'ronde' : 'rondes', $courses[$small_id]['name'] ?? $small_id);
        }
        $opgave[] = $youth ? 'jeugd' : 'volwassene';
        if ($off_peak) {
            $opgave[] = 'speelt vooral in de daluren';
        }

        $voornaam = mb_substr(sanitize_text_field((string) ($input['voornaam'] ?? '')), 0, 60);
        $opvolging = !empty($input['opvolgToestemming']);
        // Alleen met toestemming voor opvolgmails: een willekeurige volgcode,
        // waarmee de bekeken pagina's daarna bij deze aanvraag in Connect komen.
        // Hij gaat ook mee in de links in de mail, zodat het volgen ook werkt
        // als iemand de mail op een ander apparaat opent.
        $volg_token = $opvolging ? bin2hex(random_bytes(16)) : '';
        if ($volg_token !== '') {
            $link_advies = str_replace('#calculator', '', add_query_arg(self::TRACK_COOKIE, $volg_token, str_replace('#calculator', '', $link_advies))) . '#calculator';
            $link_webshop = add_query_arg(self::TRACK_COOKIE, $volg_token, $link_webshop);
        }

        return array(
            'actie' => 'aanvraag',
            'aanvraagId' => wp_generate_uuid4(),
            'email' => $email,
            'voornaam' => $voornaam,
            'opvolgToestemming' => $opvolging,
            'toestemmingTekst' => $opvolging ? self::settings()['vinkje'] : '',
            'volgToken' => $volg_token,
            'ip' => $ip,
            'paginaUrl' => $page_url,
            'linkAdvies' => $link_advies,
            'linkWebshop' => $link_webshop,
            'invoer' => array(
                'grootRondes' => $large,
                'kleinRondes' => $small,
                'grootBaan' => $large > 0 ? (string) ($courses[$large_id]['name'] ?? '') : '',
                'kleinBaan' => $small > 0 ? (string) ($courses[$small_id]['name'] ?? '') : '',
                'jeugd' => $youth,
                'daluren' => $off_peak,
            ),
            'advies' => array(
                'titel' => $best['naam'],
                'prijs' => $best['prijs'],
                'toelichting' => $best['toelichting'],
                'alternatief' => $alternative ? sprintf('%s (%s)', $alternative['naam'], $alternative['prijs']) : '',
                'opgave' => ucfirst(implode(', ', $opgave)),
            ),
        );
    }

    /**
     * Naam, prijs en toelichting van één speelrecht uit het advies, op basis van
     * de soort (family) en het aantal credits. Onbekend = null.
     */
    public static function describe_plan(array $config, array $plan, bool $youth): ?array
    {
        $family = (string) ($plan['family'] ?? '');
        $credits = (int) ($plan['credits'] ?? 0);
        $repeat = max(1, min(20, (int) ($plan['repeat'] ?? 1)));
        $green_fee_rounds = max(0, min(400, (int) ($plan['greenFeeRounds'] ?? 0)));
        $covers = !empty($plan['covers']);
        $unit = 'credits';

        if ($family === 'handicap' || $family === 'loyaltee') {
            $registration = $config['handicapRegistration'] ?? array();
            if ($family === 'handicap') {
                $name = 'Hollandsche Golfclub Handicapregistratie';
                $price = (float) ($youth ? ($registration['youthPrice'] ?? 0) : ($registration['adultPrice'] ?? 0));
                $explain = $youth ? 'Je rondes reken je per ronde af tegen het jeugdgreenfeetarief.' : 'Je rondes reken je per ronde af tegen het greenfeetarief.';
            } else {
                if ($youth || empty($config['loyalTee'])) {
                    return null;
                }
                $name = (string) ($config['loyalTee']['name'] ?? 'Hollandsche Golfclub LoyalTee');
                $price = (float) ($config['loyalTee']['membershipPrice'] ?? 0);
                $explain = 'Je rondes reken je per ronde af tegen het gereduceerde greenfeetarief.';
            }
            return array('naam' => $name, 'prijs' => self::euro($price) . ' per jaar', 'toelichting' => $explain);
        }

        $packages = null;
        $product = '';
        if (preg_match('/^local:([a-z0-9-]+)(:offpeak)?$/', $family, $match)) {
            $local = $config['localPackages'][$match[1]] ?? null;
            if (!$local || $youth) {
                return null;
            }
            $off_peak = !empty($match[2]);
            $packages = $off_peak ? ($local['offPeak'] ?? array()) : ($local['packages'] ?? array());
            $product = (string) ($local['name'] ?? 'Lokaal speelrecht') . ($off_peak ? ' daluren' : '');
            $unit = 'rondes';
        } else {
            $map = array(
                'standard' => array('standardPackages', 'Hollandsche Golfclub Speelrecht'),
                'offpeak' => array('offPeakPackages', 'Hollandsche Golfclub Daluren-speelrecht'),
                'youth' => array('youthPackages', 'Hollandsche Golfclub Jeugd-speelrecht'),
                'shortgolf' => array('shortGolfPackages', 'Hollandsche Golfclub Shortgolf-speelrecht'),
            );
            if (!isset($map[$family]) || ($youth && $family !== 'youth') || (!$youth && $family === 'youth')) {
                return null;
            }
            $packages = $config[$map[$family][0]] ?? array();
            $product = $map[$family][1];
        }

        $package = null;
        foreach ((array) $packages as $item) {
            if ((int) ($item['credits'] ?? 0) === $credits && $credits > 0) {
                $package = $item;
                break;
            }
        }
        if (!$package) {
            return null;
        }
        $amount = sprintf('%d %s', $credits, $unit);
        $name = !empty($package['name']) ? (string) $package['name'] : sprintf('%s – %s', $product, $amount);

        $explain = array();
        if ($covers) {
            $explain[] = 'Dit speelrecht dekt al je opgegeven rondes.';
        }
        if ($repeat > 1) {
            $explain[] = sprintf('Je koopt dit speelrecht naar verwachting %d keer: zodra je %s op zijn, koop je opnieuw.', $repeat, $unit);
        }
        if ($green_fee_rounds > 0) {
            $explain[] = sprintf('Daarnaast speel je ongeveer %d %s los tegen het %s.', $green_fee_rounds, $green_fee_rounds === 1 ? 'ronde' : 'rondes', $youth ? 'jeugdgreenfeetarief' : 'gereduceerde greenfeetarief');
        }
        if (!$covers && $repeat === 1 && $green_fee_rounds === 0) {
            $explain[] = 'Als je speelrecht op is, kun je altijd een nieuw speelrecht afnemen of rondes los afrekenen met een greenfee (gereduceerd bedrag).';
        }

        return array(
            'naam' => $name,
            'prijs' => self::euro((float) ($package['price'] ?? 0)) . ' per golfjaar',
            'toelichting' => implode(' ', $explain),
        );
    }

    private static function euro(float $amount): string
    {
        return '€ ' . number_format($amount, 2, ',', '.');
    }

    /**
     * Alleen een adres op deze site komt als link in de mail; anders de voorpagina.
     */
    private static function own_url(string $url): string
    {
        $url = esc_url_raw($url, array('https', 'http'));
        $home = wp_parse_url(home_url('/'));
        $parts = $url !== '' ? wp_parse_url($url) : false;
        if (!$parts || empty($parts['host']) || strtolower($parts['host']) !== strtolower((string) ($home['host'] ?? ''))) {
            return home_url('/');
        }
        $clean = ($parts['scheme'] ?? 'https') . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '') . ($parts['path'] ?? '/');
        return $clean;
    }

    private static function same_origin(): bool
    {
        $source = (string) ($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
        if ($source === '') {
            return false;
        }
        $host = wp_parse_url($source, PHP_URL_HOST);
        $home = wp_parse_url(home_url('/'), PHP_URL_HOST);
        return is_string($host) && is_string($home) && strtolower($host) === strtolower($home);
    }

    private static function is_rate_limited(string $key, int $limit, int $window): bool
    {
        $bucket = 'hgc_am_' . md5($key . '|' . $window . '|' . (int) floor(time() / $window));
        $count = (int) get_transient($bucket);
        if ($count >= $limit) {
            return true;
        }
        set_transient($bucket, $count + 1, $window + 5);
        return false;
    }

    // ------------------------------------------------------------------ gedrag

    /**
     * Klein script op elke pagina. Doet alleen iets bij wie een volgcode heeft
     * (cookie, of de code uit een link in de mail): dan meldt het de bekeken
     * pagina, zodat Connect de opvolgmail kan afstemmen op wat iemand bekeek.
     * Zonder vinkje voor opvolgmails is er geen volgcode en gebeurt er niets.
     */
    public function print_tracker(): void
    {
        if (is_admin() || !self::is_ready() || wp_doing_ajax()) {
            return;
        }
        $config = array(
            'url' => admin_url('admin-ajax.php?action=hgc_advies_gedrag'),
            'cookie' => self::TRACK_COOKIE,
            'dagen' => self::TRACK_DAYS,
        );
        ?>
<script id="hgc-advies-volgen">
(function (c) {
  try {
    var re = /^[a-f0-9]{32}$/, p = new URLSearchParams(location.search), t = p.get(c.cookie);
    if (t === "uit") { document.cookie = c.cookie + "=; Max-Age=0; path=/; SameSite=Lax"; return; }
    if (t && re.test(t)) {
      document.cookie = c.cookie + "=" + t + "; Max-Age=" + (c.dagen * 86400) + "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
      // De code uit de adresbalk halen: wie de link deelt, deelt dan niet zijn volgcode.
      if (history.replaceState) { p.delete(c.cookie); var q = p.toString(); history.replaceState(history.state, "", location.pathname + (q ? "?" + q : "") + location.hash); }
    } else {
      var m = document.cookie.match(new RegExp("(?:^|; )" + c.cookie + "=([a-f0-9]{32})"));
      t = m ? m[1] : "";
    }
    if (!t || p.has("hgc-audit")) return;
    var body = JSON.stringify({ t: t, url: location.href.split("#")[0], titel: document.title.slice(0, 200) });
    if (navigator.sendBeacon) navigator.sendBeacon(c.url, new Blob([body], { type: "text/plain" }));
    else fetch(c.url, { method: "POST", body: body, keepalive: true, credentials: "same-origin" });
  } catch (e) {}
})(<?php echo wp_json_encode($config, JSON_UNESCAPED_SLASHES); ?>);
</script>
        <?php
    }

    public function ajax_behaviour(): void
    {
        if (!self::is_ready() || !self::same_origin()) {
            status_header(204);
            exit;
        }
        $raw_body = (string) file_get_contents('php://input');
        $input = strlen($raw_body) <= 2000 ? json_decode($raw_body, true) : null;
        $token = is_array($input) ? (string) ($input['t'] ?? '') : '';
        $url = is_array($input) ? self::page_url((string) ($input['url'] ?? '')) : '';
        $ip = sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'] ?? ''));
        if (!preg_match('/^[a-f0-9]{32}$/', $token) || $url === ''
            || self::is_rate_limited('gedrag:' . $token, 60, HOUR_IN_SECONDS)
            || self::is_rate_limited('gedrag-ip:' . $ip, 120, 10 * MINUTE_IN_SECONDS)) {
            status_header(204);
            exit;
        }
        $s = self::settings();
        // Niet blokkerend: de bezoeker wacht hier niet op Connect.
        wp_remote_post($s['connect_url'], array(
            'timeout' => 3,
            'blocking' => false,
            'headers' => array('Content-Type' => 'application/json', self::KEY_HEADER => $s['sleutel']),
            'body' => wp_json_encode(array(
                'actie' => 'gedrag',
                'volgToken' => $token,
                'events' => array(array(
                    'url' => $url,
                    'titel' => mb_substr(sanitize_text_field((string) ($input['titel'] ?? '')), 0, 200),
                    'op' => gmdate('Y-m-d\TH:i:s\Z'),
                )),
            )),
        ));
        status_header(204);
        exit;
    }

    /**
     * Een bekeken pagina op deze site, zonder volgcode, UTM- of andere
     * campagneparameters. Andere sites = leeg.
     */
    private static function page_url(string $url): string
    {
        $parts = wp_parse_url(esc_url_raw($url, array('https', 'http')));
        $home = wp_parse_url(home_url('/'), PHP_URL_HOST);
        if (!$parts || empty($parts['host']) || !is_string($home) || strtolower($parts['host']) !== strtolower($home)) {
            return '';
        }
        $query = array();
        if (!empty($parts['query'])) {
            parse_str($parts['query'], $query);
            $query = array_filter($query, static fn($key) => !preg_match('/^(utm_|hgc_|fbclid|gclid|mc_)/', (string) $key), ARRAY_FILTER_USE_KEY);
        }
        $clean = ($parts['scheme'] ?? 'https') . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '') . ($parts['path'] ?? '/');
        return $query ? add_query_arg($query, $clean) : $clean;
    }

    // ------------------------------------------------------------------ Connect

    /**
     * @return string 'ok', 'later' (tijdelijk niet gelukt) of 'fout'
     */
    public static function send(array $payload): string
    {
        $s = self::settings();
        if ($s['connect_url'] === '' || $s['sleutel'] === '') {
            return 'later';
        }
        $response = wp_remote_post($s['connect_url'], array(
            'timeout' => 12,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                self::KEY_HEADER => $s['sleutel'],
            ),
            'body' => wp_json_encode($payload),
        ));
        if (is_wp_error($response)) {
            self::log('Connect niet bereikbaar: ' . $response->get_error_message());
            return 'later';
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code >= 200 && $code < 300) {
            return 'ok';
        }
        self::log(sprintf('Connect antwoordde %d: %s', $code, mb_substr((string) wp_remote_retrieve_body($response), 0, 300)));
        // 429, 503 en andere serverfouten zijn tijdelijk; 400/401/403 niet.
        return ($code === 429 || $code >= 500) ? 'later' : 'fout';
    }

    private static function enqueue(array $payload): void
    {
        $queue = get_option(self::QUEUE_OPTION, array());
        $queue = is_array($queue) ? $queue : array();
        if (count($queue) >= self::MAX_QUEUE) {
            self::log('Wachtrij vol; aanvraag niet bewaard.');
            return;
        }
        $queue[] = array('payload' => $payload, 'pogingen' => 0, 'volgende' => time() + 10 * MINUTE_IN_SECONDS);
        update_option(self::QUEUE_OPTION, $queue, false);
        self::schedule_retry(10 * MINUTE_IN_SECONDS);
    }

    private static function schedule_retry(int $delay): void
    {
        if (!wp_next_scheduled(self::RETRY_HOOK)) {
            wp_schedule_single_event(time() + $delay, self::RETRY_HOOK);
        }
    }

    /**
     * Probeert bewaarde aanvragen opnieuw: na 10 minuten, en daarna steeds
     * langer wachten, maximaal vijf keer. Het e-mailadres staat alleen zo lang
     * in WordPress als nodig.
     */
    public function retry_queue(): void
    {
        $queue = get_option(self::QUEUE_OPTION, array());
        if (!is_array($queue) || !$queue) {
            return;
        }
        $remaining = array();
        foreach ($queue as $item) {
            if (!is_array($item) || !is_array($item['payload'] ?? null)) {
                continue;
            }
            if ((int) ($item['volgende'] ?? 0) > time()) {
                $remaining[] = $item;
                continue;
            }
            $result = self::send($item['payload']);
            if ($result === 'ok') {
                continue;
            }
            $tries = (int) ($item['pogingen'] ?? 0) + 1;
            if ($result === 'fout' || $tries >= self::MAX_TRIES) {
                self::log(sprintf('Aanvraag %s opgegeven na %d pogingen.', $item['payload']['aanvraagId'] ?? '?', $tries));
                continue;
            }
            $item['pogingen'] = $tries;
            $item['volgende'] = time() + (int) (10 * MINUTE_IN_SECONDS * (2 ** $tries));
            $remaining[] = $item;
        }
        update_option(self::QUEUE_OPTION, array_values($remaining), false);
        if ($remaining) {
            $next = min(array_map(static fn($item) => (int) $item['volgende'], $remaining));
            wp_schedule_single_event(max(time() + 60, $next), self::RETRY_HOOK);
        }
    }

    public static function queue_size(): int
    {
        $queue = get_option(self::QUEUE_OPTION, array());
        return is_array($queue) ? count($queue) : 0;
    }

    public static function deactivate_cleanup(): void
    {
        wp_clear_scheduled_hook(self::RETRY_HOOK);
    }

    private static function log(string $message): void
    {
        error_log('[HGC Advies per mail] ' . $message);
    }

    // ------------------------------------------------------------------ beheer

    public function save(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Je hebt geen toestemming om deze instellingen te wijzigen.');
        }
        check_admin_referer('hgc_advies_mail_save');
        $raw = isset($_POST['advies_mail']) && is_array($_POST['advies_mail']) ? wp_unslash($_POST['advies_mail']) : array();
        $current = self::settings();
        $url = esc_url_raw(trim((string) ($raw['connect_url'] ?? '')));
        if ($url !== '' && stripos($url, 'https://') !== 0) {
            $url = '';
        }
        // Een leeg wachtwoordveld laat de bestaande sleutel staan.
        $key = trim((string) ($raw['sleutel'] ?? ''));
        $defaults = self::defaults();
        $text = static fn(string $field) => sanitize_text_field((string) ($raw[$field] ?? '')) ?: $defaults[$field];
        update_option(self::OPTION, array(
            'actief' => !empty($raw['actief']),
            'connect_url' => $url,
            'sleutel' => $key !== '' ? sanitize_text_field($key) : $current['sleutel'],
            'privacy_url' => esc_url_raw((string) ($raw['privacy_url'] ?? '')),
            'titel' => $text('titel'),
            'intro' => sanitize_textarea_field((string) ($raw['intro'] ?? '')) ?: $defaults['intro'],
            'vinkje' => $text('vinkje'),
            'knop' => $text('knop'),
            'bedankt' => $text('bedankt'),
        ), false);
        wp_safe_redirect(add_query_arg('advies_mail', 'opgeslagen', admin_url('options-general.php?page=hgc-calculator')) . '#hgc-advies-mail');
        exit;
    }

    /**
     * Stuurt een testaanvraag naar Connect voor het e-mailadres van de
     * beheerder: 42 rondes op de eerste grote baan, met het advies van de
     * huidige prijzen. Er gaat dus echt een mail via Laposta.
     */
    public function test(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Je hebt geen toestemming om dit te doen.');
        }
        check_admin_referer('hgc_advies_mail_test');
        $config = hgc_calculator_config();
        $course = null;
        foreach (($config['courses'] ?? array()) as $item) {
            if (isset($item['largeRate']) && is_numeric($item['largeRate'])) {
                $course = $item;
                break;
            }
        }
        $user = wp_get_current_user();
        $payload = $course ? self::build_payload(array(
            'voornaam' => $user->first_name ?: $user->display_name,
            'opvolgToestemming' => !empty($_POST['opvolging']),
            'paginaUrl' => home_url('/'),
            'invoer' => array('l' => 42, 's' => 0, 'lc' => $course['id']),
            'plannen' => array(array('family' => 'standard', 'credits' => 60, 'covers' => true)),
        ), (string) $user->user_email, '127.0.0.1') : new WP_Error('test', 'Geen golfbaan gevonden.');
        $result = is_wp_error($payload) ? 'fout' : self::send($payload);
        wp_safe_redirect(add_query_arg('advies_mail', 'test-' . $result, admin_url('options-general.php?page=hgc-calculator')) . '#hgc-advies-mail');
        exit;
    }

    public function render_admin_section(): void
    {
        $s = self::settings();
        $notice = sanitize_key((string) ($_GET['advies_mail'] ?? ''));
        $messages = array(
            'opgeslagen' => array('success', 'De instellingen voor advies per mail zijn opgeslagen.'),
            'test-ok' => array('success', 'Connect heeft de testaanvraag ontvangen. De mail komt via Laposta, als de lijst en automatisering in Laposta klaarstaan.'),
            'test-later' => array('warning', 'Connect is nu niet bereikbaar of de module staat daar nog uit. Controleer de URL, de sleutel en Marketing › Keuzehulp in Connect.'),
            'test-fout' => array('error', 'Connect weigerde de testaanvraag. Controleer de sleutel (moet gelijk zijn aan KEUZEHULP_KEY in Connect).'),
        );
        $queue = self::queue_size();
        ?>
        <section class="hgc-admin-panel" id="hgc-advies-mail">
            <h2>Advies per mail</h2>
            <p class="hgc-admin-hint">Onder het advies kan een bezoeker zijn e-mailadres invullen. De aanvraag gaat naar HGC Connect (Marketing › Keuzehulp). Connect bepaalt wanneer welke mail gaat en verstuurt via Laposta; de teksten van de mails staan in Laposta. Opvolgmails krijgt alleen wie het vinkje daarvoor aanzet.</p>
            <?php if (isset($messages[$notice])) : ?>
                <div class="notice notice-<?php echo esc_attr($messages[$notice][0]); ?> is-dismissible"><p><?php echo esc_html($messages[$notice][1]); ?></p></div>
            <?php endif; ?>
            <?php if ($queue > 0) : ?>
                <div class="notice notice-warning"><p><?php echo esc_html(sprintf('%d aanvra%s wacht%s nog op Connect; de plugin probeert het automatisch opnieuw.', $queue, $queue === 1 ? 'ag' : 'gen', $queue === 1 ? '' : 'en')); ?></p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="hgc_advies_mail_save" />
                <?php wp_nonce_field('hgc_advies_mail_save'); ?>
                <label class="hgc-admin-check"><input type="checkbox" name="advies_mail[actief]" value="1" <?php checked(!empty($s['actief'])); ?> /> Formulier "advies per mail" tonen onder het advies</label>
                <div class="hgc-admin-grid hgc-admin-grid--two">
                    <label class="hgc-admin-field"><span>Connect-functie (URL)</span><input class="large-text code" type="url" name="advies_mail[connect_url]" value="<?php echo esc_attr($s['connect_url']); ?>" placeholder="https://…/functions/keuzehulpAdvies" /></label>
                    <label class="hgc-admin-field"><span>Sleutel (KEUZEHULP_KEY)</span><input class="large-text code" type="password" autocomplete="off" name="advies_mail[sleutel]" value="" placeholder="<?php echo esc_attr($s['sleutel'] !== '' ? 'Ingesteld; laat leeg om te behouden' : 'Nog niet ingesteld'); ?>" /></label>
                    <label class="hgc-admin-field"><span>Privacyverklaring</span><input class="large-text" type="url" name="advies_mail[privacy_url]" value="<?php echo esc_attr($s['privacy_url']); ?>" placeholder="Leeg = die van het restaurantformulier" /></label>
                    <label class="hgc-admin-field"><span>Titel</span><input class="large-text" type="text" name="advies_mail[titel]" value="<?php echo esc_attr($s['titel']); ?>" /></label>
                    <label class="hgc-admin-field"><span>Uitleg</span><textarea rows="3" name="advies_mail[intro]"><?php echo esc_textarea($s['intro']); ?></textarea></label>
                    <label class="hgc-admin-field"><span>Tekst bij het vinkje voor opvolgmails</span><textarea rows="3" name="advies_mail[vinkje]"><?php echo esc_textarea($s['vinkje']); ?></textarea></label>
                    <label class="hgc-admin-field"><span>Knop</span><input class="large-text" type="text" name="advies_mail[knop]" value="<?php echo esc_attr($s['knop']); ?>" /></label>
                    <label class="hgc-admin-field"><span>Melding na versturen</span><input class="large-text" type="text" name="advies_mail[bedankt]" value="<?php echo esc_attr($s['bedankt']); ?>" /></label>
                </div>
                <p class="hgc-admin-hint">De sleutel moet gelijk zijn aan het secret <code>KEUZEHULP_KEY</code> in Connect. De tekst bij het vinkje gaat als bewijs van toestemming mee naar Connect; houd hem eerlijk over wat er komt.</p>
                <div class="hgc-admin-actions">
                    <?php submit_button('Instellingen advies per mail opslaan', 'primary', 'submit', false); ?>
                </div>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="hgc-admin-actions">
                <input type="hidden" name="action" value="hgc_advies_mail_test" />
                <?php wp_nonce_field('hgc_advies_mail_test'); ?>
                <label class="hgc-admin-check"><input type="checkbox" name="opvolging" value="1" /> Ook opvolgmails testen</label>
                <button class="button" type="submit">Testaanvraag naar mijn eigen e-mailadres</button>
            </form>
        </section>
        <?php
    }
}
