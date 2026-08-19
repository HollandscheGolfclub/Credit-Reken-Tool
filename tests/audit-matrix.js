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
    if (best.type === "shortgolf" && context.largeRounds !== 0) {
      report("shortgolf-with-large-rounds", context);
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
                  if (plan.type === "shortgolf" && largeRounds !== 0) report("shortgolf-with-large-rounds", context);
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
