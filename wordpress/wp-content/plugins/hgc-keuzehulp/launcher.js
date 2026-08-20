(() => {
  const launcher = document.querySelector('[data-calculator-mode="launcher"]');
  const allowedDesigns = ["clubhouse", "fairway", "scorecard", "night", "energy"];

  function applyDesign(root, design) {
    const selected = allowedDesigns.includes(design) ? design : "clubhouse";
    root.dataset.design = selected;
    root.querySelectorAll(".hgc-calculator").forEach((calculator) => { calculator.dataset.design = selected; });
    return selected;
  }

  if (!launcher) {
    const requestedDesign = new URLSearchParams(window.location.search).get("design");
    if (allowedDesigns.includes(requestedDesign)) {
      document.querySelectorAll(".hgc-calculator").forEach((calculator) => { calculator.dataset.design = requestedDesign; });
    }
    return;
  }

  const picker = launcher.querySelector("#hgc-design-picker");
  const choicePanel = launcher.querySelector('[data-mode-panel="choice"]');

  function showDesignPicker() {
    choicePanel.hidden = true;
    picker.hidden = false;
    picker.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "calculator_design_selection_viewed" });
  }

  function showChoice(design) {
    const selected = applyDesign(launcher, design);
    picker.hidden = true;
    choicePanel.hidden = false;
    choicePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "calculator_design_selected",
      calculator_design: selected,
      calculator_mode: "choice",
    });
  }

  launcher.querySelectorAll("[data-design-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      launcher.querySelectorAll("[data-design-choice]").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
      showChoice(button.dataset.designChoice);
    });
  });

  launcher.querySelectorAll("[data-back-to-designs]").forEach((button) => button.addEventListener("click", showDesignPicker));

  const requestedDesign = new URLSearchParams(window.location.search).get("design");
  if (allowedDesigns.includes(requestedDesign)) showChoice(requestedDesign);
})();
