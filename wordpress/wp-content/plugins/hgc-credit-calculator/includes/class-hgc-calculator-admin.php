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
            'HGC Calculator',
            'HGC Calculator',
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
            <h1>HGC Calculator</h1>
            <p class="hgc-admin-intro">Beheer hier de gegevens die de calculator op de website gebruikt. Wijzigingen zijn direct actief na opslaan.</p>

            <?php if (isset($_GET['updated'])) : ?>
                <div class="notice notice-success is-dismissible"><p>De calculatorinstellingen zijn opgeslagen.</p></div>
            <?php elseif (isset($_GET['reset'])) : ?>
                <div class="notice notice-success is-dismissible"><p>De standaardinstellingen zijn hersteld.</p></div>
            <?php endif; ?>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="hgc_calculator_save" />
                <?php wp_nonce_field('hgc_calculator_save'); ?>

                <section class="hgc-admin-panel">
                    <h2>Algemene instellingen</h2>
                    <div class="hgc-admin-grid hgc-admin-grid--four">
                        <?php $this->number_field('Jaar', 'config[year]', $config['year'] ?? date('Y'), 1); ?>
                        <?php $this->number_field('Marge “ongeveer gelijk”', 'config[settings][equalCostMargin]', $config['settings']['equalCostMargin'] ?? 50, 0.01, '€'); ?>
                        <?php $this->number_field('18-holes vermenigvuldiger', 'config[settings][eighteenHoleMultiplier]', $config['settings']['eighteenHoleMultiplier'] ?? 2, 0.1); ?>
                        <?php $this->number_field('Maandbetalingstoeslag', 'config[settings][monthlyPaymentSurchargePercentage]', $config['settings']['monthlyPaymentSurchargePercentage'] ?? 5, 0.1, '%'); ?>
                    </div>
                </section>

                <section class="hgc-admin-panel">
                    <h2>Handicapregistratie en LoyalTee</h2>
                    <div class="hgc-admin-grid hgc-admin-grid--three">
                        <?php $this->number_field('Handicapregistratie volwassenen', 'config[handicapRegistration][adultPrice]', $config['handicapRegistration']['adultPrice'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('Handicapregistratie jeugd', 'config[handicapRegistration][youthPrice]', $config['handicapRegistration']['youthPrice'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('Aantal inbegrepen vouchers', 'config[handicapRegistration][vouchers]', $config['handicapRegistration']['vouchers'] ?? 2, 1); ?>
                        <?php $this->number_field('LoyalTee-lidmaatschap', 'config[loyalTee][membershipPrice]', $config['loyalTee']['membershipPrice'] ?? 0, 0.01, '€'); ?>
                        <?php $this->number_field('LoyalTee-korting', 'config[loyalTee][discountPercentage]', $config['loyalTee']['discountPercentage'] ?? 20, 0.1, '%'); ?>
                        <?php $this->number_field('LoyalTee-ballentegoed', 'config[loyalTee][ballCredit]', $config['loyalTee']['ballCredit'] ?? 0, 0.01, '€'); ?>
                    </div>
                </section>

                <section class="hgc-admin-panel">
                    <h2>Links</h2>
                    <div class="hgc-admin-grid hgc-admin-grid--two">
                        <?php foreach (array('webshop' => 'Webshop', 'loyalTee' => 'LoyalTee', 'handicapRegistration' => 'Handicapregistratie', 'terms' => 'Voorwaarden') as $key => $label) : ?>
                            <label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><input class="large-text" type="url" name="config[links][<?php echo esc_attr($key); ?>]" value="<?php echo esc_attr($config['links'][$key] ?? ''); ?>" /></label>
                        <?php endforeach; ?>
                    </div>
                </section>

                <?php foreach ($package_groups as $key => $title) : ?>
                    <?php $this->package_table($key, $title, $config[$key] ?? array()); ?>
                <?php endforeach; ?>

                <section class="hgc-admin-panel">
                    <div class="hgc-admin-heading">
                        <div><h2>Golfbanen en tarieven</h2><p>Een leeg tarief betekent dat die spelvorm niet beschikbaar is.</p></div>
                        <button class="button button-secondary" type="button" data-add-course>Nieuwe baan toevoegen</button>
                    </div>
                    <div id="hgc-course-list" class="hgc-course-list">
                        <?php foreach (($config['courses'] ?? array()) as $index => $course) : ?>
                            <?php $this->course_card((string) $index, $course); ?>
                        <?php endforeach; ?>
                    </div>
                    <?php $this->course_template(); ?>
                </section>

                <section class="hgc-admin-panel">
                    <h2>Voordelen</h2>
                    <p>Zet ieder voordeel op een nieuwe regel.</p>
                    <div class="hgc-admin-grid hgc-admin-grid--two">
                        <?php foreach (array('benefits' => 'Algemene speelrechten', 'shortGolfBenefits' => 'Shortgolf', 'localBenefits' => 'Lokale speelrechten', 'loyalTeeBenefits' => 'LoyalTee', 'handicapBenefits' => 'Handicapregistratie') as $key => $label) : ?>
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
                <button class="button button-link-delete" type="submit">Alle instellingen terugzetten naar GitHub-standaardwaarden</button>
            </form>
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

        foreach (array('equalCostMargin', 'eighteenHoleMultiplier', 'monthlyPaymentSurchargePercentage') as $key) {
            $config['settings'][$key] = $this->number($raw['settings'][$key] ?? $config['settings'][$key] ?? 0);
        }
        $config['settings']['preferSinglePackage'] = true;

        foreach (array('adultPrice', 'youthPrice', 'vouchers') as $key) {
            $config['handicapRegistration'][$key] = $this->number($raw['handicapRegistration'][$key] ?? 0);
        }
        foreach (array('membershipPrice', 'discountPercentage', 'ballCredit') as $key) {
            $config['loyalTee'][$key] = $this->number($raw['loyalTee'][$key] ?? 0);
        }

        foreach (array('webshop', 'loyalTee', 'handicapRegistration', 'terms') as $key) {
            $config['links'][$key] = esc_url_raw($raw['links'][$key] ?? '');
        }

        foreach (array('standardPackages', 'offPeakPackages', 'youthPackages', 'shortGolfPackages') as $key) {
            $config[$key] = $this->sanitize_packages($raw[$key] ?? array());
        }

        $config['courses'] = $this->sanitize_courses($raw['courses'] ?? array());

        foreach (array('benefits', 'shortGolfBenefits', 'localBenefits', 'loyalTeeBenefits', 'handicapBenefits') as $key) {
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

            $green_fees = array();
            foreach (array('nine', 'eighteen', 'short', 'loyalNine', 'loyalEighteen', 'loyalShort') as $fee_key) {
                $green_fees[$fee_key] = $this->number($row['greenFees'][$fee_key] ?? null, null);
            }

            $courses[] = array(
                'id' => $id,
                'name' => $name,
                'location' => sanitize_text_field($row['location'] ?? ''),
                'largeHoles' => $this->number($row['largeHoles'] ?? null, null),
                'largeRate' => $this->number($row['largeRate'] ?? null, null),
                'shortRate' => $this->number($row['shortRate'] ?? null, null),
                'provisional' => !empty($row['provisional']),
                'note' => sanitize_text_field($row['note'] ?? ''),
                'greenFees' => $green_fees,
            );
        }
        return $courses;
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
        ?>
        <section class="hgc-admin-panel hgc-package-panel">
            <div class="hgc-admin-heading"><h2><?php echo esc_html($title); ?></h2><button class="button" type="button" data-add-package="<?php echo esc_attr($key); ?>">Pakket toevoegen</button></div>
            <table class="widefat striped" id="hgc-packages-<?php echo esc_attr($key); ?>">
                <thead><tr><th>Naam</th><th>Credits</th><th>Prijs</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($packages as $index => $package) : ?>
                    <tr><td><input class="large-text" name="config[<?php echo esc_attr($key); ?>][<?php echo esc_attr($index); ?>][name]" value="<?php echo esc_attr($package['name'] ?? ''); ?>" /></td><td><input type="number" min="0.01" step="0.01" name="config[<?php echo esc_attr($key); ?>][<?php echo esc_attr($index); ?>][credits]" value="<?php echo esc_attr($package['credits'] ?? ''); ?>" /></td><td><input type="number" min="0" step="0.01" name="config[<?php echo esc_attr($key); ?>][<?php echo esc_attr($index); ?>][price]" value="<?php echo esc_attr($package['price'] ?? ''); ?>" /></td><td><button class="button-link-delete" type="button" data-remove-row>Verwijderen</button></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <template id="hgc-package-template-<?php echo esc_attr($key); ?>"><tr><td><input class="large-text" name="config[<?php echo esc_attr($key); ?>][__INDEX__][name]" /></td><td><input type="number" min="0.01" step="0.01" name="config[<?php echo esc_attr($key); ?>][__INDEX__][credits]" /></td><td><input type="number" min="0" step="0.01" name="config[<?php echo esc_attr($key); ?>][__INDEX__][price]" /></td><td><button class="button-link-delete" type="button" data-remove-row>Verwijderen</button></td></tr></template>
        </section>
        <?php
    }

    private function course_card(string $index, array $course): void
    {
        $fees = $course['greenFees'] ?? array();
        ?>
        <article class="hgc-course-card">
            <div class="hgc-admin-heading"><h3><?php echo esc_html($course['name'] ?? 'Nieuwe baan'); ?></h3><button class="button-link-delete" type="button" data-remove-course>Baan verwijderen</button></div>
            <div class="hgc-admin-grid hgc-admin-grid--three">
                <?php $this->text_input('Naam', "config[courses][$index][name]", $course['name'] ?? '', true); ?>
                <?php $this->text_input('ID / slug', "config[courses][$index][id]", $course['id'] ?? ''); ?>
                <?php $this->text_input('Plaats', "config[courses][$index][location]", $course['location'] ?? ''); ?>
            </div>
            <h4>Credits en baan</h4>
            <div class="hgc-admin-grid hgc-admin-grid--three">
                <?php $this->nullable_number('Aantal holes grote baan', "config[courses][$index][largeHoles]", $course['largeHoles'] ?? null, 1); ?>
                <?php $this->nullable_number('Credits per baanronde', "config[courses][$index][largeRate]", $course['largeRate'] ?? null); ?>
                <?php $this->nullable_number('Credits per shortgolfronde', "config[courses][$index][shortRate]", $course['shortRate'] ?? null); ?>
            </div>
            <h4>Reguliere greenfees</h4>
            <div class="hgc-admin-grid hgc-admin-grid--three">
                <?php $this->nullable_number('9 holes', "config[courses][$index][greenFees][nine]", $fees['nine'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('18 holes', "config[courses][$index][greenFees][eighteen]", $fees['eighteen'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('Shortgolf', "config[courses][$index][greenFees][short]", $fees['short'] ?? null, 0.01, '€'); ?>
            </div>
            <h4>LoyalTee-greenfees</h4>
            <div class="hgc-admin-grid hgc-admin-grid--three">
                <?php $this->nullable_number('9 holes', "config[courses][$index][greenFees][loyalNine]", $fees['loyalNine'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('18 holes', "config[courses][$index][greenFees][loyalEighteen]", $fees['loyalEighteen'] ?? null, 0.01, '€'); ?>
                <?php $this->nullable_number('Shortgolf', "config[courses][$index][greenFees][loyalShort]", $fees['loyalShort'] ?? null, 0.01, '€'); ?>
            </div>
            <div class="hgc-admin-grid hgc-admin-grid--two">
                <label class="hgc-admin-check"><input type="checkbox" name="config[courses][<?php echo esc_attr($index); ?>][provisional]" value="1" <?php checked(!empty($course['provisional'])); ?> /> Tarieven zijn voorlopig</label>
                <?php $this->text_input('Toelichting', "config[courses][$index][note]", $course['note'] ?? ''); ?>
            </div>
        </article>
        <?php
    }

    private function course_template(): void
    {
        ob_start();
        $this->course_card('__INDEX__', array('name' => '', 'id' => '', 'location' => '', 'greenFees' => array()));
        $html = ob_get_clean();
        echo '<template id="hgc-course-template">' . $html . '</template>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }

    private function text_input(string $label, string $name, $value, bool $required = false): void
    {
        ?><label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><input class="large-text" type="text" name="<?php echo esc_attr($name); ?>" value="<?php echo esc_attr($value); ?>" <?php echo $required ? 'required' : ''; ?> /></label><?php
    }

    private function nullable_number(string $label, string $name, $value, $step = 0.01, string $suffix = ''): void
    {
        ?><label class="hgc-admin-field"><span><?php echo esc_html($label); ?></span><span class="hgc-admin-number"><input type="number" min="0" step="<?php echo esc_attr($step); ?>" name="<?php echo esc_attr($name); ?>" value="<?php echo $value === null ? '' : esc_attr($value); ?>" /><?php if ($suffix) : ?><b><?php echo esc_html($suffix); ?></b><?php endif; ?></span></label><?php
    }
}
