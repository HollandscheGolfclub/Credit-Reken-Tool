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
- per baan het gereduceerde greenfeetarief voor een ronde op de grote baan invullen;
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
- **Het geadviseerde speelrecht dekt altijd alle opgegeven rondes.** Zijn bijvoorbeeld 31,2 credits nodig, dan adviseert de keuzehulp 60 credits en niet een instappakket van 20 credits. De keuzehulp toont dus nooit een bedrag dat het opgegeven golfjaar niet dekt.
- **Eén speelrecht heeft voorrang, ook wanneer meerdere kleinere pakketten samen goedkoper uitvallen.** Die route met meerdere aankopen wordt niet getoond. In plaats daarvan staat het kleinere speelrecht als tweede advies onder het hoofdadvies, met de melding dat het de opgegeven rondes niet dekt en dat de bezoeker een nieuw speelrecht kan aanschaffen zodra de credits op zijn. Bij 30 benodigde credits adviseert de keuzehulp dus 60 credits voor € 1.030,00, met daaronder 20 credits voor € 485,00 en de tekst dat je daarmee 10 credits tekort komt. De route van 2 × 20 credits voor € 970,00 komt niet meer in beeld.
- Bestaat er geen enkel speelrecht dat de rondes in één keer dekt, dan adviseert de keuzehulp de voordeligste combinatie en benoemt zij dat expliciet. Bij jeugd- en dalurenspeelrechten bestaat alleen een pakket van 20 credits, dus daar is bijvoorbeeld "2 × 20 credits, samen 40 credits" een normale uitkomst.
- Deze keuze is bewust gemaakt: een instapprijs tonen die het golfjaar niet dekt geeft een te laag beeld van de werkelijke kosten. Het gevolg is dat de getoonde bedragen bij een hoger speelvolume hoger uitvallen dan voorheen.
- De verhouding tussen kleine- en grote-baanrondes bepaalt het advies. De keuzehulp kent drie zones, met instelbare grenzen:
  - vanaf 85% kleine-baanrondes adviseert de keuzehulp een Shortgolf-speelrecht, omdat Shortgolf-credits op de kleine baan voordeliger zijn. Het advies vermeldt dat de resterende grote-baanrondes buiten dat speelrecht vallen en apart worden afgerekend;
  - tussen 40% en 60% kleine-baanrondes is het speelbeeld gemengd. De keuzehulp legt de keuze dan bij de bezoeker met twee kaarten: groen voor het algemene speelrecht dat alle rondes dekt, oranje voor Shortgolf;
  - daarbuiten, bijvoorbeeld bij een verhouding van 70:30, adviseert de keuzehulp een algemeen creditspeelrecht.
- De gereduceerde greenfeetarieven komen uit de flyer "Hollandsche Golfclub Greenfees 2026", geldig vanaf 1 januari 2026. Een ronde volgt het aantal holes van de betreffende baan: bij Reymerswael 12 holes, bij de overige banen 9. Golfpark Naarderbos staat niet op die flyer; dat tarief is los aangeleverd door de club. ShortGolf Utrecht heeft geen grote baan, dus daar blijft het veld leeg.
- De keuzehulp rekent met het gereduceerde tarief en niet met het normale greenfeetarief. De club heeft bevestigd dat dit het juiste tarief is voor een speelrechthouder op een grote baan. De flyer zelf noemt bij het gereduceerde tarief alleen LoyalTee-leden, introducees van speelrechthouders en tijdelijk non-qualifying banen, dus wie de flyer naleest vindt dat verband er niet letterlijk in terug.
- De flyer vermeldt dat het gereduceerde tarief niet geldt voor banen die standaard geen qualifying status hebben. Bij Golfpark Rotterdam staat de grote baan als tijdelijke lus vermeld; controleer daar of het gereduceerde tarief van toepassing is.
- Is per baan het gereduceerde greenfeetarief voor de grote baan ingevuld, dan weegt de keuzehulp de grote-baanrondes van een Shortgolf-speelrecht daartegen mee **bij het bepalen van het advies**. Zo wordt de vergelijking met een algemeen speelrecht eerlijk. Bij 60 kleine en 8 grote rondes op Almkreek komt Shortgolf op € 836,50 tegen € 1.089,50 voor een algemeen speelrecht, dus is Shortgolf het advies. Bij 22 kleine en 20 grote rondes is het omgekeerd: € 1.124,50 tegen € 1.089,50, dus adviseert de keuzehulp daar het algemene speelrecht.
- **Het getoonde bedrag is de prijs van het speelrecht zelf, zonder greenfees.** Voor het Shortgolf-advies hierboven staat er € 644,50, niet € 836,50. Het advies vermeldt erbij dat de rondes op de grote baan per ronde worden afgerekend tegen het gereduceerde greenfeetarief en dat dat bedrag niet in de prijs zit.
- **Het greenfeetarief zelf wordt nooit aan de bezoeker getoond.** Er verschijnt geen tarief per ronde en ook geen kostenkaart "Grote baan", omdat die het tarief zou verraden. Rekencontroles met een testtarief en met de werkelijke tarieven bewaken dat.
- De greenfees zitten daarmee in `selectionCost`, de sleutel waarop de kandidaten worden gesorteerd, en niet in `price` of `annualCost`, die het getoonde bedrag bepalen.
- Is het tarief voor een baan leeg, dan rekent de keuzehulp niet met greenfees. Het advies meldt dan dat de grote-baanrondes buiten het speelrecht vallen, en er wordt geen bedrag getoond dat de club niet heeft vastgesteld.
- **Handicapregistratie zit standaard niet in de getoonde bedragen.** Een speelrecht van 60 credits staat er dus voor € 1.030,00 en een Shortgolf-speelrecht van 60 credits voor € 585,00, gelijk aan de webshopprijzen. In het advies staat een schakelaar waarmee de bezoeker de registratie erbij zet; dan worden het € 1.089,50 en € 644,50.
- Die schakelaar wisselt alleen de getoonde bedragen en laat het voordeel "Handicapregistratie bij de Hollandsche Golfclub" in de lijst verschijnen of verdwijnen. De aanbeveling zelf verandert er nooit door, omdat de registratieprijs voor ieder speelrecht gelijk is.
- Een beheerder kan de standaardstand omzetten onder Instellingen. Eén functie, `handicapDefault`, bepaalt die stand voor de bedragen, de toelichting, de schakelaar en de voordelenlijst, zodat die vier niet uiteen kunnen lopen.
- Bij een gemengd speelbeeld staan de voordelen per kaart, zodat de Shortgolf-kaart de Shortgolf-voordelen toont en niet die van het algemene speelrecht.
- De keuzehulp rekent uitsluitend met creditwaarden, speelrechtprijzen en de prijs van handicapregistratie.
- Ook bij een laag speelvolume adviseert de keuzehulp een passend creditspeelrecht.
- Lokale speelrechten worden alleen meegenomen wanneer alle opgegeven rondes op hetzelfde ondersteunde lokale golfpark worden gespeeld.
- Maastricht International en Naarderbos hebben vastgestelde waarden voor een algemeen speelrecht: Maastricht 1 credit voor de grote baan en 0,8 voor de kleine, Naarderbos 0,9 en 0,5. De gereduceerde greenfee van de grote baan is het volledige tarief min 20%: Maastricht € 40,00 (van € 50,00) en Naarderbos € 24,00 (van € 30,00). Voor die twee banen is nog geen aparte Shortgolf-creditwaarde bekend, dus daar adviseert de keuzehulp geen Shortgolf-speelrecht; die waarde wordt later ingevuld.

Laat de Hollandsche Golfclub deze aannames controleren voordat de keuzehulp publiek wordt ingezet.

## Rekencontrole

`tests/audit-matrix.js` controleert de aanbevelingen over alle banen, producttypen, leeftijden, dalurenkeuzes en relevante grenswaarden. De audit controleert ook pakketdekking, toegestane producten, alternatieven en of de kosten per baantype optellen tot het getoonde totaal.

Iedere aanbeveling wordt gecontroleerd op dekking: geen enkel plan mag minder credits bevatten dan er nodig zijn, en de geadviseerde credits moeten optellen uit pakketten die daadwerkelijk in het aanbod staan. Een voordeligere route met meerdere aankopen moet de rondes ook dekken, uit meer dan één pakket bestaan en werkelijk goedkoper zijn; die route wordt niet aan de bezoeker getoond, en de audit controleert dat er dan een kleiner speelrecht als tweede advies staat met het aantal credits dat tekortkomt erbij.

`runHgcGreenFeeAudit` rekent met een testtarief van € 37,77 op een kopie van iedere baan en controleert dat het greenfeebedrag juist wordt berekend, dat het meeweegt in `selectionCost` maar buiten het getoonde bedrag blijft, dat het tarief nergens in de uitvoer verschijnt, dat de kostenkaart voor de grote baan ontbreekt en dat het advies het gereduceerde tarief benoemt in plaats van de rondes als ongedekt te melden. Het testtarief is een ongebruikelijk bedrag, zodat een toevallige overeenkomst met een ander bedrag in de uitvoer uitgesloten is. Dezelfde controle draait daarna op de tarieven die werkelijk in de configuratie staan, zonder de controle op een zichtbaar tarief: een echt bedrag als € 28,00 kan toevallig samenvallen met een ander bedrag in de uitvoer.

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
