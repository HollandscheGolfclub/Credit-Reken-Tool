(() => {
const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const decimal = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 });

const calculatorRoot = document.querySelector('[data-calculator-mode="choice"]');
const form = calculatorRoot.querySelector("#calculator-form");
const steps = [...calculatorRoot.querySelectorAll(".form-step")];
const currentStepLabel = calculatorRoot.querySelector("#current-step");
const progressBar = calculatorRoot.querySelector("#progress-bar");
const largeRoundsRange = calculatorRoot.querySelector("#large-rounds");
const largeRoundsNumber = calculatorRoot.querySelector("#large-rounds-number");
const smallRoundsRange = calculatorRoot.querySelector("#small-rounds");
const smallRoundsNumber = calculatorRoot.querySelector("#small-rounds-number");
const largeCourseSelect = calculatorRoot.querySelector("#large-course");
const smallCourseSelect = calculatorRoot.querySelector("#small-course");
const largeCourseHelp = calculatorRoot.querySelector("#large-course-help");
const smallCourseHelp = calculatorRoot.querySelector("#small-course-help");
const ageCategory = calculatorRoot.querySelector("#age-category");
const offPeak = calculatorRoot.querySelector("#off-peak");
const roundsError = calculatorRoot.querySelector("#rounds-error");
const resultContent = calculatorRoot.querySelector("#result-content");

let currentStep = 1;
// Advies per mail: alleen als de plugin het aanzet (WordPress zet dan
// window.hgcAdviesMail). Het laatste advies bewaren we voor het formulier.
const adviesMail = window.hgcAdviesMail || null;
let lastResult = null;

function track(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...details });
}

function brandText(value) {
  const branded = String(value).replace(/\bHGC\b/g, "Hollandsche Golfclub");
  return branded.replace(
    /^Spelen op aangesloten (?:Hollandsche Golfclub-)?golfparken(?: van Hollandsche Golfclub)? door heel Nederland$/,
    "Spelen op alle golfparken van de Hollandsche Golfclub door heel Nederland"
  );
}

function enhanceCourseSelect(select, label) {
  const picker = document.createElement("div");
  const buttonId = `${select.id}-picker-button`;
  const valueId = `${select.id}-picker-value`;
  picker.className = "course-picker";
  picker.innerHTML = `
    <button class="course-picker-button" id="${buttonId}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${label.id} ${valueId}">
      <span id="${valueId}" class="course-picker-value"></span>
      <span class="course-picker-chevron" aria-hidden="true">⌄</span>
    </button>
    <div class="course-picker-menu" role="listbox" aria-labelledby="${label.id}" hidden></div>
  `;
  select.classList.add("course-select-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  select.insertAdjacentElement("afterend", picker);
  label.htmlFor = buttonId;

  const button = picker.querySelector(".course-picker-button");
  const value = picker.querySelector(".course-picker-value");
  const menu = picker.querySelector(".course-picker-menu");

  function close({ restoreFocus = false } = {}) {
    picker.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    if (restoreFocus) button.focus();
  }

  function open() {
    document.querySelectorAll(".course-picker.is-open").forEach((other) => {
      if (other !== picker) {
        other.classList.remove("is-open");
        other.querySelector(".course-picker-button")?.setAttribute("aria-expanded", "false");
        const otherMenu = other.querySelector(".course-picker-menu");
        if (otherMenu) otherMenu.hidden = true;
      }
    });
    picker.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    menu.querySelector('[aria-selected="true"]')?.focus();
  }

  function render() {
    const availableCourses = [...select.options]
      .map((option) => hgcConfig.courses.find((course) => course.id === option.value))
      .filter(Boolean);
    const selectedCourse = availableCourses.find((course) => course.id === select.value) || availableCourses[0];
    if (!selectedCourse) return;
    value.innerHTML = `<strong>${selectedCourse.name}</strong><small>${selectedCourse.location}</small>`;
    menu.innerHTML = availableCourses.map((course) => `
      <button class="course-picker-option" type="button" role="option" data-course-id="${course.id}" aria-selected="${course.id === selectedCourse.id}">
        <span><strong>${course.name}</strong><small>${course.location}</small></span>
        <span class="course-picker-check" aria-hidden="true">✓</span>
      </button>
    `).join("");
  }

  button.addEventListener("click", () => picker.classList.contains("is-open") ? close() : open());
  button.addEventListener("keydown", (event) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      open();
    }
  });
  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-course-id]");
    if (!option) return;
    select.value = option.dataset.courseId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    close({ restoreFocus: true });
  });
  menu.addEventListener("keydown", (event) => {
    const options = [...menu.querySelectorAll(".course-picker-option")];
    const index = options.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(index + 1) % options.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  });
  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target)) close();
  });
  return { render, close };
}

const largeCoursePicker = enhanceCourseSelect(largeCourseSelect, calculatorRoot.querySelector("#large-course-label"));
const smallCoursePicker = enhanceCourseSelect(smallCourseSelect, calculatorRoot.querySelector("#small-course-label"));

function populateCourses() {
  const previousLarge = largeCourseSelect.value;
  const previousSmall = smallCourseSelect.value;
  const largeCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.largeRate));
  const smallCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.shortRate));
  largeCourseSelect.innerHTML = largeCourses.map((course) => `<option value="${course.id}">${course.name} — ${course.location}</option>`).join("");
  smallCourseSelect.innerHTML = smallCourses.map((course) => `<option value="${course.id}">${course.name} — ${course.location}</option>`).join("");
  if (largeCourses.some((course) => course.id === previousLarge)) largeCourseSelect.value = previousLarge;
  if (smallCourses.some((course) => course.id === previousSmall)) smallCourseSelect.value = previousSmall;
  largeCoursePicker.render();
  smallCoursePicker.render();
  updateCourseHelp();
}

function selectedCourse(select) {
  return hgcConfig.courses.find((course) => course.id === select.value);
}

function updateCourseHelp() {
  const large = selectedCourse(largeCourseSelect);
  const small = selectedCourse(smallCourseSelect);
  if (large) {
    const note = large.note ? ` · ${large.note}` : "";
    largeCourseHelp.innerHTML = `<span class="credit-chip">${decimal.format(large.largeHoles || 9)} holes = ${decimal.format(large.largeRate)} credit${note}</span>`;
  }
  if (small) {
    const shortGolfRate = Number.isFinite(small.shortGolfRate) ? small.shortGolfRate : small.shortRate;
    const note = small.note ? ` · ${small.note}` : "";
    smallCourseHelp.innerHTML = `
      <span class="credit-chip">HGC-speelrecht: ${decimal.format(small.shortRate)} credit per ronde</span>
      <span class="credit-chip credit-chip--shortgolf">Shortgolf-speelrecht: ${decimal.format(shortGolfRate)} credit per ronde${note}</span>
    `;
  }
}

function showStep(stepNumber) {
  currentStep = stepNumber;
  steps.forEach((step) => {
    const active = Number(step.dataset.step) === stepNumber;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
  });
  currentStepLabel.textContent = stepNumber;
  progressBar.style.width = `${(stepNumber / 2) * 100}%`;
  calculatorRoot.querySelector("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
}

function normaliseRounds(value) {
  const maximum = Math.max(Number(largeRoundsRange.max), Number(smallRoundsRange.max));
  return Math.min(maximum, Math.max(0, Math.round(Number(value) || 0)));
}

function updateRangeFill(range) {
  const minimum = Number(range.min);
  const maximum = Number(range.max);
  const percentage = ((Number(range.value) - minimum) / (maximum - minimum)) * 100;
  const thumbRadius = 13.5;
  const thumbOffset = thumbRadius * (1 - (2 * percentage / 100));
  const fillEnd = `calc(${percentage}% + ${thumbOffset}px)`;
  range.style.background = `linear-gradient(90deg, var(--green) 0 ${fillEnd}, #dfe5df ${fillEnd})`;
}

function connectRange(range, number) {
  range.addEventListener("input", () => {
    number.value = range.value;
    updateRangeFill(range);
  });
  number.addEventListener("input", () => {
    range.value = normaliseRounds(number.value);
    updateRangeFill(range);
  });
  number.addEventListener("blur", () => {
    number.value = normaliseRounds(number.value);
    range.value = number.value;
    updateRangeFill(range);
  });
}

// Lokale speelrechten tellen in rondes, de andere speelrechten in credits.
function unitWord(unit, count) {
  if (unit === "rondes") return count === 1 ? "ronde" : "rondes";
  return count === 1 ? "credit" : "credits";
}

function unitAmount(count, unit) {
  return `${decimal.format(count)} ${unitWord(unit, count)}`;
}

function usablePackages(packages) {
  return (Array.isArray(packages) ? packages : [])
    .filter((item) => Number(item.credits) > 0 && Number.isFinite(Number(item.price)))
    .map((item) => ({ ...item, credits: Number(item.credits), price: Number(item.price) }))
    .sort((a, b) => a.credits - b.credits);
}

// Standaardtekst wanneer een speelrecht niet alle rondes dekt.
function shortfallText(requiredCredits, unit, subject = "het voorgestelde speelrecht") {
  return `Voor je keuze heb je ${unitAmount(requiredCredits, unit)} nodig. Dus met ${subject} worden niet alle ${unitWord(unit, 2)} gedekt. Als je speelrecht ‘op’ is kun je altijd een nieuw speelrecht afnemen of je kunt rondes los afrekenen met een greenfee (gereduceerd bedrag).`;
}

// Standaardtekst bij een overgang naar een groter speelrecht.
function transitionText(target, { fromFeeRoute = false } = {}) {
  const unit = target.unit || "credits";
  const prijs = Number(target.packagePrice ?? target.price);
  const perEenheid = Number(target.credits) > 0 ? prijs / Number(target.credits) : 0;
  let tekst = `De prijs per ${unitWord(unit, 1)} in een speelrecht van ${unitAmount(Number(target.credits), unit)} is ${euro.format(perEenheid)}. Als je verwacht toch meer te spelen dan je inschatting, is dit al snel voordeliger per ronde.`;
  if (fromFeeRoute) {
    tekst += " Daarbij kun je met een speelrecht flightgenoten met korting introduceren.";
    if (Number(target.offPeakPrice) > 0 && Number(target.offPeakCredits) > 0) {
      tekst += ` Er is ook een dalurenvariant waarbij je slechts ${euro.format(Number(target.offPeakPrice) / Number(target.offPeakCredits))} per ${unitWord(unit, 1)} betaalt.`;
    }
  }
  return tekst;
}

// Een dalurenvariant met hetzelfde aantal credits noemen we bij de overstap
// vanaf LoyalTee of handicapregistratie.
function withUnit(plan, unit, offPeakPackages) {
  const offPeak = usablePackages(offPeakPackages).find((item) => item.credits === Number(plan.credits)) || null;
  return { ...plan, unit, offPeakPackages: offPeakPackages || null, offPeakPrice: offPeak ? offPeak.price : null, offPeakCredits: offPeak ? offPeak.credits : null };
}

function packagePlan(packages, requiredCredits, productName, group, unit = "credits") {
  if (!Array.isArray(packages) || !packages.length || requiredCredits <= 0) return null;
  const usable = packages
    .filter((item) => Number(item.credits) > 0 && Number.isFinite(Number(item.price)))
    .map((item) => ({ ...item, credits: Number(item.credits), price: Number(item.price) }))
    .sort((a, b) => a.credits - b.credits);
  if (!usable.length) return null;

  const maximumCredits = Math.ceil(requiredCredits + Math.max(...usable.map((item) => item.credits)));
  const bestAt = Array(maximumCredits + 1).fill(null);
  bestAt[0] = { price: 0, count: 0, items: [] };
  for (let credits = 0; credits <= maximumCredits; credits += 1) {
    if (!bestAt[credits]) continue;
    usable.forEach((item) => {
      const nextCredits = credits + item.credits;
      if (!Number.isInteger(nextCredits) || nextCredits > maximumCredits) return;
      const option = {
        price: bestAt[credits].price + item.price,
        count: bestAt[credits].count + 1,
        items: [...bestAt[credits].items, item],
      };
      const current = bestAt[nextCredits];
      if (!current || option.price < current.price || (option.price === current.price && option.count < current.count)) {
        bestAt[nextCredits] = option;
      }
    });
  }

  const options = bestAt
    .map((plan, credits) => plan ? { ...plan, credits } : null)
    .filter((plan) => plan && plan.credits + 1e-8 >= requiredCredits)
    .sort((a, b) => a.price - b.price || a.credits - b.credits || a.count - b.count);
  const singleCoveringPackage = usable.find((item) => item.credits + 1e-8 >= requiredCredits) || null;
  const cheapestRoute = options[0];
  const largestPackage = usable[usable.length - 1];

  // Het advies is altijd één speelrecht. Dekt geen enkel speelrecht de rondes
  // in één keer, dan adviseren we het grootste speelrecht en melden we dat er
  // een nieuw speelrecht bij kan zodra de credits op zijn. Meerdere aankopen
  // stapelen we nooit in één advies met één prijs.
  const chosenPackage = singleCoveringPackage || largestPackage;
  const chosen = { price: chosenPackage.price, count: 1, items: [chosenPackage], credits: chosenPackage.credits };
  const coversRounds = chosen.credits + 1e-8 >= requiredCredits;
  const instruction = coversRounds
    ? `Met ${unitAmount(chosen.credits, unit)} heb je voldoende ruimte voor jouw verwachte rondes.`
    : shortfallText(requiredCredits, unit);

  // Zijn meerdere kleinere speelrechten samen goedkoper, dan tonen we die route
  // niet; ze bepaalt alleen dat het kleinere speelrecht als tweede advies komt.
  const cheaperRoute = cheapestRoute && cheapestRoute.count > 1 && cheapestRoute.price + 1e-8 < chosen.price
    ? {
        credits: cheapestRoute.credits,
        price: cheapestRoute.price,
        count: cheapestRoute.count,
      }
    : null;

  return {
    type: "credits",
    group,
    unit,
    name: chosen.items[0].name || `${productName} – ${unitAmount(chosen.credits, unit)}`,
    productName,
    price: chosen.price,
    credits: chosen.credits,
    requiredCredits,
    coversRounds,
    count: 1,
    packageItems: chosen.items,
    cheaperRoute,
    instruction,
  };
}

// Maakt van een speelrecht dat niet alle rondes dekt een herhaalde aankoop:
// zodra de credits op zijn koop je hetzelfde speelrecht opnieuw. De
// vervolgaankopen wegen mee in selectionCost; de getoonde prijs is die van één
// aankoop, net als bij de andere herhaalroutes.
function asRepeatPlan(plan, requiredCredits, largeRate, smallRate, totalRounds) {
  const credits = Number(plan.credits);
  const price = Number(plan.price);
  const unit = plan.unit || "credits";
  const aankopen = Math.max(1, Math.ceil((requiredCredits - 1e-8) / credits));
  const rounds = Number.isFinite(totalRounds) ? totalRounds : Number(plan.coveredRounds || 0);
  return {
    ...plan,
    group: `${plan.group}-herhaal-${credits}`,
    coversRounds: false,
    count: 1,
    repeatPurchases: aankopen,
    repeatExtraTotal: (aankopen - 1) * price,
    coveredRounds: rounds * Math.min(1, credits / requiredCredits),
    largeBaseCost: largeRate * (aankopen * price / requiredCredits),
    smallBaseCost: smallRate * (aankopen * price / requiredCredits),
    detail: `${unitAmount(requiredCredits, unit)} nodig; ${unitAmount(credits, unit)} geadviseerd. Daarmee dek je het eerste deel van je rondes.`,
    instruction: shortfallText(requiredCredits, unit),
  };
}

// Bepaalt of de bezoeker duidelijk op één baantype speelt of een gemengd beeld
// laat zien. Overheerst de kleine baan, dan is een Shortgolf-speelrecht het
// advies omdat Shortgolf-credits daar voordeliger zijn. Bij een gemengd beeld
// legt de keuzehulp de keuze tussen beide speelrechten bij de bezoeker.
function playProfile(largeRounds, smallRounds) {
  const totalRounds = largeRounds + smallRounds;
  const smallShare = totalRounds > 0 ? smallRounds / totalRounds : 0;
  const settings = hgcConfig.settings || {};
  const shortGolfShare = Number(settings.shortGolfSharePercent ?? 85) / 100;
  const mixedFrom = Number(settings.mixedProfileFromPercent ?? 40) / 100;
  const mixedTo = Number(settings.mixedProfileToPercent ?? 60) / 100;
  if (smallShare >= shortGolfShare) return { zone: "shortgolf", smallShare };
  if (smallShare >= mixedFrom && smallShare <= mixedTo) return { zone: "mixed", smallShare };
  return { zone: "credits", smallShare };
}

function addRegistration(plan, handicapPrice) {
  return { ...plan, registrationPrice: handicapPrice, annualCost: plan.price + handicapPrice };
}

function candidatePlans(context) {
  const { largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak } = context;
  const totalRounds = largeRounds + smallRounds;
  const handicapPrice = youth ? Number(hgcConfig.handicapRegistration.youthPrice) : Number(hgcConfig.handicapRegistration.adultPrice);
  const vouchers = Math.max(0, Number(hgcConfig.handicapRegistration.vouchers || 0));
  const standardCredits = largeRounds * largeCourse.largeRate + smallRounds * smallCourse.shortRate;
  const shortGolfFitsPlayStyle = smallRounds > 0;
  const candidates = [];

  const packageChoices = youth
    ? [{ packages: hgcConfig.youthPackages, name: "Hollandsche Golfclub Jeugd-speelrecht", group: "youth" }]
    : [
        { packages: hgcConfig.standardPackages, name: "Hollandsche Golfclub Speelrecht", group: "standard", offPeakPackages: hgcConfig.offPeakPackages },
        ...(canPlayOffPeak ? [{ packages: hgcConfig.offPeakPackages, name: "Hollandsche Golfclub Daluren-speelrecht", group: "offpeak" }] : []),
      ];
  // greenfeebedrag weegt via selectionCost mee en blijft buiten de prijs.
  // Jeugd betaalt op elk park het vaste jeugdgreenfeetarief, niet het
  // gereduceerde tarief voor volwassenen.
  const largeGreenFee = youth
    ? Number(hgcConfig.handicapRegistration.youthGreenFee)
    : Number(largeCourse && largeCourse.greenFee);
  const largeRate = Number(largeCourse && largeCourse.largeRate);
  const smallRate = Number(smallCourse && smallCourse.shortRate);
  // Volwassenen spelen het tekort bij op de grote baan, want alleen daar staat
  // een tarief vast. Jeugd betaalt overal hetzelfde jeugdtarief en kan het
  // tekort dus ook op de kleine baan bijspelen.
  const canPlayOnGreenFee = standardCredits > 0
    && Number.isFinite(largeGreenFee) && largeGreenFee > 0
    && (youth || (largeRounds > 0 && Number.isFinite(largeRate) && largeRate > 0));
  // Aantal rondes op greenfee om een tekort aan credits te overbruggen, of
  // null als dat niet in de opgegeven rondes past. Eerst de grote baan: daar
  // scheelt één ronde de meeste credits.
  const greenFeeRoundsFor = (shortfall) => {
    if (shortfall <= 1e-8) return 0;
    const fromLarge = largeRate > 0 ? Math.min(largeRounds, Math.ceil(shortfall / largeRate - 1e-8)) : 0;
    const rest = shortfall - fromLarge * (largeRate > 0 ? largeRate : 0);
    if (rest <= 1e-8) return fromLarge;
    if (!youth || !(smallRate > 0)) return null;
    const fromSmall = Math.ceil(rest / smallRate - 1e-8);
    return fromSmall <= smallRounds + 1e-8 ? fromLarge + fromSmall : null;
  };

  packageChoices.forEach((choice) => {
    const plan = packagePlan(choice.packages, standardCredits, choice.name, choice.group);
    if (plan) {
      // Dekt het grootste pakket niet, dan komt er verderop een eerlijk
      // geprijsde kandidaat met exact dezelfde credits plus greenfee voor het
      // tekort (mits dat tekort in de opgegeven grote-baanrondes past). Dit
      // pakket zonder geprijsd tekort mag daar niet tegen concurreren op
      // selectionCost, anders wint het puur omdat de rest van de rondes hier
      // ten onrechte gratis lijkt.
      const shortfall = standardCredits - plan.credits;
      const shortfallFairlyPriced = !plan.coversRounds && canPlayOnGreenFee
        && greenFeeRoundsFor(shortfall) !== null;
      // Dekt het grootste pakket niet en is het tekort niet via greenfee te
      // beprijzen, dan telt de rest hier niet mee en zou dit pakket ten onrechte
      // winnen. Dezelfde credits staan hieronder als herhaalde aankoop, met de
      // vervolgaankopen wel meegeteld.
      if (!shortfallFairlyPriced && plan.coversRounds) {
        plan.availablePackages = choice.packages;
        plan.coveredRounds = standardCredits > 0 ? totalRounds * Math.min(1, plan.credits / standardCredits) : totalRounds;
        // De prijs per ronde spreidt over de credits die je met dit pakket
        // werkelijk opmaakt: de rondes die je speelt. Koop je 120 credits voor
        // 100 rondes, dan deel je door 100. Dekt het pakket niet alles, dan
        // deel je door de gekochte credits; de rest gaat apart op greenfee.
        const priceBasis = Math.min(plan.credits, standardCredits);
        plan.largeBaseCost = priceBasis > 0 ? largeCourse.largeRate * (plan.price / priceBasis) : 0;
        plan.smallBaseCost = priceBasis > 0 ? smallCourse.shortRate * (plan.price / priceBasis) : 0;
        plan.detail = plan.coversRounds
          ? `${decimal.format(standardCredits)} credits nodig; ${decimal.format(plan.credits)} credits geadviseerd. Dit speelrecht dekt al je opgegeven rondes.`
          : `${decimal.format(standardCredits)} credits nodig; ${decimal.format(plan.credits)} credits geadviseerd. Dit speelrecht dekt een deel van je opgegeven rondes.`;
        candidates.push(addRegistration(withUnit(plan, "credits", choice.offPeakPackages), handicapPrice));
      }
    }
  });

  // Een kleiner speelrecht met de resterende rondes op greenfee kan flink
  // voordeliger zijn dan het speelrecht dat alles dekt. Die route rekenen we
  // mee als kandidaat, zodat het advies niet duurder uitvalt dan nodig. Het
  // Hetzelfde speelrecht nog eens kopen zodra de credits op zijn, is soms
  // goedkoper dan meteen een groter pakket nemen. De getoonde prijs is die van
  // één aankoop; de vervolgaankopen wegen mee in selectionCost.
  packageChoices.forEach((choice) => {
    (choice.packages || []).forEach((item) => {
      const credits = Number(item.credits);
      const price = Number(item.price);
      if (!Number.isFinite(credits) || !Number.isFinite(price) || credits <= 0) return;
      if (standardCredits <= credits + 1e-8) return;
      const aankopen = Math.ceil((standardCredits - 1e-8) / credits);
      if (aankopen < 2) return;
      const plan = {
        type: "credits",
        group: `${choice.group}-herhaal-${credits}`,
        name: item.name || `${choice.name} – ${decimal.format(credits)} credits`,
        productName: choice.name,
        price,
        credits,
        requiredCredits: standardCredits,
        coversRounds: false,
        count: 1,
        packageItems: [{ ...item, credits, price }],
        availablePackages: choice.packages,
        cheaperRoute: null,
        repeatPurchases: aankopen,
        repeatExtraTotal: (aankopen - 1) * price,
        coveredRounds: totalRounds * Math.min(1, credits / standardCredits),
        // Alle aankopen samen, gespreid over de credits die je opmaakt: de
        // laatste aankoop gebruik je meestal maar voor een deel.
        largeBaseCost: largeCourse.largeRate * (aankopen * price / standardCredits),
        smallBaseCost: Number(smallCourse.shortRate) * (aankopen * price / standardCredits),
        detail: `${decimal.format(standardCredits)} credits nodig; ${decimal.format(credits)} credits geadviseerd. Daarmee dek je het eerste deel van je rondes.`,
        instruction: shortfallText(standardCredits, "credits"),
      };
      candidates.push(addRegistration(withUnit(plan, "credits", choice.offPeakPackages), handicapPrice));
    });
  });

  if (canPlayOnGreenFee) {
    packageChoices.forEach((choice) => {
      (choice.packages || []).forEach((item) => {
        const credits = Number(item.credits);
        const price = Number(item.price);
        if (!Number.isFinite(credits) || !Number.isFinite(price) || credits <= 0) return;
        const shortfall = standardCredits - credits;
        if (shortfall <= 1e-8) return;
        // Het tekort rekenen we af op de grote baan, want alleen daar staat een
        // tarief vast. Past het tekort niet in de grote rondes, dan kunnen we
        // deze route niet eerlijk beprijzen en bieden we hem niet aan.
        const extraRounds = greenFeeRoundsFor(shortfall);
        if (extraRounds === null) return;
        // De gratis rondes uit de handicapregistratie worden eerst gebruikt
        // voor het tekort na de gekochte credits. Zonder registratie blijft
        // het volledige tekort tegen greenfee staan.
        const registrationRounds = Math.min(extraRounds, vouchers);
        const extraRoundsWithRegistration = Math.max(0, extraRounds - registrationRounds);
        const plan = {
          type: "credits",
          group: `${choice.group}-greenfee-${credits}`,
          name: item.name || `${choice.name} – ${decimal.format(credits)} credits`,
          productName: choice.name,
          price,
          credits,
          requiredCredits: standardCredits,
          coversRounds: false,
          count: 1,
          packageItems: [{ ...item, credits, price }],
          availablePackages: choice.packages,
          cheaperRoute: null,
          greenFeeExtraRounds: extraRoundsWithRegistration,
          greenFeeExtraTotal: extraRoundsWithRegistration * largeGreenFee,
          greenFeeExtraRoundsNoReg: extraRounds,
          greenFeeExtraTotalNoReg: extraRounds * largeGreenFee,
          coveredRounds: totalRounds * Math.min(1, credits / standardCredits),
          // Op basis van de credits: de prijs per ronde spreidt over de credits
          // die je koopt, niet over de rondes die je daarna nog op greenfee
          // bijspeelt. Anders lijkt die prijs lager dan hij is.
          largeBaseCost: (largeRate > 0 ? largeRate : 0) * (price / credits),
          smallBaseCost: Number(smallCourse.shortRate) * (price / credits),
          detail: `${decimal.format(standardCredits)} credits nodig; ${decimal.format(credits)} credits geadviseerd. Daarmee dek je het grootste deel van je rondes.`,
          instruction: shortfallText(standardCredits, "credits"),
        };
        candidates.push(addRegistration(withUnit(plan, "credits", choice.offPeakPackages), handicapPrice));
      });
    });
  }

  const shortGolfRate = Number(smallCourse.shortGolfRate);
  const profile = playProfile(largeRounds, smallRounds);
  const shortGolfSuitsProfile = profile.zone === "shortgolf" || profile.zone === "mixed";
  if (!youth && shortGolfSuitsProfile && shortGolfFitsPlayStyle && Number.isFinite(shortGolfRate)) {
    const shortCredits = smallRounds * shortGolfRate;
    const shortPlan = packagePlan(hgcConfig.shortGolfPackages, shortCredits, "Hollandsche Golfclub Shortgolf-speelrecht", "shortgolf");
    if (shortPlan) {
      const reducedGreenFee = Number(largeCourse && largeCourse.greenFee);
      const payGreenFee = largeRounds > 0 && Number.isFinite(reducedGreenFee) && reducedGreenFee > 0;
      const greenFeeCost = payGreenFee ? largeRounds * reducedGreenFee : 0;

      shortPlan.availablePackages = hgcConfig.shortGolfPackages;
      shortPlan.type = "shortgolf";
      shortPlan.reducedGreenFeeRounds = payGreenFee ? largeRounds : 0;
      // Weegt mee in de keuze via selectionCost, maar niet in het getoonde bedrag.
      shortPlan.reducedGreenFeeTotal = greenFeeCost;
      shortPlan.uncoveredLargeRounds = payGreenFee ? 0 : largeRounds;
      shortPlan.largeBaseCost = 0;
      // De prijs per ronde op de kleine baan spreidt over de Shortgolf-credits
      // die je werkelijk opmaakt, net als bij het gewone speelrecht.
      shortPlan.smallBaseCost = shortGolfRate * (shortPlan.price / Math.min(shortPlan.credits, shortCredits));
      // Dekt het grootste Shortgolf-speelrecht de rondes niet, dan noemen we
      // hoeveel rondes het wél dekt in plaats van te doen alsof alles gedekt is.
      const coveredSmallRounds = Math.floor(shortPlan.credits / shortGolfRate);
      const shortCoverage = shortPlan.coversRounds
        ? `${decimal.format(shortCredits)} Shortgolf-credits dekken je ${smallRounds} rondes op de kleine baan; ${decimal.format(shortPlan.credits)} credits geadviseerd.`
        : `${decimal.format(shortPlan.credits)} Shortgolf-credits dekken ${coveredSmallRounds} van je ${smallRounds} rondes op de kleine baan.`;
      shortPlan.detail = payGreenFee
        ? `${shortCoverage} Je ${largeRounds} ronde${largeRounds === 1 ? "" : "s"} op de grote baan reken je per ronde af tegen het gereduceerde greenfeetarief voor speelrechthouders; dat bedrag zit niet in de genoemde prijs.`
        : largeRounds > 0
          ? `${shortCoverage} Je ${largeRounds} ronde${largeRounds === 1 ? "" : "s"} op de grote baan ${largeRounds === 1 ? "valt" : "vallen"} buiten dit speelrecht.`
          : shortCoverage;
      // Naast het speelrecht dat alle kleine rondes dekt, is een kleiner
      // Shortgolf-speelrecht met de resterende rondes op greenfee vaak
      // voordeliger. Die route kan alleen mee wanneer voor de kleine baan een
      // gereduceerd tarief bekend is.
      const smallFee = Number(smallCourse && smallCourse.shortGreenFee);
      // Dekt het grootste Shortgolf-pakket niet, dan komt er hieronder een
      // eerlijk geprijsde kandidaat met dezelfde credits plus greenfee voor
      // het tekort (mits dat tekort in de kleine-baanrondes past). Dit
      // pakket zonder geprijsd tekort mag daar dan niet tegen concurreren.
      const topShortfall = shortCredits - shortPlan.credits;
      const topShortfallFairlyPriced = !shortPlan.coversRounds && Number.isFinite(smallFee) && smallFee > 0
        && Math.ceil(topShortfall / shortGolfRate - 1e-8) <= smallRounds + 1e-8;
      if (!topShortfallFairlyPriced) {
        // Zonder greenfeetarief voor het tekort tellen we de vervolgaankopen
        // mee, anders lijkt een niet-dekkend pakket goedkoper dan het is.
        const plan = shortPlan.coversRounds
          ? shortPlan
          : { ...asRepeatPlan(shortPlan, shortCredits, 0, shortGolfRate, smallRounds), detail: shortPlan.detail };
        candidates.push(addRegistration(withUnit(plan, "credits", null), handicapPrice));
      }
      if (Number.isFinite(smallFee) && smallFee > 0) {
        hgcConfig.shortGolfPackages.forEach((item) => {
          const credits = Number(item.credits);
          const price = Number(item.price);
          const shortfall = shortCredits - credits;
          if (!Number.isFinite(credits) || !Number.isFinite(price) || shortfall <= 1e-8) return;
          const extraRounds = Math.ceil(shortfall / shortGolfRate - 1e-8);
          if (extraRounds > smallRounds + 1e-8) return;
          const plan = {
            type: "shortgolf",
            group: `shortgolf-greenfee-${credits}`,
            name: item.name || `Hollandsche Golfclub Shortgolf – ${decimal.format(credits)} credits`,
            productName: "Hollandsche Golfclub Shortgolf-speelrecht",
            price,
            credits,
            requiredCredits: shortCredits,
            coversRounds: false,
            count: 1,
            packageItems: [{ ...item, credits, price }],
            availablePackages: hgcConfig.shortGolfPackages,
            cheaperRoute: null,
            greenFeeExtraRounds: extraRounds,
            greenFeeExtraTotal: extraRounds * smallFee,
            reducedGreenFeeRounds: payGreenFee ? largeRounds : 0,
            reducedGreenFeeTotal: greenFeeCost,
            uncoveredLargeRounds: payGreenFee ? 0 : largeRounds,
            coveredRounds: smallRounds * Math.min(1, credits / shortCredits),
            largeBaseCost: 0,
            // Op basis van de credits: spreiden over wat je koopt, niet over
            // de rondes die daarna nog op greenfee gaan.
            smallBaseCost: shortGolfRate * (price / credits),
            detail: `${decimal.format(credits)} Shortgolf-credits dekken ${Math.floor(credits / shortGolfRate)} van je ${smallRounds} rondes op de kleine baan.`,
            instruction: shortfallText(shortCredits, "credits"),
          };
          candidates.push(addRegistration(withUnit(plan, "credits", null), handicapPrice));
        });
      }
    }
  }

  const activeCourseIds = [largeRounds > 0 ? largeCourse.id : null, smallRounds > 0 ? smallCourse.id : null].filter(Boolean);
  const localId = activeCourseIds.length && activeCourseIds.every((id) => id === activeCourseIds[0]) ? activeCourseIds[0] : null;
  const local = localId ? hgcConfig.localPackages?.[localId] : null;
  if (!youth && local) {
    const localCredits = largeRounds * Number(local.largeRoundRate || 0) + smallRounds * Number(local.shortRoundRate || 0);
    const localChoices = [
      { packages: local.packages, name: local.name, group: `local-${localId}`, offPeakPackages: local.offPeak },
      ...(canPlayOffPeak && local.offPeak?.length ? [{ packages: local.offPeak, name: `${local.name} daluren`, group: `local-${localId}-offpeak` }] : []),
    ];
    localChoices.forEach((choice) => {
      const packaged = packagePlan(choice.packages, localCredits, choice.name, choice.group, "rondes");
      if (!packaged) return;
      if (!packaged.coversRounds) {
        // Dekt het grootste lokale speelrecht niet, dan tellen de
        // vervolgaankopen mee in de prijs; anders zou bijvoorbeeld 20 rondes
        // daluren bij 100 rondes als goedkoopste advies verschijnen.
        packaged.availablePackages = choice.packages;
        candidates.push(addRegistration(withUnit(
          asRepeatPlan(packaged, localCredits, Number(local.largeRoundRate || 0), Number(local.shortRoundRate || 0), totalRounds),
          "rondes", choice.offPeakPackages), handicapPrice));
        return;
      }
      const plan = packaged;
      plan.availablePackages = choice.packages;
      plan.coveredRounds = localCredits > 0 ? totalRounds * Math.min(1, plan.credits / localCredits) : totalRounds;
      const localPriceBasis = Math.min(plan.credits, localCredits);
      plan.largeBaseCost = localPriceBasis > 0 ? Number(local.largeRoundRate || 0) * (plan.price / localPriceBasis) : 0;
      plan.smallBaseCost = localPriceBasis > 0 ? Number(local.shortRoundRate || 0) * (plan.price / localPriceBasis) : 0;
      plan.detail = plan.coversRounds
        ? `${unitAmount(localCredits, "rondes")} nodig; ${unitAmount(plan.credits, "rondes")} geadviseerd. Dit speelrecht dekt al je opgegeven rondes.`
        : shortfallText(localCredits, "rondes");
      candidates.push(addRegistration(withUnit(plan, "rondes", choice.offPeakPackages), handicapPrice));
    });
  }

  // De flyer kent twee routes zonder speelrecht: handicapregistratie voor wie
  // heel af en toe golft, en LoyalTee voor wie af en toe golft. Beide rekenen de
  // rondes per stuk af, dus we bieden ze alleen aan wanneer alle rondes op de
  // grote baan vallen; voor de kleine baan is geen greenfeetarief vastgesteld.
  const loyalTee = hgcConfig.loyalTee || null;
  // De gratis rondes gaan naar de duurste rondes, en de grote baan is op iedere
  // baan duurder dan de kleine.
  const freeLarge = Math.min(largeRounds, vouchers);
  const freeSmall = Math.min(smallRounds, Math.max(0, vouchers - freeLarge));
  const paidLarge = largeRounds - freeLarge;
  const paidSmall = smallRounds - freeSmall;
  // Number(null) is 0, en 0 is finite: zonder deze uitzondering zou een
  // ontbrekend greenfeetarief (null in de config) doorgaan als "gratis" in
  // plaats van als "onbekend", en de tarief-routes toch aanbieden.
  const fee = (course, key) => {
    const value = course && course[key];
    return value === null || value === undefined ? NaN : Number(value);
  };
  // Voor jeugd geldt op elk park hetzelfde vaste greenfeetarief; daarvoor is
  // geen baanafhankelijk tarief nodig zoals bij volwassenen.
  const youthGreenFee = Number(hgcConfig.handicapRegistration.youthGreenFee);
  // Per baantype waar rondes liggen moet een tarief bekend zijn, anders kunnen we
  // deze routes niet eerlijk beprijzen en bieden we ze niet aan.
  const largeFits = youth
    ? Number.isFinite(youthGreenFee)
    : largeRounds === 0 || (Number.isFinite(fee(largeCourse, "greenFee")) && Number.isFinite(fee(largeCourse, "greenFeeFull")));
  const smallFits = youth
    ? Number.isFinite(youthGreenFee)
    : smallRounds === 0 || (Number.isFinite(fee(smallCourse, "shortGreenFee")) && Number.isFinite(fee(smallCourse, "shortGreenFeeFull")));
  // Boven de ingestelde grens hoort een speelrecht het advies te zijn, ook al is
  // per ronde afrekenen daar soms nog een paar tientjes goedkoper. Zo houdt de
  // keuzehulp de ladder van de flyer aan.
  const feeRouteMax = Number(hgcConfig.settings.feeRouteMaxRounds ?? 20);
  const binnenGrens = !Number.isFinite(feeRouteMax) || totalRounds <= feeRouteMax;
  // Jeugd heeft geen LoyalTee, dus die afhankelijkheid geldt alleen voor volwassenen.
  const feeRoutesFit = (youth || loyalTee) && totalRounds > 0 && binnenGrens && largeFits && smallFits;

  if (feeRoutesFit) {
    // Wie alleen handicapregistratie heeft betaalt het volle tarief; met LoyalTee
    // geldt het gereduceerde tarief. Jeugd betaalt op elk park hetzelfde vaste tarief.
    const perRonde = (largeKey, smallKey) => youth
      ? (paidLarge + paidSmall) * youthGreenFee
      : paidLarge * (fee(largeCourse, largeKey) || 0) + paidSmall * (fee(smallCourse, smallKey) || 0);
    const paidRounds = paidLarge + paidSmall;
    const freeRounds = freeLarge + freeSmall;
    // De gratis rondes komen uit de handicapregistratie. Rekent de bezoeker die
    // niet mee, dan heeft die ook de gratis rondes niet en betaalt hij LoyalTee's
    // gereduceerde greenfeetarief over al zijn rondes.
    const perRondeNoReg = (largeKey, smallKey) => youth
      ? totalRounds * youthGreenFee
      : largeRounds * (fee(largeCourse, largeKey) || 0) + smallRounds * (fee(smallCourse, smallKey) || 0);
    const gratisRondesTekst = vouchers > 0
      ? `Een handicapregistratielidmaatschap is inclusief ${decimal.format(vouchers)} gratis ${vouchers === 1 ? "ronde" : "rondes"} golf van 9 holes.`
      : "Met handicapregistratie speel je op elke HGC-baan tegen het greenfeetarief.";

    const routes = [
      {
        type: "handicap",
        group: "handicap",
        name: "Hollandsche Golfclub Handicapregistratie",
        price: handicapPrice,
        registration: false,
        total: perRonde("greenFeeFull", "shortGreenFeeFull"),
        detail: gratisRondesTekst,
        instruction: paidRounds > 0
          ? `Je ${roundWord(paidRounds)} na die gratis rondes reken je per ronde af tegen het greenfeetarief; dat bedrag zit niet in de genoemde prijs.`
          : `Je ${roundWord(totalRounds)} vallen binnen de gratis rondes, dus je betaalt verder niets per ronde.`,
      },
      // Jeugd heeft geen LoyalTee: die route bestaat alleen voor volwassenen.
      ...(youth ? [] : [{
        type: "loyaltee",
        group: "loyaltee",
        name: loyalTee.name,
        price: Number(loyalTee.membershipPrice),
        registration: true,
        total: perRonde("greenFee", "shortGreenFee"),
        detail: `Met LoyalTee speel je zonder speelrecht tegen ${decimal.format(Number(loyalTee.discountPercentage))}% korting op de greenfee.`,
        instruction: paidRounds > 0
          ? `Je ${roundWord(paidRounds)} na de gratis rondes van je handicapregistratie reken je per ronde af tegen het gereduceerde greenfeetarief; dat bedrag zit niet in de genoemde prijs.`
          : `Je ${roundWord(totalRounds)} vallen binnen de gratis rondes van je handicapregistratie.`,
        totalNoReg: perRondeNoReg("greenFee", "shortGreenFee"),
        instructionNoReg: `Je ${roundWord(totalRounds)} reken je per ronde af tegen het gereduceerde greenfeetarief; dat bedrag zit niet in de genoemde prijs.`,
      }]),
    ];

    const excluded = Array.isArray(loyalTee.excludedCourseIds) ? loyalTee.excludedCourseIds : [];
    const loyalTeeGeldt = ![largeRounds > 0 ? largeCourse.id : null, smallRounds > 0 ? smallCourse.id : null]
      .filter(Boolean)
      .some((id) => excluded.includes(id));

    routes.forEach((route) => {
      if (route.type === "loyaltee" && !loyalTeeGeldt) return;
      const plan = {
        type: route.type,
        group: route.group,
        name: route.name,
        productName: route.name,
        price: route.price,
        credits: 0,
        requiredCredits: 0,
        coversRounds: false,
        count: 1,
        packageItems: [],
        availablePackages: [],
        cheaperRoute: null,
        greenFeeExtraRounds: paidRounds,
        greenFeeExtraTotal: route.total,
        coveredRounds: freeRounds,
        largeBaseCost: route.price / totalRounds,
        smallBaseCost: route.price / totalRounds,
        detail: route.detail,
        instruction: route.instruction,
        greenFeeExtraRoundsNoReg: route.type === "loyaltee" ? totalRounds : paidRounds,
        greenFeeExtraTotalNoReg: route.type === "loyaltee" ? route.totalNoReg : route.total,
        instructionNoReg: route.type === "loyaltee" ? route.instructionNoReg : route.instruction,
      };
      if (route.registration) {
        candidates.push(addRegistration(plan, handicapPrice));
      } else {
        candidates.push({ ...plan, registrationPrice: 0, annualCost: route.price });
      }
    });
  }

  const sorted = candidates
    .map((plan) => {
      const shared = (Number(plan.registrationPrice || 0) + Number(plan.sharedCost || 0)) / totalRounds;
      return {
        ...plan,
        selectionCost: Number(plan.annualCost) + Number(plan.reducedGreenFeeTotal || 0) + Number(plan.greenFeeExtraTotal || 0) + Number(plan.repeatExtraTotal || 0),
        largeRoundCost: largeRounds ? Number(plan.largeBaseCost || 0) + shared : null,
        smallRoundCost: smallRounds ? Number(plan.smallBaseCost || 0) + shared : null,
      };
    })
    .sort((a, b) => a.selectionCost - b.selectionCost || a.group.localeCompare(b.group));
  return sorted;
}

// Twee routes zijn gelijkwaardig zodra het dekkende speelrecht binnen de
// ingestelde marge van de goedkoopste route valt. Daaronder adviseert de
// keuzehulp gewoon de goedkoopste.
function routeChoiceFor(best, plans) {
  if (!best || best.coversRounds) return null;
  if (!Number(best.greenFeeExtraRounds || 0)) return null;
  const margin = Number(hgcConfig.settings.dualAdviceMarginPercent ?? 15) / 100;
  const covering = plans.find((plan) => plan.type === best.type && plan.coversRounds);
  if (!covering) return null;
  if (Number(covering.selectionCost) > Number(best.selectionCost) * (1 + margin)) return null;
  return { greenFee: best, covering };
}

function recommendationFor({ largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak }) {
  const plans = candidatePlans({ largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak });
  // Het formulier voorkomt dat dit met 0 rondes wordt aangeroepen; deze
  // controle is er voor wie de API zelf aanroept, zonder dat formulier.
  if (!plans.length) return null;
  const best = plans[0];
  const handicapPrice = youth ? Number(hgcConfig.handicapRegistration.youthPrice) : Number(hgcConfig.handicapRegistration.adultPrice);

  // Winnen handicapregistratie of LoyalTee op prijs, dan blijft dat het advies:
  // de goedkoopste route financieel aanhouden voorkomt dat het rekenmodel zelf
  // moet gaan aannemen wat iemand aan extra speelruimte waard vindt. Ernaast
  // staat altijd het goedkoopste dekkende speelrecht als optie, met wat je
  // daarvoor extra betaalt en wat je ervoor terugkrijgt: ruimte om vaker te
  // spelen dan opgegeven en de mogelijkheid om flightgenoten te introduceren
  // tegen het gereduceerde greenfeetarief.
  const coveringAlternative = ["handicap", "loyaltee"].includes(best.type)
    ? plans.find((plan) => plan.coversRounds) || null
    : null;

  const adjacentPackage = Number(best.credits) === 120
    ? nextSmallerCreditOption(best, handicapPrice)
    : Number(best.credits) === 20 || Number(best.credits) === 60
      ? nextLargerCreditOption(best, handicapPrice)
      : null;
  const profile = playProfile(largeRounds, smallRounds);
  const creditsOption = plans.find((plan) => plan.type === "credits") || null;
  const shortGolfOption = plans.find((plan) => plan.type === "shortgolf") || null;
  // Een keuze tussen twee speelrechten hoort er alleen te staan wanneer een
  // speelrecht ook werkelijk het goedkoopst is. Wint een route die per ronde
  // afrekent, dan is dat het advies en niet die keuze.
  const speelrechtWint = ["credits", "shortgolf"].includes(best.type);
  const choice = profile.zone === "mixed" && speelrechtWint && creditsOption && shortGolfOption
    ? { credits: creditsOption, shortGolf: shortGolfOption }
    : null;
  // Bij een gemengd speelbeeld ligt er al een keuze voor; twee keuzes tegelijk
  // zouden de bezoeker overvragen.
  const routeChoice = choice ? null : routeChoiceFor(best, plans);
  // Is een route met meerdere aankopen goedkoper, dan tonen we die route niet.
  // In plaats daarvan staat het kleinere speelrecht eronder. Bij een dubbele
  // kaart staat de tweede route al naast het advies, dus dan geen derde kaart.
  const alternative = routeChoice
    ? null
    : (best.cheaperRoute ? nextSmallerCreditOption(best, handicapPrice) : null)
      || (Number(best.credits) === 200 ? null : adjacentPackage);
  return {
    largeRounds,
    smallRounds,
    largeCourse,
    smallCourse,
    handicapPrice,
    profile,
    choice,
    routeChoice,
    best,
    alternative,
    coveringAlternative,
  };
}

function calculate() {
  return recommendationFor({
    largeRounds: normaliseRounds(largeRoundsNumber.value),
    smallRounds: normaliseRounds(smallRoundsNumber.value),
    largeCourse: selectedCourse(largeCourseSelect),
    smallCourse: selectedCourse(smallCourseSelect),
    youth: ageCategory.value === "youth",
    canPlayOffPeak: offPeak.checked,
  });
}

function nextLargerCreditOption(plan, handicapPrice) {
  if (!Array.isArray(plan.availablePackages) || !plan.availablePackages.length) return null;
  const next = plan.availablePackages
    .map((item) => ({ ...item, credits: Number(item.credits), price: Number(item.price) }))
    .filter((item) => item.credits > Number(plan.credits) && Number.isFinite(item.price))
    .sort((a, b) => a.credits - b.credits)[0];
  if (!next) return null;

  const totalPrice = next.price + Number(plan.nonPackageCost || 0);
  const unit = plan.unit || "credits";
  const offPeak = usablePackages(plan.offPeakPackages).find((item) => item.credits === next.credits) || null;
  return {
    type: plan.type,
    group: `${plan.group}-upgrade-${next.credits}`,
    unit,
    offPeakPrice: offPeak ? offPeak.price : null,
    offPeakCredits: offPeak ? offPeak.credits : null,
    name: next.name || `${plan.productName} – ${unitAmount(next.credits, unit)}`,
    productName: plan.productName,
    credits: next.credits,
    price: totalPrice,
    registrationPrice: handicapPrice,
    annualCost: totalPrice + handicapPrice,
    isUpgradeOption: true,
    detail: transitionText({ unit, credits: next.credits, price: next.price }),
  };
}

function nextSmallerCreditOption(plan, handicapPrice) {
  if (!Array.isArray(plan.availablePackages) || !plan.availablePackages.length) return null;
  const previous = plan.availablePackages
    .map((item) => ({ ...item, credits: Number(item.credits), price: Number(item.price) }))
    .filter((item) => item.credits < Number(plan.credits) && Number.isFinite(item.price))
    .sort((a, b) => b.credits - a.credits)[0];
  if (!previous) return null;

  const fewerCredits = Number(plan.credits) - previous.credits;
  const shortfall = Number(plan.requiredCredits) - previous.credits;
  const saving = Number(plan.packageBasePrice ?? plan.price) - previous.price;
  const totalPrice = previous.price + Number(plan.nonPackageCost || 0);
  const unit = plan.unit || "credits";
  return {
    type: plan.type,
    group: `${plan.group}-starter-${previous.credits}`,
    unit,
    name: previous.name || `${plan.productName} – ${unitAmount(previous.credits, unit)}`,
    productName: plan.productName,
    credits: previous.credits,
    price: totalPrice,
    registrationPrice: handicapPrice,
    annualCost: totalPrice + handicapPrice,
    isSmallerOption: true,
    detail: `Je start met ${unitAmount(fewerCredits, unit)} minder en betaalt ${euro.format(saving)} minder voor het speelrecht. ${shortfall > 0 ? shortfallText(Number(plan.requiredCredits), unit, "dit speelrecht") : ""}`.trim(),
  };
}

function planBenefits(plan) {
  const source = plan.type === "handicap"
    ? hgcConfig.handicapBenefits
    : plan.type === "loyaltee"
      ? hgcConfig.loyalTeeBenefits
      : plan.type === "shortgolf"
    ? hgcConfig.shortGolfBenefits
    : plan.group.startsWith("local-")
      ? hgcConfig.localBenefits
      : hgcConfig.benefits;
  const cleanedSource = source.filter((benefit) => !/handicapregistratie/i.test(benefit));
  const registrationBenefits = ["Handicapregistratie bij de Hollandsche Golfclub"];
  return [...cleanedSource, ...registrationBenefits]
    .map(brandText)
    .filter((item, index, all) => all.indexOf(item) === index);
}

function planLink(plan) {
  return hgcConfig.links.webshop;
}

function costCard(label, value, note, registrationShare) {
  if (value === null) return "";
  return `<article><p>${label}</p><strong>${switchableAmount(value, value - registrationShare)}</strong><span>${note}</span></article>`;
}

// De schakelaar in het advies wisselt uitsluitend de getoonde bedragen. De
// prijs voor handicapregistratie is voor ieder speelrecht gelijk en verandert
// de aanbeveling dus niet; alleen wat de bezoeker ziet verandert.
function handicapDefault() {
  return hgcConfig.settings.includeHandicapByDefault === true;
}

function switchableAmount(withRegistration, withoutRegistration) {
  const withText = euro.format(withRegistration);
  const withoutText = euro.format(withoutRegistration);
  return `<span class="switchable" data-with="${withText}" data-without="${withoutText}">${handicapDefault() ? withText : withoutText}</span>`;
}

// Voor tekst die verandert met de schakelaar, niet alleen een bedrag: de gratis
// rondes bij LoyalTee komen uit de handicapregistratie, dus zonder die
// registratie meegerekend geldt er ook geen vrijstelling.
function switchableHtml(withHtml, withoutHtml) {
  return `<span class="switchable" data-with="${withHtml}" data-without="${withoutHtml}">${handicapDefault() ? withHtml : withoutHtml}</span>`;
}

// Het bedrag van één aankoop, zoals het in de webshop staat.
function planAmount(plan) {
  const total = Number(plan.annualCost);
  return switchableAmount(total, total - Number(plan.registrationPrice || 0));
}

function applyRegistrationSwitch(include) {
  resultContent.querySelectorAll(".switchable").forEach((node) => {
    node.textContent = include ? node.dataset.with : node.dataset.without;
  });
}

function roundWord(count) {
  return `${count} ronde${count === 1 ? "" : "s"}`;
}

function disclaimer() {
  return `<p class="result-disclaimer">Deze keuzehulp geeft een indicatie van het passende speelrecht: altijd onder voorbehoud van fouten. Lees voor je keuze altijd zelf alle actuele informatie op de website over het aanbod: <a href="${hgcConfig.links.handicapRegistration}">Handicapregistratie</a>, <a href="${hgcConfig.links.loyalTee}">LoyalTee</a> en <a href="${hgcConfig.links.playingRights}">Speelrechten</a>. En lees ook de <a href="${hgcConfig.links.terms}">voorwaarden</a>.</p>`;
}

// Speelt de bezoeker op een baan met een afwijkende holeindeling, dan tonen we
// daar een voorbehoud bij: de creditberekening gaat uit van een standaardronde.
function courseCaveats(result) {
  const courses = [
    result.largeRounds > 0 ? { course: result.largeCourse, type: "large" } : null,
    result.smallRounds > 0 ? { course: result.smallCourse, type: "small" } : null,
  ]
    .filter(Boolean)
    .filter(({ course, type }) => {
      if (!course || !course.caveat) return false;
      const target = course.caveatCourse || "both";
      return target === "both" || target === type;
    })
    .map(({ course }) => course);
  const unique = courses.filter((course, index, all) => all.findIndex((other) => other.id === course.id) === index);
  return unique
    .map((course) => `<p class="result-disclaimer result-disclaimer--course">Let op: ${course.caveat}</p>`)
    .join("");
}

function roundSummaryShort(result) {
  const parts = [];
  if (result.largeRounds) parts.push(`${result.largeRounds} grote baan`);
  if (result.smallRounds) parts.push(`${result.smallRounds} kleine baan`);
  return parts.join(" · ");
}

// Smalle kopregel boven elke uitkomst: de opgave en, waar van toepassing, de
// schakelaar of handicapregistratie in de getoonde bedragen zit. Bij het
// handicapregistratie-advies zelf is die schakelaar er niet, want daar is de
// registratie het product en dus geen keuze.
function resultHeader(result, { showSwitch = true } = {}) {
  return `
    <div class="result-topbar">
      <div class="result-topbar-label">Jouw opgave · ${roundSummaryShort(result)}</div>
      ${showSwitch ? `
        <div class="result-topbar-switch">
          <span>Bedragen weergeven</span>
          <div class="result-toggle">
            <input id="handicap-switch" type="checkbox" ${handicapDefault() ? "checked" : ""} />
            <label for="handicap-switch" class="result-toggle-seg result-toggle-seg--without">Zonder handicapregistratie</label>
            <label for="handicap-switch" class="result-toggle-seg result-toggle-seg--with">Met (+ ${euro.format(result.handicapPrice)})</label>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

// De zachte kaart met zwevend label waarin een alternatief speelrecht staat:
// wat het extra kost of scheelt, en wat je daarvoor terugkrijgt.
function adviceAlt({ label, plan, amountNote, note }) {
  return `
    <div class="advice-alt">
      <div class="advice-alt-label">${label}</div>
      <div class="advice-alt-body">
        <h3>${brandText(plan.name)}</h3>
        <div class="advice-alt-amount"><strong>${planAmount(plan)}</strong><span>${amountNote}</span></div>
        ${note ? `<div class="advice-alt-note">${note}</div>` : ""}
      </div>
    </div>
  `;
}

function roundPriceLine(plan, registrationShare) {
  const share = Number(registrationShare || 0);
  const delen = [];
  const bedrag = (waarde) => waarde != null && Number.isFinite(Number(waarde));
  const toonGroot = bedrag(plan.largeRoundCost)
    && Number(plan.largeBaseCost || 0) > 0
    && !Number(plan.uncoveredLargeRounds || 0)
    && !Number(plan.reducedGreenFeeRounds || 0);
  if (toonGroot) delen.push(`Grote baan ${switchableAmount(plan.largeRoundCost, plan.largeRoundCost - share)}`);
  if (bedrag(plan.smallRoundCost) && Number(plan.smallBaseCost || 0) > 0) {
    delen.push(`Kleine baan ${switchableAmount(plan.smallRoundCost, plan.smallRoundCost - share)}`);
  }
  if (!delen.length) return "";
  return `<p class="advice-card-rounds">${delen.join(" · ")}<small>prijs per ronde</small></p>`;
}

// De toelichting hoort dezelfde schakelaar te volgen als de bedragen: zonder
// handicapregistratie gelden de gratis rondes daaruit niet.
function cardInstruction(plan) {
  return plan.instructionNoReg && plan.instructionNoReg !== plan.instruction
    ? switchableHtml(plan.instruction, plan.instructionNoReg)
    : plan.instruction;
}

function choiceCard(plan, options) {
  return `
    <article class="advice-card advice-card--${options.variant}">
      <p class="advice-card-question">${options.question}</p>
      <p class="eyebrow">${options.product}</p>
      <h4>${brandText(plan.name)}</h4>
      <p class="advice-card-amount">${planAmount(plan)}<small>${options.amountNote}</small></p>
      <p class="advice-card-coverage">${options.coverage}</p>
      ${options.hideRoundPrice ? "" : roundPriceLine(plan, options.registrationShare)}
      ${plan.coversRounds || options.hideInstruction ? "" : `<p class="advice-card-instruction">${cardInstruction(plan)}</p>`}
      <a class="button ${options.buttonClass} button--cta-tracked" href="${planLink(plan)}">Kies dit speelrecht <span>→</span></a>
    </article>
  `;
}

// Bij een gemengd speelbeeld kiest de bezoeker zelf tussen een algemeen
// speelrecht en een Shortgolf-speelrecht.
function renderChoice(result) {
  const credits = result.choice.credits;
  const shortGolf = result.choice.shortGolf;
  const largeRoundsText = `${roundWord(result.largeRounds)} op de grote baan`;
  const smallRoundsText = `${roundWord(result.smallRounds)} op de kleine baan`;
  const shortGolfRekentGrotebaanPerRonde = Number(shortGolf.reducedGreenFeeRounds || 0) > 0;
  const kortGezegd = shortGolfRekentGrotebaanPerRonde
    ? "Alles afgekocht op beide banen kost meer vooraf; met Shortgolf betaal je minder vooraf en reken je de grote baan per ronde af. Weet je nog niet waar je meer gaat spelen? Dan is het volledige speelrecht de veiligste keuze."
    : "Alles afgekocht op beide banen kost meer vooraf, maar dekt ook alles in één keer. Weet je nog niet waar je meer gaat spelen? Dan is het volledige speelrecht de veiligste keuze.";

  resultContent.innerHTML = `
    ${resultHeader(result)}

    <div class="advice-badge advice-badge--choice">Twee passende speelrechten — jij kiest</div>
    <h2>Je speelt beide banen ongeveer even vaak</h2>
    <p class="advice-intro">Daarom is er hier geen goedkoopste keuze in het algemeen: het hangt af van <strong>waar je het liefst speelt</strong>. Kies je voor volledige dekking op beide banen, of voor het laagste bedrag vooraf met de kleine baan als basis?</p>

    <div class="advice-choice">
      ${choiceCard(credits, {
        variant: "credits",
        question: "Speel je voornamelijk op de grote baan?",
        product: brandText(credits.productName),
        amountNote: "voor al je rondes",
        coverage: credits.coversRounds
          ? `Dit speelrecht dekt zowel je ${largeRoundsText} als je ${smallRoundsText}.`
          : `Dit speelrecht dekt een deel van je ${largeRoundsText} en je ${smallRoundsText}.`,
        buttonClass: "button--primary",
      })}
      ${choiceCard(shortGolf, {
        variant: "shortgolf",
        question: "Speel je voornamelijk op de kleine baan?",
        product: brandText(shortGolf.productName),
        amountNote: `voor je ${smallRoundsText}`,
        coverage: `${shortGolf.coversRounds
          ? `Shortgolf-credits zijn voordeliger op de kleine baan. Dit speelrecht dekt je ${smallRoundsText}.`
          : `Shortgolf-credits zijn voordeliger op de kleine baan. Dit speelrecht dekt een deel van je ${smallRoundsText}.`
        } ${shortGolfRekentGrotebaanPerRonde
          ? `Je ${largeRoundsText} reken je per ronde af tegen het gereduceerde greenfeetarief voor speelrechthouders; dat bedrag zit niet in de genoemde prijs.`
          : `Je ${largeRoundsText} ${result.largeRounds === 1 ? "valt" : "vallen"} buiten dit speelrecht.`
        }`,
        buttonClass: "button--shortgolf",
      })}
    </div>

    <div class="advice-summary">
      <p><strong>Kort gezegd:</strong> ${kortGezegd}</p>
      <a href="${hgcConfig.links.playingRights || "/hgc-speelrechten/"}">Vergelijk de speelrechten →</a>
    </div>

    ${courseCaveats(result)}
    ${disclaimer()}
  `;
}

// Ligt de goedkoopste route dicht bij het speelrecht dat alle rondes dekt, dan
// is er geen goed antwoord dat de keuzehulp voor de bezoeker kan geven. Dan
// legt zij de keuze bij hem, met dezelfde twee kaarten als bij gemengd spel.
function renderRouteChoice(result) {
  const zuinig = result.routeChoice.greenFee;
  const ruim = result.routeChoice.covering;
  const deelPerRonde = (plan) => {
    const rondes = result.largeRounds + result.smallRounds;
    return rondes > 0 ? Number(plan.registrationPrice || 0) / rondes : 0;
  };
  const unit = zuinig.unit || "credits";
  // Shortgolf dekt de grote baan niet; die rondes noemen we op beide kaarten.
  const groteBaanApart = Number(zuinig.reducedGreenFeeRounds || 0) > 0
    ? ` Je ${roundWord(result.largeRounds)} op de grote baan reken je per ronde af tegen het gereduceerde greenfeetarief; dat bedrag zit niet in de genoemde prijs.`
    : Number(zuinig.uncoveredLargeRounds || 0) > 0
      ? ` Je ${roundWord(result.largeRounds)} op de grote baan ${result.largeRounds === 1 ? "valt" : "vallen"} buiten dit speelrecht.`
      : "";

  resultContent.innerHTML = `
    ${resultHeader(result)}

    <div class="advice-badge advice-badge--choice">Twee speelrechten liggen hier dicht bij elkaar</div>
    <h2>Wat het beste uitkomt, hangt van jou af</h2>
    <p class="advice-intro">Wat het beste uitkomt, hangt ervan af of je precies zoveel speelt als je nu opgaf, of vaker.</p>

    <div class="advice-choice advice-choice--stacked">
      ${choiceCard(zuinig, {
        variant: "credits",
        question: "Weet je zeker dat je niet vaker speelt?",
        product: brandText(zuinig.productName),
        amountNote: "voor dit speelrecht",
        registrationShare: deelPerRonde(zuinig),
        coverage: shortfallText(Number(zuinig.requiredCredits), unit) + groteBaanApart,
        hideInstruction: true,
        buttonClass: "button--primary",
      })}
      ${choiceCard(ruim, {
        variant: "credits",
        question: "Speel je misschien vaker dan je nu opgaf?",
        product: brandText(ruim.productName),
        amountNote: groteBaanApart ? "voor dit speelrecht" : "voor al je rondes",
        coverage: transitionText(ruim) + groteBaanApart,
        hideRoundPrice: true,
        hideInstruction: true,
        buttonClass: "button--primary",
      })}
    </div>

    ${courseCaveats(result)}
    ${disclaimer()}
  `;
}

function renderSingleAdvice(result) {
  const best = result.best;
  const alternative = result.alternative;
  const totalRounds = result.largeRounds + result.smallRounds;
  const registrationShare = totalRounds > 0 ? Number(best.registrationPrice || 0) / totalRounds : 0;
  const isShortGolf = best.type === "shortgolf";
  const uncoveredLargeRounds = Number(best.uncoveredLargeRounds || 0);
  const greenFeeRounds = Number(best.reducedGreenFeeRounds || 0);
  // Het greenfeetarief wordt nooit als bedrag getoond, dus ook niet als kosten
  // per ronde op de grote baan.
  const greenFeeExtraRounds = Number(best.greenFeeExtraRounds || 0);
  const greenFeeExtraRoundsNoReg = Number(best.greenFeeExtraRoundsNoReg ?? greenFeeExtraRounds);
  const hasGreenFeeExtraRounds = greenFeeExtraRounds > 0 || greenFeeExtraRoundsNoReg > 0;
  const perRondeRoute = ["handicap", "loyaltee"].includes(best.type);
  // largeBaseCost/smallBaseCost spreiden de prijs over de credits die je
  // werkelijk opmaakt, dus dit is wat een gespeelde ronde je kost. Rondes die
  // op greenfee gaan zitten er niet in; die staan apart onder "Wat je verder
  // betaalt".
  // Bij shortgolf blijft largeBaseCost altijd 0 (Shortgolf-credits dekken de
  // grote baan nooit), dus die kaart blijft terecht verborgen.
  const showLargeRoundCost = result.largeRounds > 0 && !uncoveredLargeRounds && !greenFeeRounds;
  const showSmallRoundCost = result.smallRounds > 0 && !perRondeRoute;
  const herhaalt = Number(best.repeatPurchases || 0) > 1;
  const rondesBuitenPrijs = hasGreenFeeExtraRounds || greenFeeRounds > 0 || uncoveredLargeRounds > 0 || (!perRondeRoute && !best.coversRounds);
  const totalCostLabel = herhaalt || rondesBuitenPrijs ? "Wat je vooraf betaalt" : "Verwachte kosten per jaar";
  const totalCostNote = herhaalt
    ? `per aankoop van ${unitAmount(Number(best.credits), best.unit || "credits")}`
    : rondesBuitenPrijs
      ? "niet alle rondes worden door dit speelrecht gedekt"
      : "per golfjaar";
  const productNote = herhaalt || rondesBuitenPrijs ? "voor dit speelrecht" : "per golfjaar";
  // Het badge-label bovenaan zegt in één keer waar de uitkomst om draait: een
  // route die per ronde afrekent is per definitie de goedkoopste voor deze
  // opgave; koop je stapsgewijs bij, dan is dat de eerste vraag, niet de prijs.
  const advieslabel = perRondeRoute || (best.coversRounds && !herhaalt && !rondesBuitenPrijs)
    ? { tone: "best", text: `★ Goedkoopste keuze voor jouw ${roundWord(totalRounds)}` }
    : herhaalt
      ? { tone: "steps", text: `Stapsgewijs · je koopt bij wanneer je ${unitWord(best.unit || "credits", 2)} op zijn` }
      : { tone: "steps", text: "Let op: dit speelrecht dekt niet al je rondes" };
  resultContent.innerHTML = `
    ${resultHeader(result, { showSwitch: best.type !== "handicap" })}

    <div class="advice-badge advice-badge--${advieslabel.tone}">${advieslabel.text}</div>
    <h2>${brandText(best.name)}</h2>

    ${perRondeRoute ? `
      <div class="choice-costs choice-costs--steps">
        <article class="choice-costs-total"><p><span class="stat-num">1</span>Wat je vooraf betaalt</p><strong>${planAmount(best)}</strong><span>${best.detail}</span></article>
        <article><p><span class="stat-num">2</span>Wat je verder betaalt</p><span class="stat-value-text">${best.type === "handicap" ? "Losse greenfee" : "Gereduceerde greenfee"}</span><span class="stat-instruction">${best.instructionNoReg && best.instructionNoReg !== best.instruction ? switchableHtml(best.instruction, best.instructionNoReg) : best.instruction}</span></article>
      </div>
    ` : `
      <div class="choice-costs">
        <article class="choice-costs-total"><p>${totalCostLabel}</p><strong>${planAmount(best)}</strong><span>${totalCostNote}</span></article>
        ${costCard("Grote baan", showLargeRoundCost ? best.largeRoundCost : null, "prijs per ronde", registrationShare)}
        ${costCard("Kleine baan", showSmallRoundCost ? best.smallRoundCost : null, "prijs per ronde", registrationShare)}
      </div>
      ${uncoveredLargeRounds || greenFeeRounds || !best.coversRounds ? `
        <h3 class="result-subheading">Wat je verder betaalt</h3>
        ${uncoveredLargeRounds ? `<p class="coverage-warning">Je ${roundWord(uncoveredLargeRounds)} op de grote baan ${uncoveredLargeRounds === 1 ? "valt" : "vallen"} buiten dit speelrecht. Die reken je apart af op de baan.</p>` : ""}
        ${greenFeeRounds ? `<p class="greenfee-note">Je ${roundWord(greenFeeRounds)} op de grote baan reken je per ronde af tegen het gereduceerde greenfeetarief voor speelrechthouders. Dat bedrag zit niet in de prijs hierboven.</p>` : ""}
        ${best.coversRounds ? "" : `<p class="package-instruction">${best.instructionNoReg && best.instructionNoReg !== best.instruction ? switchableHtml(best.instruction, best.instructionNoReg) : best.instruction}</p>`}
      ` : ""}
    `}

    <div class="recommendation-actions" style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap">
      <a class="button button--secondary" href="${hgcConfig.links.handicapRegistration}">Meer over Handicapregistratie</a>
      <a class="button button--secondary" href="${hgcConfig.links.playingRights || "/hgc-speelrechten/"}">Meer over speelrechten</a>
      <a class="button button--secondary" href="${hgcConfig.links.greenFeePrices}">Alle greenfeeprijzen</a>
      <a class="button ${isShortGolf ? "button--shortgolf" : "button--primary"} button--cta-tracked" href="${planLink(best)}">Naar de webshop <span>→</span></a>
    </div>

    ${result.coveringAlternative ? adviceAlt({
      label: "Meer speelruimte",
      plan: result.coveringAlternative,
      amountNote: "per golfjaar · alle rondes inbegrepen",
      note: transitionText(result.coveringAlternative, { fromFeeRoute: true }),
    }) : ""}

    ${alternative ? adviceAlt({
      label: alternative.isUpgradeOption ? "Meer speelruimte" : alternative.isSmallerOption ? "Voordeliger instappen" : "Andere passende optie",
      plan: alternative,
      amountNote: "per golfjaar",
      note: alternative.detail,
    }) : ""}

    ${courseCaveats(result)}
    ${disclaimer()}
  `;
}

function renderResult(result) {
  if (result.choice) {
    renderChoice(result);
  } else if (result.routeChoice) {
    renderRouteChoice(result);
  } else {
    renderSingleAdvice(result);
  }
  lastResult = result;
  if (adviesMail) resultContent.insertAdjacentHTML("beforeend", adviesMailBlock());
  applyRegistrationSwitch(handicapDefault());
}

/* ---------- advies per mail ---------- */

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Welk soort speelrecht een plan is. De server zoekt daarmee zelf naam en
// prijs op; de browser stuurt geen teksten mee.
function planFamily(plan) {
  const group = String(plan?.group || "");
  const localId = Object.keys(hgcConfig.localPackages || {}).find((id) => group.startsWith(`local-${id}`));
  if (localId) return group.startsWith(`local-${localId}-offpeak`) ? `local:${localId}:offpeak` : `local:${localId}`;
  return ["standard", "offpeak", "youth", "shortgolf", "handicap", "loyaltee"].find((family) => group.startsWith(family)) || null;
}

function mailPlans(result) {
  const plans = result.choice
    ? [result.choice.credits, result.choice.shortGolf]
    : result.routeChoice
      ? [result.routeChoice.greenFee, result.routeChoice.covering]
      : [result.best, result.alternative || result.coveringAlternative];
  return plans.filter(Boolean).map((plan) => ({
    family: planFamily(plan),
    credits: Number(plan.credits) || 0,
    repeat: Number(plan.repeatPurchases || 1),
    greenFeeRounds: Number(plan.greenFeeExtraRounds || 0),
    covers: Boolean(plan.coversRounds),
  })).filter((plan) => plan.family);
}

function adviesMailBlock() {
  const privacy = adviesMail.privacyUrl
    ? `<a href="${escapeHtml(adviesMail.privacyUrl)}" target="_blank" rel="noopener">privacyverklaring</a>`
    : "privacyverklaring";
  return `
    <section class="advies-mail" data-advies-mail aria-labelledby="advies-mail-title">
      <h3 id="advies-mail-title">${escapeHtml(adviesMail.titel)}</h3>
      <p class="advies-mail-intro">${escapeHtml(adviesMail.intro)}</p>
      <div class="advies-mail-fields">
        <label class="advies-mail-field"><span>Voornaam <small>(optioneel)</small></span><input type="text" name="advies-voornaam" autocomplete="given-name" maxlength="60" data-advies-mail-input /></label>
        <label class="advies-mail-field"><span>E-mailadres</span><input type="email" name="advies-email" autocomplete="email" required data-advies-mail-input /></label>
      </div>
      <label class="advies-mail-website" aria-hidden="true">Website<input type="text" name="advies-website" tabindex="-1" autocomplete="off" /></label>
      <label class="advies-mail-check"><input type="checkbox" name="advies-opvolging" /> <span>${escapeHtml(adviesMail.vinkje)}</span></label>
      <p class="advies-mail-privacy">We gebruiken je gegevens alleen om je dit advies te sturen. Zet je het vinkje aan, dan onthouden we met een cookie welke pagina's je daarna op onze website bekijkt, om de berichten daarop af te stemmen. Lees onze ${privacy}.</p>
      <div class="advies-mail-actions">
        <button class="button button--primary" type="button" data-advies-mail-send>${escapeHtml(adviesMail.knop)} <span>→</span></button>
      </div>
      <p class="advies-mail-status" role="status" aria-live="polite" hidden></p>
    </section>
  `;
}

async function sendAdviesMail(block) {
  const status = block.querySelector(".advies-mail-status");
  const button = block.querySelector("[data-advies-mail-send]");
  const emailInput = block.querySelector('[name="advies-email"]');
  const show = (text, tone) => { status.hidden = false; status.textContent = text; status.dataset.tone = tone; };
  if (!lastResult) return;
  if (!emailInput.value.trim() || !emailInput.checkValidity()) {
    show("Vul een geldig e-mailadres in.", "error");
    emailInput.focus();
    return;
  }
  const opvolging = block.querySelector('[name="advies-opvolging"]').checked;
  const body = {
    email: emailInput.value.trim(),
    voornaam: block.querySelector('[name="advies-voornaam"]').value.trim(),
    website: block.querySelector('[name="advies-website"]').value,
    opvolgToestemming: opvolging,
    paginaUrl: window.location.href,
    invoer: {
      l: lastResult.largeRounds,
      s: lastResult.smallRounds,
      lc: lastResult.largeCourse?.id || "",
      sc: lastResult.smallCourse?.id || "",
      y: ageCategory.value === "youth",
      op: offPeak.checked,
    },
    plannen: mailPlans(lastResult),
  };
  button.disabled = true;
  show("Bezig met versturen…", "busy");
  try {
    const response = await fetch(adviesMail.ajaxUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.success) {
      // De volgcode (alleen met vinkje) onthoudt welke pagina's je daarna
      // bekijkt; het script in de voettekst van elke pagina meldt die.
      const volgToken = data.data?.volgToken;
      if (/^[a-f0-9]{32}$/.test(volgToken || "")) {
        const dagen = Number(data.data?.volgDagen) || 60;
        document.cookie = `hgc_kh=${volgToken}; Max-Age=${dagen * 86400}; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      }
      show(data.data?.message || adviesMail.bedankt, "ok");
      block.querySelector(".advies-mail-fields").hidden = true;
      block.querySelector(".advies-mail-check").hidden = true;
      button.hidden = true;
      track("calculator_advice_emailed", { follow_up: opvolging });
      return;
    }
    show(data?.data?.message || "Versturen lukte niet. Probeer het later nog eens.", "error");
  } catch {
    show("Versturen lukte niet. Controleer je verbinding en probeer het opnieuw.", "error");
  }
  button.disabled = false;
}

// De link in de mail opent de keuzehulp met dezelfde invoer en toont meteen
// het advies, met de prijzen van dat moment.
function applyLinkInput() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("hgc_l") && !params.has("hgc_s")) return false;
  const rounds = (key) => String(normaliseRounds(params.get(key) || 0));
  largeRoundsNumber.value = rounds("hgc_l");
  largeRoundsRange.value = largeRoundsNumber.value;
  smallRoundsNumber.value = rounds("hgc_s");
  smallRoundsRange.value = smallRoundsNumber.value;
  const pick = (select, id) => {
    if (id && [...select.options].some((option) => option.value === id)) select.value = id;
  };
  pick(largeCourseSelect, params.get("hgc_lc"));
  pick(smallCourseSelect, params.get("hgc_sc"));
  ageCategory.value = params.get("hgc_y") === "1" ? "youth" : "adult";
  offPeak.checked = params.get("hgc_op") === "1";
  largeCoursePicker.render();
  smallCoursePicker.render();
  updateCourseHelp();
  updateRangeFill(largeRoundsRange);
  updateRangeFill(smallRoundsRange);
  if (Number(largeRoundsNumber.value) + Number(smallRoundsNumber.value) < 1) return false;
  track("calculator_opened_from_email");
  form.requestSubmit();
  return true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  largeRoundsNumber.value = normaliseRounds(largeRoundsNumber.value);
  smallRoundsNumber.value = normaliseRounds(smallRoundsNumber.value);
  largeRoundsRange.value = largeRoundsNumber.value;
  smallRoundsRange.value = smallRoundsNumber.value;
  if (Number(largeRoundsNumber.value) + Number(smallRoundsNumber.value) < 1) {
    roundsError.hidden = false;
    largeRoundsNumber.focus();
    return;
  }
  roundsError.hidden = true;
  const result = calculate();
  renderResult(result);
  track("calculator_step_1_completed", { large_rounds: result.largeRounds, small_rounds: result.smallRounds });
  track("calculator_result_viewed", { recommended_product: result.best.name, annual_cost: result.best.annualCost, play_profile: result.profile.zone });
  showStep(2);
});

calculatorRoot.querySelector("[data-back]").addEventListener("click", () => showStep(1));
calculatorRoot.querySelector("#restart").addEventListener("click", () => {
  // Opnieuw beginnen zet de rondes op nul, net als bij het openen: een vooraf
  // ingevuld aantal kan iemand per ongeluk overnemen.
  largeRoundsNumber.value = 0;
  largeRoundsRange.value = 0;
  smallRoundsNumber.value = 0;
  smallRoundsRange.value = 0;
  ageCategory.value = "adult";
  offPeak.checked = false;
  roundsError.hidden = true;
  updateRangeFill(largeRoundsRange);
  updateRangeFill(smallRoundsRange);
  showStep(1);
  track("calculator_restarted");
});
resultContent.addEventListener("click", (event) => {
  if (event.target.closest(".button--cta-tracked")) track("calculator_product_clicked");
});
resultContent.addEventListener("click", (event) => {
  const send = event.target.closest("[data-advies-mail-send]");
  if (send) sendAdviesMail(send.closest("[data-advies-mail]"));
});
// Enter in het mailformulier verstuurt het advies, niet het rekenformulier
// eromheen.
resultContent.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !event.target.matches("[data-advies-mail-input]")) return;
  event.preventDefault();
  sendAdviesMail(event.target.closest("[data-advies-mail]"));
});
resultContent.addEventListener("change", (event) => {
  if (event.target.id !== "handicap-switch") return;
  applyRegistrationSwitch(event.target.checked);
  track("calculator_registration_switched", { handicap_registration: event.target.checked });
});
largeCourseSelect.addEventListener("change", () => { largeCoursePicker.render(); updateCourseHelp(); });
smallCourseSelect.addEventListener("change", () => { smallCoursePicker.render(); updateCourseHelp(); });
connectRange(largeRoundsRange, largeRoundsNumber);
connectRange(smallRoundsRange, smallRoundsNumber);
populateCourses();
updateRangeFill(largeRoundsRange);
updateRangeFill(smallRoundsRange);
progressBar.style.width = "50%";
if (new URLSearchParams(window.location.search).has("hgc-audit")) {
  window.hgcCalculatorAudit = Object.freeze({ packagePlan, candidatePlans, recommendationFor, calculate, playProfile, renderResult, resultContent, planBenefits, applyRegistrationSwitch, handicapDefault });
}
track("calculator_opened");
applyLinkInput();
})();
