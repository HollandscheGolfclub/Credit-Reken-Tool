<?php

defined('ABSPATH') || exit;

/**
 * Tijdelijk hulpmiddel (Extra hulpmiddelen → Pluginmap opschonen) voor
 * wanneer Plugins → Verwijderen een map als weg meldt, maar hij na
 * verversen terugkomt. Dat gebeurt wanneer WordPress' eigen
 * bestandssysteem-laag (WP_Filesystem) geen echte schrijfrechten heeft en
 * dat stilletjes negeert; deze klasse verwijdert rechtstreeks met PHP's
 * eigen bestandsfuncties, buiten die laag om.
 *
 * Bewust geen algemene bestandsbeheerder: uitsluitend mappen direct onder
 * wp-content/plugins zijn te zien of te verwijderen, nooit losse bestanden,
 * nooit iets daarbuiten (geen thema's, geen uploads, geen wp-config.php).
 * Alleen beheerders (manage_options) kunnen bij deze pagina.
 */
final class HGC_Bestandsbeheer
{
    private const PAGE_SLUG = 'hgc-bestandsbeheer';

    public function __construct()
    {
        add_action('admin_menu', array($this, 'register_page'));
        add_action('admin_post_hgc_bestandsbeheer_delete', array($this, 'handle_delete'));
    }

    public function register_page(): void
    {
        add_management_page(
            'Pluginmap opschonen',
            'Pluginmap opschonen',
            'manage_options',
            self::PAGE_SLUG,
            array($this, 'render_page')
        );
    }

    /**
     * Herleidt een mapnaam terug naar een echt pad binnen wp-content/plugins,
     * en weigert alles wat daarbuiten uitkomt (bijvoorbeeld via ../).
     */
    private function resolve_plugin_folder(string $naam): ?string
    {
        $naam = basename($naam);
        if ($naam === '' || $naam === '.' || $naam === '..') {
            return null;
        }
        $base = realpath(WP_PLUGIN_DIR);
        $pad = realpath(WP_PLUGIN_DIR . '/' . $naam);
        if ($base === false || $pad === false) {
            return null;
        }
        // Moet een directe submap van de pluginmap zijn, niet de pluginmap
        // zelf en niet iets erbuiten.
        if (strpos($pad, $base . DIRECTORY_SEPARATOR) !== 0) {
            return null;
        }
        if (!is_dir($pad)) {
            return null;
        }
        return $pad;
    }

    private function verwijder_recursief(string $pad): array
    {
        $fouten = array();
        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($pad, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $doel = $item->getPathname();
            if ($item->isDir() && !$item->isLink()) {
                if (!@rmdir($doel)) {
                    $fouten[] = $doel;
                }
            } else {
                if (!@unlink($doel)) {
                    $fouten[] = $doel;
                }
            }
        }
        if (!$fouten && !@rmdir($pad)) {
            $fouten[] = $pad;
        }
        return $fouten;
    }

    private function map_grootte(string $pad): int
    {
        $totaal = 0;
        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($pad, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($items as $item) {
            if ($item->isFile()) {
                $totaal += $item->getSize();
            }
        }
        return $totaal;
    }

    private function leesbare_grootte(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }

    public function handle_delete(): void
    {
        if (!current_user_can('manage_options')) {
            wp_die('Je hebt geen toestemming voor deze actie.');
        }
        check_admin_referer('hgc_bestandsbeheer_delete');

        $naam = isset($_POST['map']) ? sanitize_text_field(wp_unslash($_POST['map'])) : '';
        $pad = $this->resolve_plugin_folder($naam);

        if ($pad === null) {
            wp_safe_redirect(add_query_arg(array('page' => self::PAGE_SLUG, 'fout' => rawurlencode('Map niet gevonden of ligt buiten wp-content/plugins.')), admin_url('tools.php')));
            exit;
        }

        $fouten = $this->verwijder_recursief($pad);

        $args = array('page' => self::PAGE_SLUG);
        if ($fouten) {
            $args['fout'] = rawurlencode(sprintf('%d bestand(en) konden niet verwijderd worden, o.a. %s. De PHP-gebruiker van de server heeft hier geen schrijfrechten voor; dat moet de hosting-partij oplossen.', count($fouten), $fouten[0]));
        } else {
            $args['verwijderd'] = rawurlencode($naam);
        }
        wp_safe_redirect(add_query_arg($args, admin_url('tools.php')));
        exit;
    }

    public function render_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $mappen = array();
        foreach (glob(WP_PLUGIN_DIR . '/*', GLOB_ONLYDIR) ?: array() as $pad) {
            $naam = basename($pad);
            $mappen[] = array(
                'naam' => $naam,
                'grootte' => $this->leesbare_grootte($this->map_grootte($pad)),
                'gewijzigd' => date_i18n('j M Y H:i', filemtime($pad)),
                'schrijfbaar' => is_writable($pad),
            );
        }
        usort($mappen, static fn(array $a, array $b): int => strcasecmp($a['naam'], $b['naam']));

        $actieve_plugins = array();
        foreach (array_keys(get_plugins()) as $bestand) {
            $actieve_plugins[explode('/', $bestand)[0]] = is_plugin_active($bestand);
        }
        ?>
        <div class="wrap">
            <h1>Pluginmap opschonen</h1>
            <p>Voor als Plugins → Verwijderen een map als verwijderd meldt, maar hij na verversen terugkomt. Dit verwijdert rechtstreeks op de server, buiten WordPress' eigen bestandssysteem-laag om. Alleen mappen direct onder <code>wp-content/plugins</code> zijn hier te zien; er is verder niets van de server te benaderen.</p>
            <p><strong>Let op:</strong> dit kan niet ongedaan gemaakt worden. Verwijder alleen mappen waarvan je zeker weet dat je ze niet meer nodig hebt.</p>

            <?php if (isset($_GET['verwijderd'])) : ?>
                <div class="notice notice-success is-dismissible"><p><?php echo esc_html(sanitize_text_field(wp_unslash($_GET['verwijderd']))); ?> is verwijderd.</p></div>
            <?php elseif (isset($_GET['fout'])) : ?>
                <div class="notice notice-error is-dismissible"><p><?php echo esc_html(sanitize_text_field(wp_unslash($_GET['fout']))); ?></p></div>
            <?php endif; ?>

            <table class="widefat striped" style="max-width: 900px; margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Map</th>
                        <th>Status</th>
                        <th>Grootte</th>
                        <th>Laatst gewijzigd</th>
                        <th>Schrijfbaar door PHP</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($mappen as $map) : ?>
                        <tr>
                            <td><code><?php echo esc_html($map['naam']); ?></code></td>
                            <td>
                                <?php if (!array_key_exists($map['naam'], $actieve_plugins)) : ?>
                                    <span style="color:#a6702a;">Niet als plugin herkend (geen geldige plugin-header)</span>
                                <?php elseif ($actieve_plugins[$map['naam']]) : ?>
                                    <span style="color:#2f4d12;">Actief</span>
                                <?php else : ?>
                                    <span>Geïnstalleerd, niet actief</span>
                                <?php endif; ?>
                            </td>
                            <td><?php echo esc_html($map['grootte']); ?></td>
                            <td><?php echo esc_html($map['gewijzigd']); ?></td>
                            <td><?php echo $map['schrijfbaar'] ? 'Ja' : 'Nee'; ?></td>
                            <td>
                                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" onsubmit="return confirm('Map ' + <?php echo wp_json_encode($map['naam']); ?> + ' definitief verwijderen? Dit kan niet ongedaan gemaakt worden.');">
                                    <input type="hidden" name="action" value="hgc_bestandsbeheer_delete" />
                                    <input type="hidden" name="map" value="<?php echo esc_attr($map['naam']); ?>" />
                                    <?php wp_nonce_field('hgc_bestandsbeheer_delete'); ?>
                                    <button type="submit" class="button button-link-delete">Verwijderen</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$mappen) : ?>
                        <tr><td colspan="6">Geen mappen gevonden in wp-content/plugins.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <h2 style="margin-top: 32px;">Waarom dit gebeurt</h2>
            <p>WordPress' eigen verwijderfunctie gaat via een bestandssysteem-laag die soms geen echte schrijfrechten heeft, ook al meldt hij succes. Deze pagina verwijdert rechtstreeks met PHP; staat "Schrijfbaar door PHP" op "Nee", dan zal ook dit niet lukken — dat moet de hosting-partij oplossen door de eigenaar/rechten van die map aan te passen.</p>
            <p><em>Dit is een tijdelijk hulpmiddel. Zodra je de vastzittende mappen hebt opgeschoond, hoeft deze pagina niet meer gebruikt te worden.</em></p>
        </div>
        <?php
    }
}
