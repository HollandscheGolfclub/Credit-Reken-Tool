(() => {
  function expectedAlternative(best) {
    const packages = Array.isArray(best.availablePackages) ? best.availablePackages : [];
    const credits = Number(best.credits);
    const smaller = packages.map((item) => Number(item.credits)).filter((value) => value < credits).sort((a, b) => b - a)[0] ?? null;
    // Is een route met meerdere aankopen goedkoper, dan staat het kleinere
    // speelrecht als tweede advies onder het hoofdadvies.
    if (best.cheaperRoute && smaller !== null) return smaller;
    if (credits === 200) return null;
    if (credits === 120) {
      return smaller;
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
    const items = Array.isArray(best.packageItems) ? best.packageItems : [];
    const available = (Array.isArray(best.availablePackages) ? best.availablePackages : []).map((item) => Number(item.credits));
    if (!items.length) {
      report("advies-zonder-pakketten", { ...context, group: best.group });
    } else {
      if (items.some((item) => !available.includes(Number(item.credits)))) {
        report("pakket-niet-in-aanbod", { ...context, group: best.group, items: items.map((item) => item.credits).join("+") });
      }
      const sum = items.reduce((total, item) => total + Number(item.credits), 0);
      if (Math.abs(sum - Number(best.credits)) > 1e-8) {
        report("credits-tellen-niet-op", { ...context, group: best.group, sum, credits: best.credits });
      }
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
                  if (Number(plan.count) !== 1 || (Array.isArray(plan.packageItems) && plan.packageItems.length !== 1)) {
                    report("advies-uit-meerdere-aankopen", { ...context, group: plan.group, count: plan.count });
                  }
                  const covers = Number(plan.credits) + 1e-8 >= Number(plan.requiredCredits);
                  if (covers !== Boolean(plan.coversRounds)) {
                    report("dekking-vlag-wijkt-af", { ...context, group: plan.group, coversRounds: plan.coversRounds });
                  }
                  if (!covers) {
                    // Dan hoort dit het grootste speelrecht uit het aanbod te zijn.
                    const largest = Math.max(...(Array.isArray(plan.availablePackages) ? plan.availablePackages : []).map((item) => Number(item.credits)));
                    if (Number(plan.credits) !== largest) {
                      report("advies-dekt-niet-en-is-niet-het-grootste", { ...context, group: plan.group, credits: plan.credits, largest, nodig: plan.requiredCredits });
                    }
                  }
                  if (plan.cheaperRoute) {
                    if (Number(plan.cheaperRoute.credits) + 1e-8 < Number(plan.requiredCredits)) {
                      report("voordeligere-route-dekt-niet", { ...context, group: plan.group });
                    }
                    if (Number(plan.cheaperRoute.price) + 1e-8 >= Number(plan.price)) {
                      report("voordeligere-route-niet-voordeliger", { ...context, group: plan.group, route: plan.cheaperRoute.price, advies: plan.price });
                    }
                    if (Number(plan.cheaperRoute.count) <= 1) {
                      report("voordeligere-route-is-een-pakket", { ...context, group: plan.group });
                    }
                  }
                  const greenFeeRounds = Number(plan.reducedGreenFeeRounds || 0);
                  if (greenFeeRounds) {
                    const fee = Number(largeCourse.greenFee);
                    if (greenFeeRounds !== largeRounds) {
                      report("greenfee-rondes-wijken-af", { ...context, group: plan.group, greenFeeRounds });
                    }
                    if (Number(plan.uncoveredLargeRounds || 0) !== 0) {
                      report("greenfee-en-ongedekt-tegelijk", { ...context, group: plan.group });
                    }
                    if (Math.abs(Number(plan.reducedGreenFeeTotal) - greenFeeRounds * fee) > 0.001) {
                      report("greenfeetotaal-telt-niet-op", { ...context, group: plan.group, totaal: plan.reducedGreenFeeTotal });
                    }
                    if (Math.abs(Number(plan.selectionCost) - Number(plan.annualCost) - Number(plan.reducedGreenFeeTotal)) > 0.001) {
                      report("greenfee-weegt-niet-mee-in-keuze", { ...context, group: plan.group });
                    }
                    if (Number(plan.largeBaseCost || 0) !== 0) {
                      report("greenfee-in-kosten-per-ronde", { ...context, group: plan.group });
                    }
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
    const { recommendationFor, renderResult, resultContent, planBenefits, applyRegistrationSwitch, handicapDefault } = window.hgcCalculatorAudit;
    const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
    // Het getoonde bedrag volgt de standaardstand van de schakelaar.
    const shownAmountFor = (plan) => euro
      .format(Number(plan.annualCost) - (handicapDefault() ? 0 : Number(plan.registrationPrice || 0)))
      .replace(/\s/g, "");
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

      if (!claimsCoverage) {
        report("dekking-niet-benoemd", { ...context, coverage });
      }

      const expected = shownAmountFor(plan);
      if (amount.replace(/\s/g, "") !== expected) {
        report("bedrag-wijkt-af", { ...context, amount, expected });
      }

      // De route met meerdere aankopen tonen we niet meer, op geen enkele kaart.
      if (card.querySelector(".cheaper-route-note")) {
        report("voordeligere-route-alsnog-op-kaart", context);
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
            if (registrationRows.some((item) => item.hidden !== !handicapDefault())) {
              report("registratie-voordeel-volgt-standaard-niet", context);
            }
            applyRegistrationSwitch(false);
            if (registrationRows.some((item) => !item.hidden)) {
              report("registratie-voordeel-blijft-staan", context);
            }
            applyRegistrationSwitch(true);
            if (registrationRows.some((item) => item.hidden)) {
              report("registratie-voordeel-komt-niet-terug", context);
            }
            applyRegistrationSwitch(handicapDefault());

            if (result.choice) {
              checkCard(resultContent.querySelector(".advice-card--credits"), result.choice.credits, { ...context, kaart: "credits" });
              checkCard(resultContent.querySelector(".advice-card--shortgolf"), result.choice.shortGolf, { ...context, kaart: "shortgolf" });
              continue;
            }

            const shown = resultContent.textContent;
            if (Number(result.best.uncoveredLargeRounds || 0) > 0 && !/buiten dit speelrecht/.test(shown)) {
              report("ongedekte-rondes-niet-gemeld", context);
            }
            // Dekt het advies de rondes niet, dan hoort dat in de tekst te staan.
            if (result.best.coversRounds === false && !/nieuw speelrecht aanschaffen/.test(shown)) {
              report("onvoldoende-dekking-niet-gemeld", context);
            }
            // Een route met meerdere aankopen tonen we niet. Is die route
            // goedkoper, dan hoort het kleinere speelrecht als tweede advies
            // eronder te staan, met de melding dat het de rondes niet dekt en
            // dat er daarna een nieuw speelrecht bij komt.
            if (/Voordeliger, in meerdere aankopen/.test(shown)) {
              report("voordeligere-route-alsnog-getoond", context);
            }
            if (result.best.cheaperRoute) {
              if (!result.alternative || !result.alternative.isSmallerOption) {
                report("kleiner-speelrecht-niet-als-tweede-advies", context);
              } else if (!/credits tekort/.test(shown)) {
                report("tekort-niet-benoemd", context);
              } else if (!/nieuw speelrecht aanschaffen/.test(shown)) {
                report("nieuw-speelrecht-niet-benoemd", context);
              }
            }
          }
        }
      }
    }
    return { cases, cardsChecked, errorCounts, errors };
  };

  window.runHgcGreenFeeAudit = function runHgcGreenFeeAudit() {
    const { candidatePlans, recommendationFor, renderResult, resultContent } = window.hgcCalculatorAudit;
    // Een ongebruikelijk bedrag, zodat een toevallige overeenkomst met een ander
    // bedrag in de uitvoer uitgesloten is.
    const testFee = 37.77;
    const shownFee = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2 }).format(testFee);
    const roundPairs = [[1, 20], [2, 30], [5, 40], [8, 60], [10, 60], [20, 60], [25, 28], [10, 10], [30, 30]];
    const largeCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.largeRate));
    const smallCourses = hgcConfig.courses.filter((course) => Number.isFinite(course.shortGolfRate));
    const errors = [];
    const errorCounts = {};
    let cases = 0;
    let greenFeePlans = 0;
    let shortGolfAdvised = 0;
    let configuredCourses = largeCourses.filter((course) => Number(course.greenFee) > 0).length;

    function report(code, context) {
      errorCounts[code] = (errorCounts[code] || 0) + 1;
      if (errors.length < 50) errors.push({ code, ...context });
    }

    for (const largeCourse of largeCourses) {
      for (const smallCourse of smallCourses) {
        for (const [largeRounds, smallRounds] of roundPairs) {
          const context = { largeRounds, smallRounds, largeCourse: largeCourse.id, smallCourse: smallCourse.id };
          const withFee = { ...largeCourse, greenFee: testFee };
          const input = { largeRounds, smallRounds, largeCourse: withFee, smallCourse, youth: false, canPlayOffPeak: false };
          cases += 1;

          let plans;
          let result;
          try {
            plans = candidatePlans(input);
            result = recommendationFor(input);
            renderResult(result);
          } catch (error) {
            report("exception", { ...context, message: error.message });
            continue;
          }

          const shortGolf = plans.find((plan) => plan.type === "shortgolf");
          const zone = window.hgcCalculatorAudit.playProfile(largeRounds, smallRounds).zone;
          if (zone !== "credits" && !shortGolf) {
            report("shortgolf-plan-ontbreekt", { ...context, zone });
            continue;
          }
          if (!shortGolf) continue;

          greenFeePlans += 1;
          if (Number(shortGolf.reducedGreenFeeRounds) !== largeRounds) {
            report("greenfee-rondes-niet-verwerkt", { ...context, rondes: shortGolf.reducedGreenFeeRounds });
          }
          if (Math.abs(Number(shortGolf.reducedGreenFeeTotal) - largeRounds * testFee) > 0.001) {
            report("greenfeetotaal-onjuist", { ...context, totaal: shortGolf.reducedGreenFeeTotal });
          }
          if (Math.abs(Number(shortGolf.selectionCost) - Number(shortGolf.annualCost) - largeRounds * testFee) > 0.001) {
            report("greenfee-weegt-niet-mee-in-keuze", context);
          }
          if (Number(shortGolf.reducedGreenFeeTotal) > 0 && Number(shortGolf.annualCost) !== Number(shortGolf.price) + Number(shortGolf.registrationPrice)) {
            report("greenfee-in-getoond-bedrag", context);
          }
          if (Math.abs(Number(shortGolf.annualCost) - Number(shortGolf.price) - Number(shortGolf.registrationPrice)) > 0.001) {
            report("jaarbedrag-telt-niet-op", context);
          }

          // Het tarief zelf mag nergens in de uitvoer staan, en de kosten per
          // ronde op de grote baan mogen het niet verraden.
          const shown = resultContent.textContent;
          if (shown.includes(shownFee)) {
            report("greenfeetarief-zichtbaar", { ...context, tarief: shownFee });
          }
          if (result.best.type === "shortgolf") {
            shortGolfAdvised += 1;
            const labels = [...resultContent.querySelectorAll(".choice-costs article p")].map((node) => node.textContent);
            if (labels.includes("Grote baan")) {
              report("kosten-per-ronde-grote-baan-getoond", context);
            }
            if (!/gereduceerde greenfeetarief/.test(shown)) {
              report("gereduceerd-tarief-niet-benoemd", context);
            }
            if (/buiten dit speelrecht/.test(shown)) {
              report("rondes-onterecht-als-ongedekt-gemeld", context);
            }
          }
        }
      }
    }
    let realCases = 0;
    let realGreenFeePlans = 0;
    for (const largeCourse of largeCourses.filter((course) => Number(course.greenFee) > 0)) {
      for (const smallCourse of smallCourses) {
        for (const [largeRounds, smallRounds] of roundPairs) {
          const context = { largeRounds, smallRounds, largeCourse: largeCourse.id, smallCourse: smallCourse.id, tarief: largeCourse.greenFee };
          realCases += 1;
          let result;
          try {
            result = recommendationFor({ largeRounds, smallRounds, largeCourse, smallCourse, youth: false, canPlayOffPeak: false });
            renderResult(result);
          } catch (error) {
            report("echte-tarieven-exception", { ...context, message: error.message });
            continue;
          }
          if (result.best.type !== "shortgolf") continue;
          realGreenFeePlans += 1;

          if (Number(result.best.reducedGreenFeeRounds) !== largeRounds) {
            report("echte-tarieven-rondes-niet-verwerkt", { ...context, rondes: result.best.reducedGreenFeeRounds });
          }
          if (Math.abs(Number(result.best.reducedGreenFeeTotal) - largeRounds * Number(largeCourse.greenFee)) > 0.001) {
            report("echte-tarieven-greenfeetotaal-onjuist", context);
          }
          if (Math.abs(Number(result.best.annualCost) - Number(result.best.price) - Number(result.best.registrationPrice)) > 0.001) {
            report("echte-tarieven-greenfee-in-bedrag", context);
          }
          const labels = [...resultContent.querySelectorAll(".choice-costs article p")].map((node) => node.textContent);
          if (labels.includes("Grote baan")) {
            report("echte-tarieven-kosten-grote-baan-getoond", context);
          }
          const shown = resultContent.textContent;
          if (!/gereduceerde greenfeetarief/.test(shown)) {
            report("echte-tarieven-tarief-niet-benoemd", context);
          }
          if (/buiten dit speelrecht/.test(shown)) {
            report("echte-tarieven-onterecht-ongedekt", context);
          }
        }
      }
    }

    return { cases, realCases, configuredCourses, greenFeePlans, realGreenFeePlans, shortGolfAdvised, errorCounts, errors };
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
