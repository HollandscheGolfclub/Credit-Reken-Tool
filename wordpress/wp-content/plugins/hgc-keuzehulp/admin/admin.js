(() => {
  let rowIndex = Date.now();
  const nextIndex = () => String(rowIndex++);
  const courseList = document.querySelector("#hgc-course-list");
  const courseSearch = document.querySelector("#hgc-course-search");
  const courseTypeFilter = document.querySelector("#hgc-course-type-filter");
  const courseCaveatFilter = document.querySelector("#hgc-course-caveat-filter");
  const courseCount = document.querySelector("#hgc-course-count");

  function fieldValue(card, suffix) {
    return card.querySelector(`[name$="[${suffix}]"]`)?.value.trim() || "";
  }

  function courseTypes(card) {
    return {
      large: fieldValue(card, "largeRate") !== "",
      small: fieldValue(card, "shortRate") !== "",
    };
  }

  function updateCourseSummary(card) {
    const location = fieldValue(card, "location");
    const types = courseTypes(card);
    const labels = [];
    if (location) labels.push(location);
    if (types.large) labels.push("Grote baan");
    if (types.small) labels.push("Kleine baan");
    if (fieldValue(card, "caveat")) labels.push("Met melding");
    const summary = card.querySelector(".hgc-course-summary");
    if (summary) summary.textContent = labels.join(" · ") || "Nog niet ingevuld";
  }

  function setCourseOpen(card, open) {
    const toggle = card.querySelector("[data-toggle-course]");
    const body = card.querySelector(".hgc-course-card__body");
    if (!toggle || !body) return;
    toggle.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
    card.classList.toggle("is-open", open);
  }

  function filterCourses() {
    if (!courseList) return;
    const query = (courseSearch?.value || "").trim().toLocaleLowerCase("nl");
    const typeFilter = courseTypeFilter?.value || "all";
    const caveatFilter = courseCaveatFilter?.value || "all";
    const cards = [...courseList.querySelectorAll(".hgc-course-card")];
    let visible = 0;

    cards.forEach((card) => {
      updateCourseSummary(card);
      const searchable = [fieldValue(card, "name"), fieldValue(card, "location"), fieldValue(card, "id")]
        .join(" ")
        .toLocaleLowerCase("nl");
      const types = courseTypes(card);
      const typeMatches = typeFilter === "all"
        || (typeFilter === "both" ? types.large && types.small : types[typeFilter]);
      const hasCaveat = fieldValue(card, "caveat") !== "";
      const caveatMatches = caveatFilter === "all"
        || (caveatFilter === "with" ? hasCaveat : !hasCaveat);
      const matches = searchable.includes(query) && typeMatches && caveatMatches;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    if (courseCount) {
      courseCount.textContent = visible === cards.length
        ? `${cards.length} ${cards.length === 1 ? "baan" : "banen"}`
        : `${visible} van ${cards.length} banen zichtbaar`;
    }
    courseList.classList.toggle("has-no-results", visible === 0);
  }

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
        if (courseSearch) courseSearch.value = "";
        if (courseTypeFilter) courseTypeFilter.value = "all";
        if (courseCaveatFilter) courseCaveatFilter.value = "all";
        list.insertAdjacentHTML("beforeend", template.innerHTML.split("__INDEX__").join(nextIndex()));
        const card = list.lastElementChild;
        if (card) {
          setCourseOpen(card, true);
          filterCourses();
          card.scrollIntoView({ behavior: "smooth", block: "start" });
          card.querySelector('input[name$="[name]"]')?.focus({ preventScroll: true });
        }
      }
      return;
    }

    const toggleCourse = event.target.closest("[data-toggle-course]");
    if (toggleCourse) {
      const card = toggleCourse.closest(".hgc-course-card");
      if (card) setCourseOpen(card, toggleCourse.getAttribute("aria-expanded") !== "true");
      return;
    }

    if (event.target.closest("[data-expand-courses]")) {
      courseList?.querySelectorAll(".hgc-course-card:not([hidden])").forEach((card) => setCourseOpen(card, true));
      return;
    }

    if (event.target.closest("[data-collapse-courses]")) {
      courseList?.querySelectorAll(".hgc-course-card:not([hidden])").forEach((card) => setCourseOpen(card, false));
      return;
    }

    const removeCourse = event.target.closest("[data-remove-course]");
    if (removeCourse && window.confirm("Weet je zeker dat je deze baan wilt verwijderen?")) {
      removeCourse.closest(".hgc-course-card")?.remove();
      filterCourses();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target === courseSearch) {
      filterCourses();
      return;
    }
    const card = event.target.closest(".hgc-course-card");
    if (!card) return;
    if (event.target.matches('input[name$="[name]"]')) {
      const heading = card.querySelector(".hgc-course-card__title strong");
      if (heading) heading.textContent = event.target.value || "Nieuwe baan";
    }
    updateCourseSummary(card);
  });

  courseTypeFilter?.addEventListener("change", filterCourses);
  courseCaveatFilter?.addEventListener("change", filterCourses);
  courseSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && courseSearch.value) {
      courseSearch.value = "";
      filterCourses();
    }
  });

  courseList?.querySelectorAll(".hgc-course-card").forEach((card) => setCourseOpen(card, false));
  filterCourses();
})();
