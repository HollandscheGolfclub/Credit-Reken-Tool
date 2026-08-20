/**
 * HOLLANDSCHE GOLFCLUB CALCULATORCONFIGURATIE
 *
 * Bedragen zijn in euro's. Een null-waarde betekent dat die spelvorm niet
 * beschikbaar is. De keuzehulp rekent uitsluitend met credits, speelrechten
 * en handicapregistratie.
 */

window.hgcConfig = {
  year: 2026,
  settings: {
    // Staat handicapregistratie standaard in de getoonde bedragen? De bezoeker
    // kan hem in het advies zelf aanvinken.
    includeHandicapByDefault: false,
    // Zit dit aandeel van de rondes of meer op de kleine baan, dan adviseert de
    // keuzehulp een Shortgolf-speelrecht; die credits zijn daar voordeliger.
    shortGolfSharePercent: 85,
    // Ligt het aandeel kleine-baanrondes tussen deze twee waarden, dan is het
    // speelbeeld gemengd en legt de keuzehulp de keuze bij de bezoeker.
    mixedProfileFromPercent: 40,
    mixedProfileToPercent: 60,
    // Ligt het speelrecht dat alle rondes dekt binnen deze marge van de
    // goedkoopste route, dan legt de keuzehulp de keuze bij de bezoeker.
    dualAdviceMarginPercent: 15,
  },
  // Bij handicapregistratie horen twee vrije rondes van 9 holes per kalenderjaar.
  handicapRegistration: { adultPrice: 59.5, youthPrice: 27.5, vouchers: 2 },

  // LoyalTee geeft korting op de greenfee zonder speelrecht. Het gereduceerde
  // tarief per baan is het tarief mét die korting; het volle tarief leidt de
  // keuzehulp daaruit af met hetzelfde percentage.
  loyalTee: {
    name: "Hollandsche Golfclub LoyalTee",
    membershipPrice: 54,
    discountPercentage: 20,
    ballCredit: 25,
    excludedCourseIds: ["shortgolf-utrecht"],
  },
  links: {
    webshop: "https://www.hollandschegolfclub.nl/webshop/",
    playingRights: "https://www.hollandschegolfclub.nl/hgc-speelrechten/",
    handicapRegistration: "https://www.hollandschegolfclub.nl/ngf-handicapregistratie-2/",
    terms: "https://www.hollandschegolfclub.nl/wp-content/uploads/2026/01/HGC-Voorwaarden-Speelrechten-2026.pdf",
  },
  standardPackages: [
    { credits: 20, price: 485, name: "Hollandsche Golfclub Speelrecht – 20 credits" },
    { credits: 60, price: 1030, name: "Hollandsche Golfclub Speelrecht – 60 credits" },
    { credits: 120, price: 1440, name: "Hollandsche Golfclub Speelrecht – 120 credits" },
    { credits: 200, price: 1725, name: "Hollandsche Golfclub Speelrecht – 200 credits" },
  ],
  offPeakPackages: [
    { credits: 20, price: 385, name: "Hollandsche Golfclub Daluren – 20 credits" },
  ],
  youthPackages: [
    { credits: 20, price: 140, name: "Hollandsche Golfclub Jeugd – 20 credits" },
  ],
  shortGolfPackages: [
    { credits: 20, price: 255, name: "Hollandsche Golfclub Shortgolf – 20 credits" },
    { credits: 60, price: 585, name: "Hollandsche Golfclub Shortgolf – 60 credits" },
    { credits: 120, price: 715, name: "Hollandsche Golfclub Shortgolf – 120 credits" },
  ],
  localPackages: {
    "de-breuninkhof": {
      name: "Lokaal speelrecht De Breuninkhof",
      packages: [
        { credits: 20, price: 420 }, { credits: 60, price: 950 },
        { credits: 120, price: 1235 }, { credits: 200, price: 1475 },
      ],
      offPeak: [{ credits: 20, price: 335 }],
      largeRoundRate: 1,
      shortRoundRate: 0.5,
    },
    "land-van-thorn": {
      name: "Lokaal speelrecht Land van Thorn",
      packages: [
        { credits: 20, price: 375 }, { credits: 60, price: 830 },
        { credits: 120, price: 1060 }, { credits: 200, price: 1255 },
      ],
      offPeak: [{ credits: 20, price: 300 }],
      largeRoundRate: 1,
      shortRoundRate: null,
    },
  },
  courses: [
    { id: "almkreek", name: "Golfpark Almkreek", location: "Almkerk", largeHoles: 9, largeRate: 0.9, shortRate: 0.6, shortGolfRate: 1, greenFee: 24 },
    { id: "de-berendonck", name: "Golfpark De Berendonck", location: "Wijchen", largeHoles: 9, largeRate: 1, shortRate: 0.4, shortGolfRate: 0.7, greenFee: 28 },
    { id: "de-breuninkhof", name: "Golfpark De Breuninkhof", location: "Voorst", largeHoles: 9, largeRate: 0.85, shortRate: 0.5, shortGolfRate: 0.75, greenFee: 23.6 },
    { id: "de-haverleij", name: "Golfpark De Haverleij", location: "’s-Hertogenbosch", largeHoles: 9, largeRate: 1, shortRate: 0.5, shortGolfRate: 0.75, greenFee: 28 },
    { id: "de-kurenpolder", name: "Golfpark De Kurenpolder", location: "Hank", largeHoles: 9, largeRate: 0.6, shortRate: 0.3, shortGolfRate: 0.5, greenFee: 22 },
    { id: "de-loonsche-duynen", name: "Golfpark De Loonsche Duynen", location: "De Moer", largeHoles: 9, largeRate: 1, shortRate: 0.6, shortGolfRate: 1, greenFee: 28 },
    { id: "de-purmer", name: "Golfpark De Purmer", location: "Purmerend", largeHoles: 9, largeRate: 1, shortRate: 0.4, shortGolfRate: 0.7, greenFee: 28 },
    { id: "gendersteyn", name: "Golfpark Gendersteyn", location: "Veldhoven", largeHoles: 9, largeRate: 1, shortRate: null, greenFee: 28 },
    { id: "land-van-thorn", name: "Golfpark Land van Thorn", location: "Hunsel", largeHoles: 9, largeRate: 0.75, shortRate: null, greenFee: 23.6 },
    { id: "maastricht", name: "Golfpark Maastricht International", location: "Maastricht", largeHoles: 9, largeRate: 1, shortRate: 0.8, greenFee: 40 },
    { id: "naarderbos", name: "Golfpark Naarderbos", location: "Naarden", largeHoles: 9, largeRate: 0.9, shortRate: 0.5, greenFee: 24 },
    { id: "reymerswael", name: "Golfpark Reymerswael", location: "Rilland-Bath", largeHoles: 12, largeRate: 1.2, shortRate: null, greenFee: 36 },
    { id: "rotterdam", name: "Golfpark Rotterdam", location: "Rotterdam", largeHoles: 9, largeRate: 0.7, shortRate: 0.6, shortGolfRate: 1, greenFee: 20 },
    { id: "shortgolf-utrecht", name: "ShortGolf Utrecht", location: "Nieuwegein", largeHoles: null, largeRate: null, shortRate: 0.35, shortGolfRate: 0.5, greenFee: null },
    { id: "sint-nyk", name: "Golfpark Sint Nyk", location: "Sint Nicolaasga", largeHoles: 9, largeRate: 0.9, shortRate: null, greenFee: 24 },
    { id: "westerpark", name: "Golfpark Westerpark", location: "Zoetermeer", largeHoles: 9, largeRate: 1, shortRate: null, greenFee: 28 },
  ],
  benefits: [
    "Credits gebruiken op de aangesloten golfparken van de Hollandsche Golfclub",
    "Onbeperkt medespelers introduceren tegen een gereduceerd greenfeetarief",
    "Eén duidelijk speelrecht voor jouw verwachte rondes",
    "Meedoen aan activiteiten op de golfparken van Hollandsche Golfclub",
    "Na opgebruikte credits kun je een nieuw speelrecht kiezen",
  ],
  shortGolfBenefits: [
    "Shortgolf-credits gebruiken op de aangesloten shortgolfbanen",
    "Op de grote banen spelen tegen een gereduceerd greenfeetarief",
    "Een speelrecht afgestemd op jouw kleine-baanrondes",
    "Na opgebruikte credits kun je een nieuw speelrecht kiezen",
    "Meedoen aan activiteiten op de golfparken van Hollandsche Golfclub",
  ],
  loyalTeeBenefits: [
    "20% korting op de greenfee van de HGC-golfbanen",
    "€ 25 ballentegoed",
    "Te combineren met handicapregistratie",
    "Meedoen aan activiteiten op de golfparken van Hollandsche Golfclub",
  ],

  handicapBenefits: [
    "Officiële NGF-handicapregistratie",
    "Digitale NGF-pas via Hollandsche Golfclub en GOLF.NL",
    "Online qualifying scorekaarten registreren",
    "Onderdeel van de getoonde advieskosten",
  ],
  localBenefits: [
    "Lokale credits gebruiken op het gekozen golfpark",
    "Een lokaal speelrecht afgestemd op jouw verwachte rondes",
    "Na opgebruikte credits kun je een nieuw speelrecht kiezen",
    "Meedoen aan activiteiten op de golfparken van Hollandsche Golfclub",
  ],
};
