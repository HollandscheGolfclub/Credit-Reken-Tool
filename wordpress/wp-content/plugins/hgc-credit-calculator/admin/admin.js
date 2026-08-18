(() => {
  let rowIndex = Date.now();
  const nextIndex = () => String(rowIndex++);

  document.addEventListener("click", (event) => {
    const addPackage = event.target.closest("[data-add-package]");
    if (addPackage) {
      const key = addPackage.dataset.addPackage;
      const template = document.querySelector(`#hgc-package-template-${key}`);
      const body = document.querySelector(`#hgc-packages-${key} tbody`);
      if (template && body) body.insertAdjacentHTML("beforeend", template.innerHTML.split("__INDEX__").join(nextIndex()));
      return;
    }

    const removeRow = event.target.closest("[data-remove-row]");
    if (removeRow) {
      removeRow.closest("tr")?.remove();
      return;
    }

    const addCourse = event.target.closest("[data-add-course]");
    if (addCourse) {
      const template = document.querySelector("#hgc-course-template");
      const list = document.querySelector("#hgc-course-list");
      if (template && list) {
        list.insertAdjacentHTML("beforeend", template.innerHTML.split("__INDEX__").join(nextIndex()));
        list.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const removeCourse = event.target.closest("[data-remove-course]");
    if (removeCourse && window.confirm("Weet je zeker dat je deze baan wilt verwijderen?")) {
      removeCourse.closest(".hgc-course-card")?.remove();
    }
  });

  document.addEventListener("input", (event) => {
    if (!event.target.matches('input[name$="[name]"]')) return;
    const card = event.target.closest(".hgc-course-card");
    const heading = card?.querySelector("h3");
    if (heading) heading.textContent = event.target.value || "Nieuwe baan";
  });
})();
