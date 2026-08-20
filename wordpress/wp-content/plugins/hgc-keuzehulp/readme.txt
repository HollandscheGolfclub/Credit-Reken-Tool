=== Hollandsche Golfclub Keuzehulp ===
Contributors: hollandschegolfclub
Tags: golf, calculator, speelrecht, credits
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.14.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adviseert het best passende speelrecht op basis van rondes op grote en kleine golfbanen.

== Installatie ==

1. Upload `hgc-keuzehulp.zip` via Plugins > Nieuwe plugin > Plugin uploaden.
2. Activeer Hollandsche Golfclub Keuzehulp.
3. Plaats `[hgc_calculator]` om de gekozen HGC-speelrechtkeuzehulp direct te tonen.

De alternatieve shortcode `[hgc_rekentool]` werkt eveneens.

Beheer banen, creditwaarden, pakketten, voordelen en links via
Instellingen > Hollandsche Golfclub Calculator.

== GitHub-updates ==

De plugin controleert de nieuwste publieke GitHub Release van:
https://github.com/HollandscheGolfclub/Credit-Reken-Tool

Een release moet een bestand met exact deze naam bevatten:
`hgc-keuzehulp.zip`

De meegeleverde GitHub Actions-workflow bouwt en publiceert dat bestand automatisch bij een tag zoals `v1.0.1`.

== Changelog ==

= 1.14.0 =
* De greenfeetarieven van de kleine banen staan er nu in, overgenomen uit de flyer Hollandsche Golfclub Greenfees 2026. Per baan is zowel het normale als het gereduceerde tarief vastgelegd, voor de grote en de kleine baan.
* Daardoor gelden de routes handicapregistratie en LoyalTee nu ook voor wie op de kleine baan speelt, en voor wie beide baantypen combineert. Eerder konden die routes alleen worden aangeboden aan spelers die uitsluitend de grote baan lopen.
* De twee vrije rondes van de handicapregistratie gaan naar de duurste rondes, dus eerst de grote baan.
* Bij een gemengd speelbeeld verschijnt de keuze tussen twee speelrechten alleen nog wanneer een speelrecht ook werkelijk het goedkoopst is. Was een route die per ronde afrekent goedkoper, dan toonde de keuzehulp twee speelrechtkaarten terwijl het beste advies elders lag.
* Op de kaart voor handicapregistratie staat geen schakelaar meer om de registratie mee te rekenen: het getoonde bedrag is die registratie zelf.

= 1.13.0 =
* De keuzehulp kent nu de hele ladder van de flyer "Maak hier je keuze". Naast de speelrechten kan zij ook handicapregistratie adviseren voor wie heel af en toe golft, en LoyalTee voor wie af en toe golft.
* Bij handicapregistratie horen twee vrije rondes van 9 holes per kalenderjaar. Die tellen mee in de vergelijking.
* LoyalTee is terug in de configuratie: EUR 54, twintig procent korting op de greenfee, EUR 25 ballentegoed, ShortGolf Utrecht uitgesloten.
* Op een baan van een credit per ronde adviseert de keuzehulp nu handicapregistratie tot negen rondes, LoyalTee van tien tot zeventien, en daarboven een speelrecht. Eerder stond daar altijd een speelrecht van EUR 485, ook bij een enkele ronde.
* Deze twee routes rekenen per ronde af en verschijnen daarom alleen wanneer alle rondes op de grote baan vallen; voor de kleine baan is geen greenfeetarief vastgesteld.

= 1.12.0 =
* Liggen twee routes dicht bij elkaar, dan legt de keuzehulp de keuze bij de bezoeker met twee kaarten naast elkaar, net als bij een gemengd speelbeeld. Bij 35 rondes op een baan van 1 credit staat links 20 credits voor EUR 485,00 met de rondes daarna per ronde afgerekend, en rechts 60 credits voor EUR 1.030,00 met 25 credits ruimte over.
* De marge waarbinnen twee routes gelijkwaardig zijn, staat onder Instellingen en is standaard 15 procent. Daarbuiten adviseert de keuzehulp gewoon de goedkoopste route.
* Bij zo'n dubbele kaart staat er geen derde kaart met een alternatief meer onder.
* Het advies bij bijspelen op greenfee noemt nu ook de andere mogelijkheid: een nieuw speelrecht van hetzelfde aantal credits.

= 1.11.0 =
* Een kleiner speelrecht met de resterende rondes tegen het gereduceerde greenfeetarief doet nu mee als volwaardige optie. Wie 30 credits nodig heeft, krijgt daardoor 20 credits voor EUR 485,00 geadviseerd in plaats van 60 credits voor EUR 1.030,00. Het omslagpunt ligt rond 40 credits; daarboven dekt het grotere speelrecht alles en is dat weer het advies.
* Bij zo'n advies verschijnt geen prijs per ronde voor de grote baan, want die zou alleen de credits bevatten en dus te laag uitkomen.
* Teksten aangepast op verzoek van de club: HGC-keuzehulp, Het best passende speelrecht, Hoe ziet je golfjaar eruit, en rondes per 12 maanden in plaats van per jaar.
* De term algemeen speelrecht is HGC-speelrecht geworden.
* De baantypen heten nu Par 3/4/5-baan en Shortgolfbaan / Par 3-baan.

= 1.10.6 =
* Een onafgerond templatebestand dat nog in ontwikkeling is, zat per ongeluk in het pakket van 1.10.5. Het werd door geen enkele shortcode gebruikt en kon dus niets stukmaken, maar hoort niet in een release.

= 1.10.5 =
* Het gemarkeerde blok onderaan de advieskaart verschijnt alleen nog wanneer een speelrecht de opgegeven rondes niet dekt. Dekt het wel, dan zei dat blok hetzelfde als de regel erboven.
* Koppen breken niet meer af op een los woord.
* Het label "Hoeveel rondes per jaar?" is "Rondes per jaar" geworden, zodat het op een regel past.
* De kleine baan heet nu overal kleine baan; het woord Shortgolf is voorbehouden aan het speelrecht.

= 1.10.4 =
* De knop "Opnieuw controleren" op de updatepagina werkt nu ook voor deze plugin. De laatst gevonden release werd zes uur bewaard, waardoor WordPress na een nieuwe release nog uren meldde dat alles up-to-date was.
* Is GitHub onbereikbaar, dan wordt dat een kwartier onthouden. Zonder dat deed iedere updatecontrole opnieuw een verzoek met tien seconden wachttijd.

= 1.10.3 =
* De bedragen in de kostenkaarten boven het advies stonden klein en grijs in plaats van groot en donker. De opmaakregel voor de toelichting onder het bedrag pakte ook de tekst van het bedrag zelf mee, omdat dat in een span binnen de strong staat. Die regel geldt nu alleen voor de toelichting.
* Daarmee verdwijnt de lege ruimte boven het bedrag die de kaarten onnodig hoog maakte.

= 1.10.2 =
* De keuzehulp schildert in WordPress geen eigen achtergrond meer. Het lichtgroene kader met 32 pixels ruimte om de kaart was bedoeld als paginakleur voor de losse testpagina, maar verscheen in WordPress als een groen blok bovenop de achtergrond van het thema. In een pagina staat nu alleen de witte kaart; de testpagina houdt het kader.

= 1.10.1 =
* Opgelost: op de live site waren productnamen onleesbaar. Het WordPress-thema gaf koppen een witte kleur, en de keuzehulp liet die kleur over aan het thema. Kleur, regelafstand en afbreekstreepjes staan nu vast in de keuzehulp zelf, zodat de weergave in elk thema gelijk is.
* Daarmee verdwijnen ook de te ruime witruimte in de kostenkaarten en afbreekstreepjes midden in een woord.

= 1.10.0 =
* De plugin heet nu Hollandsche Golfclub Keuzehulp en staat in de map hgc-keuzehulp. De opgeslagen instellingen en alle shortcodes blijven ongewijzigd, dus bestaande pagina’s werken door. Een achtergebleven map hgc-credit-calculator op de server kan daarna weg.
* Het advies bestaat altijd uit één speelrecht. Dekt geen enkel speelrecht de opgegeven rondes, dan adviseert de keuzehulp het grootste speelrecht met de melding hoeveel het dekt, in plaats van een samengesteld advies als "120 credits + 2 x 20 credits" met een prijs voor drie aankopen.
* Bij jeugd- en dalurenspeelrechten bestaat alleen een pakket van 20 credits. Wie daar meer credits nodig heeft, ziet dus dat ene speelrecht met de melding dat het een deel van de rondes dekt.
* De instelling "Eén speelrecht heeft voorrang" is vervallen; dat is nu altijd zo.

= 1.9.0 =
* Golfpark Maastricht International en Golfpark Naarderbos hebben vastgestelde creditwaarden: Maastricht 1 credit voor de grote baan en 0,8 voor de kleine, Naarderbos 0,9 en 0,5. De markering "voorlopige waarden" is bij beide banen weg.
* Beide banen hebben nu ook een kleine baan in de keuzehulp.
* De gereduceerde greenfee van de grote baan staat erbij: Maastricht EUR 40,00 en Naarderbos EUR 24,00, het volledige tarief min 20 procent.
* Voor Maastricht en Naarderbos is nog geen Shortgolf-creditwaarde bekend, dus daar adviseert de keuzehulp geen Shortgolf-speelrecht.
* De route met meerdere aankopen staat niet meer als tweede advies. Zijn twee kleinere speelrechten samen goedkoper, dan staat nu het kleinere speelrecht eronder met de melding dat het de opgegeven rondes niet dekt en dat er een nieuw speelrecht bij kan zodra de credits op zijn.

= 1.8.1 =
* Handicapregistratie zit standaard niet meer in de getoonde bedragen. Een speelrecht van 60 credits staat er voor EUR 1.030,00 en een Shortgolf-speelrecht van 60 credits voor EUR 585,00.
* De bezoeker kan handicapregistratie in het advies zelf aanvinken; de bedragen lopen dan op naar EUR 1.089,50 en EUR 644,50.
* Een beheerder kan de standaardstand omzetten onder Instellingen.

= 1.8.0 =
* De gereduceerde greenfees wegen mee bij het bepalen van het advies, maar blijven buiten het getoonde bedrag. Dat bedrag is de prijs van het speelrecht zelf.
* Het advies vermeldt dat de rondes op de grote baan per ronde worden afgerekend tegen het gereduceerde greenfeetarief en dat dat bedrag niet in de prijs zit.

= 1.7.1 =
* De gereduceerde greenfeetarieven van de grote baan zijn ingevuld voor veertien golfparken, overgenomen uit de flyer Hollandsche Golfclub Greenfees 2026.
* Voor Golfpark Naarderbos staat geen tarief op die flyer; ShortGolf Utrecht heeft geen grote baan. Die twee velden blijven leeg.

= 1.7.0 =
* Per baan is het gereduceerde greenfeetarief voor een ronde van 9 holes op de grote baan in te vullen onder Instellingen.
* De keuzehulp rekent de grote-baanrondes van een Shortgolf-speelrecht tegen dat tarief mee, zodat de vergelijking met een algemeen speelrecht eerlijk is. Bij 60 kleine en 8 grote rondes komt Shortgolf daarmee als advies naar voren.
* Het greenfeetarief zelf wordt niet aan de bezoeker getoond. Het zit verwerkt in het totaalbedrag; er verschijnt geen tarief per ronde en geen kostenkaart voor de grote baan.
* Zolang een tarief leeg is, verandert er niets: het advies meldt dan dat de grote-baanrondes buiten het speelrecht vallen.

= 1.6.1 =
* Een algemeen speelrecht vermeldt dat je onbeperkt medespelers kunt introduceren tegen een gereduceerd greenfeetarief.
* Een Shortgolf-speelrecht vermeldt dat je op de grote banen tegen een gereduceerd greenfeetarief speelt.

= 1.6.0 =
* Het geadviseerde speelrecht dekt altijd alle opgegeven rondes. Zijn er 31,2 credits nodig, dan adviseert de keuzehulp 60 credits in plaats van een instappakket van 20 credits.
* Zijn meerdere kleinere pakketten samen goedkoper, dan staat het kleinere speelrecht als tweede advies onder het hoofdadvies, met de melding dat het de rondes niet dekt.
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
