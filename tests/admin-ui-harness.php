<?php
$groups = array(
    'standardPackages' => array('Algemene speelrechten', array(20, 60, 120, 200)),
    'offPeakPackages' => array('Dalurenspeelrechten', array(20)),
    'youthPackages' => array('Jeugdspeelrechten', array(20)),
    'shortGolfPackages' => array('Shortgolf-speelrechten', array(20, 60, 120)),
);
$parks = array('Almkreek', 'De Berendonck', 'De Breuninkhof', 'De Haverleij', 'De Kurenpolder', 'De Loonsche Duynen', 'De Purmer', 'Gendersteyn', 'Land van Thorn', 'Maastricht', 'Naarderbos', 'Reymerswael', 'Rotterdam', 'ShortGolf Utrecht', 'Sint Nyk', 'Westerpark');
function slug(string $name): string { return trim(strtolower((string) preg_replace('/[^a-z0-9]+/i', '-', $name)), '-'); }
?><!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HGC admin QA</title>
<link rel="stylesheet" href="../wordpress/wp-content/plugins/hgc-keuzehulp/admin/admin.css">
<style>
body{margin:0;background:#f0f0f1;color:#1d2327;font:14px Arial,sans-serif}.wrap{margin:20px}.button{display:inline-block;min-height:32px;padding:0 12px;border:1px solid #2271b1;border-radius:3px;color:#2271b1;background:#fff;cursor:pointer}.button:disabled{color:#a7aaad;border-color:#dcdcde}.button-link-delete{border:0;color:#b32d2e;background:transparent;cursor:pointer}.widefat{width:100%;border-collapse:collapse;background:#fff}.widefat th{text-align:left}.large-text{width:100%;box-sizing:border-box}input,select{min-height:32px;padding:0 8px;box-sizing:border-box}.screen-reader-text{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
</style></head><body><div class="wrap hgc-admin">
<h1>Hollandsche Golfclub Calculator</h1><p class="hgc-admin-intro">Visuele test van pakket- en restaurantbeheer.</p>
<nav class="hgc-admin-nav"><a href="#hgc-products">Pakketten</a><a href="#hgc-restaurant">Restaurant</a></nav>
<div class="hgc-admin-section-heading" id="hgc-products"><h2>Speelrechten en pakketten</h2><p>Open alleen de pakketgroep die je wilt aanpassen.</p></div>
<?php foreach ($groups as $key => [$title, $credits]) : ?>
<section class="hgc-admin-panel hgc-package-panel" data-package-panel><div class="hgc-package-panel__header">
<button class="hgc-package-panel__toggle" type="button" data-toggle-packages aria-expanded="true"><span class="hgc-package-panel__chevron"></span><span class="hgc-package-panel__heading"><strong><?= htmlspecialchars($title) ?></strong><small data-package-summary></small></span></button>
<button class="button" type="button" data-add-package="<?= $key ?>">Pakket toevoegen</button></div>
<div class="hgc-package-panel__content"><p class="hgc-package-panel__intro">Beheer de naam, credits en verkoopprijs.</p><div class="hgc-package-table-wrap"><table class="widefat hgc-package-table" id="hgc-packages-<?= $key ?>"><thead><tr><th>Naam</th><th>Credits</th><th>Prijs</th><th></th></tr></thead><tbody>
<?php foreach ($credits as $index => $credit) : ?><tr><td data-label="Naam"><input class="large-text" name="config[<?= $key ?>][<?= $index ?>][name]" value="<?= htmlspecialchars($title . ' – ' . $credit . ' credits') ?>"></td><td data-label="Credits"><input type="number" name="config[<?= $key ?>][<?= $index ?>][credits]" value="<?= $credit ?>"></td><td data-label="Prijs"><span class="hgc-package-price">€ <input type="number" name="config[<?= $key ?>][<?= $index ?>][price]" value="485"></span></td><td><button class="button-link-delete" type="button" data-remove-row>Pakket verwijderen</button></td></tr><?php endforeach; ?>
</tbody></table><p class="hgc-package-empty" data-package-empty hidden>Nog geen pakketten.</p></div></div>
<template id="hgc-package-template-<?= $key ?>"><tr><td data-label="Naam"><input name="config[<?= $key ?>][__INDEX__][name]"></td><td data-label="Credits"><input type="number" name="config[<?= $key ?>][__INDEX__][credits]"></td><td data-label="Prijs"><span class="hgc-package-price">€ <input type="number" name="config[<?= $key ?>][__INDEX__][price]"></span></td><td><button data-remove-row>Pakket verwijderen</button></td></tr></template></section>
<?php endforeach; ?>
<section class="hgc-admin-panel" id="hgc-restaurant" data-hgc-restaurant-section><h2>Restaurant reserveren</h2>
<div class="hgc-admin-grid hgc-admin-grid--two"><label class="hgc-admin-field"><span>Connect API-URL</span><input value="https://example.test/restaurantApi"></label><label class="hgc-admin-field"><span>Standaard restaurant</span><select data-hgc-restaurant-default></select></label></div>
<div class="hgc-admin-heading hgc-restaurant-heading"><div><h3>Restaurants en banen</h3><p class="hgc-admin-hint">Voeg zoveel locaties toe als nodig.</p></div><button class="button" type="button" data-hgc-add-restaurant>Restaurant toevoegen</button></div>
<div class="hgc-restaurant-toolbar"><label class="hgc-course-search"><span class="screen-reader-text">Zoeken</span><input type="search" placeholder="Zoek op naam, parkcode of adres…" data-hgc-restaurant-search></label><div class="hgc-course-toolbar__actions"><button class="button" data-hgc-expand-restaurants>Alles openen</button><button class="button" data-hgc-collapse-restaurants>Alles sluiten</button></div></div>
<p class="hgc-course-count" data-hgc-restaurant-count></p><div class="hgc-course-list" data-hgc-restaurant-list>
<?php foreach ($parks as $index => $park) : $parkSlug = slug($park); ?><article class="hgc-course-card" data-hgc-restaurant-row><div class="hgc-course-card__header"><button class="hgc-course-card__toggle" data-hgc-toggle-restaurant aria-expanded="true"><span class="hgc-course-card__chevron"></span><span class="hgc-course-card__title"><strong data-hgc-location-title><?= htmlspecialchars($park) ?></strong><small data-hgc-location-summary><?= htmlspecialchars($parkSlug) ?></small></span></button><button class="button-link-delete" data-hgc-remove-restaurant>Verwijderen</button></div><div class="hgc-course-card__body"><div class="hgc-admin-grid hgc-admin-grid--two"><label class="hgc-admin-field"><span>Parkcode / slug</span><input name="restaurant[locations][<?= $index ?>][slug]" value="<?= htmlspecialchars($parkSlug) ?>" data-hgc-location-slug></label><label class="hgc-admin-field"><span>Naam</span><input name="restaurant[locations][<?= $index ?>][name]" value="Golfpark <?= htmlspecialchars($park) ?>" data-hgc-location-name></label><label class="hgc-admin-field"><span>Adres</span><input name="restaurant[locations][<?= $index ?>][address]" value="Voorbeeldadres <?= $index + 1 ?>"></label><label class="hgc-admin-field"><span>Telefoonnummer</span><input name="restaurant[locations][<?= $index ?>][phone]" value="010 123 45 67"></label></div></div></article><?php endforeach; ?>
</div><template data-hgc-restaurant-template></template></section>
</div><script src="../wordpress/wp-content/plugins/hgc-keuzehulp/admin/admin.js"></script></body></html>
