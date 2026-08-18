# Hollandsche Golfclub Credit Calculator voor WordPress

WordPress-plugin voor de Hollandsche Golfclub. De calculator vergelijkt de huidige golfkosten van een bezoeker met de ingestelde speelrechten, LoyalTee en handicapregistratie.

## Installeren in WordPress

De live site gebruikt `DISALLOW_FILE_MODS = true`. De plugin staat daarom direct op de Git-deploylocatie:

`wordpress/wp-content/plugins/hgc-credit-calculator/`

1. Push of merge de plugin naar de branch die de live site deployt.
2. Wacht tot de automatische Git-deploy klaar is.
3. Ga in WordPress naar **Plugins** en activeer **Hollandsche Golfclub Credit Calculator**.
4. Plaats `[hgc_calculator]` in de gewenste WordPress-pagina.

De beveiligingsinstelling hoeft niet aangepast te worden. Als alternatief kan de map uit `dist/hgc-credit-calculator.zip` via SFTP naar `wp-content/plugins/` worden geüpload.

De alternatieve shortcode `[hgc_rekentool]` werkt ook.

## Beheer in WordPress

Onder **Instellingen > Hollandsche Golfclub Calculator** kan een beheerder zonder code:

- golfbanen toevoegen, aanpassen en verwijderen;
- creditwaarden per baanronde wijzigen;
- reguliere en LoyalTee-greenfees voor 9 holes, 18 holes en shortgolf beheren;
- algemene, daluren-, jeugd- en shortgolfpakketten toevoegen of verwijderen;
- handicapregistratie, LoyalTee, links en voordelen aanpassen;
- alle waarden terugzetten naar de standaardconfiguratie uit GitHub.

De opgeslagen WordPress-instellingen overschrijven de standaardwaarden uit `hgc-config.json`. Een reset gebruikt opnieuw de actuele standaardwaarden uit de geïnstalleerde GitHub-versie.

## Aanpassen via GitHub

De plugincode staat onder `wordpress/wp-content/plugins/hgc-credit-calculator/`. Standaardtarieven en banen staan in `hgc-config.json`; vormgeving in `styles.css`; teksten en rekenlogica in `calculator.js` en `templates/calculator.php`. `hgc-config.js` bevat dezelfde standaardwaarden voor de losse lokale testpagina.

Voor een nieuwe WordPress-versie:

1. Verhoog `Version` en `HGC_CALCULATOR_VERSION` in `hgc-credit-calculator.php`.
2. Verhoog `Stable tag` in `readme.txt`.
3. Commit en push de wijzigingen naar GitHub.
4. Maak en push een tag, bijvoorbeeld `v1.0.2`.

De workflow `.github/workflows/release.yml` verpakt de deploymap automatisch als `hgc-credit-calculator.zip` en plaatst dit bestand bij een GitHub Release. Op de beveiligde live site blijft Git-deploy de primaire updater, omdat dashboardupdates door `DISALLOW_FILE_MODS` zijn geblokkeerd.

## Lokaal openen

Omdat JavaScript-modules door een webserver geladen moeten worden:

```powershell
node dev-server.mjs
```

Open daarna `http://localhost:8000`.

## Starten met dubbelklik

- `HGC Calculator.exe` start een ingebouwde lokale webserver en opent de calculator in de standaardbrowser. Hiervoor is Node.js niet nodig.
- `Start HGC Calculator.cmd` doet hetzelfde via `dev-server.mjs` en vereist dat Node.js is geïnstalleerd.

Laat de launcher bij `index.html` en de map `wordpress/` staan. De `.exe` blijft op de achtergrond actief zolang de lokale calculator beschikbaar moet blijven.

## Tarieven aanpassen

Alle prijzen, creditwaarden, links, voordelen en belangrijke rekeninstellingen zijn via het WordPress-beheerscherm aanpasbaar. De GitHub-standaardwaarden staan in `wordpress/wp-content/plugins/hgc-credit-calculator/hgc-config.json`.

## Belangrijke ingestelde aannames

- De bezoeker voert altijd het aantal rondes van 9 holes in en kiest daarna tussen de grote en kleine baan.
- Binnen het grootste beschikbare pakket wordt één pakket geadviseerd dat alle verwachte credits dekt.
- Handicapregistratie wordt standaard in ieder advies meegenomen.
- Handicapregistratie doet ook zelfstandig mee in de automatische vergelijking: twee rondes zijn inbegrepen en eventuele extra rondes worden tegen het reguliere greenfeetarief berekend.
- Onder het hoofdadvies toont de calculator automatisch vanaf hoeveel rondes een flexibelere of ruimere optie van Hollandsche Golfclub voordeliger wordt.
- Hollandsche Golfclub LoyalTee wordt automatisch vergeleken met de speelrechten op basis van de ingestelde greenfeetarieven per baan. Het €25 ballentegoed wordt als voordeel getoond, maar niet van de golfkosten afgetrokken.
- Bij ieder speelrecht worden resterende rondes na het opgebruiken van de credits meegerekend tegen het gereduceerde greenfeetarief. Daardoor kan een kleiner speelrecht plus losse rondes voordeliger zijn dan een groter pakket.
- ShortGolf Utrecht is uitgesloten van de LoyalTee-korting, conform de voorwaarden van Hollandsche Golfclub.
- Maastricht International en Naarderbos staan in de lijst met gemarkeerde voorlopige creditwaarden. Pas deze in WordPress of in `hgc-config.json` aan zodra Hollandsche Golfclub de officiële vernieuwde credittabel publiceert.
- Het dalurenpakket wordt alleen geadviseerd wanneer het verwachte creditverbruik binnen het beschikbare pakket past.
- Lokale speelrechten worden alleen vergeleken bij De Breuninkhof en Land van Thorn.

Laat Hollandsche Golfclub deze aannames controleren voordat de calculator publiek wordt ingezet.

## Analytics

De calculator stuurt gebeurtenissen naar `window.dataLayer`, waaronder:

- `calculator_opened`
- `calculator_step_1_completed`
- `calculator_result_viewed`
- `calculator_product_clicked`
- `calculator_restarted`

Hiermee kan Google Tag Manager de campagneconversies meten.

## WordPress

Na de Git-deploy hoeft de plugin alleen nog in het WordPress Plugins-overzicht geactiveerd te worden. Gebruik daarna `[hgc_calculator]` op de gewenste pagina.
