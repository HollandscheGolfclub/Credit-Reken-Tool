<?php

defined('WP_UNINSTALL_PLUGIN') || exit;

delete_option('hgc_calculator_config');
delete_site_transient('hgc_calculator_github_release');
