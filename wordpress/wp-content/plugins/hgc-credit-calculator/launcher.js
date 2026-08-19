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
  const start = launcher.querySelector("#hgc-calculator-start");
  const panels = [...launcher.querySelectorAll("[data-mode-panel]")];

  function showDesignPicker() {
    panels.forEach((panel) => { panel.hidden = true; });
    start.hidden = true;
    picker.hidden = false;
    picker.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "calculator_design_selection_viewed" });
  }

  function showLauncher() {
    panels.forEach((panel) => { panel.hidden = true; });
    picker.hidden = true;
    start.hidden = false;
    start.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "calculator_mode_selection_viewed" });
  }

  launcher.querySelectorAll("[data-design-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const design = applyDesign(launcher, button.dataset.designChoice);
      launcher.querySelectorAll("[data-design-choice]").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
      showLauncher();
      window.dataLayer.push({ event: "calculator_design_selected", calculator_design: design });
    });
  });

  launcher.querySelectorAll("[data-launch-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.launchMode;
      start.hidden = true;
      panels.forEach((panel) => { panel.hidden = panel.dataset.modePanel !== mode; });
      const activePanel = panels.find((panel) => !panel.hidden);
      activePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "calculator_mode_selected", calculator_mode: mode });
    });
  });

  launcher.querySelectorAll("[data-launch-href]").forEach((button) => {
    button.addEventListener("click", () => {
      const destination = new URL(button.dataset.launchHref, window.location.href);
      destination.searchParams.set("design", launcher.dataset.design || "clubhouse");
      window.location.href = destination.href;
    });
  });

  launcher.querySelectorAll("[data-back-to-launcher]").forEach((button) => button.addEventListener("click", showLauncher));
  launcher.querySelectorAll("[data-back-to-designs]").forEach((button) => button.addEventListener("click", showDesignPicker));

  const requestedDesign = new URLSearchParams(window.location.search).get("design");
  if (allowedDesigns.includes(requestedDesign)) {
    applyDesign(launcher, requestedDesign);
    showLauncher();
  }
})();
