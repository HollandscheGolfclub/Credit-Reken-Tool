=== Hollandsche Golfclub Keuzehulp ===
Contributors: hollandschegolfclub
Tags: golf, calculator, speelrecht, credits
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 2.0.2
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

= 2.0.2 =
* De "Meer speelruimte"-kaart naast een handicapregistratie-/LoyalTee-advies toont niet langer de prijszin "Voor € X meer heb je een speelrecht dat al je opgegeven rondes dekt", alleen nog de twee bullets eronder (extra credits, onbeperkt flightgenoten introduceren).

= 2.0.1 =
* De golfswing-iconen bij "Grote baan" en "Kleine baan" (toegevoegd in 2.0.0) zijn weer verwijderd; die kaarten tonen nu alleen de titel en toelichting.
* "Bezoek pluginwebsite" in het WordPress-pluginoverzicht verwijst nu naar hollandschegolfclub.nl in plaats van de GitHub-repository.

= 2.0.0 =
* Iconen bij "Grote baan" en "Kleine baan" in stap 1 zijn vervangen: beide tonen nu dezelfde golfswing-pictogram (was een "9" resp. een vlaggetje) in het groen van de club, in plaats van twee verschillende stijlen.
* Het "Voorbehoud bij uitslag" (het "Let op bij [baan]: ..." bericht op het resultaatscherm) is per baan instelbaar gemaakt in het adminscherm (Instellingen → Hollandsche Golfclub Calculator), in plaats van vast in de code.
* De alternatiefkaart "Meer speelruimte" (het grotere speelrecht als upsell) is anders ingevuld: in plaats van "Je krijgt X credits extra voor € Y meer" staat er nu of dit grotere speelrecht al je opgegeven rondes volledig dekt of een groter deel daarvan, zonder een bedrag te herhalen dat al bovenaan de kaart staat.
* Auteur bijgewerkt naar Jesse Weevers | Hollandsche Golfclub.

= 1.32.0 =
* Openingstekst keuzehulp aangescherpt: "Twee stappen, ongeveer een minuut, zodat je weet wat je kosten zijn."
* Creditwaarden gecorrigeerd op basis van feedback: grote baan Rotterdam naar 0,9 credit, kleine baan Naarderbos met Shortgolf-speelrecht naar 0,75 credit, ShortGolf Utrecht naar 0,50 (HGC-speelrecht) / 0,75 (Shortgolf-speelrecht) credit per ronde.
* Maastricht International kwam ten onrechte voor als optie bij de kleine baan (er is daar geen shortgolf-speelrecht); nu alleen nog te kiezen als grote baan.
* Reymerswael en Maastricht International hebben een baanindeling met lussen die afwijkt van de standaard 9-holesindeling. De keuzehulp toont daar nu een voorbehoud bij in het resultaat; bij Reymerswael specifiek genoemd: naast de 12-holeslus (1,2 credit per ronde, de aanname in de berekening) bestaat er ook een 6-holeslus van 0,6 credit per ronde.
* Resultaatscherm herzien: "Wat je nu betaalt" / "Wat je per ronde betaalt" heten nu "Wat je vooraf betaalt" / "Wat je verder betaalt" (ook als kopje boven de resterende kosten bij gedeeltelijke dekking), "Volledige greenfee" heet "Losse greenfee", en het label bij gedeeltelijke dekking begint nu met "Let op:".
* De knoppenrij onder het advies is vervangen door "Meer over Handicapregistratie", "Meer over speelrechten", "Alle greenfeeprijzen" en "Naar de webshop", in die volgorde.
* Alle vinkjeslijsten met voordelen zijn verwijderd uit de adviesschermen: de keuzehulp verwijst voor de inhoud van een speelrecht bewust naar de website in plaats van dit zelf samen te vatten.
* De alternatiefkaart ("Meer vrijheid nodig?") heet nu "Meer speelruimte" en toont geen apart kadertje met knop meer, alleen de toelichting.
* Bugfix: het verschilbedrag in "Meer speelruimte" ("Voor € X meer...") rekende altijd met handicapregistratie inbegrepen, ook wanneer de schakelaar op "zonder handicapregistratie" stond. Daardoor klopte dat bedrag niet met de rest van het scherm. Volgt nu dezelfde schakelaar als de andere bedragen.
* Jeugd kreeg tot nu toe bij een laag aantal rondes altijd een regulier Jeugd-speelrecht geadviseerd, omdat handicapregistratie en LoyalTee alleen voor volwassenen beschikbaar waren. Jeugd heeft nu ook een handicapregistratie-route, met het vaste jeugdgreenfeetarief van EUR 10 per ronde (op elk park gelijk); LoyalTee blijft uitsluitend voor volwassenen.
* Onbenutte code opgeruimd die alleen nog de verwijderde vinkjeslijsten bediende.

= 1.31.0 =
* Boekingsschermen restaurantreservering volledig herbouwd, op basis van meegeleverde ontwerpen (2a: desktopwizard, 2b: mobiele popup):
  - Desktop: ingebouwde 3-stappen wizard (wanneer/hoeveel → tijd → gegevens) met dagenrij, +/- teller voor aantal personen, tijden gegroepeerd onder Lunch/Diner, een meelopende samenvatting in de zijbalk en een voortgangsbalk.
  - Mobiel (kleiner dan 760px): eerst een compacte teaserkaart met een "Reserveer uw tafel"-knop; die opent dezelfde boekingsstappen in een sheet die van onderop opschuift, met een vaste knop onderaan.
  - Nieuwe instellingen (optioneel): clublogo, parklogo, telefoonnummer, adres en een vrije tekst voor openingstijden — allemaal weg te laten, dan worden de bijbehorende regels gewoon niet getoond.
  - Bugfix onderweg: de mobiele sheet werd buiten de widget in de pagina gehangen, waardoor hij de kleuren en de box-sizing van de widget niet overerfde en zichtbaar kapot oogde (verkeerde kleuren, scheve afstanden). De sheet hangt nu binnen de widget zelf; `position: fixed` dekt nog steeds gewoon de hele viewport.
  - Bewuste keuzes: geen "X vrij"-aantal per dag in de dagenrij (zou 6 extra Connect-aanroepen per paginabezoek kosten, tegen de recente koude-start-aanpak in) en geen verzonnen annuleringstermijn in de tekst (die regel stond alleen in het ontwerp, niet in de echte Connect-koppeling).

= 1.30.0 =
* Bugfix restaurantreservering: de laadkaart bleef zichtbaar staan boven het echte formulier, ook nadat JavaScript hem al had verstopt. Oorzaak: een eigen CSS-regel voor die kaart (`display: flex`) won het altijd van het browserstandaard-gedrag voor het "verborgen"-attribuut, ongeacht wat JavaScript deed. Daardoor stond er permanent een dubbel, kapoog-ogend blok. Opgelost met een expliciete CSS-regel die voorrang krijgt zodra het element verborgen is.
* Restaurantreservering toont het boekingsformulier nu meteen bij het laden van de pagina, met redelijke standaardwaarden (datum vanaf vandaag, 1 t/m 12 personen), in plaats van te wachten tot de Connect-koppeling heeft geantwoord. Zodra de koppeling wel antwoord geeft, worden de echte restaurantnaam en de werkelijke grenzen voor datum en groepsgrootte alsnog toegepast, zonder de pagina te blokkeren. Bezoekers hoeven dus niet meer op een koude start te wachten voordat ze kunnen beginnen met invullen.

= 1.29.0 =
* Restaurantreservering: automatische warmhoud-ping toegevoegd. De onderliggende Connect-functie is serverless en valt na een tijdje stil ("koude start"); daardoor kon de eerste bezoeker na een stille periode enkele tellen op de widget moeten wachten. De plugin stuurt nu zelf elke 5 minuten een klein, gratis leesalleen-verzoek naar de Connect-koppeling om de functie warm te houden, zonder dat daarvoor iets ingesteld hoeft te worden. Werkt alleen als de site regelmatig bezoekers heeft (WP-Cron draait mee met paginabezoeken); voor een garantie ongeacht bezoekersaantal kan de Connect-beheerder ook een "minimum aantal instanties"-instelling overwegen aan de kant van Base44 zelf.

= 1.28.0 =
* Bugfix restaurantreservering: de laadtekst verdween meteen bij het openen van de pagina, terwijl de daadwerkelijke inhoud pas verscheen zodra de Connect-koppeling had geantwoord. Bij een trage koppeling (bijvoorbeeld een koude start) oogde de widget daardoor een paar tellen leeg en kapot. De laadstatus blijft nu zichtbaar totdat er echt iets te tonen is.
* Restaurantreservering visueel verder afgewerkt: draaiende laadindicator in plaats van kale tekst, een kopband met kleurverloop boven het formulier (zelfde patroon als de keuzehulp), en een zachte inkomanimatie voor kaarten, tijdsloten en het bevestigingsscherm.

= 1.27.0 =
* Nieuw hulpmiddel toegevoegd: Extra hulpmiddelen → Pluginmap opschonen. Voor als Plugins → Verwijderen een pluginmap als verwijderd meldt, maar hij na verversen terugkomt (WordPress’ eigen bestandssysteem-laag heeft dan geen echte schrijfrechten en negeert dat stilletjes). Dit verwijdert rechtstreeks met PHP, uitsluitend mappen direct onder wp-content/plugins; niets daarbuiten is te zien of te benaderen. Komt mee via deze plugin, dus geen aparte installatie nodig.

= 1.26.0 =
* De restaurantreservering in de HGC-huisstijl gezet: Poppins-lettertype (werd nog geladen als dat nog niet gebeurd was), de groentinten van de keuzehulp in plaats van de generieke standaardkleur, en afgeronde pil-chips voor de tijdstippen in plaats van vierkante knopjes. Functioneel ongewijzigd.

= 1.25.0 =
* Restaurantreservering (voorheen de losse plugin HGC Restaurant Reserveren) samengevoegd in deze plugin: één plugin, één versienummer, één auto-updater vanuit deze GitHub-repo, en de instellingen staan op dezelfde pagina (Instellingen → Hollandsche Golfclub Calculator). Shortcode [hgc_restaurant_reserveren park="almkreek"] of het blok “HGC Restaurant Reserveren”. De reserveringsdata zelf blijft buiten WordPress, bij HGC Connect; deze plugin doet alleen het formulier en een dunne AJAX-proxy naar de Connect-koppeling.
* Was eerder de losse plugin HGC Restaurant Reserveren v1.0.0; die kan na deze update gedeactiveerd en verwijderd worden.

= 1.24.0 =
* De prijs-per-ronde-kaarten voor grote en kleine baan verdwenen tot nu toe zodra een deel van de rondes op greenfee werd bijgespeeld, omdat de oude berekening de pakketprijs over alle gespeelde rondes verdeelde (inclusief de rondes die niet door credits gedekt zijn) en daardoor een te laag bedrag liet zien. Nu wordt de prijs per ronde berekend op basis van de credits: pakketprijs gedeeld door de credits die je koopt, keer het credittarief van die baan. Dat bedrag klopt ook als een deel van de rondes op greenfee gaat, dus de kaarten staan er weer, met een preciezer bedrag dan voorheen (bijvoorbeeld kleine baan: was eerder al zichtbaar maar te laag doordat dezelfde verdunning meespeelde).

= 1.23.1 =
* Het logo in de kopregel zakte weg van de rechterbovenhoek zodra de introzin de linkerkolom hoger maakte dan de logo-kolom, omdat de kopregel onderaan uitlijnde. Lijnt nu bovenaan uit.
* De alternatiefkaart ("Meer vrijheid nodig?" / "Meer speelruimte") stond op smallere paginabreedtes gestapeld met een doos-in-een-doos: een apart omkaderd vak binnen de toch al omkaderde kaart. De vaste 264px-kolom gold voorheen altijd, ongeacht de breedte; nu is een kolom naast elkaar pas de standaard vanaf voldoende brede pagina, en ziet de gestapelde versie er zonder dubbele rand ook verzorgd uit.

= 1.23.0 =
* Bugfix: had je meer credits nodig dan het grootste beschikbare pakket (bijv. boven de 200 bij een regulier speelrecht, boven het enige daluren-pakket, of boven het grootste Shortgolf-pakket), dan werd dat grootste pakket geadviseerd zonder de kosten van de resterende rondes mee te wegen, terwijl er al een eerlijk geprijsd alternatief bestond (dat pakket plus greenfee voor het tekort). Het te goedkope advies won daardoor onterecht. Raakte vooral daluren-spelers boven 20 credits per jaar.
* Bugfix: bij een baan zonder bekend greenfeetarief voor de kleine baan (Maastricht, Naarderbos) werd dat ontbrekende tarief intern als EUR 0 gelezen in plaats van als onbekend, waardoor handicapregistratie/LoyalTee daar tóch werden aangeboden met de kleine-baanrondes gratis gerekend. Die routes worden nu terecht uitgesloten zolang het tarief ontbreekt.
* De WordPress-configuratiesamenvoeging vult nu ook nieuwe LoyalTee-velden, nieuwe linkjes en een baan die na het laatst opslaan is toegevoegd automatisch aan; eerder verdween een nieuwe baan op een bestaande installatie totdat een beheerder handmatig opnieuw opsloeg.
* Kleine robuustheidsfix: het rekenmodel gaf een crash bij 0 rondes in plaats van nette lege uitkomst (het formulier voorkwam dit al, maar de onderliggende functie niet).
* Gevonden door vier onafhankelijke controles op de aanbevelingslogica; volledige audit (318.780 + 32.670 + 5.280 + 1.215 + 1.316.040 gevallen) draait schoon.

= 1.22.0 =
* Nieuwe vormgeving voor stap 1 (mockup 7b): een korte introzin onder de titel, de creditwaarde per baan nu als losse chips direct onder de baankiezer in plaats van een zin (bij de kleine baan apart voor HGC- en Shortgolf-speelrecht), en een toelichtende zin naast de knop onderaan. De bestaande sliders, invulvelden en baankiezer waren al dicht bij de mockup en zijn verder ongewijzigd.

= 1.21.0 =
* Nieuwe vormgeving doorgevoerd in de resterende adviesschermen: de keuze tussen twee speelrechten bij gemengd spelen (6c) krijgt nu gelijke, even hoge kolommen met een samenvatting eronder, en het scherm bij twee dicht bij elkaar liggende speelrechten volgt dezelfde kopregel en kaartstijl als de rest.
* Ongebruikte code opgeruimd die alleen nog de oude, vervangen kopregel bediende.

= 1.20.0 =
* Nieuwe vormgeving van het adviesscherm (eerste onderdeel): een smalle kopregel met de opgave en de registratieschakelaar in plaats van de grote groene hero, een label dat in een oogopslag zegt waar het advies om draait, genummerde stapkaarten bij handicapregistratie/LoyalTee, en een zachte alternatiefkaart met zwevend label in plaats van de losse voordelenblokken. Lettertype is Poppins geworden.
* De keuze tussen twee speelrechten bij gemengd spelen en de resterende schermen volgen in een latere versie.

= 1.19.1 =
* Bij LoyalTee stond er ook met de schakelaar Handicapregistratie meerekenen uit nog dat de rondes na de vrije rondes van je handicapregistratie per ronde worden afgerekend. De 2 vrije rondes komen echter uit die handicapregistratie; reken je die niet mee, dan geldt de vrijstelling ook niet. Zonder de schakelaar staan nu gewoon alle rondes, zonder vrijstelling te noemen.

= 1.19.0 =
* Winnen handicapregistratie of LoyalTee op prijs, dan blijft dat het advies. Ernaast staat nu altijd een kaart met het goedkoopste speelrecht dat alle opgegeven rondes wel dekt, met wat je daarvoor extra betaalt en wat je ervoor terugkrijgt: ruimte om vaker te spelen dan opgegeven en flightgenoten introduceren tegen het gereduceerde greenfeetarief.

= 1.18.4 =
* Opgelost: de kaart met de prijs per ronde op de kleine baan stond er ook wanneer rondes per stuk tegen greenfee worden afgerekend. Bij 15 rondes op de kleine baan van Almkreek stond er EUR 3,97 per ronde, terwijl dat EUR 16,10 is. Die kaart verschijnt nu alleen wanneer het bedrag volledig is.
* De kaart bovenaan heet Wat je vooraf betaalt zodra er rondes buiten dat bedrag vallen, in plaats van Verwachte kosten per jaar. Dat laatste beweerde een jaartotaal dat het niet was.

= 1.18.3 =
* Opgelost: op een site waar een beheerder ooit op Opslaan had gedrukt, waren handicapregistratie en LoyalTee onzichtbaar. De opgeslagen configuratie kreeg de nieuwe onderdelen niet mee, waardoor de keuzehulp terugviel op een speelrecht. Bij 3 rondes stond er dus EUR 485,00 in plaats van EUR 59,50.
* Ontbrekende onderdelen worden nu uit de standaard aangevuld: LoyalTee, de vrije rondes bij handicapregistratie en de greenfeetarieven per baan.
* Onder Instellingen zijn per baan alle vier de greenfeetarieven in te vullen: grote en kleine baan, normaal en gereduceerd. Opslaan wist ze niet meer.

= 1.18.2 =
* Bijspelen op greenfee wordt afgerond op hele rondes. Er stond bijvoorbeeld "De 17,8 rondes die je nog op de grote baan speelt", en zo’n ronde bestaat niet.
* Daarmee is het bedrag ook exact, want een greenfee betaal je per hele ronde. De keuzehulp rekende die laatste ronde eerder gedeeltelijk mee en kwam dus iets te laag uit.

= 1.18.1 =
* Het advies noemt het speelrecht en de vervolgaankoop, maar telt de aankopen niet meer op tot een bedrag voor het hele jaar. De kaart bovenaan heet bij zo’n route Prijs van dit speelrecht en noemt het bedrag per aankoop.
* De prijs per ronde blijft ongewijzigd; die is bij een herhaalroute gelijk of je hem over een aankoop of over het hele jaar rekent.

= 1.18.0 =
* Hetzelfde speelrecht nog eens kopen zodra de credits op zijn, kan nu het advies zijn. Bij 40 rondes op een baan van een credit per ronde adviseert de keuzehulp 20 credits voor EUR 485,00 met de melding dat je er een tweede bij koopt; samen EUR 970,00, tegen EUR 1.030,00 voor 60 credits.
* Het getoonde bedrag blijft de prijs van een aankoop. De kaart Verwachte kosten per jaar toont het jaartotaal, dus bij zo'n route EUR 970,00, en de prijs per ronde volgt datzelfde jaartotaal.

= 1.17.0 =
* Liggen twee routes van hetzelfde speelrecht dicht bij elkaar, dan staan die adviezen nu onder elkaar in plaats van naast elkaar. Over de volle breedte past de toelichting op twee regels in plaats van zes.
* De keuze tussen een HGC-speelrecht en een Shortgolf-speelrecht blijft naast elkaar staan; daar vergelijkt de bezoeker twee baantypen en dan helpt het om ze naast elkaar te zien.

= 1.16.1 =
* De keuzehulp gebruikt de volle breedte die de pagina hem geeft. De vaste maat van 1060 pixels is eruit, zodat twee kaarten naast elkaar meer ruimte krijgen en minder tekst hoeft af te breken.
* Een advieskaart kan zijn inhoud niet meer afkappen, ook niet wanneer het thema hoogtes of overflow oplegt.
* De knop staat onderaan de kaart. Staan er twee kaarten met verschillende inhoud naast elkaar, dan komt de lege ruimte boven de knop terecht in plaats van tussen de kop en de voordelenlijst.

= 1.16.0 =
* De keuzehulp houdt de ladder van de flyer aan: handicapregistratie, dan LoyalTee, dan een speelrecht. Vanaf 20 rondes per jaar is een speelrecht het advies, ook wanneer per ronde afrekenen daar nog een paar tientjes goedkoper uitvalt.
* Dat was nodig omdat de keuzehulp puur op prijs sorteerde. Bij 25 rondes op de grote en 25 op de kleine baan adviseerde zij LoyalTee voor EUR 945,50 tegen EUR 1.011,17 voor een speelrecht, een verschil van zeven procent, terwijl de flyer daar een speelrecht bij zet.
* De grens staat als feeRouteMaxRounds onder Instellingen en is standaard 20 rondes.

= 1.15.0 =
* Een kleiner Shortgolf-speelrecht met de resterende kleine-baanrondes op greenfee doet nu mee als kandidaat. Die route bestond alleen voor de grote baan, waardoor de keuzehulp bij 40 rondes op de kleine baan van Almkreek LoyalTee adviseerde voor EUR 539,10 terwijl Shortgolf met 20 credits op EUR 538,50 uitkomt.
* De bijspeelroute rekent het tekort nu af op de baan waar de rondes liggen: een Shortgolf-speelrecht op de kleine baan, de overige speelrechten op de grote.

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
