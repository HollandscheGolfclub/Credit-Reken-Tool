/**
 * HGC CALCULATORCONFIGURATIE
 * -------------------------
 * Pas prijzen, creditwaarden, teksten en links uitsluitend in dit bestand aan.
 * Bedragen zijn in euro's. Een null-waarde betekent dat die spelvorm niet beschikbaar is.
 *
 * Bron tarieven: HGC Speelrechten 2026 en de HGC-webshop, geraadpleegd 18 augustus 2026.
 */

export const hgcConfig = {
  year: 2026,

  settings: {
    // Een verschil binnen deze marge presenteren we als "ongeveer gelijk".
    equalCostMargin: 50,
    // HGC rekent meestal per baanronde. Voor 18 holes rekenen we met twee baanrondes.
    eighteenHoleMultiplier: 2,
    // Binnen het grootste pakket adviseren we één passend pakket, niet meerdere kleine pakketten.
    preferSinglePackage: true,
    monthlyPaymentSurchargePercentage: 5,
  },

  handicapRegistration: {
    adultPrice: 59.5,
    youthPrice: 27.5,
    vouchers: 2,
  },

  links: {
    webshop: "https://www.hollandschegolfclub.nl/webshop/",
    terms: "https://www.hollandschegolfclub.nl/wp-content/uploads/2026/01/HGC-Voorwaarden-Speelrechten-2026.pdf",
  },

  // Algemene speelrechten: geldig op grote én kleine HGC-banen.
  standardPackages: [
    { credits: 20, price: 485, name: "HGC Speelrecht – 20 credits" },
    { credits: 60, price: 1030, name: "HGC Speelrecht – 60 credits" },
    { credits: 120, price: 1440, name: "HGC Speelrecht – 120 credits" },
    { credits: 200, price: 1725, name: "HGC Speelrecht – 200 credits" },
  ],

  offPeakPackages: [
    { credits: 20, price: 385, name: "HGC Daluren – 20 credits" },
  ],

  youthPackages: [
    { credits: 20, price: 140, name: "HGC Jeugd – 20 credits" },
  ],

  shortGolfPackages: [
    { credits: 20, price: 255, name: "HGC Shortgolf – 20 credits" },
    { credits: 60, price: 585, name: "HGC Shortgolf – 60 credits" },
    { credits: 120, price: 715, name: "HGC Shortgolf – 120 credits" },
  ],

  localPackages: {
    "de-breuninkhof": {
      name: "Lokaal speelrecht De Breuninkhof",
      packages: [
        { credits: 20, price: 420 },
        { credits: 60, price: 950 },
        { credits: 120, price: 1235 },
        { credits: 200, price: 1475 },
      ],
      offPeak: [{ credits: 20, price: 335 }],
      largeRoundRate: 1,
      shortRoundRate: 0.5,
    },
    "land-van-thorn": {
      name: "Lokaal speelrecht Land van Thorn",
      packages: [
        { credits: 20, price: 375 },
        { credits: 60, price: 830 },
        { credits: 120, price: 1060 },
        { credits: 200, price: 1255 },
      ],
      offPeak: [{ credits: 20, price: 300 }],
      largeRoundRate: 1,
      shortRoundRate: null,
    },
  },

  // Creditwaarden gelden per genoemde baanronde volgens de HGC-brochure.
  courses: [
    { id: "almkreek", name: "Golfpark Almkreek", location: "Almkerk", largeHoles: 9, largeRate: 0.9, shortRate: 0.6 },
    { id: "de-berendonck", name: "Golfpark De Berendonck", location: "Wijchen", largeHoles: 9, largeRate: 1, shortRate: 0.4 },
    { id: "de-breuninkhof", name: "Golfpark De Breuninkhof", location: "Voorst", largeHoles: 9, largeRate: 0.85, shortRate: 0.5 },
    { id: "de-haverleij", name: "Golfpark De Haverleij", location: "’s-Hertogenbosch", largeHoles: 9, largeRate: 1, shortRate: 0.5 },
    { id: "de-kurenpolder", name: "Golfpark De Kurenpolder", location: "Hank", largeHoles: 9, largeRate: 0.6, shortRate: 0.3 },
    { id: "de-loonsche-duynen", name: "Golfpark De Loonsche Duynen", location: "De Moer", largeHoles: 9, largeRate: 1, shortRate: 0.6 },
    { id: "de-purmer", name: "Golfpark De Purmer", location: "Purmerend", largeHoles: 9, largeRate: 1, shortRate: 0.4 },
    { id: "gendersteyn", name: "Golfpark Gendersteyn", location: "Veldhoven", largeHoles: 9, largeRate: 1, shortRate: 0.6 },
    { id: "land-van-thorn", name: "Golfpark Land van Thorn", location: "Hunsel", largeHoles: 7, largeRate: 0.75, shortRate: null },
    { id: "reymerswael", name: "Golfcentrum Reymerswael", location: "Rilland-Bath", largeHoles: 12, largeRate: 1.2, shortRate: 0.6 },
    { id: "rotterdam", name: "Golfpark Rotterdam", location: "Rotterdam", largeHoles: 9, largeRate: 0.7, shortRate: 0.6 },
    { id: "shortgolf-utrecht", name: "ShortGolf Utrecht", location: "Nieuwegein", largeHoles: null, largeRate: null, shortRate: 0.35 },
    { id: "sint-nyk", name: "Golfpark Sint Nyk", location: "Sint Nicolaasga", largeHoles: 9, largeRate: 0.9, shortRate: null },
    { id: "westerpark", name: "Golfpark Westerpark", location: "Zoetermeer", largeHoles: 9, largeRate: 1, shortRate: null },
    { id: "naarderbos", name: "Golfpark Naarderbos", location: "Naarden", largeHoles: 9, largeRate: 1, shortRate: 0.8 },
  ],

  benefits: [
    "Spelen op aangesloten HGC-golfparken door heel Nederland",
    "Onbeperkt introducees meenemen tegen gereduceerd greenfeetarief",
    "Meedoen aan activiteiten op de HGC-golfparken",
    "Na opgebruikte credits spelen tegen gereduceerd greenfeetarief",
  ],

  shortGolfBenefits: [
    "Spelen op de aangesloten HGC-shortgolfbanen",
    "Op grote HGC-banen spelen tegen gereduceerd greenfeetarief",
    "Onbeperkt introducees meenemen tegen gereduceerd greenfeetarief",
    "Meedoen aan activiteiten op de HGC-golfparken",
  ],

  localBenefits: [
    "Jouw rondes gebruiken op het gekozen lokale golfpark",
    "Op andere HGC-banen spelen tegen gereduceerd greenfeetarief",
    "Onbeperkt introducees meenemen tegen gereduceerd greenfeetarief",
    "Meedoen aan activiteiten op de HGC-golfparken",
  ],
};
