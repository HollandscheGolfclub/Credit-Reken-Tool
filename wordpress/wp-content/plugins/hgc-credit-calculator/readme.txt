=== Hollandsche Golfclub Credit Calculator ===
Contributors: hollandschegolfclub
Tags: golf, calculator, speelrecht, credits, greenfee
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.4.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adviseert het best passende speelrecht op basis van rondes op grote en kleine golfbanen.

== Installatie ==

1. Upload `hgc-credit-calculator.zip` via Plugins > Nieuwe plugin > Plugin uploaden.
2. Activeer Hollandsche Golfclub Credit Calculator.
3. Plaats `[hgc_calculator]` voor de gecombineerde start, of gebruik `[hgc_calculator mode="keuzehulp"]` en `[hgc_calculator mode="vergelijking"]` voor een losse variant.

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

= 1.4.1 =
* De vijf ontwerpkaarten openen nu direct de keuzehulp “Welk speelrecht past bij mij?”.
* De tussenstap met de kostenvergelijking is uit de ontwerpflow verwijderd.
* Het gekozen ontwerp loopt door in alle formuliervelden, knoppen en resultaten van de keuzehulp.

= 1.4.0 =
* Nieuwe ontwerpkeuze aan het begin met vijf visuele stijlen: Clubhuis, Fairway, Scorekaart, Tour en Energie.
* Het gekozen ontwerp wordt toegepast op de routekeuze, calculator en resultaten zonder de berekeningen te wijzigen.
* Bezoekers kunnen eenvoudig teruggaan om een ander ontwerp te bekijken.
* De ontwerpkeuze is responsive en meetbaar via afzonderlijke analyticsgebeurtenissen.

= 1.3.0 =
* Nieuwe, volledig responsive start waar bezoekers eerst kiezen tussen persoonlijk speelrechtadvies en een vergelijking met hun huidige golfkosten.
* Officieel Hollandsche Golfclub-logo en een duidelijkere, websitewaardige merkpresentatie in alle stappen.
* Golfjaar-invoer vernieuwd tot één rustig paneel; sliders ondersteunen nu maximaal 400 rondes van 9 holes per jaar.
* Bij een hoog speelvolume adviseert de keuzehulp eerst het speelrecht van 200 credits; de bezoeker kan verlengen zodra die credits werkelijk op zijn.
* LoyalTee wordt alleen als alternatief getoond bij een laag speelvolume rond het 20-creditadvies, niet naast 60-, 120- of 200-creditadviezen.
* Bij 60 credits toont de uitkomst 120 credits voor meer speelruimte; bij 120 credits toont zij 60 credits als voordeligere instapoptie.
* Beide routes openen op dezelfde pagina en bezoekers kunnen eenvoudig terug naar de startkeuze.
* Nieuwe analyticsgebeurtenissen voor het bekijken en maken van de routekeuze.

= 1.2.0 =
* De speelrechtkeuzehulp en eerdere kostenvergelijking zijn beide beschikbaar.
* Nieuwe shortcodes voor iedere variant en losse lokale voorbeeldpagina voor de vergelijking.

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
