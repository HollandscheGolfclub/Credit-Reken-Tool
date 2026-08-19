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
    largeCourseHelp.textContent = `Een ronde van ${large.largeHoles || 9} holes kost hier ${decimal.format(large.largeRate)} credit.`;
    if (large.note) largeCourseHelp.textContent += ` ${large.note}`;
  }
  if (small) {
    const shortGolfRate = Number.isFinite(small.shortGolfRate) ? small.shortGolfRate : small.shortRate;
    smallCourseHelp.textContent = `Per ronde: ${decimal.format(small.shortRate)} credit met een algemeen speelrecht en ${decimal.format(shortGolfRate)} credit met een Shortgolf-speelrecht.`;
    if (small.note) smallCourseHelp.textContent += ` ${small.note}`;
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
  const largestPackage = usable[usable.length - 1];
  const recommendStarterPackage = Boolean(hgcConfig.settings.preferSinglePackage) && requiredCredits > largestPackage.credits;
  const best = recommendStarterPackage
    ? { price: largestPackage.price, count: 1, items: [largestPackage], credits: largestPackage.credits }
    : options[0];
  if (!best) return null;

  const counts = best.items.reduce((all, item) => {
    const key = String(item.credits);
    all[key] = { item, count: (all[key]?.count || 0) + 1 };
    return all;
  }, {});
  const orderedPackages = Object.values(counts)
    .sort((a, b) => b.item.credits - a.item.credits);
  const parts = orderedPackages
    .map(({ item, count }) => `${count > 1 ? `${count} × ` : ""}${decimal.format(item.credits)} credits`);
  const first = orderedPackages[0].item;
  const followUps = orderedPackages
    .flatMap(({ item, count }) => Array(count - (item.credits === first.credits ? 1 : 0)).fill(item))
    .map((item) => `${decimal.format(item.credits)} credits`);
  const instruction = recommendStarterPackage
    ? `Start met ${decimal.format(best.credits)} credits. Zodra deze op zijn, kun je direct verlengen met het speelrecht dat dan het beste bij je resterende golfplannen past.`
    : best.count > 1
    ? `Start met het speelrecht van ${decimal.format(first.credits)} credits. Alleen als je die credits binnen jouw golfjaar opmaakt, verleng je met ${followUps.join(" en daarna met ")}. Zo koop je niet alles vooraf. Totale ruimte: ${decimal.format(best.credits)} credits.`
    : `Met ${decimal.format(best.credits)} credits heb je voldoende ruimte voor jouw verwachte rondes.`;

  return {
    type: "credits",
    group,
    name: best.count === 1 ? (best.items[0].name || `${productName} – ${best.credits} credits`) : `Start met ${productName} – ${decimal.format(first.credits)} credits`,
    productName,
    price: best.price,
    credits: best.credits,
    requiredCredits,
    count: best.count,
    packageItems: best.items,
    packageParts: parts,
    firstPackage: first,
    isStarterPlan: recommendStarterPackage,
    instruction,
  };
}

function regularFee(course, type) {
  return Number(course.greenFees?.[type === "large" ? "nine" : "short"] || 0);
}

function loyalFee(course, type) {
  const key = type === "large" ? "loyalNine" : "loyalShort";
  const discounted = Number(course.greenFees?.[key]);
  return Number.isFinite(discounted) && discounted > 0 ? discounted : regularFee(course, type);
}

function addRegistration(plan, handicapPrice) {
  return { ...plan, registrationPrice: handicapPrice, annualCost: plan.price + handicapPrice };
}

function candidatePlans(context) {
  const { largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak } = context;
  const totalRounds = largeRounds + smallRounds;
  const handicapPrice = youth ? Number(hgcConfig.handicapRegistration.youthPrice) : Number(hgcConfig.handicapRegistration.adultPrice);
  const standardCredits = largeRounds * largeCourse.largeRate + smallRounds * smallCourse.shortRate;
  const shortGolfShare = totalRounds > 0 ? (smallRounds / totalRounds) * 100 : 0;
  const minimumShortGolfShare = Number(hgcConfig.settings.minimumShortGolfRoundSharePercentage ?? 33);
  const shortGolfFitsPlayStyle = smallRounds > 0 && shortGolfShare + 1e-8 >= minimumShortGolfShare;
  const candidates = [];

  const packageChoices = youth
    ? [{ packages: hgcConfig.youthPackages, name: "Hollandsche Golfclub Jeugd-speelrecht", group: "youth" }]
    : [
        { packages: hgcConfig.standardPackages, name: "Hollandsche Golfclub Speelrecht", group: "standard" },
        ...(canPlayOffPeak ? [{ packages: hgcConfig.offPeakPackages, name: "Hollandsche Golfclub Daluren-speelrecht", group: "offpeak" }] : []),
      ];
  packageChoices.forEach((choice) => {
    const plan = packagePlan(choice.packages, standardCredits, choice.name, choice.group);
    if (plan) {
      plan.availablePackages = choice.packages;
      plan.coveredRounds = standardCredits > 0 ? totalRounds * Math.min(1, plan.credits / standardCredits) : totalRounds;
      plan.largeBaseCost = plan.credits > 0 ? largeCourse.largeRate * (plan.price / plan.credits) : 0;
      plan.smallBaseCost = plan.credits > 0 ? smallCourse.shortRate * (plan.price / plan.credits) : 0;
      plan.detail = plan.isStarterPlan
        ? `Je verwacht circa ${decimal.format(standardCredits)} credits nodig te hebben. Begin met het grootste speelrecht van ${decimal.format(plan.credits)} credits en verleng pas wanneer die credits daadwerkelijk op zijn.`
        : plan.count > 1
        ? `Voor jouw opgegeven speelvolume zijn circa ${decimal.format(standardCredits)} credits nodig. De voordeligste route is ${plan.packageParts.join(" + ")} (${decimal.format(plan.credits)} credits totaal).`
        : `${decimal.format(standardCredits)} credits nodig; ${decimal.format(plan.credits)} credits geadviseerd.`;
      candidates.push(addRegistration(plan, handicapPrice));
    }
  });

  const shortGolfRate = Number(smallCourse.shortGolfRate);
  if (!youth && shortGolfFitsPlayStyle && Number.isFinite(shortGolfRate)) {
    const shortCredits = smallRounds * shortGolfRate;
    const shortPlan = packagePlan(hgcConfig.shortGolfPackages, shortCredits, "Hollandsche Golfclub Shortgolf-speelrecht", "shortgolf");
    if (shortPlan) {
      shortPlan.availablePackages = hgcConfig.shortGolfPackages;
      shortPlan.type = "shortgolf";
      const largeGreenFees = largeRounds * loyalFee(largeCourse, "large");
      shortPlan.packageBasePrice = shortPlan.price;
      shortPlan.nonPackageCost = largeGreenFees;
      shortPlan.price += largeGreenFees;
      shortPlan.largeBaseCost = loyalFee(largeCourse, "large");
      shortPlan.smallBaseCost = shortPlan.packageItems.reduce((sum, item) => sum + item.price, 0) / smallRounds;
      shortPlan.detail = `${decimal.format(shortCredits)} Shortgolf-credits voor je kleine rondes${largeRounds ? `, plus ${largeRounds} grote-baanrondes tegen gereduceerd greenfeetarief` : ""}.`;
      candidates.push(addRegistration(shortPlan, handicapPrice));
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
      plan.largeBaseCost = plan.credits > 0 ? Number(local.largeRoundRate || 0) * (plan.price / plan.credits) : 0;
      plan.smallBaseCost = plan.credits > 0 ? Number(local.shortRoundRate || 0) * (plan.price / plan.credits) : 0;
      plan.detail = plan.isStarterPlan
        ? `Je verwacht circa ${decimal.format(localCredits)} lokale credits nodig te hebben. Begin met ${decimal.format(plan.credits)} credits en verleng pas wanneer die daadwerkelijk op zijn.`
        : `${decimal.format(localCredits)} lokale credits nodig; ${decimal.format(plan.credits)} credits geadviseerd.`;
      candidates.push(addRegistration(plan, handicapPrice));
    });
  }

  if (!youth) {
    const largeFee = loyalFee(largeCourse, "large");
    const smallFee = loyalFee(smallCourse, "small");
    const greenFees = largeRounds * largeFee + smallRounds * smallFee;
    candidates.push(addRegistration({
      type: "loyaltee",
      group: "loyaltee",
      name: brandText(hgcConfig.loyalTee.name),
      productName: brandText(hgcConfig.loyalTee.name),
      price: Number(hgcConfig.loyalTee.membershipPrice) + greenFees,
      sharedCost: Number(hgcConfig.loyalTee.membershipPrice),
      largeBaseCost: largeFee,
      smallBaseCost: smallFee,
      detail: `${euro.format(hgcConfig.loyalTee.membershipPrice)} lidmaatschap plus greenfees met 20% korting waar dit tarief beschikbaar is.`,
      instruction: "Je betaalt per gespeelde ronde en krijgt korting op de reguliere greenfee.",
    }, handicapPrice));
  }

  const voucherCount = Math.min(totalRounds, Number(hgcConfig.handicapRegistration.vouchers || 0));
  const voucherOptions = [
    ...Array(largeRounds).fill({ type: "large", fee: regularFee(largeCourse, "large") }),
    ...Array(smallRounds).fill({ type: "small", fee: regularFee(smallCourse, "small") }),
  ].sort((a, b) => b.fee - a.fee);
  const covered = voucherOptions.slice(0, voucherCount);
  const coveredLarge = covered.filter((item) => item.type === "large").length;
  const coveredSmall = covered.filter((item) => item.type === "small").length;
  const paidLarge = Math.max(0, largeRounds - coveredLarge);
  const paidSmall = Math.max(0, smallRounds - coveredSmall);
  const extraGreenFees = paidLarge * regularFee(largeCourse, "large") + paidSmall * regularFee(smallCourse, "small");
  candidates.push({
    type: "handicap",
    group: "handicap",
    name: "Hollandsche Golfclub Handicapregistratie",
    productName: "Hollandsche Golfclub Handicapregistratie",
    price: handicapPrice + extraGreenFees,
    registrationPrice: 0,
    sharedCost: handicapPrice,
    annualCost: handicapPrice + extraGreenFees,
    largeBaseCost: largeRounds ? paidLarge * regularFee(largeCourse, "large") / largeRounds : 0,
    smallBaseCost: smallRounds ? paidSmall * regularFee(smallCourse, "small") / smallRounds : 0,
    detail: `Inclusief ${voucherCount} van de ${hgcConfig.handicapRegistration.vouchers} persoonlijke greenfees; overige rondes zijn tegen regulier tarief meegerekend.`,
    instruction: "De inbegrepen greenfees zijn losse rondes en geen credits.",
  });

  const sorted = candidates
    .map((plan) => {
      const shared = (Number(plan.registrationPrice || 0) + Number(plan.sharedCost || 0)) / (Number(plan.coveredRounds) || totalRounds);
      return {
        ...plan,
        selectionCost: plan.isStarterPlan && Number(plan.requiredCredits) > Number(plan.credits)
          ? (Number(plan.price) / Number(plan.credits)) * Number(plan.requiredCredits) + Number(plan.registrationPrice || 0)
          : plan.annualCost,
        largeRoundCost: largeRounds ? Number(plan.largeBaseCost || 0) + shared : null,
        smallRoundCost: smallRounds ? Number(plan.smallBaseCost || 0) + shared : null,
      };
    })
    .sort((a, b) => a.selectionCost - b.selectionCost || a.group.localeCompare(b.group));
  const creditPlans = sorted.filter((plan) => plan.type === "credits" || plan.type === "shortgolf");
  if (standardCredits >= 20 && creditPlans.length) {
    return [...creditPlans, ...sorted.filter((plan) => !creditPlans.includes(plan))];
  }
  return sorted;
}

function calculate() {
  const largeRounds = normaliseRounds(largeRoundsNumber.value);
  const smallRounds = normaliseRounds(smallRoundsNumber.value);
  const largeCourse = selectedCourse(largeCourseSelect);
  const smallCourse = selectedCourse(smallCourseSelect);
  const youth = ageCategory.value === "youth";
  const plans = candidatePlans({ largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak: offPeak.checked });
  const best = plans[0];
  const loyalTeeIsRelevant = (best.type === "credits" || best.type === "shortgolf") && Number(best.credits) <= 20;
  const substantialCreditAdvice = (best.type === "credits" || best.type === "shortgolf") && Number(best.credits) > 20;
  const handicapPrice = youth ? Number(hgcConfig.handicapRegistration.youthPrice) : Number(hgcConfig.handicapRegistration.adultPrice);
  const adjacentPackage = Number(best.credits) === 120
    ? nextSmallerCreditOption(best, handicapPrice)
    : Number(best.credits) === 60
      ? nextLargerCreditOption(best, handicapPrice)
      : null;
  const alternative = loyalTeeIsRelevant
    ? plans.find((plan) => plan.type === "loyaltee")
    : substantialCreditAdvice
      ? adjacentPackage
      : plans.find((plan) => plan.group !== best?.group && plan.type !== "loyaltee");
  return {
    largeRounds,
    smallRounds,
    largeCourse,
    smallCourse,
    handicapPrice,
    best,
    alternative,
  };
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
    detail: `Je start met ${decimal.format(fewerCredits)} credits minder en betaalt ${euro.format(saving)} minder voor het speelrecht. Dit dekt niet al je verwachte rondes; zodra de credits op zijn, kun je verlengen.`,
  };
}

function planBenefits(plan) {
  const source = plan.type === "shortgolf"
    ? hgcConfig.shortGolfBenefits
    : plan.type === "loyaltee"
      ? hgcConfig.loyalTeeBenefits
      : plan.type === "handicap"
        ? hgcConfig.handicapBenefits
        : plan.group.startsWith("local-")
          ? hgcConfig.localBenefits
          : hgcConfig.benefits;
  const cleanedSource = plan.type === "handicap"
    ? source
    : source.filter((benefit) => !/handicapregistratie/i.test(benefit));
  const registrationBenefits = plan.type === "handicap"
    ? []
    : ["Handicapregistratie bij de Hollandsche Golfclub", "2 persoonlijke greenfees naast je gekozen product"];
  return [...cleanedSource, ...registrationBenefits]
    .map(brandText)
    .filter((item, index, all) => all.indexOf(item) === index);
}

function planLink(plan) {
  if (plan.type === "loyaltee") return hgcConfig.links.loyalTee || hgcConfig.links.webshop;
  if (plan.type === "handicap") return hgcConfig.links.handicapRegistration || hgcConfig.links.webshop;
  return hgcConfig.links.webshop;
}

function roundSummary(result) {
  const parts = [];
  if (result.largeRounds) parts.push(`${result.largeRounds} grote-baanrondes bij ${result.largeCourse.name}`);
  if (result.smallRounds) parts.push(`${result.smallRounds} kleine-baanrondes bij ${result.smallCourse.name}`);
  return parts.join(" en ");
}

function costCard(label, value, note) {
  if (value === null) return "";
  return `<article><p>${label}</p><strong>${euro.format(value)}</strong><span>${note}</span></article>`;
}

function renderResult(result) {
  const best = result.best;
  const benefits = planBenefits(best);
  const registrationText = best.type === "handicap"
    ? `Handicapregistratie is het geadviseerde product en bevat ${hgcConfig.handicapRegistration.vouchers} persoonlijke greenfees.`
    : `In dit totaal zit ${euro.format(result.handicapPrice)} voor handicapregistratie. De ${hgcConfig.handicapRegistration.vouchers} persoonlijke greenfees zijn extra rondes en zijn niet van je credits afgetrokken.`;
  const alternative = result.alternative;
  const totalCostLabel = best.isStarterPlan ? "Kosten om te starten" : best.count > 1 ? "Geschatte totale kosten" : "Verwachte kosten per jaar";
  const totalCostNote = best.isStarterPlan ? `voor ${decimal.format(best.credits)} credits, inclusief handicapregistratie` : best.count > 1 ? "voor jouw opgegeven speelvolume, inclusief handicapregistratie" : "inclusief handicapregistratie";
  const recommendationEyebrow = best.isStarterPlan ? "Ons advies" : best.count > 1 ? "Jouw voordeligste route" : "Kies jouw speelrecht";
  const webshopLabel = best.isStarterPlan ? `Kies ${decimal.format(best.credits)} credits` : best.count > 1 ? `Start met ${decimal.format(best.firstPackage.credits)} credits` : "Bekijk in de webshop";

  resultContent.innerHTML = `
    <div class="result-hero">
      <span class="result-check" aria-hidden="true">✓</span>
      <p class="eyebrow">Jouw advies</p>
      <h3>Dit past het beste bij jouw golfgedrag</h3>
      <p>Gebaseerd op ${roundSummary(result)}.</p>
    </div>

    <div class="choice-costs">
      <article class="choice-costs-total"><p>${totalCostLabel}</p><strong>${euro.format(best.annualCost)}</strong><span>${totalCostNote}</span></article>
      ${costCard("Grote baan", best.largeRoundCost, "effectief per ronde")}
      ${costCard("Kleine baan", best.smallRoundCost, "effectief per ronde")}
    </div>

    <article class="recommendation recommendation--featured">
      <div class="recommendation-main">
        <p class="eyebrow">${recommendationEyebrow}</p>
        <h4>${brandText(best.name)}</h4>
        <p>${best.detail}</p>
        <p class="package-instruction">${best.instruction}</p>
        <p class="registration-note">${registrationText}</p>
      </div>
      <div class="recommendation-actions">
        <a class="button button--primary button--cta" href="${planLink(best)}">${webshopLabel} <span>→</span></a>
        <a class="button button--secondary" href="${hgcConfig.links.playingRights || "/hgc-speelrechten/"}">Meer over speelrechten</a>
      </div>
    </article>

    ${alternative ? `
      <article class="next-option">
        <div>
          <p class="eyebrow">${alternative.isUpgradeOption ? "Meer speelruimte" : alternative.isSmallerOption ? "Voordeliger instappen" : "Andere passende optie"}</p>
          <h4>${brandText(alternative.name)}</h4>
          <p>${alternative.isStarterPlan
            ? `Met deze optie start je voor <strong>${euro.format(alternative.annualCost)}</strong> en kun je later verlengen.`
            : `Deze ruimere of andere keuze komt uit op circa <strong>${euro.format(alternative.annualCost)} per jaar</strong>.`} ${alternative.detail}</p>
        </div>
        <div class="next-option-actions"><a class="next-option-link" href="${planLink(alternative)}">Meer informatie →</a></div>
      </article>
    ` : ""}

    <section class="included-benefits">
      <p class="eyebrow">Dit krijg je er ook bij</p>
      <h4>Meer dan alleen speelrondes</h4>
      <ul>${benefits.map((benefit) => `<li><span>✓</span>${benefit}</li>`).join("")}</ul>
    </section>

    <p class="result-disclaimer">Deze keuzehulp geeft een indicatie op basis van jouw opgegeven rondes en de ingestelde tarieven voor ${hgcConfig.year}. Greenfees kunnen per dag en tijdstip verschillen. Bekijk altijd de actuele <a href="${hgcConfig.links.terms}">voorwaarden</a>.</p>
  `;
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
  track("calculator_result_viewed", { recommended_product: result.best.name, annual_cost: result.best.annualCost });
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
  if (event.target.closest(".button--cta")) track("calculator_product_clicked");
});
largeCourseSelect.addEventListener("change", () => { largeCoursePicker.render(); updateCourseHelp(); });
smallCourseSelect.addEventListener("change", () => { smallCoursePicker.render(); updateCourseHelp(); });
connectRange(largeRoundsRange, largeRoundsNumber);
connectRange(smallRoundsRange, smallRoundsNumber);
populateCourses();
updateRangeFill(largeRoundsRange);
updateRangeFill(smallRoundsRange);
progressBar.style.width = "50%";
track("calculator_opened");
})();
