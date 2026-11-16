<?php

defined('WP_UNINSTALL_PLUGIN') || exit;

delete_option('hgc_calculator_config');
delete_option('hgc_restaurant_settings');
delete_option('hgc_advies_mail_settings');
delete_option('hgc_advies_mail_wachtrij');
wp_clear_scheduled_hook('hgc_advies_mail_opnieuw');
delete_site_transient('hgc_calculator_github_release');
