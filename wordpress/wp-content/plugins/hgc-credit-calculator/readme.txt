=== Hollandsche Golfclub Credit Calculator ===
Contributors: hollandschegolfclub
Tags: golf, calculator, speelrecht, credits
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.6.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adviseert het best passende speelrecht op basis van rondes op grote en kleine golfbanen.

== Installatie ==

1. Upload `hgc-credit-calculator.zip` via Plugins > Nieuwe plugin > Plugin uploaden.
2. Activeer Hollandsche Golfclub Credit Calculator.
3. Plaats `[hgc_calculator]` om de gekozen HGC-speelrechtkeuzehulp direct te tonen.

De alternatieve shortcode `[hgc_rekentool]` werkt eveneens.

Beheer banen, creditwaarden, pakketten, voordelen en links via
Instellingen > Hollandsche Golfclub Calculator.

== GitHub-updates ==

De plugin controleert de nieuwste publieke GitHub Release van:
https://github.com/HollandscheGolfclub/Credit-Reken-Tool

Een release moet een bestand met exact deze naam bevatten:
`hgc-credit-calculator.zip`

De meegeleverde GitHub Actions-workflow bouwt en publiceert dat bestand automatisch bij een tag zoals `v1.0.1`.

== Changelog ==

= 1.6.0 =
* Het geadviseerde speelrecht dekt altijd alle opgegeven rondes. Zijn er 31,2 credits nodig, dan adviseert de keuzehulp 60 credits in plaats van een instappakket van 20 credits.
* Zijn meerdere kleinere pakketten samen goedkoper, dan staat die route als tweede advies onder het hoofdadvies, met het aantal aankopen en het bedrag.
* Bestaat er geen speelrecht dat de rondes in één keer dekt, dan noemt het advies de benodigde combinatie expliciet, bijvoorbeeld 2 x 20 credits bij een jeugdspeelrecht.
* Het advies toont geen instapprijs meer die het opgegeven golfjaar niet dekt.

= 1.5.0 =
* De verhouding tussen kleine- en grote-baanrondes bepaalt het advies. Overheerst de kleine baan, dan adviseert de keuzehulp een Shortgolf-speelrecht omdat die credits daar voordeliger zijn.
* Bij een gemengd speelbeeld legt de keuzehulp de keuze bij de bezoeker: een groene kaart voor het algemene speelrecht en een oranje kaart voor Shortgolf.
* Het advies toont een schakelaar voor handicapregistratie. Alle bedragen wisselen direct mee, ook die van de aanbeveling en van de alternatieve optie.
* Aanbeveling en alternatief tonen nu allebei het bedrag zelf in plaats van alleen een omschrijving.
* Een beheerder stelt de drempelwaarden voor het speelbeeld in onder Instellingen.
* Bij een startpakket vermeldt het advies waar de bezoeker uitkomt als hij al zijn rondes speelt, met het aantal benodigde credits, het aantal speelrechten en het totaalbedrag.

= 1.4.2 =
* De lichte Clubhuis-vormgeving is de definitieve standaard; de shortcode opent direct de keuzehulp zonder ontwerpselectie.
* De keuzehulp rekent uitsluitend met credits, speelrechtprijzen en handicapregistratie.
* Tarieven en producten voor losse rondes zijn volledig uit de plugin verwijderd.
* Als meerdere kleine pakketten nodig zouden zijn, adviseert de keuzehulp eerst één passend startpakket en pas later verlengen.
* De effectieve kosten per grote en kleine ronde sluiten nu aan op het getoonde totaalbedrag.
* Een automatische rekenaudit controleert alle producttypen, banen, leeftijden, daluren en grenswaarden.

= 1.4.1 =
* De vijf ontwerpkaarten openen nu direct de keuzehulp “Welk speelrecht past bij mij?”.
* Het gekozen ontwerp loopt door in alle formuliervelden, knoppen en resultaten van de keuzehulp.

= 1.4.0 =
* Nieuwe ontwerpkeuze aan het begin met vijf visuele stijlen: Clubhuis, Fairway, Scorekaart, Tour en Energie.
* Het gekozen ontwerp wordt toegepast op de routekeuze, calculator en resultaten zonder de berekeningen te wijzigen.
* Bezoekers kunnen eenvoudig teruggaan om een ander ontwerp te bekijken.
* De ontwerpkeuze is responsive en meetbaar via afzonderlijke analyticsgebeurtenissen.

= 1.3.0 =
* Nieuwe, volledig responsive start voor persoonlijk speelrechtadvies.
* Officieel Hollandsche Golfclub-logo en een duidelijkere, websitewaardige merkpresentatie in alle stappen.
* Golfjaar-invoer vernieuwd tot één rustig paneel; sliders ondersteunen nu maximaal 400 rondes van 9 holes per jaar.
* Bij een hoog speelvolume adviseert de keuzehulp eerst het speelrecht van 200 credits; de bezoeker kan verlengen zodra die credits werkelijk op zijn.
* Alternatieve creditpakketten sluiten aan op het geadviseerde speelvolume.
* Bij 60 credits toont de uitkomst 120 credits voor meer speelruimte; bij 120 credits toont zij 60 credits als voordeligere instapoptie.
* Nieuwe analyticsgebeurtenissen voor het bekijken van de keuzehulp.

= 1.2.0 =
* Nieuwe shortcodes voor de speelrechtkeuzehulp.

= 1.1.0 =
* Omgebouwd van kostenvergelijker naar speelrechtkeuzehulp.
* Aparte invoer en baanselectie voor grote en kleine 9-holesrondes.
* Afzonderlijke creditwaarden voor algemene en Shortgolf-speelrechten.
* Shortgolf wordt bij gemengd spelen alleen geadviseerd bij voldoende kleine-baanrondes.
* Opeenvolgende creditpakketten worden geadviseerd wanneer één pakket niet volstaat.
* Toont de effectieve kosten per grote- en kleine-baanronde.
* Handicapregistratie blijft standaard inbegrepen en verlaagt het benodigde aantal credits niet.

= 1.0.2 =
* Alle zichtbare merkvermeldingen uitgeschreven naar Hollandsche Golfclub.
* Invoer vereenvoudigd naar 9-holesrondes op een grote of kleine baan.
* Handicapregistratie wordt standaard in ieder advies meegenomen.
* Aanbeveling, call-to-action en inbegrepen voordelen duidelijker vormgegeven.

= 1.0.1 =
* Plugin geschikt gemaakt voor Git-deploy vanuit wordpress/wp-content/plugins.
* Speelrechten met credits kunnen met handicapregistratie van Hollandsche Golfclub worden gecombineerd.

= 1.0.0 =
* Eerste WordPress-pluginversie.
