const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const decimal = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 });

const calculatorRoot = document.querySelector(".hgc-calculator");
const form = calculatorRoot.querySelector("#calculator-form");
const steps = [...calculatorRoot.querySelectorAll(".form-step")];
const currentStepLabel = calculatorRoot.querySelector("#current-step");
const progressBar = calculatorRoot.querySelector("#progress-bar");
const roundsRange = calculatorRoot.querySelector("#rounds");
const roundsNumber = calculatorRoot.querySelector("#rounds-number");
const courseSelect = calculatorRoot.querySelector("#course");
const courseHelp = calculatorRoot.querySelector("#course-help");
const ageCategory = calculatorRoot.querySelector("#age-category");
const offPeak = calculatorRoot.querySelector("#off-peak");
const greenfeePanel = calculatorRoot.querySelector("#greenfee-panel");
const annualPanel = calculatorRoot.querySelector("#annual-panel");
const greenfeeInput = calculatorRoot.querySelector("#greenfee");
const annualInput = calculatorRoot.querySelector("#annual-cost");
const includeHandicap = calculatorRoot.querySelector("#include-handicap");
const handicapCopy = calculatorRoot.querySelector("#handicap-copy");
const costError = calculatorRoot.querySelector("#cost-error");
const resultContent = calculatorRoot.querySelector("#result-content");

let currentStep = 1;

function parseMoney(value) {
  const cleaned = String(value).replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Number.parseFloat(cleaned);
}

function formatInputMoney(input) {
  const value = parseMoney(input.value);
  if (Number.isFinite(value)) input.value = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function selectedValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value;
}

function getFormat() {
  return selectedValue("round-format") || "nine";
}

function populateCourses() {
  const format = getFormat();
  const previous = courseSelect.value;
  const available = hgcConfig.courses.filter((course) => format === "short" ? course.shortRate !== null : course.largeRate !== null);

  courseSelect.innerHTML = available.map((course) => `<option value="${course.id}">${course.name} — ${course.location}</option>`).join("");
  if (available.some((course) => course.id === previous)) courseSelect.value = previous;
  updateCourseHelp();
}

function updateCourseHelp() {
  const course = hgcConfig.courses.find((item) => item.id === courseSelect.value);
  if (!course) return;
  const format = getFormat();
  if (format === "short") {
    courseHelp.textContent = `Een shortgolfronde kost hier ${decimal.format(course.shortRate)} credit.`;
  } else if (format === "eighteen") {
    courseHelp.textContent = `We rekenen 18 holes als twee baanrondes: ${decimal.format(course.largeRate * hgcConfig.settings.eighteenHoleMultiplier)} credits.`;
  } else {
    courseHelp.textContent = `Een baanronde van ${course.largeHoles} holes kost hier ${decimal.format(course.largeRate)} credit.`;
  }
  if (course.note) courseHelp.textContent += ` ${course.note}`;
}

function showStep(stepNumber) {
  currentStep = stepNumber;
  steps.forEach((step) => {
    const active = Number(step.dataset.step) === stepNumber;
    step.hidden = !active;
    step.classList.toggle("is-active", active);
  });
  currentStepLabel.textContent = stepNumber;
  progressBar.style.width = `${(stepNumber / 3) * 100}%`;
  calculatorRoot.querySelector("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
}

function normaliseRounds(value) {
  return Math.min(150, Math.max(1, Math.round(Number(value) || 1)));
}

function updateRangeFill() {
  const minimum = Number(roundsRange.min);
  const maximum = Number(roundsRange.max);
  const percentage = ((Number(roundsRange.value) - minimum) / (maximum - minimum)) * 100;
  roundsRange.style.background = `linear-gradient(90deg, var(--green) 0 ${percentage}%, #dfe5df ${percentage}%)`;
}

function packagePlan(packages, requiredCredits, namePrefix = "", topUp = null) {
  const sorted = [...packages].sort((a, b) => a.credits - b.credits);

  // Speelrechthouders mogen na het opgebruiken van hun credits losse rondes
  // spelen tegen het gereduceerde greenfeetarief. Vergelijk daarom ieder
  // pakket inclusief de kosten van eventueel resterende rondes.
  if (topUp && Number.isFinite(topUp.rounds) && Number.isFinite(topUp.creditRate) && Number.isFinite(topUp.greenFee)) {
    return sorted
      .map((item) => {
        const includedRounds = Math.min(topUp.rounds, Math.floor((item.credits + 1e-8) / topUp.creditRate));
        const extraRounds = Math.max(0, topUp.rounds - includedRounds);
        return {
          price: item.price + extraRounds * topUp.greenFee,
          basePrice: item.price,
          credits: item.credits,
          label: item.name || `${namePrefix} – ${item.credits} credits`,
          count: 1,
          includedRounds,
          extraRounds,
          topUpGreenFee: topUp.greenFee,
        };
      })
      .sort((a, b) => a.price - b.price || a.credits - b.credits)[0];
  }

  const largest = sorted.at(-1);
  const single = sorted.find((item) => item.credits + 1e-8 >= requiredCredits);

  if (single && hgcConfig.settings.preferSinglePackage) {
    return {
      price: single.price,
      credits: single.credits,
      label: single.name || `${namePrefix} – ${single.credits} credits`,
      count: 1,
    };
  }

  if (single) {
    return { price: single.price, credits: single.credits, label: single.name || `${namePrefix} – ${single.credits} credits`, count: 1 };
  }

  const fullPackages = Math.floor(requiredCredits / largest.credits);
  const remainder = requiredCredits - fullPackages * largest.credits;
  const extra = remainder > 1e-8 ? sorted.find((item) => item.credits >= remainder) || largest : null;
  const count = fullPackages + (extra ? 1 : 0);
  const totalCredits = fullPackages * largest.credits + (extra?.credits || 0);
  const totalPrice = fullPackages * largest.price + (extra?.price || 0);
  return {
    price: totalPrice,
    credits: totalCredits,
    label: count === 1 ? (largest.name || `${namePrefix} – ${largest.credits} credits`) : `${count} opeenvolgende ${namePrefix.toLowerCase()}en`,
    count,
  };
}

function candidatePlans({ course, format, rounds, youth, canPlayOffPeak }) {
  const multiplier = format === "eighteen" ? hgcConfig.settings.eighteenHoleMultiplier : 1;
  const standardRate = format === "short" ? course.shortRate : course.largeRate * multiplier;
  const standardCredits = rounds * standardRate;
  const candidates = [];
  const loyalTeeExcluded = hgcConfig.loyalTee.excludedCourseIds.includes(course.id);
  const loyalGreenFee = format === "short"
    ? course.greenFees?.loyalShort
    : format === "eighteen"
      ? course.greenFees?.loyalEighteen
      : course.greenFees?.loyalNine;
  const regularGreenFee = format === "short"
    ? course.greenFees?.short
    : format === "eighteen"
      ? course.greenFees?.eighteen
      : course.greenFees?.nine;
  const reducedGreenFee = Number.isFinite(loyalGreenFee) ? loyalGreenFee : regularGreenFee;
  const handicapRegistrationPrice = youth
    ? hgcConfig.handicapRegistration.youthPrice
    : hgcConfig.handicapRegistration.adultPrice;
  const handicapExtraGreenFee = youth ? 10 : regularGreenFee;

  // De twee vouchers zijn baanrondes van 9 holes. Bij 18 holes vormen ze
  // samen dus één volledige ronde. Shortgolf is geen gelijkwaardige voucheroptie.
  if (format !== "short" && Number.isFinite(handicapExtraGreenFee)) {
    const voucherRounds = format === "eighteen"
      ? Math.floor(hgcConfig.handicapRegistration.vouchers / hgcConfig.settings.eighteenHoleMultiplier)
      : hgcConfig.handicapRegistration.vouchers;
    const includedRounds = Math.min(rounds, voucherRounds);
    const extraRounds = Math.max(0, rounds - includedRounds);
    candidates.push({
      price: handicapRegistrationPrice + extraRounds * handicapExtraGreenFee,
      basePrice: handicapRegistrationPrice,
      credits: null,
      label: "HGC Handicapregistratie",
      count: 1,
      requiredCredits: null,
      family: "HGC Handicapregistratie",
      scope: "twee persoonlijke greenfees op HGC-golfparken",
      unit: "greenfees",
      isLocal: false,
      kind: "handicap",
      includesHandicap: true,
      includedRounds,
      extraRounds,
      topUpGreenFee: handicapExtraGreenFee,
    });
  }

  if (youth) {
    const youthPlan = packagePlan(hgcConfig.youthPackages, standardCredits, "HGC Jeugd-speelrecht", {
      rounds,
      creditRate: standardRate,
      greenFee: 10,
    });
    candidates.push({ ...youthPlan, requiredCredits: standardCredits, family: "Jeugd-speelrecht", scope: "alle HGC-golfbanen", unit: "credits", isLocal: false, includesHandicap: false });
    return candidates;
  }

  const basePackages = format === "short" ? hgcConfig.shortGolfPackages : hgcConfig.standardPackages;
  const baseName = format === "short" ? "HGC Shortgolf-speelrecht" : "HGC Speelrecht";
  const basePlan = packagePlan(basePackages, standardCredits, baseName, {
    rounds,
    creditRate: standardRate,
    greenFee: reducedGreenFee,
  });
  candidates.push({ ...basePlan, requiredCredits: standardCredits, family: baseName, scope: format === "short" ? "alle HGC-shortgolfbanen" : "alle HGC-golfbanen", unit: "credits", isLocal: false, includesHandicap: false });

  if (canPlayOffPeak) {
    const plan = packagePlan(hgcConfig.offPeakPackages, standardCredits, "HGC Daluren-speelrecht", {
      rounds,
      creditRate: standardRate,
      greenFee: reducedGreenFee,
    });
    candidates.push({ ...plan, requiredCredits: standardCredits, family: "HGC Daluren-speelrecht", scope: "alle HGC-golfbanen in daluren", unit: "credits", isLocal: false, includesHandicap: false });
  }

  const local = hgcConfig.localPackages[course.id];
  if (local && (format !== "short" || local.shortRoundRate !== null)) {
    const localRate = format === "short" ? local.shortRoundRate : local.largeRoundRate * multiplier;
    const localCredits = rounds * localRate;
    const localPackages = local.packages.map((item) => ({ ...item, name: `${local.name} – ${item.credits} rondes` }));
    const plan = packagePlan(localPackages, localCredits, local.name, {
      rounds,
      creditRate: localRate,
      greenFee: reducedGreenFee,
    });
    candidates.push({ ...plan, requiredCredits: localCredits, family: local.name, scope: `alleen ${course.name}`, unit: "rondes", isLocal: true, includesHandicap: false });

    if (canPlayOffPeak) {
      const localOffPeak = local.offPeak.map((item) => ({ ...item, name: `${local.name} daluren – ${item.credits} rondes` }));
      const offPeakPlan = packagePlan(localOffPeak, localCredits, `${local.name} daluren`, {
        rounds,
        creditRate: localRate,
        greenFee: reducedGreenFee,
      });
      candidates.push({ ...offPeakPlan, requiredCredits: localCredits, family: `${local.name} daluren`, scope: `alleen ${course.name} in daluren`, unit: "rondes", isLocal: true, includesHandicap: false });
    }
  }

  if (!loyalTeeExcluded && Number.isFinite(loyalGreenFee)) {
    const greenFeeTotal = rounds * loyalGreenFee;
    candidates.push({
      price: hgcConfig.loyalTee.membershipPrice + greenFeeTotal,
      credits: null,
      label: hgcConfig.loyalTee.name,
      count: 1,
      requiredCredits: null,
      family: hgcConfig.loyalTee.name,
      scope: "reguliere greenfees op HGC-golfparken",
      unit: "greenfees",
      isLocal: false,
      kind: "loyaltee",
      perRoundGreenFee: loyalGreenFee,
      greenFeeTotal,
      includesHandicap: false,
    });
  }

  return candidates;
}

function track(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...details });
}

function sortedPlans({ course, format, rounds, youth, canPlayOffPeak, forceHandicap }) {
  const registrationPrice = youth ? hgcConfig.handicapRegistration.youthPrice : hgcConfig.handicapRegistration.adultPrice;
  return candidatePlans({ course, format, rounds, youth, canPlayOffPeak })
    .map((plan) => ({
      ...plan,
      comparisonPrice: plan.price + (forceHandicap && !plan.includesHandicap ? registrationPrice : 0),
    }))
    .sort((a, b) => a.comparisonPrice - b.comparisonPrice);
}

function findNextOption({ course, format, rounds, youth, canPlayOffPeak, forceHandicap, currentBest }) {
  const maximumRounds = Number(roundsRange.max);

  // Zoek het eerste punt waarop een ander product werkelijk de voordeligste
  // keuze wordt. Zo tonen we een bruikbaar doorgroeipad in plaats van een upsell.
  for (let futureRounds = rounds + 1; futureRounds <= maximumRounds; futureRounds += 1) {
    const futureBest = sortedPlans({ course, format, rounds: futureRounds, youth, canPlayOffPeak, forceHandicap })[0];
    if (futureBest.label !== currentBest.label) {
      return { plan: futureBest, fromRounds: futureRounds, annualCost: futureBest.comparisonPrice };
    }
  }

  const alternative = sortedPlans({ course, format, rounds, youth, canPlayOffPeak, forceHandicap })
    .find((plan) => plan.label !== currentBest.label);
  return alternative ? { plan: alternative, fromRounds: null, annualCost: alternative.comparisonPrice } : null;
}

function calculate() {
  const rounds = normaliseRounds(roundsNumber.value);
  const format = getFormat();
  const course = hgcConfig.courses.find((item) => item.id === courseSelect.value);
  const youth = ageCategory.value === "youth";
  const costType = selectedValue("cost-type");
  const enteredCost = parseMoney(costType === "greenfee" ? greenfeeInput.value : annualInput.value);

  if (!Number.isFinite(enteredCost) || enteredCost <= 0) {
    costError.hidden = false;
    return null;
  }
  costError.hidden = true;

  const currentAnnualCost = costType === "greenfee" ? enteredCost * rounds : enteredCost;
  const currentRoundCost = currentAnnualCost / rounds;
  const registrationPrice = youth ? hgcConfig.handicapRegistration.youthPrice : hgcConfig.handicapRegistration.adultPrice;
  const planContext = { course, format, rounds, youth, canPlayOffPeak: offPeak.checked, forceHandicap: includeHandicap.checked };
  const best = sortedPlans(planContext)[0];
  const nextOption = findNextOption({ ...planContext, currentBest: best });
  const handicapPrice = includeHandicap.checked && !best.includesHandicap ? registrationPrice : 0;
  const hgcAnnualCost = best.price + handicapPrice;
  const hgcRoundCost = hgcAnnualCost / rounds;
  const difference = currentAnnualCost - hgcAnnualCost;

  return { rounds, format, course, youth, currentAnnualCost, currentRoundCost, best, nextOption, handicapPrice, hgcAnnualCost, hgcRoundCost, difference };
}

function resultMessage(difference) {
  const margin = hgcConfig.settings.equalCostMargin;
  if (difference >= margin) return { type: "saving", kicker: "Goed nieuws", title: `Je kunt mogelijk ${euro.format(difference)} per jaar besparen`, label: "Jij bespaart" };
  if (difference <= -margin) return { type: "extra", kicker: "Meer golfmogelijkheden", title: `Ontdek wat je voor ${euro.format(Math.abs(difference))} extra krijgt`, label: "Verschil" };
  return { type: "equal", kicker: "Bijna dezelfde kosten", title: "Voor vrijwel hetzelfde bedrag krijg je meer golfmogelijkheden", label: "Verschil" };
}

function renderResult(result) {
  const message = resultMessage(result.difference);
  const formatLabel = result.format === "short" ? "shortgolfrondes" : result.format === "eighteen" ? "rondes van 18 holes" : "baanrondes";
  const differenceValue = Math.abs(result.difference);
  const handicapLine = result.best.includesHandicap
    ? "<li>Inclusief HGC-handicapregistratie</li>"
    : result.handicapPrice
      ? `<li>Inclusief handicapregistratie: ${euro.format(result.handicapPrice)}</li>`
      : "";
  const benefits = result.best.kind === "handicap"
    ? hgcConfig.handicapBenefits
    : result.best.kind === "loyaltee"
    ? hgcConfig.loyalTeeBenefits
    : result.best.isLocal
    ? hgcConfig.localBenefits
    : result.format === "short"
      ? hgcConfig.shortGolfBenefits
      : hgcConfig.benefits;
  const recommendationExplanation = result.best.kind === "loyaltee"
    ? `${euro.format(hgcConfig.loyalTee.membershipPrice)} lidmaatschap plus ${result.rounds} greenfees van ${euro.format(result.best.perRoundGreenFee)}. Het ballentegoed van ${euro.format(hgcConfig.loyalTee.ballCredit)} is een extra voordeel en is niet van de golfkosten afgetrokken.`
    : result.best.kind === "handicap"
      ? `${euro.format(result.best.basePrice)} voor handicapregistratie inclusief ${result.best.includedRounds} persoonlijke ${result.best.includedRounds === 1 ? "greenfee" : "greenfees"}.${result.best.extraRounds > 0 ? ` De overige ${result.best.extraRounds} ${result.best.extraRounds === 1 ? "ronde is" : "rondes zijn"} meegerekend tegen het reguliere tarief van ${euro.format(result.best.topUpGreenFee)} per ronde.` : ""}`
    : result.best.extraRounds > 0
      ? `Het speelrecht zelf kost ${euro.format(result.best.basePrice)} en dekt naar verwachting ${result.best.includedRounds} van je ${result.rounds} rondes. De overige ${result.best.extraRounds} rondes zijn meegerekend tegen het gereduceerde tarief van ${euro.format(result.best.topUpGreenFee)} per ronde.`
    : `Je gebruikt naar verwachting ${decimal.format(result.best.requiredCredits)} ${result.best.unit} en krijgt met dit advies ruimte voor ${decimal.format(result.best.credits)}. Geldig voor ${result.best.scope}.`;
  const validityLine = result.best.kind === "loyaltee"
    ? "LoyalTee loopt per kalenderjaar"
    : result.best.kind === "handicap"
      ? "Handicapregistratie loopt per kalenderjaar"
      : "Speelrecht is 12 maanden geldig";
  const productLink = result.best.kind === "loyaltee"
    ? hgcConfig.links.loyalTee
    : result.best.kind === "handicap"
      ? hgcConfig.links.handicapRegistration
      : hgcConfig.links.webshop;
  const productButton = result.best.kind === "loyaltee"
    ? "Bekijk HGC LoyalTee"
    : result.best.kind === "handicap"
      ? "Bekijk handicapregistratie"
      : "Bekijk jouw speelrecht";
  const nextOptionLink = result.nextOption?.plan.kind === "loyaltee"
    ? hgcConfig.links.loyalTee
    : result.nextOption?.plan.kind === "handicap"
      ? hgcConfig.links.handicapRegistration
      : hgcConfig.links.webshop;
  const nextOptionHtml = result.nextOption
    ? `<div class="next-option">
        <div class="next-option-copy">
          <p class="eyebrow">${result.nextOption.fromRounds ? "Slim alternatief als je vaker speelt" : "Andere HGC-optie"}</p>
          <h4>${result.nextOption.plan.label}</h4>
          <p>${result.nextOption.fromRounds
            ? `Speel je ongeveer <strong>${result.nextOption.fromRounds} ${formatLabel}</strong> per jaar? Dan wordt dit volgens de berekening de voordeligste HGC-keuze, voor circa <strong>${euro.format(result.nextOption.annualCost)} per jaar</strong>.`
            : `Dit is bij jouw huidige speelgedrag de eerstvolgende optie, voor circa <strong>${euro.format(result.nextOption.annualCost)} per jaar</strong>.`}</p>
        </div>
        <a class="next-option-link" href="${nextOptionLink}" target="_blank" rel="noopener">Bekijk deze optie <span>→</span></a>
      </div>`
    : "";

  resultContent.innerHTML = `
    <div class="result-hero result-hero--${message.type}">
      <div class="result-check" aria-hidden="true">${message.type === "saving" ? "✓" : "⛳"}</div>
      <p class="eyebrow">${message.kicker}</p>
      <h3>${message.title}</h3>
      <p>Gebaseerd op ${result.rounds} ${formatLabel} per jaar bij ${result.course.name}.</p>
    </div>

    <div class="comparison" aria-label="Vergelijking huidige kosten en HGC-kosten">
      <article>
        <p>Jouw situatie nu</p>
        <strong>${euro.format(result.currentAnnualCost)}</strong>
        <span>per jaar</span>
        <b>${euro.format(result.currentRoundCost)} per ronde</b>
      </article>
      <div class="comparison-arrow" aria-hidden="true">→</div>
      <article class="comparison-hgc">
        <p>Met HGC</p>
        <strong>${euro.format(result.hgcAnnualCost)}</strong>
        <span>per jaar</span>
        <b>${euro.format(result.hgcRoundCost)} per ronde</b>
      </article>
    </div>

    <div class="difference-card difference-card--${message.type}">
      <span>${message.label}</span>
      <strong>${euro.format(differenceValue)} <small>per jaar</small></strong>
    </div>

    <div class="recommendation">
      <div class="recommendation-main">
        <p class="eyebrow">Jouw beste HGC-optie</p>
        <h4>${result.best.label}</h4>
        <p>${recommendationExplanation}</p>
        <ul>${handicapLine}<li>${validityLine}</li>${result.best.kind === "loyaltee" || result.best.kind === "handicap" ? "" : "<li>Prijzen zijn exclusief maandbetalingstoeslag</li>"}</ul>
      </div>
      <a class="button button--primary button--cta" href="${productLink}" target="_blank" rel="noopener">${productButton} <span>→</span></a>
    </div>

    ${nextOptionHtml}

    <div class="included-benefits">
      <h4>Dit krijg je er ook bij</h4>
      <ul>${benefits.map((benefit) => `<li><span>✓</span>${benefit}</li>`).join("")}</ul>
    </div>

    <p class="result-disclaimer">Indicatieve berekening. De voorwaarden, beschikbaarheid en actuele productinformatie van HGC zijn leidend. <a href="${hgcConfig.links.terms}" target="_blank" rel="noopener">Bekijk de voorwaarden</a>.</p>
  `;

  track("calculator_result_viewed", {
    recommended_product: result.best.label,
    result_type: message.type,
    annual_difference: Math.round(result.difference * 100) / 100,
    course: result.course.id,
  });
}

roundsRange.addEventListener("input", () => { roundsNumber.value = roundsRange.value; updateRangeFill(); });
roundsNumber.addEventListener("input", () => { roundsRange.value = normaliseRounds(roundsNumber.value); updateRangeFill(); });
roundsNumber.addEventListener("blur", () => { roundsNumber.value = normaliseRounds(roundsNumber.value); roundsRange.value = roundsNumber.value; updateRangeFill(); });
form.querySelectorAll('input[name="round-format"]').forEach((input) => input.addEventListener("change", populateCourses));
courseSelect.addEventListener("change", updateCourseHelp);

form.querySelectorAll('input[name="cost-type"]').forEach((input) => input.addEventListener("change", () => {
  const greenfee = selectedValue("cost-type") === "greenfee";
  greenfeePanel.hidden = !greenfee;
  annualPanel.hidden = greenfee;
  costError.hidden = true;
}));

ageCategory.addEventListener("change", () => {
  const price = ageCategory.value === "youth" ? hgcConfig.handicapRegistration.youthPrice : hgcConfig.handicapRegistration.adultPrice;
  handicapCopy.textContent = `We nemen ${euro.format(price)} dan mee in ieder advies. Voor weinig rondes vergelijken we registratie automatisch als losse optie.`;
});

[greenfeeInput, annualInput].forEach((input) => input.addEventListener("blur", () => formatInputMoney(input)));

calculatorRoot.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => {
  track(`calculator_step_${currentStep}_completed`);
  showStep(Math.min(3, currentStep + 1));
}));
calculatorRoot.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(Math.max(1, currentStep - 1))));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = calculate();
  if (!result) return;
  renderResult(result);
  showStep(3);
});

calculatorRoot.querySelector("#restart").addEventListener("click", () => {
  form.reset();
  roundsRange.value = 35;
  roundsNumber.value = 35;
  updateRangeFill();
  populateCourses();
  showStep(1);
  track("calculator_restarted");
});

calculatorRoot.addEventListener("click", (event) => {
  const cta = event.target.closest(".button--cta");
  if (cta) track("calculator_product_clicked");
});

populateCourses();
handicapCopy.textContent = `We nemen ${euro.format(hgcConfig.handicapRegistration.adultPrice)} dan mee in ieder advies. Voor weinig rondes vergelijken we registratie automatisch als losse optie.`;
progressBar.style.width = "33.333%";
updateRangeFill();
track("calculator_opened");
