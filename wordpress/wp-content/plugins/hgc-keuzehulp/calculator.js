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
  range.style.background = `linear-gradient(90deg, var(--green) 0 ${percentage}%, #dfe5df ${percentage}%)`;
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

function packagePlan(packages, requiredCredits, productName, group) {
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
    ? `Met ${decimal.format(chosen.credits)} credits heb je voldoende ruimte voor jouw verwachte rondes.`
    : `Er bestaat geen groter speelrecht dan ${decimal.format(chosen.credits)} credits. Zodra die credits op zijn, kun je een nieuw speelrecht aanschaffen.`;

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
    name: chosen.items[0].name || `${productName} – ${chosen.credits} credits`,
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
  const standardCredits = largeRounds * largeCourse.largeRate + smallRounds * smallCourse.shortRate;
  const shortGolfFitsPlayStyle = smallRounds > 0;
  const candidates = [];

  const packageChoices = youth
    ? [{ packages: hgcConfig.youthPackages, name: "Hollandsche Golfclub Jeugd-speelrecht", group: "youth" }]
    : [
        { packages: hgcConfig.standardPackages, name: "Hollandsche Golfclub Speelrecht", group: "standard" },
        ...(canPlayOffPeak ? [{ packages: hgcConfig.offPeakPackages, name: "Hollandsche Golfclub Daluren-speelrecht", group: "offpeak" }] : []),
      ];
  // greenfeebedrag weegt via selectionCost mee en blijft buiten de prijs.
  const largeGreenFee = Number(largeCourse && largeCourse.greenFee);
  const largeRate = Number(largeCourse && largeCourse.largeRate);
  const canPlayOnGreenFee = largeRounds > 0 && standardCredits > 0
    && Number.isFinite(largeGreenFee) && largeGreenFee > 0
    && Number.isFinite(largeRate) && largeRate > 0;

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
        && Math.ceil(shortfall / largeRate - 1e-8) <= largeRounds + 1e-8;
      if (!shortfallFairlyPriced) {
        plan.availablePackages = choice.packages;
        plan.coveredRounds = standardCredits > 0 ? totalRounds * Math.min(1, plan.credits / standardCredits) : totalRounds;
        // Dekt het pakket alles, dan spreiden we de prijs over de credits die je
        // nodig hebt: dat is exact wat je gaat spelen. Dekt het pakket niet
        // alles, dan bestaat dat "nodig" aantal niet eerlijk meer (een deel
        // blijft onbeprijsd); dan spreiden we over de credits die je wél kocht,
        // zodat de prijs per ronde alleen over de credit-gedekte rondes gaat.
        const priceBasis = plan.coversRounds ? standardCredits : plan.credits;
        plan.largeBaseCost = priceBasis > 0 ? largeCourse.largeRate * (plan.price / priceBasis) : 0;
        plan.smallBaseCost = priceBasis > 0 ? smallCourse.shortRate * (plan.price / priceBasis) : 0;
        plan.detail = plan.coversRounds
          ? `${decimal.format(standardCredits)} credits nodig; ${decimal.format(plan.credits)} credits geadviseerd. Dit speelrecht dekt al je opgegeven rondes.`
          : `${decimal.format(standardCredits)} credits nodig; ${decimal.format(plan.credits)} credits geadviseerd. Dit speelrecht dekt een deel van je opgegeven rondes.`;
        candidates.push(addRegistration(plan, handicapPrice));
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
        largeBaseCost: standardCredits > 0 ? largeCourse.largeRate * (aankopen * price / standardCredits) : 0,
        smallBaseCost: standardCredits > 0 ? Number(smallCourse.shortRate) * (aankopen * price / standardCredits) : 0,
        detail: `${decimal.format(standardCredits)} credits nodig; ${decimal.format(credits)} credits geadviseerd. Daarmee dek je het eerste deel van je rondes.`,
        instruction: `Koop een nieuw speelrecht van ${decimal.format(credits)} credits zodra deze op zijn. Zo betaal je alleen voor de credits die je gebruikt.`,
      };
      candidates.push(addRegistration(plan, handicapPrice));
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
        const extraRounds = Math.ceil(shortfall / largeRate - 1e-8);
        if (extraRounds > largeRounds + 1e-8) return;
        const rounded = extraRounds;
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
          greenFeeExtraRounds: extraRounds,
          greenFeeExtraTotal: extraRounds * largeGreenFee,
          coveredRounds: totalRounds * Math.min(1, credits / standardCredits),
          // Op basis van de credits: de prijs per ronde spreidt over de credits
          // die je koopt, niet over de rondes die je daarna nog op greenfee
          // bijspeelt. Anders lijkt die prijs lager dan hij is.
          largeBaseCost: largeRate * (price / credits),
          smallBaseCost: Number(smallCourse.shortRate) * (price / credits),
          detail: `${decimal.format(standardCredits)} credits nodig; ${decimal.format(credits)} credits geadviseerd. Daarmee dek je het grootste deel van je rondes.`,
          instruction: `De ${decimal.format(rounded)} rondes die je na ${decimal.format(credits)} credits nog op de grote baan speelt, reken je per ronde af tegen het gereduceerde greenfeetarief voor speelrechthouders; dat bedrag zit niet in de genoemde prijs. Of je koopt een nieuw speelrecht van ${decimal.format(credits)} credits.`,
        };
        candidates.push(addRegistration(plan, handicapPrice));
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
      // Dekt het pakket alles, dan spreiden we over de rondes die je speelt
      // (gelijk aan spreiden over de credits die je nodig hebt). Dekt het niet
      // alles, dan spreiden we over de credits die je wél kocht, niet over
      // rondes die straks alsnog op greenfee gaan.
      shortPlan.smallBaseCost = shortPlan.coversRounds
        ? shortPlan.price / smallRounds
        : shortGolfRate * (shortPlan.price / shortPlan.credits);
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
        candidates.push(addRegistration(shortPlan, handicapPrice));
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
            instruction: `Je ${roundWord(extraRounds)} op de kleine baan na die credits reken je per ronde af tegen het gereduceerde greenfeetarief; dat bedrag zit niet in de genoemde prijs. Of je koopt een nieuw speelrecht van ${decimal.format(credits)} credits.`,
          };
          candidates.push(addRegistration(plan, handicapPrice));
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
      { packages: local.packages, name: local.name, group: `local-${localId}` },
      ...(canPlayOffPeak && local.offPeak?.length ? [{ packages: local.offPeak, name: `${local.name} daluren`, group: `local-${localId}-offpeak` }] : []),
    ];
    localChoices.forEach((choice) => {
      const plan = packagePlan(choice.packages, localCredits, choice.name, choice.group);
      if (!plan) return;
      plan.availablePackages = choice.packages;
      plan.coveredRounds = localCredits > 0 ? totalRounds * Math.min(1, plan.credits / localCredits) : totalRounds;
      const localPriceBasis = plan.coversRounds ? localCredits : plan.credits;
      plan.largeBaseCost = localPriceBasis > 0 ? Number(local.largeRoundRate || 0) * (plan.price / localPriceBasis) : 0;
      plan.smallBaseCost = localPriceBasis > 0 ? Number(local.shortRoundRate || 0) * (plan.price / localPriceBasis) : 0;
      plan.detail = plan.coversRounds
        ? `${decimal.format(localCredits)} lokale credits nodig; ${decimal.format(plan.credits)} credits geadviseerd. Dit speelrecht dekt al je opgegeven rondes.`
        : `${decimal.format(localCredits)} lokale credits nodig; ${decimal.format(plan.credits)} credits geadviseerd. Dit speelrecht dekt een deel van je opgegeven rondes.`;
      candidates.push(addRegistration(plan, handicapPrice));
    });
  }

  // De flyer kent twee routes zonder speelrecht: handicapregistratie voor wie
  // heel af en toe golft, en LoyalTee voor wie af en toe golft. Beide rekenen de
  // rondes per stuk af, dus we bieden ze alleen aan wanneer alle rondes op de
  // grote baan vallen; voor de kleine baan is geen greenfeetarief vastgesteld.
  const loyalTee = hgcConfig.loyalTee || null;
  const vouchers = Math.max(0, Number(hgcConfig.handicapRegistration.vouchers || 0));
  // De vrije rondes gaan naar de duurste rondes, en de grote baan is op iedere
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
  // Per baantype waar rondes liggen moet een tarief bekend zijn, anders kunnen we
  // deze routes niet eerlijk beprijzen en bieden we ze niet aan.
  const largeFits = largeRounds === 0 || (Number.isFinite(fee(largeCourse, "greenFee")) && Number.isFinite(fee(largeCourse, "greenFeeFull")));
  const smallFits = smallRounds === 0 || (Number.isFinite(fee(smallCourse, "shortGreenFee")) && Number.isFinite(fee(smallCourse, "shortGreenFeeFull")));
  // Boven de ingestelde grens hoort een speelrecht het advies te zijn, ook al is
  // per ronde afrekenen daar soms nog een paar tientjes goedkoper. Zo houdt de
  // keuzehulp de ladder van de flyer aan.
  const feeRouteMax = Number(hgcConfig.settings.feeRouteMaxRounds ?? 20);
  const binnenGrens = !Number.isFinite(feeRouteMax) || totalRounds <= feeRouteMax;
  const feeRoutesFit = !youth && loyalTee && totalRounds > 0 && binnenGrens && largeFits && smallFits;

  if (feeRoutesFit) {
    // Wie alleen handicapregistratie heeft betaalt het volle tarief; met LoyalTee
    // geldt het gereduceerde tarief.
    const perRonde = (largeKey, smallKey) => paidLarge * (fee(largeCourse, largeKey) || 0) + paidSmall * (fee(smallCourse, smallKey) || 0);
    const paidRounds = paidLarge + paidSmall;
    const freeRounds = freeLarge + freeSmall;
    // De vrije rondes komen uit de handicapregistratie. Rekent de bezoeker die
    // niet mee, dan heeft die ook de vrije rondes niet en betaalt hij LoyalTee's
    // gereduceerde greenfeetarief over al zijn rondes.
    const perRondeNoReg = (largeKey, smallKey) => largeRounds * (fee(largeCourse, largeKey) || 0) + smallRounds * (fee(smallCourse, smallKey) || 0);
    const vrijeRondesTekst = vouchers > 0
      ? `Bij handicapregistratie horen ${roundWord(vouchers)} van 9 holes per kalenderjaar, die je gratis speelt.`
      : "Met handicapregistratie speel je op elke HGC-baan tegen het greenfeetarief.";

    const routes = [
      {
        type: "handicap",
        group: "handicap",
        name: "Hollandsche Golfclub Handicapregistratie",
        price: handicapPrice,
        registration: false,
        total: perRonde("greenFeeFull", "shortGreenFeeFull"),
        detail: vrijeRondesTekst,
        instruction: paidRounds > 0
          ? `Je ${roundWord(paidRounds)} na die vrije rondes reken je per ronde af tegen het greenfeetarief; dat bedrag zit niet in de genoemde prijs.`
          : `Je ${roundWord(totalRounds)} vallen binnen de vrije rondes, dus je betaalt verder niets per ronde.`,
      },
      {
        type: "loyaltee",
        group: "loyaltee",
        name: loyalTee.name,
        price: Number(loyalTee.membershipPrice),
        registration: true,
        total: perRonde("greenFee", "shortGreenFee"),
        detail: `Met LoyalTee speel je zonder speelrecht tegen ${decimal.format(Number(loyalTee.discountPercentage))}% korting op de greenfee.`,
        instruction: paidRounds > 0
          ? `Je ${roundWord(paidRounds)} na de vrije rondes van je handicapregistratie reken je per ronde af tegen het gereduceerde greenfeetarief; dat bedrag zit niet in de genoemde prijs.`
          : `Je ${roundWord(totalRounds)} vallen binnen de vrije rondes van je handicapregistratie.`,
        totalNoReg: perRondeNoReg("greenFee", "shortGreenFee"),
        instructionNoReg: `Je ${roundWord(totalRounds)} reken je per ronde af tegen het gereduceerde greenfeetarief; dat bedrag zit niet in de genoemde prijs.`,
      },
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

  const extraCredits = next.credits - Number(plan.credits);
  const extraCost = next.price - Number(plan.packageBasePrice ?? plan.price);
  const totalPrice = next.price + Number(plan.nonPackageCost || 0);
  return {
    type: plan.type,
    group: `${plan.group}-upgrade-${next.credits}`,
    name: next.name || `${plan.productName} – ${decimal.format(next.credits)} credits`,
    productName: plan.productName,
    credits: next.credits,
    price: totalPrice,
    registrationPrice: handicapPrice,
    annualCost: totalPrice + handicapPrice,
    isUpgradeOption: true,
    detail: `Je krijgt ${decimal.format(extraCredits)} credits extra voor ${euro.format(extraCost)} meer dan het geadviseerde speelrecht. Zo heb je meer ruimte als je vaker wilt spelen.`,
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
  return {
    type: plan.type,
    group: `${plan.group}-starter-${previous.credits}`,
    name: previous.name || `${plan.productName} – ${decimal.format(previous.credits)} credits`,
    productName: plan.productName,
    credits: previous.credits,
    price: totalPrice,
    registrationPrice: handicapPrice,
    annualCost: totalPrice + handicapPrice,
    isSmallerOption: true,
    detail: `Je start met ${decimal.format(fewerCredits)} credits minder en betaalt ${euro.format(saving)} minder voor het speelrecht. ${shortfall > 0 ? `Dat dekt niet al je opgegeven rondes: je komt ${decimal.format(shortfall)} credits tekort.` : "Dat dekt niet al je opgegeven rondes."} Zodra die credits op zijn, kun je een nieuw speelrecht aanschaffen.`,
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

// Voor tekst die verandert met de schakelaar, niet alleen een bedrag: de vrije
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
  resultContent.querySelectorAll("[data-registration-row]").forEach((node) => {
    node.hidden = !include;
  });
}

function roundWord(count) {
  return `${count} ronde${count === 1 ? "" : "s"}`;
}

function benefitList(plan) {
  return planBenefits(plan)
    .map((benefit) => {
      const followsSwitch = /handicapregistratie/i.test(benefit) ? " data-registration-row" : "";
      return `<li${followsSwitch}><span>✓</span>${benefit}</li>`;
    })
    .join("");
}

function disclaimer() {
  return `<p class="result-disclaimer">Deze keuzehulp geeft een indicatie op basis van jouw opgegeven rondes, creditwaarden en speelrechtprijzen voor ${hgcConfig.year}. Bekijk altijd de actuele <a href="${hgcConfig.links.terms}">voorwaarden</a>.</p>`;
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
function adviceAlt({ label, plan, amountNote, note, boxNote, ctaText }) {
  return `
    <div class="advice-alt">
      <div class="advice-alt-label">${label}</div>
      <div class="advice-alt-body">
        <div>
          <h3>${brandText(plan.name)}</h3>
          <div class="advice-alt-amount"><strong>${planAmount(plan)}</strong><span>${amountNote}</span></div>
          ${note ? `<div class="advice-alt-note">${note}</div>` : ""}
        </div>
        <div class="advice-alt-box">
          <p>${boxNote}</p>
          <a class="button" href="${planLink(plan)}">${ctaText} <span>→</span></a>
        </div>
      </div>
    </div>
  `;
}

function choiceCard(plan, options) {
  return `
    <article class="advice-card advice-card--${options.variant}">
      <p class="advice-card-question">${options.question}</p>
      <p class="eyebrow">${options.product}</p>
      <h4>${brandText(plan.name)}</h4>
      <p class="advice-card-amount">${planAmount(plan)}<small>${options.amountNote}</small></p>
      <p class="advice-card-coverage">${options.coverage}</p>
      ${plan.coversRounds ? "" : `<p class="advice-card-instruction">${plan.instruction}</p>`}
      <p class="advice-card-benefits-title">Hierbij hoort</p>
      <ul class="advice-card-benefits">${benefitList(plan)}</ul>
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

    ${disclaimer()}
  `;
}

// Ligt de goedkoopste route dicht bij het speelrecht dat alle rondes dekt, dan
// is er geen goed antwoord dat de keuzehulp voor de bezoeker kan geven. Dan
// legt zij de keuze bij hem, met dezelfde twee kaarten als bij gemengd spel.
function renderRouteChoice(result) {
  const zuinig = result.routeChoice.greenFee;
  const ruim = result.routeChoice.covering;
  const ruimte = Math.round((Number(ruim.credits) - Number(ruim.requiredCredits)) * 10) / 10;

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
        amountNote: "voor het speelrecht",
        coverage: `Dit speelrecht dekt de rondes die binnen ${decimal.format(zuinig.credits)} credits passen. Je betaalt dus alleen voor de credits die je nodig hebt.`,
        buttonClass: "button--primary",
      })}
      ${choiceCard(ruim, {
        variant: "credits",
        question: "Speel je misschien vaker dan je nu opgaf?",
        product: brandText(ruim.productName),
        amountNote: "voor al je rondes",
        coverage: `Dit speelrecht dekt al je opgegeven rondes en houdt ${decimal.format(ruimte)} credits over voor rondes die je nu nog niet inplant.`,
        buttonClass: "button--primary",
      })}
    </div>

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
  const perRondeRoute = ["handicap", "loyaltee"].includes(best.type);
  // largeBaseCost/smallBaseCost spreiden de prijs bij bijspelen op greenfee
  // over de credits die je kocht, niet over rondes die daarna nog op greenfee
  // gaan; die prijs per ronde klopt dus ook wanneer een deel wordt bijgespeeld.
  // Bij shortgolf blijft largeBaseCost altijd 0 (Shortgolf-credits dekken de
  // grote baan nooit), dus die kaart blijft terecht verborgen.
  const showLargeRoundCost = result.largeRounds > 0 && !uncoveredLargeRounds && !greenFeeRounds;
  const showSmallRoundCost = result.smallRounds > 0 && !perRondeRoute;
  const herhaalt = Number(best.repeatPurchases || 0) > 1;
  const rondesBuitenPrijs = greenFeeExtraRounds > 0 || greenFeeRounds > 0 || uncoveredLargeRounds > 0;
  const totalCostLabel = herhaalt || rondesBuitenPrijs ? "Wat je vooraf betaalt" : "Verwachte kosten per jaar";
  const totalCostNote = herhaalt
    ? `per aankoop van ${decimal.format(best.credits)} credits`
    : rondesBuitenPrijs
      ? "de rondes daarna reken je per ronde af"
      : "per golfjaar";
  const productNote = herhaalt || rondesBuitenPrijs ? "voor dit speelrecht" : "per golfjaar";
  // Het badge-label bovenaan zegt in één keer waar de uitkomst om draait: een
  // route die per ronde afrekent is per definitie de goedkoopste voor deze
  // opgave; koop je stapsgewijs bij, dan is dat de eerste vraag, niet de prijs.
  const advieslabel = perRondeRoute || (best.coversRounds && !herhaalt && !rondesBuitenPrijs)
    ? { tone: "best", text: `★ Goedkoopste keuze voor jouw ${roundWord(totalRounds)}` }
    : herhaalt
      ? { tone: "steps", text: "Stapsgewijs · je koopt bij wanneer je credits op zijn" }
      : { tone: "steps", text: "Gedeeltelijke dekking · de rest reken je per ronde af" };
  const webshopLabel = "Bekijk in de webshop";

  resultContent.innerHTML = `
    ${resultHeader(result, { showSwitch: best.type !== "handicap" })}

    <div class="advice-badge advice-badge--${advieslabel.tone}">${advieslabel.text}</div>
    <h2>${brandText(best.name)}</h2>

    ${perRondeRoute ? `
      <div class="choice-costs choice-costs--steps">
        <article class="choice-costs-total"><p><span class="stat-num">1</span>Wat je nu betaalt</p><strong>${planAmount(best)}</strong><span>${best.detail}</span></article>
        <article><p><span class="stat-num">2</span>Wat je per ronde betaalt</p><span class="stat-value-text">${best.type === "handicap" ? "Volledige greenfee" : "Gereduceerde greenfee"}</span><span class="stat-instruction">${best.instructionNoReg && best.instructionNoReg !== best.instruction ? switchableHtml(best.instruction, best.instructionNoReg) : best.instruction}</span></article>
      </div>
    ` : `
      <div class="choice-costs">
        <article class="choice-costs-total"><p>${totalCostLabel}</p><strong>${planAmount(best)}</strong><span>${totalCostNote}</span></article>
        ${costCard("Grote baan", showLargeRoundCost ? best.largeRoundCost : null, "effectief per ronde", registrationShare)}
        ${costCard("Kleine baan", showSmallRoundCost ? best.smallRoundCost : null, "effectief per ronde", registrationShare)}
      </div>
      ${uncoveredLargeRounds ? `<p class="coverage-warning">Je ${roundWord(uncoveredLargeRounds)} op de grote baan ${uncoveredLargeRounds === 1 ? "valt" : "vallen"} buiten dit speelrecht. Die reken je apart af op de baan.</p>` : ""}
      ${greenFeeRounds ? `<p class="greenfee-note">Je ${roundWord(greenFeeRounds)} op de grote baan reken je per ronde af tegen het gereduceerde greenfeetarief voor speelrechthouders. Dat bedrag zit niet in de prijs hierboven.</p>` : ""}
      ${best.coversRounds ? "" : `<p class="package-instruction">${best.instructionNoReg && best.instructionNoReg !== best.instruction ? switchableHtml(best.instruction, best.instructionNoReg) : best.instruction}</p>`}
    `}

    <div class="recommendation-actions" style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap">
      <a class="button ${isShortGolf ? "button--shortgolf" : "button--primary"} button--cta-tracked" href="${planLink(best)}">${webshopLabel} <span>→</span></a>
      <a class="button button--secondary" href="${hgcConfig.links.playingRights || "/hgc-speelrechten/"}">Meer over speelrechten</a>
    </div>

    <ul class="advice-checklist">${benefitList(best)}</ul>

    ${result.coveringAlternative ? adviceAlt({
      label: "Meer vrijheid nodig?",
      plan: result.coveringAlternative,
      amountNote: "per golfjaar · alle rondes inbegrepen",
      note: `En voor ${euro.format(Number(result.coveringAlternative.selectionCost) - Number(best.selectionCost))} meer heb je een speelrecht dat al je opgegeven rondes dekt: ruimte om vaker te spelen dan je nu opgaf en de mogelijkheid om flightgenoten te introduceren tegen het gereduceerde greenfeetarief.`,
      boxNote: "Golf je in de praktijk vaker dan je nu opgeeft? Dan wordt dit de rustigste keuze, zonder per ronde af te rekenen.",
      ctaText: "Naar het speelrecht",
    }) : ""}

    ${alternative ? adviceAlt({
      label: alternative.isUpgradeOption ? "Meer speelruimte" : alternative.isSmallerOption ? "Voordeliger instappen" : "Andere passende optie",
      plan: alternative,
      amountNote: "per golfjaar",
      note: alternative.detail,
      boxNote: alternative.isUpgradeOption
        ? "Twijfel je of dit aantal rondes klopt? Met deze staffel zit je ruimer in je credits."
        : alternative.isSmallerOption
          ? "Weet je zeker dat je niet vaker speelt? Dan is dit de voordeligere keuze om mee te beginnen."
          : "Bekijk deze optie als alternatief voor jouw opgave.",
      ctaText: "Meer informatie",
    }) : ""}

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
  applyRegistrationSwitch(handicapDefault());
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
  largeRoundsNumber.value = 20;
  largeRoundsRange.value = 20;
  smallRoundsNumber.value = 10;
  smallRoundsRange.value = 10;
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
})();
