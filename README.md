# HGC Credit Calculator voor WordPress

WordPress-plugin voor de Hollandsche Golfclub. De calculator vergelijkt de huidige golfkosten van een bezoeker met de ingestelde HGC-speelrechten, LoyalTee en handicapregistratie.

## Installeren in WordPress

1. Upload `dist/hgc-credit-calculator.zip` via **Plugins > Nieuwe plugin > Plugin uploaden**.
2. Activeer **HGC Credit Calculator**.
3. Plaats `[hgc_calculator]` in de gewenste WordPress-pagina.

De alternatieve shortcode `[hgc_rekentool]` werkt ook.

## Beheer in WordPress

Onder **Instellingen > HGC Calculator** kan een beheerder zonder code:

- golfbanen toevoegen, aanpassen en verwijderen;
- creditwaarden per baanronde wijzigen;
- reguliere en LoyalTee-greenfees voor 9 holes, 18 holes en shortgolf beheren;
- algemene, daluren-, jeugd- en shortgolfpakketten toevoegen of verwijderen;
- handicapregistratie, LoyalTee, links en voordelen aanpassen;
- alle waarden terugzetten naar de standaardconfiguratie uit GitHub.

De opgeslagen WordPress-instellingen overschrijven de standaardwaarden uit `hgc-config.json`. Een reset gebruikt opnieuw de actuele standaardwaarden uit de geïnstalleerde GitHub-versie.

## Aanpassen via GitHub

De broncode staat in `HollandscheGolfclub/Credit-Reken-Tool`. Standaardtarieven en banen staan in `hgc-config.json`; vormgeving in `styles.css`; teksten en rekenlogica in `calculator.js` en `templates/calculator.php`. `hgc-config.js` bevat dezelfde standaardwaarden voor de losse lokale testpagina.

Voor een nieuwe WordPress-versie:

1. Verhoog `Version` en `HGC_CALCULATOR_VERSION` in `hgc-credit-calculator.php`.
2. Verhoog `Stable tag` in `readme.txt`.
3. Commit en push de wijzigingen naar GitHub.
4. Maak en push een tag, bijvoorbeeld `v1.0.1`.

De workflow `.github/workflows/release.yml` bouwt dan automatisch `hgc-credit-calculator.zip` en plaatst dit bestand bij een GitHub Release. Bestaande WordPress-installaties zien de nieuwe versie vervolgens als normale plugin-update.

## Lokaal openen

Omdat JavaScript-modules door een webserver geladen moeten worden:

```powershell
node dev-server.mjs
```

Open daarna `http://localhost:8000`.

## Starten met dubbelklik

- `HGC Calculator.exe` start een ingebouwde lokale webserver en opent de calculator in de standaardbrowser. Hiervoor is Node.js niet nodig.
- `Start HGC Calculator.cmd` doet hetzelfde via `dev-server.mjs` en vereist dat Node.js is geïnstalleerd.

Laat de launcher in dezelfde map staan als `index.html`, `styles.css`, `calculator.js` en `hgc-config.js`. De `.exe` blijft op de achtergrond actief zolang de lokale calculator beschikbaar moet blijven.

## Tarieven aanpassen

Alle prijzen, creditwaarden, links, voordelen en belangrijke rekeninstellingen staan in `hgc-config.js`. Voor reguliere tariefwijzigingen hoeven `calculator.js`, `styles.css` en `index.html` niet aangepast te worden.

## Belangrijke ingestelde aannames

- Een 18-holesronde telt voor de berekening als twee HGC-baanrondes.
- Binnen het grootste beschikbare pakket wordt één pakket geadviseerd dat alle verwachte credits dekt.
- Handicapregistratie is optioneel en staat standaard uit.
- Handicapregistratie doet ook zelfstandig mee in de automatische vergelijking: twee rondes zijn inbegrepen en eventuele extra rondes worden tegen het reguliere greenfeetarief berekend. De schakelaar betekent dat registratie verplicht in ieder advies moet zitten.
- Onder het hoofdadvies toont de calculator automatisch vanaf hoeveel rondes een flexibelere of ruimere HGC-optie voordeliger wordt.
- HGC LoyalTee wordt automatisch vergeleken met de speelrechten op basis van de ingestelde greenfeetarieven per baan. Het €25 ballentegoed wordt als voordeel getoond, maar niet van de golfkosten afgetrokken.
- Bij ieder speelrecht worden resterende rondes na het opgebruiken van de credits meegerekend tegen het gereduceerde greenfeetarief. Daardoor kan een kleiner speelrecht plus losse rondes voordeliger zijn dan een groter pakket.
- ShortGolf Utrecht is uitgesloten van de LoyalTee-korting, conform de HGC-voorwaarden.
- Maastricht International en Naarderbos staan in de lijst met gemarkeerde voorlopige creditwaarden. Pas deze in `hgc-config.js` aan zodra HGC de officiële vernieuwde credittabel publiceert.
- Het dalurenpakket wordt alleen geadviseerd wanneer het verwachte creditverbruik binnen het beschikbare pakket past.
- Lokale speelrechten worden alleen vergeleken bij De Breuninkhof en Land van Thorn.

Laat HGC deze aannames controleren voordat de calculator publiek wordt ingezet.

## Analytics

De calculator stuurt gebeurtenissen naar `window.dataLayer`, waaronder:

- `calculator_opened`
- `calculator_step_1_completed`
- `calculator_result_viewed`
- `calculator_product_clicked`
- `calculator_restarted`

Hiermee kan Google Tag Manager de campagneconversies meten.

## WordPress

De bestanden zijn dependency-vrij en kunnen als losse campagnepagina worden gehost. Voor plaatsing in de bestaande WordPress-site kunnen de HTML, CSS en JavaScript in een kleine shortcode-plugin worden verpakt. De daadwerkelijke WordPress-integratie vereist toegang tot de HGC WordPress-installatie of het gebruikte deploymentproces.
