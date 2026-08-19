(() => {
  function expectedAlternative(best) {
    const packages = Array.isArray(best.availablePackages) ? best.availablePackages : [];
    const credits = Number(best.credits);
    if (credits === 200) return null;
    if (credits === 120) {
      return packages.map((item) => Number(item.credits)).filter((value) => value < 120).sort((a, b) => b - a)[0] ?? null;
    }
    if (credits === 20 || credits === 60) {
      return packages.map((item) => Number(item.credits)).filter((value) => value > credits).sort((a, b) => a - b)[0] ?? null;
    }
    return null;
  }

  function validateRecommendation(result, context, report) {
    const { best, alternative } = result;
    if (!best || !["credits", "shortgolf"].includes(best.type)) {
      report("unsupported-product", { ...context, type: best?.type });
      return;
    }
    if (![20, 60, 120, 200].includes(Number(best.credits))) {
      report("unknown-credit-tier", { ...context, credits: best.credits, group: best.group });
    }
    const expected = expectedAlternative(best);
    if (expected === null && alternative) {
      report("unexpected-alternative", { ...context, credits: best.credits, alternativeCredits: alternative.credits });
    }
    if (expected !== null && Number(alternative?.credits) !== expected) {
      report("wrong-alternative", { ...context, credits: best.credits, expected, actual: alternative?.credits });
    }
    const zone = result.profile ? result.profile.zone : null;
    if (!["credits", "mixed", "shortgolf"].includes(zone)) {
      report("unknown-profile-zone", { ...context, zone });
    }
    if (best.type === "shortgolf" && zone === "credits") {
      report("shortgolf-outside-profile", { ...context, zone });
    }
    const shortGolfPossible = !context.youth
      && context.smallRounds > 0
      && Number.isFinite(Number(result.smallCourse && result.smallCourse.shortGolfRate));
    if (zone === "mixed" && shortGolfPossible && !result.choice) {
      report("missing-choice-in-mixed-zone", { ...context, zone });
    }
    if (zone !== "mixed" && result.choice) {
      report("choice-outside-mixed-zone", { ...context, zone });
    }
    if (result.choice && (result.choice.credits.type !== "credits" || result.choice.shortGolf.type !== "shortgolf")) {
      report("wrong-choice-types", { ...context, credits: result.choice.credits.type, shortGolf: result.choice.shortGolf.type });
    }
    if (context.youth && best.group !== "youth") {
      report("non-youth-product-for-youth", { ...context, group: best.group });
    }
  }

  window.runHgcMatrixAudit = function runHgcMatrixAudit() {
    const { candidatePlans, recommendationFor } = window.hgcCalculatorAudit;
    const roundValues = [0, 1, 2, 5, 10, 15, 20, 21, 24, 25, 30, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300, 400];
    const largeCourses = hgcConfig.courses.filter((course) => course.largeRate !== null && course.largeRate !== undefined);
    const smallCourses = hgcConfig.courses.filter((course) => course.shortRate !== null && course.shortRate !== undefined);
    const errors = [];
    const errorCounts = {};
    const recommendationCounts = {};
    let cases = 0;
    let plansChecked = 0;

    function report(code, context) {
      errorCounts[code] = (errorCounts[code] || 0) + 1;
      if (errors.length < 50) errors.push({ code, ...context });
    }

    for (const largeCourse of largeCourses) {
      for (const smallCourse of smallCourses) {
        for (const largeRounds of roundValues) {
          for (const smallRounds of roundValues) {
            if (largeRounds + smallRounds === 0) continue;
            for (const youth of [false, true]) {
              for (const canPlayOffPeak of [false, true]) {
                const context = { largeRounds, smallRounds, largeCourse: largeCourse.id, smallCourse: smallCourse.id, youth, canPlayOffPeak };
                const input = { largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak };
                cases += 1;
                let plans;
                let result;
                try {
                  plans = candidatePlans(input);
                  result = recommendationFor(input);
                } catch (error) {
                  report("exception", { ...context, message: error.message });
                  continue;
                }
                if (!plans.length) {
                  report("no-plans", context);
                  continue;
                }
                if (result.best.group !== plans[0].group || result.best.credits !== plans[0].credits) {
                  report("recommendation-best-mismatch", context);
                }
                validateRecommendation(result, context, report);
                const key = `${result.best.type}:${result.best.group}:${result.best.credits}`;
                recommendationCounts[key] = (recommendationCounts[key] || 0) + 1;

                if (!plans.every((plan, index) => index === 0 || Number(plans[index - 1].selectionCost) <= Number(plan.selectionCost) + 1e-8)) {
                  report("plans-not-sorted", context);
                }

                for (const plan of plans) {
                  plansChecked += 1;
                  if (!["credits", "shortgolf"].includes(plan.type)) report("unsupported-candidate", { ...context, type: plan.type });
                  for (const field of ["price", "annualCost", "selectionCost"]) {
                    if (!Number.isFinite(Number(plan[field])) || Number(plan[field]) < 0) report(`invalid-${field}`, { ...context, group: plan.group });
                  }
                  if (Math.abs(Number(plan.annualCost) - Number(plan.price) - Number(plan.registrationPrice || 0)) > 0.001) {
                    report("annual-cost-mismatch", { ...context, group: plan.group });
                  }
                  const reconstructed = largeRounds * Number(plan.largeRoundCost || 0) + smallRounds * Number(plan.smallRoundCost || 0);
                  if (Math.abs(reconstructed - Number(plan.annualCost)) > 0.01) {
                    report("round-cost-total-mismatch", { ...context, group: plan.group, reconstructed, annualCost: plan.annualCost });
                  }
                  if (!plan.isStarterPlan && Number(plan.credits) + 1e-8 < Number(plan.requiredCredits)) {
                    report("undercovered-nonstarter", { ...context, group: plan.group });
                  }
                  if (plan.isStarterPlan && (Number(plan.count) !== 1 || Number(plan.requiredCredits) <= Number(plan.credits))) {
                    report("invalid-starter", { ...context, group: plan.group });
                  }
                  if (plan.isStarterPlan) {
                    if (!plan.fullRoute) {
                      report("starter-zonder-volledige-route", { ...context, group: plan.group });
                    } else {
                      if (Number(plan.fullRoute.credits) + 1e-8 < Number(plan.requiredCredits)) {
                        report("volledige-route-dekt-niet", { ...context, group: plan.group, route: plan.fullRoute.credits, nodig: plan.requiredCredits });
                      }
                      if (Number(plan.fullRoute.price) + 1e-8 < Number(plan.price)) {
                        report("volledige-route-goedkoper-dan-startpakket", { ...context, group: plan.group });
                      }
                    }
                  } else if (plan.fullRoute) {
                    report("volledige-route-zonder-startpakket", { ...context, group: plan.group });
                  }
                  if (plan.type === "shortgolf" && window.hgcCalculatorAudit.playProfile(largeRounds, smallRounds).zone === "credits") {
                    report("shortgolf-outside-profile", { ...context, group: plan.group });
                  }
                  if (youth && plan.group !== "youth") report("adult-plan-for-youth", { ...context, group: plan.group });
                  if (!canPlayOffPeak && String(plan.group).includes("offpeak")) report("offpeak-without-selection", { ...context, group: plan.group });
                }
              }
            }
          }
        }
      }
    }
    return { cases, plansChecked, largeCourseCount: largeCourses.length, smallCourseCount: smallCourses.length, roundValues, errorCounts, errors, recommendationCounts };
  };

  window.runHgcProfileAudit = function runHgcProfileAudit() {
    const { candidatePlans, recommendationFor, playProfile } = window.hgcCalculatorAudit;
    const settings = hgcConfig.settings || {};
    const shortGolfShare = Number(settings.shortGolfSharePercent) / 100;
    const mixedFrom = Number(settings.mixedProfileFromPercent) / 100;
    const mixedTo = Number(settings.mixedProfileToPercent) / 100;
    const roundValues = [0, 1, 2, 5, 10, 20, 30, 50, 100, 200];
    const largeCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.largeRate));
    const smallCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.shortRate));
    const errors = [];
    const errorCounts = {};
    const zoneCounts = {};
    let cases = 0;
    let choicesSeen = 0;

    function report(code, context) {
      errorCounts[code] = (errorCounts[code] || 0) + 1;
      if (errors.length < 50) errors.push({ code, ...context });
    }

    for (const largeCourse of largeCourses) {
      for (const smallCourse of smallCourses) {
        for (const largeRounds of roundValues) {
          for (const smallRounds of roundValues) {
            if (largeRounds + smallRounds === 0) continue;
            for (const youth of [false, true]) {
              const context = { largeRounds, smallRounds, largeCourse: largeCourse.id, smallCourse: smallCourse.id, youth };
              const input = { largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak: false };
              cases += 1;

              const share = smallRounds / (largeRounds + smallRounds);
              const expectedZone = share >= shortGolfShare
                ? "shortgolf"
                : share >= mixedFrom && share <= mixedTo
                  ? "mixed"
                  : "credits";
              const profile = playProfile(largeRounds, smallRounds);
              if (profile.zone !== expectedZone) {
                report("zone-mismatch", { ...context, share, expected: expectedZone, actual: profile.zone });
              }
              zoneCounts[expectedZone] = (zoneCounts[expectedZone] || 0) + 1;

              let plans;
              let result;
              try {
                plans = candidatePlans(input);
                result = recommendationFor(input);
              } catch (error) {
                report("exception", { ...context, message: error.message });
                continue;
              }

              const shortGolfPossible = !youth && smallRounds > 0 && Number.isFinite(Number(smallCourse.shortGolfRate));
              const hasShortGolf = plans.some((plan) => plan.type === "shortgolf");
              if (expectedZone === "credits" && hasShortGolf) {
                report("shortgolf-in-credits-zone", context);
              }
              if (expectedZone !== "credits" && shortGolfPossible && !hasShortGolf) {
                report("missing-shortgolf-plan", context);
              }
              if (expectedZone === "mixed" && shortGolfPossible) {
                if (!result.choice) {
                  report("missing-choice", context);
                } else {
                  choicesSeen += 1;
                  if (result.choice.credits.type !== "credits") report("choice-credits-wrong-type", { ...context, type: result.choice.credits.type });
                  if (result.choice.shortGolf.type !== "shortgolf") report("choice-shortgolf-wrong-type", { ...context, type: result.choice.shortGolf.type });
                }
              }

              // De schakelaar toont hetzelfde bedrag min de registratieprijs.
              for (const plan of plans) {
                const withoutRegistration = Number(plan.annualCost) - Number(plan.registrationPrice || 0);
                if (Math.abs(withoutRegistration - Number(plan.price)) > 0.001) {
                  report("registration-split-mismatch", { ...context, group: plan.group });
                }
                if (withoutRegistration < 0) {
                  report("negative-amount-without-registration", { ...context, group: plan.group });
                }
              }
            }
          }
        }
      }
    }
    return { cases, zoneCounts, choicesSeen, errorCounts, errors };
  };

  window.runHgcTextAudit = function runHgcTextAudit() {
    const { recommendationFor, renderResult, resultContent, planBenefits, applyRegistrationSwitch } = window.hgcCalculatorAudit;
    const roundPairs = [
      [0, 5], [0, 22], [1, 20], [2, 20], [5, 5], [10, 10], [20, 22], [22, 20],
      [20, 20], [30, 30], [50, 50], [60, 60], [100, 100], [200, 200], [20, 0], [40, 5],
    ];
    const largeCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.largeRate));
    const smallCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.shortRate));
    const errors = [];
    const errorCounts = {};
    let cases = 0;
    let cardsChecked = 0;
    let starterCardsChecked = 0;

    function report(code, context) {
      errorCounts[code] = (errorCounts[code] || 0) + 1;
      if (errors.length < 50) errors.push({ code, ...context });
    }

    function checkCard(card, plan, context) {
      if (!card) {
        report("missing-card", context);
        return;
      }
      cardsChecked += 1;
      const coverage = card.querySelector(".advice-card-coverage").textContent;
      const note = card.querySelector(".advice-card-amount small").textContent;
      const amount = card.querySelector(".advice-card-amount .switchable").textContent;
      const claimsCoverage = /\bdekt\b/.test(coverage);

      if (plan.isStarterPlan) {
        starterCardsChecked += 1;
        if (claimsCoverage) report("startpakket-belooft-dekking", { ...context, coverage });
        if (!/startpakket/.test(coverage)) report("startpakket-niet-benoemd", { ...context, coverage });
        if (!/starten/.test(note)) report("startpakket-niet-in-toelichting", { ...context, note });
        const route = card.querySelector(".full-route-note");
        if (!route) {
          report("volledige-route-niet-getoond", context);
        } else {
          const shownAmount = route.querySelector(".switchable").textContent.replace(/\s/g, "");
          const expectedAmount = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" })
            .format(Number(plan.fullRoute.price) + Number(plan.registrationPrice || 0))
            .replace(/\s/g, "");
          if (shownAmount !== expectedAmount) {
            report("volledige-route-bedrag-wijkt-af", { ...context, shownAmount, expectedAmount });
          }
        }
      } else if (!claimsCoverage) {
        report("dekking-niet-benoemd", { ...context, coverage });
      }

      const expected = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(plan.annualCost));
      if (amount.replace(/\s/g, "") !== expected.replace(/\s/g, "")) {
        report("bedrag-wijkt-af", { ...context, amount, expected });
      }

      const shown = [...card.querySelectorAll(".advice-card-benefits li")].map((item) => item.textContent.replace(/^✓/, ""));
      const belongs = planBenefits(plan);
      if (shown.join("|") !== belongs.join("|")) {
        report("voordelen-horen-niet-bij-speelrecht", { ...context, shown: shown.join("|"), expected: belongs.join("|") });
      }
    }

    for (const largeCourse of largeCourses) {
      for (const smallCourse of smallCourses) {
        for (const [largeRounds, smallRounds] of roundPairs) {
          for (const youth of [false, true]) {
            const context = { largeRounds, smallRounds, largeCourse: largeCourse.id, smallCourse: smallCourse.id, youth };
            cases += 1;
            let result;
            try {
              result = recommendationFor({ largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak: false });
              renderResult(result);
            } catch (error) {
              report("exception", { ...context, message: error.message });
              continue;
            }

            const registrationRows = [...resultContent.querySelectorAll("li")].filter((item) => /handicapregistratie/i.test(item.textContent));
            if (!registrationRows.length) {
              report("registratie-voordeel-ontbreekt", context);
            }
            if (registrationRows.some((item) => !item.hasAttribute("data-registration-row"))) {
              report("registratie-voordeel-volgt-schakelaar-niet", context);
            }
            applyRegistrationSwitch(false);
            if (registrationRows.some((item) => !item.hidden)) {
              report("registratie-voordeel-blijft-staan", context);
            }
            applyRegistrationSwitch(true);
            if (registrationRows.some((item) => item.hidden)) {
              report("registratie-voordeel-komt-niet-terug", context);
            }

            if (result.choice) {
              checkCard(resultContent.querySelector(".advice-card--credits"), result.choice.credits, { ...context, kaart: "credits" });
              checkCard(resultContent.querySelector(".advice-card--shortgolf"), result.choice.shortGolf, { ...context, kaart: "shortgolf" });
              continue;
            }

            // Bij één advies mag een startpakket ook niet als volledige dekking gelden.
            const shown = resultContent.textContent;
            if (result.best.isStarterPlan && /dekt zowel|dekt al je rondes/.test(shown)) {
              report("startpakket-belooft-dekking-enkel-advies", context);
            }
            if (Number(result.best.uncoveredLargeRounds || 0) > 0 && !/buiten dit speelrecht/.test(shown)) {
              report("ongedekte-rondes-niet-gemeld", context);
            }
          }
        }
      }
    }
    return { cases, cardsChecked, starterCardsChecked, errorCounts, errors };
  };

  window.runHgcRoundSweepAudit = function runHgcRoundSweepAudit() {
    const { recommendationFor } = window.hgcCalculatorAudit;
    const largeCourses = hgcConfig.courses.filter((course) => course.largeRate !== null && course.largeRate !== undefined);
    const smallCourses = hgcConfig.courses.filter((course) => course.shortRate !== null && course.shortRate !== undefined);
    const errors = [];
    const errorCounts = {};
    let cases = 0;
    function report(code, context) {
      errorCounts[code] = (errorCounts[code] || 0) + 1;
      if (errors.length < 50) errors.push({ code, ...context });
    }
    for (const largeCourse of largeCourses) {
      for (const smallCourse of smallCourses) {
        for (let totalRounds = 1; totalRounds <= 400; totalRounds += 1) {
          const smallValues = [...new Set([0, Math.round(totalRounds * 0.25), Math.round(totalRounds * 0.5), Math.round(totalRounds * 0.75), totalRounds])];
          for (const smallRounds of smallValues) {
            const largeRounds = totalRounds - smallRounds;
            for (const youth of [false, true]) {
              for (const canPlayOffPeak of [false, true]) {
                const context = { largeRounds, smallRounds, largeCourse: largeCourse.id, smallCourse: smallCourse.id, youth, canPlayOffPeak };
                cases += 1;
                try {
                  validateRecommendation(recommendationFor({ largeRounds, smallRounds, largeCourse, smallCourse, youth, canPlayOffPeak }), context, report);
                } catch (error) {
                  report("exception", { ...context, message: error.message });
                }
              }
            }
          }
        }
      }
    }
    return { cases, largeCourseCount: largeCourses.length, smallCourseCount: smallCourses.length, errorCounts, errors };
  };
})();
