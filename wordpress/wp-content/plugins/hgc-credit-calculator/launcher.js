(() => {
  const launcher = document.querySelector('[data-calculator-mode="launcher"]');
  if (!launcher) return;

  const start = launcher.querySelector("#hgc-calculator-start");
  const panels = [...launcher.querySelectorAll("[data-mode-panel]")];

  function showLauncher() {
    panels.forEach((panel) => { panel.hidden = true; });
    start.hidden = false;
    start.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "calculator_mode_selection_viewed" });
  }

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
    button.addEventListener("click", () => { window.location.href = button.dataset.launchHref; });
  });

  launcher.querySelectorAll("[data-back-to-launcher]").forEach((button) => button.addEventListener("click", showLauncher));
})();
