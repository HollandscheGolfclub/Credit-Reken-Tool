(() => {
  let rowIndex = Date.now();
  const nextIndex = () => String(rowIndex++);
  const courseList = document.querySelector("#hgc-course-list");
  const courseSearch = document.querySelector("#hgc-course-search");
  const courseTypeFilter = document.querySelector("#hgc-course-type-filter");
  const courseCaveatFilter = document.querySelector("#hgc-course-caveat-filter");
  const courseCount = document.querySelector("#hgc-course-count");
  const restaurantSection = document.querySelector("[data-hgc-restaurant-section]");
  const restaurantList = restaurantSection?.querySelector("[data-hgc-restaurant-list]");
  const restaurantSearch = restaurantSection?.querySelector("[data-hgc-restaurant-search]");
  const restaurantCount = restaurantSection?.querySelector("[data-hgc-restaurant-count]");
  const restaurantDefault = restaurantSection?.querySelector("[data-hgc-restaurant-default]");
  const restaurantAdd = restaurantSection?.querySelector("[data-hgc-add-restaurant]");
  let restaurantIndex = restaurantList?.children.length || 0;

  function formatCredits(value) {
    return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(value);
  }

  function updatePackageSummary(panel) {
    if (!panel) return;
    const rows = [...panel.querySelectorAll(".hgc-package-table tbody tr")];
    const credits = rows
      .map((row) => Number(row.querySelector('input[name$="[credits]"]')?.value))
      .filter((value) => Number.isFinite(value) && value > 0);
    const count = rows.length;
    const label = `${count} ${count === 1 ? "pakket" : "pakketten"}`;
    const range = credits.length
      ? `${formatCredits(Math.min(...credits))}${Math.min(...credits) === Math.max(...credits) ? "" : `–${formatCredits(Math.max(...credits))}`} credits`
      : "";
    const summary = panel.querySelector("[data-package-summary]");
    if (summary) summary.textContent = [label, range].filter(Boolean).join(" · ");
    const empty = panel.querySelector("[data-package-empty]");
    if (empty) empty.hidden = count > 0;
  }

  function setPackagePanelOpen(panel, open) {
    if (!panel) return;
    const toggle = panel.querySelector("[data-toggle-packages]");
    const content = panel.querySelector(".hgc-package-panel__content");
    if (!toggle || !content) return;
    toggle.setAttribute("aria-expanded", String(open));
    content.hidden = !open;
    panel.classList.toggle("is-open", open);
  }

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

  function normaliseSlug(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function setRestaurantOpen(row, open) {
    const toggle = row?.querySelector("[data-hgc-toggle-restaurant]");
    const body = row?.querySelector(".hgc-course-card__body");
    if (!toggle || !body) return;
    toggle.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
    row.classList.toggle("is-open", open);
  }

  function syncRestaurants() {
    if (!restaurantList) return;
    const rows = [...restaurantList.querySelectorAll("[data-hgc-restaurant-row]")];
    const query = (restaurantSearch?.value || "").trim().toLocaleLowerCase("nl");
    const selectedDefault = restaurantDefault?.value || "";
    const slugGroups = new Map();
    let visible = 0;

    rows.forEach((row) => {
      const slugInput = row.querySelector("[data-hgc-location-slug]");
      const nameInput = row.querySelector("[data-hgc-location-name]");
      const addressInput = row.querySelector('input[name$="[address]"]');
      const slug = slugInput?.value.trim() || "";
      const name = nameInput?.value.trim() || "";
      const address = addressInput?.value.trim() || "";
      const title = row.querySelector("[data-hgc-location-title]");
      const summary = row.querySelector("[data-hgc-location-summary]");
      if (title) title.textContent = name || slug || "Nieuw restaurant";
      if (summary) summary.textContent = [slug, address].filter(Boolean).join(" · ") || "Nog niet ingevuld";
      if (slugInput) slugInput.setCustomValidity("");
      const normalised = normaliseSlug(slug);
      if (normalised) slugGroups.set(normalised, [...(slugGroups.get(normalised) || []), slugInput]);
      const matches = [name, slug, address].join(" ").toLocaleLowerCase("nl").includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    slugGroups.forEach((inputs) => {
      if (inputs.length < 2) return;
      inputs.forEach((input) => input?.setCustomValidity("Deze parkcode komt meerdere keren voor. Kies voor iedere locatie een unieke code."));
    });

    if (restaurantDefault) {
      restaurantDefault.replaceChildren(new Option("Eerste restaurant in de lijst", ""));
      rows.forEach((row) => {
        const slug = row.querySelector("[data-hgc-location-slug]")?.value.trim() || "";
        const name = row.querySelector("[data-hgc-location-name]")?.value.trim() || slug;
        if (slug) restaurantDefault.add(new Option(`${name} (${slug})`, slug));
      });
      restaurantDefault.value = [...restaurantDefault.options].some((option) => option.value === selectedDefault) ? selectedDefault : "";
    }

    if (restaurantAdd) restaurantAdd.disabled = false;
    if (restaurantCount) {
      restaurantCount.textContent = query
        ? `${visible} zichtbaar · ${rows.length} locaties ingesteld`
        : `${rows.length} locaties ingesteld`;
    }
    restaurantList.classList.toggle("has-no-results", visible === 0);
  }

  document.addEventListener("click", (event) => {
    const addPackage = event.target.closest("[data-add-package]");
    if (addPackage) {
      const key = addPackage.dataset.addPackage;
      const template = document.querySelector(`#hgc-package-template-${key}`);
      const body = document.querySelector(`#hgc-packages-${key} tbody`);
      if (template && body) {
        body.insertAdjacentHTML("beforeend", template.innerHTML.split("__INDEX__").join(nextIndex()));
        const panel = addPackage.closest("[data-package-panel]");
        setPackagePanelOpen(panel, true);
        updatePackageSummary(panel);
        const row = body.lastElementChild;
        row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        row?.querySelector('input[name$="[name]"]')?.focus({ preventScroll: true });
      }
      return;
    }

    const removeRow = event.target.closest("[data-remove-row]");
    if (removeRow) {
      const row = removeRow.closest("tr");
      const name = row?.querySelector('input[name$="[name]"]')?.value.trim();
      const message = name
        ? `Weet je zeker dat je pakket “${name}” wilt verwijderen?`
        : "Weet je zeker dat je dit pakket wilt verwijderen?";
      if (window.confirm(message)) {
        const panel = removeRow.closest("[data-package-panel]");
        row?.remove();
        updatePackageSummary(panel);
      }
      return;
    }

    const togglePackages = event.target.closest("[data-toggle-packages]");
    if (togglePackages) {
      const panel = togglePackages.closest("[data-package-panel]");
      setPackagePanelOpen(panel, togglePackages.getAttribute("aria-expanded") !== "true");
      return;
    }

    const addRestaurant = event.target.closest("[data-hgc-add-restaurant]");
    if (addRestaurant) {
      const template = restaurantSection?.querySelector("[data-hgc-restaurant-template]");
      if (template && restaurantList) {
        if (restaurantSearch) restaurantSearch.value = "";
        restaurantList.insertAdjacentHTML("beforeend", template.innerHTML.replace(/__INDEX__/g, String(restaurantIndex++)));
        const row = restaurantList.lastElementChild;
        setRestaurantOpen(row, true);
        syncRestaurants();
        row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        row?.querySelector("[data-hgc-location-slug]")?.focus({ preventScroll: true });
      }
      return;
    }

    const toggleRestaurant = event.target.closest("[data-hgc-toggle-restaurant]");
    if (toggleRestaurant) {
      const row = toggleRestaurant.closest("[data-hgc-restaurant-row]");
      setRestaurantOpen(row, toggleRestaurant.getAttribute("aria-expanded") !== "true");
      return;
    }

    if (event.target.closest("[data-hgc-expand-restaurants]")) {
      restaurantList?.querySelectorAll("[data-hgc-restaurant-row]:not([hidden])").forEach((row) => setRestaurantOpen(row, true));
      return;
    }

    if (event.target.closest("[data-hgc-collapse-restaurants]")) {
      restaurantList?.querySelectorAll("[data-hgc-restaurant-row]:not([hidden])").forEach((row) => setRestaurantOpen(row, false));
      return;
    }

    const removeRestaurant = event.target.closest("[data-hgc-remove-restaurant]");
    if (removeRestaurant) {
      const row = removeRestaurant.closest("[data-hgc-restaurant-row]");
      const name = row?.querySelector("[data-hgc-location-name]")?.value.trim();
      if (window.confirm(`Weet je zeker dat je ${name ? `“${name}”` : "deze restaurantlocatie"} wilt verwijderen?`)) {
        row?.remove();
        syncRestaurants();
      }
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
    if (event.target === restaurantSearch || event.target.closest("[data-hgc-restaurant-row]")) {
      syncRestaurants();
      return;
    }
    const packagePanel = event.target.closest("[data-package-panel]");
    if (packagePanel) {
      updatePackageSummary(packagePanel);
      return;
    }
    if (event.target === courseSearch) {
      filterCourses();
      return;
    }
    const card = event.target.closest("#hgc-course-list .hgc-course-card");
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
  restaurantSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && restaurantSearch.value) {
      restaurantSearch.value = "";
      syncRestaurants();
    }
  });
  restaurantSection?.querySelector("form")?.addEventListener("invalid", (event) => {
    const row = event.target.closest("[data-hgc-restaurant-row]");
    if (row) {
      if (restaurantSearch) restaurantSearch.value = "";
      row.hidden = false;
      setRestaurantOpen(row, true);
    }
  }, true);

  courseList?.querySelectorAll(".hgc-course-card").forEach((card) => setCourseOpen(card, false));
  document.querySelectorAll("[data-package-panel]").forEach((panel) => {
    setPackagePanelOpen(panel, false);
    updatePackageSummary(panel);
  });
  restaurantList?.querySelectorAll("[data-hgc-restaurant-row]").forEach((row) => setRestaurantOpen(row, false));
  syncRestaurants();
  filterCourses();
})();
