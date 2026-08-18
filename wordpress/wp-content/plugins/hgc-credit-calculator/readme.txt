=== Hollandsche Golfclub Credit Calculator ===
Contributors: hollandschegolfclub
Tags: golf, calculator, speelrecht, credits, greenfee
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adviseert het best passende speelrecht op basis van rondes op grote en kleine golfbanen.

== Installatie ==

1. Upload `hgc-credit-calculator.zip` via Plugins > Nieuwe plugin > Plugin uploaden.
2. Activeer Hollandsche Golfclub Credit Calculator.
3. Plaats `[hgc_calculator]` in een pagina of shortcodeblok.

De alternatieve shortcode `[hgc_rekentool]` werkt eveneens.

Beheer banen, greenfees, credits, pakketten, voordelen en links via
Instellingen > Hollandsche Golfclub Calculator.

== GitHub-updates ==

De plugin controleert de nieuwste publieke GitHub Release van:
https://github.com/HollandscheGolfclub/Credit-Reken-Tool

Een release moet een bestand met exact deze naam bevatten:
`hgc-credit-calculator.zip`

De meegeleverde GitHub Actions-workflow bouwt en publiceert dat bestand automatisch bij een tag zoals `v1.0.1`.

== Changelog ==

= 1.1.0 =
* Omgebouwd van kostenvergelijker naar speelrechtkeuzehulp.
* Aparte invoer en baanselectie voor grote en kleine 9-holesrondes.
* Afzonderlijke creditwaarden voor algemene en Shortgolf-speelrechten.
* Shortgolf wordt bij gemengd spelen alleen geadviseerd bij voldoende kleine-baanrondes.
* Opeenvolgende creditpakketten worden geadviseerd wanneer één pakket niet volstaat.
* Toont de effectieve kosten per grote- en kleine-baanronde.
* Handicapregistratie blijft standaard inbegrepen; de twee persoonlijke greenfees verlagen het aantal credits niet.

= 1.0.2 =
* Alle zichtbare merkvermeldingen uitgeschreven naar Hollandsche Golfclub.
* Invoer vereenvoudigd naar 9-holesrondes op een grote of kleine baan.
* Handicapregistratie wordt standaard in ieder advies meegenomen.
* Aanbeveling, call-to-action en inbegrepen voordelen duidelijker vormgegeven.

= 1.0.1 =
* Plugin geschikt gemaakt voor Git-deploy vanuit wordpress/wp-content/plugins.
* Speelrechten met credits en LoyalTee kunnen expliciet met handicapregistratie van Hollandsche Golfclub worden gecombineerd.

= 1.0.0 =
* Eerste WordPress-pluginversie.
