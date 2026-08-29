<?php

defined('ABSPATH') || exit;

final class HGC_Calculator_Admin
{
    private const PAGE_SLUG = 'hgc-calculator';
    private const OPTION = 'hgc_calculator_config';

    public function __construct()
    {
        add_action('admin_menu', array($this, 'register_page'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_post_hgc_calculator_save', array($this, 'save'));
        add_action('admin_post_hgc_calculator_reset', array($this, 'reset'));
    }

    public function register_page(): void
    {
        add_options_page(
            'HGC Interne WebsiteTechniek',
            'HGC Interne WebsiteTechniek',
            'manage_options',
            self::PAGE_SLUG,
            array($this, 'render_page')
        );
    }

    public function enqueue_assets(string $hook): void
    {
        if ($hook !== 'settings_page_' . self::PAGE_SLUG) {
            return;
        }

        wp_enqueue_style(
            'hgc-calculator-admin',
            HGC_CALCULATOR_URL . 'admin/admin.css',
            array(),
            (string) filemtime(HGC_CALCULATOR_DIR . 'admin/admin.css')
        );
        wp_enqueue_script(
            'hgc-calculator-admin',
            HGC_CALCULATOR_URL . 'admin/admin.js',
            array(),
            (string) filemtime(HGC_CALCULATOR_DIR . 'admin/admin.js'),
            true
        );
    }

    public function render_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $config = hgc_calculator_config();
        $package_groups = array(
            'standardPackages' => 'Algemene speelrechten',
            'offPeakPackages' => 'Dalurenspeelrechten',
            'youthPackages' => 'Jeugdspeelrechten',
            'shortGolfPackages' => 'Shortgolf-speelrechten',
        );
        ?>
        <div class="wrap hgc-admin">
            <h1>HGC Interne WebsiteTechniek</h1>
            <p class="hgc-admin-intro">Beheer hier de gegevens die de calculator op de website gebruikt. Wijzigingen zijn direct actief na opslaan.</p>
            <nav class="hgc-admin-nav" aria-label="Snel naar instellingengroep">
                <a href="#hgc-general">Algemeen</a>
                <a href="#hgc-memberships">Tarieven</a>
                <a href="#hgc-plugin-updates">Updates</a>
                <a href="#hgc-products">Pakketten</a>
                <a href="#hgc-courses">Golfbanen</a>
                <a href="#hgc-benefits">Voordelen</a>
                <a href="#hgc-restaurant">Restaurant</a>
            </nav>

            <?php if (isset($_GET['updated'])) : ?>
                <div class="notice notice-success is-dismissible"><p>De calculatorinstellingen zijn opgeslagen.</p></div>
            <?php elseif (isset($_GET['reset'])) : ?>
                <div class="notice notice-success is-dismissible"><p>De standaardinstellingen zijn hersteld.</p></div>
            <?php endif; ?>

            <section class="hgc-admin-panel hgc-update-panel" id="hgc-plugin-updates">
                <div class="hgc-admin-heading">
                    <div>
                        <h2>Pluginupdates</h2>
                        <p>Geïnstalleerde versie: <strong><?php echo esc_html(HGC_CALCULATOR_VERSION); ?></strong>. Controleer GitHub direct, zonder op de automatische WordPress-controle te wachten.</p>
                    </div>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <input type="hidden" name="action" value="hgc_calculator_check_updates" />
                        <?php wp_nonce_field('hgc_calculator_check_updates'); ?>
                        <button class="button button-secondary" type="submit">Nu op updates controleren</button>
                    </form>
                </div>
                <?php
                $update_status = sanitize_key($_GET['hgc_update_check'] ?? '');
                $latest_version = sanitize_text_field(wp_unslash($_GET['hgc_latest'] ?? ''));
                ?>
                <?php if ($update_status === 'current') : ?>
                    <div class="notice notice-success inline"><p>Je gebruikt de nieuwste versie<?php echo $latest_version ? ': ' . esc_html($latest_version) : ''; ?>.</p></div>
                <?php elseif ($update_status === 'available') : ?>
                    <?php
                    $plugin_file = plugin_basename(HGC_CALCULATOR_FILE);
                    $upgrade_url = wp_nonce_url(
                        self_admin_url('update.php?action=upgrade-plugin&plugin=' . rawurlencode($plugin_file)),
                        'upgrade-plugin_' . $plugin_file
                    );
                    ?>
                    <div class="notice notice-warning inline"><p>Versie <?php echo esc_html($latest_version); ?> is beschikbaar. <a class="button button-primary" href="<?php echo esc_url($upgrade_url); ?>">Nu bijwerken</a></p></div>
                <?php elseif ($update_status === 'error') : ?>
                    <div class="notice notice-error inline"><p>GitHub kon niet worden gecontroleerd of de release bevat geen geldig pluginbestand. Probeer het later opnieuw.</p></div>
                <?php else : ?>
                    <p class="hgc-admin-hint">WordPress blijft daarnaast automatisch controleren. Deze knop forceert alleen een onmiddellijke extra controle.</p>
                <?php endif; ?>
            </section>

            <section class="hgc-admin-panel">
                <h2>Plaatsen op de website</h2>
                <p>Plaats de gekozen onderdelen met de bijbehorende shortcode, of via het Gutenberg-blok.</p>
                <div class="hgc-admin-grid hgc-admin-grid--two">
                    <article class="hgc-shortcode-card">
                        <h3>Speelrechtkeuzehulp</h3>
                        <p>Adviseert een speelrecht op basis van grote en kleine baanrondes.</p>
                        <code>[hgc_calculator]</code>
                    </article>
                    <article class="hgc-shortcode-card">
                        <h3>Restaurant reserveren</h3>
                        <p>Reserveringsformulier voor het restaurant van het opgegeven park, of het blok “HGC Restaurant Reserveren”.</p>
                        <code>[hgc_restaurant_reserveren park="almkreek"]</code>
                    </article>
                    <article class="hgc-shortcode-card">
                        <h3>Alle restaurantlocaties</h3>
                        <p>Laat bezoekers eerst zoeken en kiezen uit alle ingestelde locaties, of gebruik het blok "HGC Restaurantkiezer".</p>
                        <code>[hgc_restaurant_kiezer]</code>
                    </article>
                </div>
            </section>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="hgc_calculator_save" />
                <?php wp_nonce_field('hgc_calculator_save'); ?>

                <section class="hgc-admin-panel" id="hgc-general">
                    <h2>Algemene instellingen</h2>
                    <div class="hgc-admin-grid hgc-admin-grid--three">
                        <?php $this->number_field('Jaar', 'config[year]', $config['year'] ?? date('Y'), 1); ?>
                    </div>
                </section>

                <section class="hgc-admin-panel">
                    <h2>Speelbeeld en advies</h2>
                    <p class="hgc-admin-hint">De verhouding tussen kleine- en grote-baanrondes bepaalt welk advies de bezoeker ziet. Zit het aandeel kleine-baanrondes op of boven de eerste waarde, dan adviseert de keuzehulp een Shortgolf-speelrecht. Ligt dat aandeel tussen de twee andere waarden, dan is het speelbeeld gemengd en kiest de bezoeker zelf tussen een algemeen speelrecht en een Shortgolf-speelrecht. Daarbuiten adviseert de keuzehulp een algemeen creditspeelrecht.</p>
                    <div class="hgc-admin-grid hgc-admin-grid--three">
                        <?php $this->number_field('Shortgolf-advies vanaf aandeel kleine baan', 'config[settings][shortGolfSharePercent]', $config['settings']['shortGolfSharePercent'] ?? 85, 1, '%'); ?>
                        <?php $this->number_field('Gemengd speelbeeld vanaf', 'config[settings][mixedProfileFromPercent]', $config['settings']['mixedProfileFromPercent'] ?? 40, 1, '%'); ?>
                        <?php $this->number_field('Gemengd speelbeeld tot en met', 'config[settings][mixedProfileToPercent]', $config['settings']['mixedProfileToPercent'] ?? 60, 1, '%'); ?>
                    </div>
                </section>

                <section class="hgc-admin-panel" id="hgc-memberships">
                    <h2>Handicapregistratie en jeugdgreenfee</h2>
                    <div class="hgc-admin-grid hgc-admin-grid--three">
                        <?php $this->number_field('Handicapregistratie volwassenen', 'config[handicapRegistration][adultPrice]', $config['handicapRegistration']['adultPrice'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('Handicapregistratie jeugd', 'config[handicapRegistration][youthPrice]', $config['handicapRegistration']['youthPrice'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('Greenfee jeugd per ronde', 'config[handicapRegistration][youthGreenFee]', $config['handicapRegistration']['youthGreenFee'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('Gratis rondes bij handicapregistratie', 'config[handicapRegistration][vouchers]', $config['handicapRegistration']['vouchers'] ?? 0, 1, 'rondes'); ?>
                    </div>
                    <label class="hgc-admin-check"><input type="checkbox" name="config[settings][includeHandicapByDefault]" value="1" <?php checked(!empty($config['settings']['includeHandicapByDefault'])); ?> /> Handicapregistratie staat standaard in de getoonde bedragen</label>
                    <p class="hgc-admin-hint">Staat dit uit, dan tonen de bedragen alleen de prijs van het speelrecht en kan de bezoeker handicapregistratie in het advies zelf aanvinken. De keuze verandert nooit welk speelrecht wordt geadviseerd, omdat de registratieprijs voor ieder speelrecht gelijk is.</p>

                    <h3>LoyalTee-tarieven</h3>
                    <div class="hgc-admin-grid hgc-admin-grid--three">
                        <?php $this->number_field('LoyalTee-lidmaatschap', 'config[loyalTee][membershipPrice]', $config['loyalTee']['membershipPrice'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('Korting op greenfee', 'config[loyalTee][discountPercentage]', $config['loyalTee']['discountPercentage'] ?? 0, 0.01, '%'); ?>
                        <?php $this->number_field('Ballentegoed', 'config[loyalTee][ballCredit]', $config['loyalTee']['ballCredit'] ?? 0, 0.01, '€'); ?>
                    </div>
                    <p class="hgc-admin-hint">Deze waarden worden direct meegenomen in de financiële vergelijking van LoyalTee met handicapregistratie, losse greenfee en speelrechten.</p>
                </section>

                <section class="hgc-admin-panel">
                    <h2>Links</h2>
                    <div class="hgc-admin-grid hgc-admin-grid--two">
                        <?php foreach (array('webshop' => 'Webshop', 'playingRights' => 'Speelrechten', 'handicapRegistration' => 'Handicapregistratie', 'loyalTee' => 'LoyalTee', 'greenFeePrices' => 'Greenfeeprijzen', 'terms' => 'Voorwaarden') as $key => $label) : ?>
                            <label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><input class="large-text" type="url" name="config[links][<?php echo esc_attr($key); ?>]" value="<?php echo esc_attr($config['links'][$key] ?? ''); ?>" /></label>
                        <?php endforeach; ?>
                    </div>
                </section>

                <div class="hgc-admin-section-heading" id="hgc-products">
                    <h2>Speelrechten en pakketten</h2>
                    <p>Open alleen de pakketgroep die je wilt aanpassen. Aantallen en creditbereik blijven in het overzicht zichtbaar.</p>
                </div>
                <?php foreach ($package_groups as $key => $title) : ?>
                    <?php $this->package_table($key, $title, $config[$key] ?? array()); ?>
                <?php endforeach; ?>

                <section class="hgc-admin-panel" id="hgc-courses">
                    <div class="hgc-admin-heading">
                        <div><h2>Golfbanen en creditwaarden</h2><p>Een lege creditwaarde betekent dat die spelvorm niet beschikbaar is.</p></div>
                        <button class="button button-secondary" type="button" data-add-course>Nieuwe baan toevoegen</button>
                    </div>
                    <div class="hgc-course-toolbar" role="search" aria-label="Golfbanen doorzoeken en filteren">
                        <label class="hgc-course-search">
                            <span class="screen-reader-text">Zoek een golfbaan</span>
                            <input type="search" id="hgc-course-search" placeholder="Zoek op naam, plaats of ID…" autocomplete="off" />
                        </label>
                        <label>
                            <span class="screen-reader-text">Filter op baantype</span>
                            <select id="hgc-course-type-filter">
                                <option value="all">Alle baantypen</option>
                                <option value="large">Grote baan</option>
                                <option value="small">Kleine baan</option>
                                <option value="both">Grote én kleine baan</option>
                            </select>
                        </label>
                        <label>
                            <span class="screen-reader-text">Filter op melding</span>
                            <select id="hgc-course-caveat-filter">
                                <option value="all">Alle meldingen</option>
                                <option value="with">Met melding</option>
                                <option value="without">Zonder melding</option>
                            </select>
                        </label>
                        <div class="hgc-course-toolbar__actions">
                            <button class="button" type="button" data-expand-courses>Alles openen</button>
                            <button class="button" type="button" data-collapse-courses>Alles sluiten</button>
                        </div>
                    </div>
                    <p id="hgc-course-count" class="hgc-course-count" aria-live="polite"></p>
                    <div id="hgc-course-list" class="hgc-course-list">
                        <?php foreach (($config['courses'] ?? array()) as $index => $course) : ?>
                            <?php $this->course_card((string) $index, $course); ?>
                        <?php endforeach; ?>
                    </div>
                    <?php $this->course_template(); ?>
                </section>

                <section class="hgc-admin-panel" id="hgc-benefits">
                    <h2>Voordelen</h2>
                    <p>Zet ieder voordeel op een nieuwe regel.</p>
                    <div class="hgc-admin-grid hgc-admin-grid--two">
                        <?php foreach (array('benefits' => 'Algemene speelrechten', 'shortGolfBenefits' => 'Shortgolf', 'localBenefits' => 'Lokale speelrechten', 'handicapBenefits' => 'Handicapregistratie') as $key => $label) : ?>
                            <label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><textarea rows="6" name="config[<?php echo esc_attr($key); ?>]"><?php echo esc_textarea(implode("\n", $config[$key] ?? array())); ?></textarea></label>
                        <?php endforeach; ?>
                    </div>
                </section>

                <div class="hgc-admin-actions">
                    <?php submit_button('Instellingen opslaan', 'primary', 'submit', false); ?>
                    <a class="button" href="#hgc-reset">Standaardwaarden herstellen</a>
                </div>
            </form>

            <form id="hgc-reset" class="hgc-admin-reset" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" onsubmit="return confirm('Weet je zeker dat je alle eigen calculatorinstellingen wilt verwijderen?');">
                <input type="hidden" name="action" value="hgc_calculator_reset" />
                <?php wp_nonce_field('hgc_calculator_reset'); ?>
                <button class="button button-link-delete" type="submit">Alle calculatorinstellingen terugzetten naar GitHub-standaardwaarden</button>
            </form>

            <?php if (isset($GLOBALS['hgc_restaurant'])) : ?>
                <?php $GLOBALS['hgc_restaurant']->render_admin_section(); ?>
            <?php endif; ?>
        </div>
        <?php
    }

    public function save(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Je hebt geen toestemming om deze instellingen te wijzigen.');
        }
        check_admin_referer('hgc_calculator_save');

        $raw = isset($_POST['config']) && is_array($_POST['config']) ? wp_unslash($_POST['config']) : array();
        update_option(self::OPTION, $this->sanitize_config($raw), false);
        wp_safe_redirect(add_query_arg('updated', '1', admin_url('options-general.php?page=' . self::PAGE_SLUG)));
        exit;
    }

    public function reset(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Je hebt geen toestemming om deze instellingen te wijzigen.');
        }
        check_admin_referer('hgc_calculator_reset');
        delete_option(self::OPTION);
        wp_safe_redirect(add_query_arg('reset', '1', admin_url('options-general.php?page=' . self::PAGE_SLUG)));
        exit;
    }

    private function sanitize_config(array $raw): array
    {
        $config = hgc_calculator_config();
        $config['year'] = absint($raw['year'] ?? $config['year'] ?? date('Y'));

        $config['settings']['includeHandicapByDefault'] = !empty($raw['settings']['includeHandicapByDefault']);
        $config['settings']['shortGolfSharePercent'] = $this->percentage($raw['settings']['shortGolfSharePercent'] ?? null, 85);
        $mixed_from = $this->percentage($raw['settings']['mixedProfileFromPercent'] ?? null, 40);
        $mixed_to = $this->percentage($raw['settings']['mixedProfileToPercent'] ?? null, 60);
        $config['settings']['mixedProfileFromPercent'] = min($mixed_from, $mixed_to);
        $config['settings']['mixedProfileToPercent'] = max($mixed_from, $mixed_to);
        $config['settings']['dualAdviceMarginPercent'] = $this->percentage($raw['settings']['dualAdviceMarginPercent'] ?? null, 15);
        $config['settings']['feeRouteMaxRounds'] = max(0, (int) $this->number($raw['settings']['feeRouteMaxRounds'] ?? null, 20));

        foreach (array('adultPrice', 'youthPrice', 'youthGreenFee') as $key) {
            $config['handicapRegistration'][$key] = max(0, $this->number($raw['handicapRegistration'][$key] ?? 0));
        }
        $config['handicapRegistration']['vouchers'] = max(0, (int) $this->number($raw['handicapRegistration']['vouchers'] ?? 0));

        $config['loyalTee']['membershipPrice'] = max(0, $this->number($raw['loyalTee']['membershipPrice'] ?? 0));
        $config['loyalTee']['discountPercentage'] = min(100, max(0, $this->number($raw['loyalTee']['discountPercentage'] ?? 20)));
        $config['loyalTee']['ballCredit'] = max(0, $this->number($raw['loyalTee']['ballCredit'] ?? 0));

        foreach (array('webshop', 'playingRights', 'handicapRegistration', 'loyalTee', 'greenFeePrices', 'terms') as $key) {
            $config['links'][$key] = esc_url_raw($raw['links'][$key] ?? '');
        }

        foreach (array('standardPackages', 'offPeakPackages', 'youthPackages', 'shortGolfPackages') as $key) {
            $config[$key] = $this->sanitize_packages($raw[$key] ?? array());
        }

        $config['courses'] = $this->sanitize_courses($raw['courses'] ?? array());

        foreach (array('benefits', 'shortGolfBenefits', 'localBenefits', 'handicapBenefits') as $key) {
            $lines = preg_split('/\r\n|\r|\n/', (string) ($raw[$key] ?? ''));
            $config[$key] = array_values(array_filter(array_map('sanitize_text_field', $lines)));
        }

        return $config;
    }

    private function sanitize_packages($rows): array
    {
        $packages = array();
        foreach (is_array($rows) ? $rows : array() as $row) {
            $credits = $this->number($row['credits'] ?? null, null);
            $price = $this->number($row['price'] ?? null, null);
            if ($credits === null || $price === null || $credits <= 0 || $price < 0) {
                continue;
            }
            $packages[] = array(
                'credits' => $credits,
                'price' => $price,
                'name' => sanitize_text_field($row['name'] ?? ''),
            );
        }
        usort($packages, static fn(array $a, array $b): int => $a['credits'] <=> $b['credits']);
        return $packages;
    }

    private function sanitize_courses($rows): array
    {
        $courses = array();
        $used_ids = array();
        foreach (is_array($rows) ? $rows : array() as $row) {
            $name = sanitize_text_field($row['name'] ?? '');
            if ($name === '') {
                continue;
            }
            $id = sanitize_title($row['id'] ?? $name);
            if ($id === '' || isset($used_ids[$id])) {
                $id .= '-' . (count($courses) + 1);
            }
            $used_ids[$id] = true;

            $caveat_course = sanitize_key($row['caveatCourse'] ?? 'both');
            if (!in_array($caveat_course, array('large', 'small', 'both'), true)) {
                $caveat_course = 'both';
            }

            $courses[] = array(
                'id' => $id,
                'name' => $name,
                'location' => sanitize_text_field($row['location'] ?? ''),
                'largeHoles' => $this->number($row['largeHoles'] ?? null, null),
                'largeRate' => $this->number($row['largeRate'] ?? null, null),
                'shortRate' => $this->number($row['shortRate'] ?? null, null),
                'shortGolfRate' => $this->number($row['shortGolfRate'] ?? null, null),
                'greenFee' => $this->number($row['greenFee'] ?? null, null),
                'greenFeeFull' => $this->number($row['greenFeeFull'] ?? null, null),
                'shortGreenFee' => $this->number($row['shortGreenFee'] ?? null, null),
                'shortGreenFeeFull' => $this->number($row['shortGreenFeeFull'] ?? null, null),
                'provisional' => !empty($row['provisional']),
                'note' => sanitize_text_field($row['note'] ?? ''),
                'caveat' => sanitize_textarea_field($row['caveat'] ?? ''),
                'caveatCourse' => $caveat_course,
            );
        }
        return $courses;
    }

    private function percentage($value, int $fallback): int
    {
        $number = $this->number($value, null);
        if ($number === null) {
            return $fallback;
        }
        return (int) min(100, max(0, round($number)));
    }

    private function number($value, $fallback = 0)
    {
        if ($value === '' || $value === null) {
            return $fallback;
        }
        $normalized = str_replace(',', '.', (string) $value);
        return is_numeric($normalized) ? (float) $normalized : $fallback;
    }

    private function number_field(string $label, string $name, $value, $step = 0.01, string $suffix = ''): void
    {
        ?>
        <label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><span class="hgc-admin-number"><input type="number" min="0" step="<?php echo esc_attr($step); ?>" name="<?php echo esc_attr($name); ?>" value="<?php echo esc_attr($value); ?>" /><?php if ($suffix) : ?><b><?php echo esc_html($suffix); ?></b><?php endif; ?></span></label>
        <?php
    }

    private function package_table(string $key, string $title, array $packages): void
    {
        $package_count = count($packages);
        $credits = array_values(array_filter(array_map(static fn(array $package): float => (float) ($package['credits'] ?? 0), $packages), static fn(float $value): bool => $value > 0));
        $credit_summary = '';
        if ($credits) {
            $minimum = min($credits);
            $maximum = max($credits);
            $format_credits = static fn(float $value): string => rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',');
            $credit_summary = $minimum === $maximum
                ? $format_credits($minimum) . ' credits'
                : $format_credits($minimum) . '-' . $format_credits($maximum) . ' credits';
        }
        ?>
        <section class="hgc-admin-panel hgc-package-panel" data-package-panel>
            <div class="hgc-package-panel__header">
                <button class="hgc-package-panel__toggle" type="button" data-toggle-packages aria-expanded="true" aria-controls="hgc-package-content-<?php echo esc_attr($key); ?>">
                    <span class="hgc-package-panel__chevron" aria-hidden="true"></span>
                    <span class="hgc-package-panel__heading">
                        <strong><?php echo esc_html($title); ?></strong>
                        <small data-package-summary><?php echo esc_html(sprintf(_n('%d pakket', '%d pakketten', $package_count), $package_count) . ($credit_summary ? ' | ' . $credit_summary : '')); ?></small>
                    </span>
                </button>
                <button class="button button-secondary" type="button" data-add-package="<?php echo esc_attr($key); ?>">Pakket toevoegen</button>
            </div>
            <div class="hgc-package-panel__content" id="hgc-package-content-<?php echo esc_attr($key); ?>">
            <p class="hgc-package-panel__intro">Beheer de naam, het aantal credits en de verkoopprijs. De volgorde wordt na opslaan automatisch bepaald door het aantal credits.</p>
            <div class="hgc-package-table-wrap">
            <table class="widefat hgc-package-table" id="hgc-packages-<?php echo esc_attr($key); ?>">
                <thead><tr><th>Naam</th><th>Credits</th><th>Prijs</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($packages as $index => $package) : ?>
                    <tr><td data-label="Naam"><input class="large-text" aria-label="Naam pakket" name="config[<?php echo esc_attr($key); ?>][<?php echo esc_attr($index); ?>][name]" value="<?php echo esc_attr($package['name'] ?? ''); ?>" /></td><td data-label="Credits"><input type="number" min="0.01" step="0.01" aria-label="Aantal credits" name="config[<?php echo esc_attr($key); ?>][<?php echo esc_attr($index); ?>][credits]" value="<?php echo esc_attr($package['credits'] ?? ''); ?>" /></td><td data-label="Prijs"><span class="hgc-package-price"><span aria-hidden="true">&euro;</span><input type="number" min="0" step="0.01" aria-label="Prijs in euro" name="config[<?php echo esc_attr($key); ?>][<?php echo esc_attr($index); ?>][price]" value="<?php echo esc_attr($package['price'] ?? ''); ?>" /></span></td><td><button class="button-link-delete" type="button" data-remove-row>Pakket verwijderen</button></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <p class="hgc-package-empty" data-package-empty <?php echo $package_count ? 'hidden' : ''; ?>>Nog geen pakketten in deze groep. Voeg het eerste pakket toe.</p>
            </div>
            </div>
            <template id="hgc-package-template-<?php echo esc_attr($key); ?>"><tr><td data-label="Naam"><input class="large-text" aria-label="Naam pakket" name="config[<?php echo esc_attr($key); ?>][__INDEX__][name]" /></td><td data-label="Credits"><input type="number" min="0.01" step="0.01" aria-label="Aantal credits" name="config[<?php echo esc_attr($key); ?>][__INDEX__][credits]" /></td><td data-label="Prijs"><span class="hgc-package-price"><span aria-hidden="true">&euro;</span><input type="number" min="0" step="0.01" aria-label="Prijs in euro" name="config[<?php echo esc_attr($key); ?>][__INDEX__][price]" /></span></td><td><button class="button-link-delete" type="button" data-remove-row>Pakket verwijderen</button></td></tr></template>
        </section>
        <?php
    }

    private function course_card(string $index, array $course): void
    {
        ?>
        <article class="hgc-course-card">
            <div class="hgc-course-card__header">
                <button class="hgc-course-card__toggle" type="button" data-toggle-course aria-expanded="true">
                    <span class="hgc-course-card__chevron" aria-hidden="true"></span>
                    <span class="hgc-course-card__title"><strong><?php echo esc_html($course['name'] ?? 'Nieuwe baan'); ?></strong><small class="hgc-course-summary"></small></span>
                </button>
                <button class="button-link-delete" type="button" data-remove-course>Baan verwijderen</button>
            </div>
            <div class="hgc-course-card__body">
            <div class="hgc-admin-grid hgc-admin-grid--three">
                <?php $this->text_input('Naam', "config[courses][$index][name]", $course['name'] ?? '', true); ?>
                <?php $this->text_input('ID / slug', "config[courses][$index][id]", $course['id'] ?? ''); ?>
                <?php $this->text_input('Plaats', "config[courses][$index][location]", $course['location'] ?? ''); ?>
            </div>
            <h4>Baan en creditwaarden</h4>
            <div class="hgc-admin-grid hgc-admin-grid--four">
                <?php $this->nullable_number('Aantal holes grote baan', "config[courses][$index][largeHoles]", $course['largeHoles'] ?? null, 1); ?>
                <?php $this->nullable_number('Algemeen speelrecht: grote baan', "config[courses][$index][largeRate]", $course['largeRate'] ?? null); ?>
                <?php $this->nullable_number('Algemeen speelrecht: kleine baan', "config[courses][$index][shortRate]", $course['shortRate'] ?? null); ?>
                <?php $this->nullable_number('Shortgolf-speelrecht: kleine baan', "config[courses][$index][shortGolfRate]", $course['shortGolfRate'] ?? null); ?>
            </div>
            <h4>Greenfeetarieven</h4>
            <p class="hgc-admin-hint">De tarieven voor één ronde, zoals ze op de flyer Greenfees staan. Een ronde volgt het aantal holes dat hierboven bij deze baan staat, dus meestal 9. Het gereduceerde tarief geldt voor spelers met een speelrecht of LoyalTee; het normale tarief voor wie alleen handicapregistratie heeft. De keuzehulp gebruikt ze om te bepalen welke route voordeliger is, en om rondes buiten een speelrecht af te rekenen. De tarieven zelf worden nooit aan de bezoeker getoond, alleen verwerkt in de vergelijking. Laat een veld leeg zolang het tarief niet vaststaat; de keuzehulp biedt die route dan niet aan.</p>
            <div class="hgc-admin-grid hgc-admin-grid--two">
                <?php $this->nullable_number('Grote baan, gereduceerd tarief', "config[courses][$index][greenFee]", $course['greenFee'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('Grote baan, normaal tarief', "config[courses][$index][greenFeeFull]", $course['greenFeeFull'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('Kleine baan, gereduceerd tarief', "config[courses][$index][shortGreenFee]", $course['shortGreenFee'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('Kleine baan, normaal tarief', "config[courses][$index][shortGreenFeeFull]", $course['shortGreenFeeFull'] ?? null, 0.01, '€'); ?>
            </div>
            <div class="hgc-admin-grid hgc-admin-grid--two">
                <label class="hgc-admin-check"><input type="checkbox" name="config[courses][<?php echo esc_attr($index); ?>][provisional]" value="1" <?php checked(!empty($course['provisional'])); ?> /> Tarieven zijn voorlopig</label>
                <?php $this->text_input('Toelichting', "config[courses][$index][note]", $course['note'] ?? ''); ?>
            </div>
            <?php $this->textarea_field('Voorbehoud bij uitslag (optioneel)', "config[courses][$index][caveat]", $course['caveat'] ?? '', 'Verschijnt op het resultaatscherm als "Let op bij ' . ($course['name'] ?? 'deze baan') . ': ...". Laat leeg om niets te tonen.'); ?>
            <label class="hgc-admin-field">
                <span>Melding tonen bij</span>
                <select name="config[courses][<?php echo esc_attr($index); ?>][caveatCourse]">
                    <option value="large" <?php selected($course['caveatCourse'] ?? 'both', 'large'); ?>>Grote baan</option>
                    <option value="small" <?php selected($course['caveatCourse'] ?? 'both', 'small'); ?>>Kleine baan</option>
                    <option value="both" <?php selected($course['caveatCourse'] ?? 'both', 'both'); ?>>Grote en kleine baan</option>
                </select>
            </label>
            </div>
        </article>
        <?php
    }

    private function course_template(): void
    {
        ob_start();
        $this->course_card('__INDEX__', array('name' => '', 'id' => '', 'location' => ''));
        $html = ob_get_clean();
        echo '<template id="hgc-course-template">' . $html . '</template>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }

    private function text_input(string $label, string $name, $value, bool $required = false): void
    {
        ?><label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><input class="large-text" type="text" name="<?php echo esc_attr($name); ?>" value="<?php echo esc_attr($value); ?>" <?php echo $required ? 'required' : ''; ?> /></label><?php
    }

    private function textarea_field(string $label, string $name, $value, string $hint = ''): void
    {
        ?>
        <label class="hgc-admin-field">
            <span><?php echo esc_html($label); ?></span>
            <textarea class="large-text" rows="2" name="<?php echo esc_attr($name); ?>"><?php echo esc_textarea($value); ?></textarea>
        </label>
        <?php if ($hint) : ?><p class="hgc-admin-hint"><?php echo esc_html($hint); ?></p><?php endif; ?>
        <?php
    }

    private function nullable_number(string $label, string $name, $value, $step = 0.01, string $suffix = ''): void
    {
        ?><label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><span class="hgc-admin-number"><input type="number" min="0" step="<?php echo esc_attr($step); ?>" name="<?php echo esc_attr($name); ?>" value="<?php echo $value === null ? '' : esc_attr($value); ?>" /><?php if ($suffix) : ?><b><?php echo esc_html($suffix); ?></b><?php endif; ?></span></label><?php
    }
}
