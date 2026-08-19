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

## WordPress-shortcodes

`[hgc_calculator]` toont direct de definitieve lichte HGC-speelrechtkeuzehulp uit de gekozen Clubhuis-vormgeving.

Dezelfde keuzehulp kan ook met `[hgc_calculator mode="keuzehulp"]` of `[hgc_keuzehulp]` worden geplaatst.

`[hgc_rekentool]` toont dezelfde speelrechtkeuzehulp. Link vanuit social media rechtstreeks naar de WordPress-pagina met deze shortcode.

Een iframe via een pagina-URL is alleen nodig wanneer de calculator op een andere website of een ander domein moet worden geplaatst. Controleer dan eerst `X-Frame-Options`, de Content Security Policy, cookie-instellingen en de automatische iframehoogte.

## Beheer in WordPress

Onder **Instellingen > Hollandsche Golfclub Calculator** kan een beheerder zonder code:

- golfbanen toevoegen, aanpassen en verwijderen;
- aparte creditwaarden voor algemene en Shortgolf-speelrechten wijzigen;
- algemene, daluren-, jeugd- en Shortgolf-pakketten toevoegen of verwijderen;
- handicapregistratie, links en voordelen aanpassen;
- alle waarden terugzetten naar de standaardconfiguratie uit GitHub.

Opgeslagen WordPress-instellingen overschrijven de standaardwaarden uit `hgc-config.json`. Nieuwe configuratievelden uit een pluginupdate worden automatisch aangevuld zonder bestaande beheerdersinstellingen te overschrijven.

## Aanpassen via GitHub

De plugincode staat onder `wordpress/wp-content/plugins/hgc-credit-calculator/`. Standaardtarieven en banen staan in `hgc-config.json`; vormgeving in `styles.css`; teksten en rekenlogica in `calculator.js` en `templates/calculator.php`. `hgc-config.js` bevat dezelfde standaardwaarden voor de losse lokale testpagina.

Voor een nieuwe WordPress-versie:

1. Verhoog `Version` en `HGC_CALCULATOR_VERSION` in `hgc-credit-calculator.php`.
2. Verhoog `Stable tag` in `readme.txt`.
3. Commit en push de wijzigingen naar GitHub.
4. Maak en push een tag, bijvoorbeeld `v1.4.2`.

De workflow `.github/workflows/release.yml` verpakt de deploymap automatisch als `hgc-credit-calculator.zip` en plaatst dit bestand bij een GitHub Release. Op de beveiligde live site blijft Git-deploy de primaire updater, omdat dashboardupdates door `DISALLOW_FILE_MODS` zijn geblokkeerd.

## Lokaal openen

```powershell
node dev-server.mjs
```

Open daarna `http://localhost:8000`.

- `http://localhost:8000/` toont de keuzehulp.

- `HGC Calculator.exe` start een ingebouwde lokale webserver en opent de keuzehulp in de standaardbrowser. Hiervoor is Node.js niet nodig.
- `Start HGC Calculator.cmd` doet hetzelfde via `dev-server.mjs` en vereist Node.js.

Laat de launcher bij `index.html` en de map `wordpress/` staan.

## Belangrijke ingestelde keuzes

- De bezoeker voert apart het aantal grote- en kleine-baanrondes van 9 holes in en kiest voor ieder baantype een golfpark.
- Algemene en Shortgolf-speelrechten gebruiken hun eigen creditwaarden voor de kleine baan.
- Een algemeen speelrecht adviseert het passende startpakket. Zijn bijvoorbeeld 22 credits nodig, dan start het advies met 20 credits en vermeldt het dat de speler pas na verbruik moet verlengen; er worden vooraf geen twee kleine pakketten opgeteld.
- Een Shortgolf-speelrecht wordt alleen geadviseerd wanneer uitsluitend kleine-baanrondes zijn ingevuld. Bij gecombineerd spelen rekent de keuzehulp volledig met algemene credits.
- Handicapregistratie wordt standaard in ieder advies meegenomen.
- De keuzehulp rekent uitsluitend met creditwaarden, speelrechtprijzen en de prijs van handicapregistratie.
- Ook bij een laag speelvolume adviseert de keuzehulp een passend creditspeelrecht.
- Lokale speelrechten worden alleen meegenomen wanneer alle opgegeven rondes op hetzelfde ondersteunde lokale golfpark worden gespeeld.
- Maastricht International en Naarderbos gebruiken gemarkeerde voorlopige waarden totdat officiële vernieuwde tarieven beschikbaar zijn.

Laat de Hollandsche Golfclub deze aannames controleren voordat de keuzehulp publiek wordt ingezet.

## Rekencontrole

`tests/audit-matrix.js` controleert de aanbevelingen over alle banen, producttypen, leeftijden, dalurenkeuzes en relevante grenswaarden. De audit controleert ook pakketdekking, toegestane producten, alternatieven en of de kosten per baantype optellen tot het getoonde totaal.

## Analytics

De keuzehulp stuurt gebeurtenissen naar `window.dataLayer`:

- `calculator_opened`
- `calculator_step_1_completed`
- `calculator_result_viewed`
- `calculator_product_clicked`
- `calculator_restarted`

Hiermee kan Google Tag Manager de campagneconversies meten.
