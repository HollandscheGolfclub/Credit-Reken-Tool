# Hollandsche Golfclub Credit Calculator voor WordPress

WordPress-plugin voor de Hollandsche Golfclub. De keuzehulp adviseert een passend speelrecht op basis van het verwachte aantal 9-holesrondes op een grote en een kleine baan.

## Installeren in WordPress

De live site gebruikt `DISALLOW_FILE_MODS = true`. De plugin staat daarom direct op de Git-deploylocatie:

`wordpress/wp-content/plugins/hgc-credit-calculator/`

1. Push of merge de plugin naar de branch die de live site deployt.
2. Wacht tot de automatische Git-deploy klaar is.
3. Ga in WordPress naar **Plugins** en activeer **Hollandsche Golfclub Credit Calculator**.
4. Plaats de gewenste shortcode in een WordPress-pagina.

De beveiligingsinstelling hoeft niet aangepast te worden. Als alternatief kan de map uit `dist/hgc-credit-calculator.zip` via SFTP naar `wp-content/plugins/` worden geüpload.

## Gecombineerd of als twee varianten plaatsen

`[hgc_calculator]` toont eerst een verzorgde keuze tussen de twee rekenroutes en opent daarna de gekozen berekening op dezelfde pagina.

De routes kunnen daarnaast nog steeds los op aparte WordPress-pagina's worden geplaatst:

- `[hgc_calculator mode="keuzehulp"]` of `[hgc_keuzehulp]` voor de huidige speelrechtkeuze.
- `[hgc_calculator mode="vergelijking"]` of `[hgc_besparingscalculator]` voor de vergelijking met huidige golfkosten.

`[hgc_rekentool]` toont eveneens de gecombineerde start. Link vanuit social media desgewenst rechtstreeks naar een pagina met één van de losse varianten.

Een iframe via een pagina-URL is alleen nodig wanneer de calculator op een andere website of een ander domein moet worden geplaatst. Controleer dan eerst `X-Frame-Options`, de Content Security Policy, cookie-instellingen en de automatische iframehoogte.

## Beheer in WordPress

Onder **Instellingen > Hollandsche Golfclub Calculator** kan een beheerder zonder code:

- golfbanen toevoegen, aanpassen en verwijderen;
- aparte creditwaarden voor algemene en Shortgolf-speelrechten wijzigen;
- reguliere en LoyalTee-greenfees beheren;
- algemene, daluren-, jeugd- en Shortgolf-pakketten toevoegen of verwijderen;
- handicapregistratie, LoyalTee, links en voordelen aanpassen;
- alle waarden terugzetten naar de standaardconfiguratie uit GitHub.

Opgeslagen WordPress-instellingen overschrijven de standaardwaarden uit `hgc-config.json`. Nieuwe configuratievelden uit een pluginupdate worden automatisch aangevuld zonder bestaande beheerdersinstellingen te overschrijven.

## Aanpassen via GitHub

De plugincode staat onder `wordpress/wp-content/plugins/hgc-credit-calculator/`. Standaardtarieven en banen staan in `hgc-config.json`; vormgeving in `styles.css`; teksten en rekenlogica in `calculator.js` en `templates/calculator.php`. `hgc-config.js` bevat dezelfde standaardwaarden voor de losse lokale testpagina.

Voor een nieuwe WordPress-versie:

1. Verhoog `Version` en `HGC_CALCULATOR_VERSION` in `hgc-credit-calculator.php`.
2. Verhoog `Stable tag` in `readme.txt`.
3. Commit en push de wijzigingen naar GitHub.
4. Maak en push een tag, bijvoorbeeld `v1.3.0`.

De workflow `.github/workflows/release.yml` verpakt de deploymap automatisch als `hgc-credit-calculator.zip` en plaatst dit bestand bij een GitHub Release. Op de beveiligde live site blijft Git-deploy de primaire updater, omdat dashboardupdates door `DISALLOW_FILE_MODS` zijn geblokkeerd.

## Lokaal openen

```powershell
node dev-server.mjs
```

Open daarna `http://localhost:8000`.

- `http://localhost:8000/` toont de keuzehulp.
- `http://localhost:8000/vergelijking.html` toont de kostenvergelijking.

- `HGC Calculator.exe` start een ingebouwde lokale webserver en opent de keuzehulp in de standaardbrowser. Hiervoor is Node.js niet nodig.
- `Start HGC Calculator.cmd` doet hetzelfde via `dev-server.mjs` en vereist Node.js.

Laat de launcher bij `index.html` en de map `wordpress/` staan.

## Belangrijke ingestelde keuzes

- De bezoeker voert apart het aantal grote- en kleine-baanrondes van 9 holes in en kiest voor ieder baantype een golfpark.
- Algemene en Shortgolf-speelrechten gebruiken hun eigen creditwaarden voor de kleine baan.
- Een algemeen speelrecht dekt alle benodigde credits. Zijn bijvoorbeeld 22 credits nodig, dan kan de keuzehulp twee opeenvolgende pakketten van 20 credits adviseren; er worden geen losse greenfees als aanvulling gebruikt.
- Een Shortgolf-speelrecht kan bij een combinatie worden geadviseerd. Kleine rondes gebruiken Shortgolf-credits en grote rondes worden tegen het gereduceerde greenfeetarief berekend.
- Bij gecombineerd spelen doet Shortgolf standaard alleen mee wanneer minimaal 33% van de rondes op een kleine baan wordt gespeeld. Dit percentage is aanpasbaar in WordPress-beheer.
- Handicapregistratie wordt standaard in ieder advies meegenomen.
- De twee persoonlijke greenfees van handicapregistratie zijn extra rondes en worden bij een speelrecht niet van de benodigde credits afgetrokken.
- Handicapregistratie doet zelfstandig mee voor laag speelvolume. De twee inbegrepen rondes zijn greenfees en nooit credits.
- Vanaf 20 benodigde algemene credits geeft de keuzehulp voorrang aan een passend credit-speelrecht. Dit borgt de gewenste productkeuze boven een puur rekenkundige greenfeevergelijking.
- LoyalTee wordt voor lager speelvolume vergeleken op basis van de ingestelde greenfees. Het ballentegoed wordt niet van de kosten afgetrokken.
- Lokale speelrechten worden alleen meegenomen wanneer alle opgegeven rondes op hetzelfde ondersteunde lokale golfpark worden gespeeld.
- Maastricht International en Naarderbos gebruiken gemarkeerde voorlopige waarden totdat officiële vernieuwde tarieven beschikbaar zijn.

Laat de Hollandsche Golfclub deze aannames controleren voordat de keuzehulp publiek wordt ingezet.

## Analytics

De keuzehulp stuurt gebeurtenissen naar `window.dataLayer`:

- `calculator_opened`
- `calculator_step_1_completed`
- `calculator_result_viewed`
- `calculator_product_clicked`
- `calculator_restarted`

Hiermee kan Google Tag Manager de campagneconversies meten.
