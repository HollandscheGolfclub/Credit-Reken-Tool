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
- de drempelwaarden voor het speelbeeld instellen die bepalen welk advies een bezoeker ziet;
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

## Zipbestand bouwen

Gebruik voor een handmatige upload het bestand uit een GitHub Release, of bouw het lokaal:

```powershell
tools\build-plugin-zip.ps1
```

Gebruik hiervoor **niet** `Compress-Archive`. Windows PowerShell 5.1 schrijft backslashes als padscheiding in het archief, terwijl de ZIP-standaard forward slashes vereist. WordPress maakt dan geen map `hgc-credit-calculator/` aan, maar pakt losse bestanden met een backslash in de naam uit. De installer meldt vervolgens "Plugin succesvol geïnstalleerd", waarna het activeren afbreekt met "Plugin bestand bestaat niet.". Verwijder in dat geval de foutieve bestanden via SFTP uit `wp-content/plugins/` voordat je opnieuw uploadt.

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
- De verhouding tussen kleine- en grote-baanrondes bepaalt het advies. De keuzehulp kent drie zones, met instelbare grenzen:
  - vanaf 85% kleine-baanrondes adviseert de keuzehulp een Shortgolf-speelrecht, omdat Shortgolf-credits op de kleine baan voordeliger zijn. Het advies vermeldt dat de resterende grote-baanrondes buiten dat speelrecht vallen en apart worden afgerekend;
  - tussen 40% en 60% kleine-baanrondes is het speelbeeld gemengd. De keuzehulp legt de keuze dan bij de bezoeker met twee kaarten: groen voor het algemene speelrecht dat alle rondes dekt, oranje voor Shortgolf;
  - daarbuiten, bijvoorbeeld bij een verhouding van 70:30, adviseert de keuzehulp een algemeen creditspeelrecht.
- De keuzehulp rekent nooit met greenfeetarieven. Rondes die buiten een speelrecht vallen krijgen geen prijs per ronde, zodat er geen bedrag wordt getoond dat de club niet heeft vastgesteld.
- Handicapregistratie zit standaard in ieder bedrag. In het advies staat een schakelaar waarmee de bezoeker die kosten uit het beeld haalt. Dat wisselt alleen de getoonde bedragen en laat het voordeel "Handicapregistratie bij de Hollandsche Golfclub" uit de lijst verdwijnen; de aanbeveling zelf verandert niet, omdat de registratieprijs voor ieder speelrecht gelijk is.
- Bij een gemengd speelbeeld staan de voordelen per kaart, zodat de Shortgolf-kaart de Shortgolf-voordelen toont en niet die van het algemene speelrecht.
- De keuzehulp rekent uitsluitend met creditwaarden, speelrechtprijzen en de prijs van handicapregistratie.
- Ook bij een laag speelvolume adviseert de keuzehulp een passend creditspeelrecht.
- Lokale speelrechten worden alleen meegenomen wanneer alle opgegeven rondes op hetzelfde ondersteunde lokale golfpark worden gespeeld.
- Maastricht International en Naarderbos gebruiken gemarkeerde voorlopige waarden totdat officiële vernieuwde tarieven beschikbaar zijn.

Laat de Hollandsche Golfclub deze aannames controleren voordat de keuzehulp publiek wordt ingezet.

## Rekencontrole

`tests/audit-matrix.js` controleert de aanbevelingen over alle banen, producttypen, leeftijden, dalurenkeuzes en relevante grenswaarden. De audit controleert ook pakketdekking, toegestane producten, alternatieven en of de kosten per baantype optellen tot het getoonde totaal.

`runHgcProfileAudit` controleert daarnaast de zone-indeling tegen de ingestelde drempelwaarden, of een Shortgolf-speelrecht alleen in de juiste zones meedoet, of een gemengd speelbeeld inderdaad twee opties oplevert, en of het bedrag achter de schakelaar exact de speelrechtprijs zonder handicapregistratie is.

Draaien gaat via een browser met foutopsporing op een debugpoort:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --remote-debugging-port=9227 --user-data-dir="$env:TEMP\hgc-audit" about:blank
node tests\run-browser-audit.mjs 9227
```

## Analytics

De keuzehulp stuurt gebeurtenissen naar `window.dataLayer`:

- `calculator_opened`
- `calculator_step_1_completed`
- `calculator_result_viewed` (met `play_profile` voor de zone: `credits`, `mixed` of `shortgolf`)
- `calculator_registration_switched`
- `calculator_product_clicked`
- `calculator_restarted`

Hiermee kan Google Tag Manager de campagneconversies meten.
