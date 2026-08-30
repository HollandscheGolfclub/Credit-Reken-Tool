(function () {
  'use strict';
  var globalCfg = window.HGCRestaurant || {};
  var labels = {
    SLOT_UNAVAILABLE: 'Dit tijdstip/deze zitting is zojuist volgeboekt. Kies een andere optie.',
    LOCATION_CLOSED: 'Het restaurant is op dit moment gesloten.',
    EVENT_CLOSED: 'Aanmelden is op dit moment gesloten.',
    PARTY_TOO_LARGE: 'Voor deze groepsgrootte kun je het beste rechtstreeks contact opnemen.',
    RATE_LIMITED: 'Je hebt te veel aanvragen gedaan. Probeer het over een minuut opnieuw.',
    TOO_SOON: 'Dit tijdstip kan niet meer online worden gekozen.',
    MISSING_FIELD: 'Vul alle verplichte velden in.',
  };
  function esc(value) { var node = document.createElement('span'); node.textContent = String(value == null ? '' : value); return node.innerHTML; }
  function api(payload, cfg) {
    return fetch(cfg.ajaxUrl + '?action=hgc_restaurant_api&nonce=' + encodeURIComponent(cfg.nonce), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) { return res.json().then(function (json) { if (!res.ok || !json.success) { var data = json.data || {}; var error = new Error(labels[data.code] || data.message || 'Er ging iets mis.'); error.code = data.code; throw error; } return json.data; }); });
  }
  function field(label, name, type, required, extra) { return '<label class="hgc-field"><span>' + label + (required ? ' *' : '') + '</span><input name="' + name + '" type="' + type + '" ' + (required ? 'required ' : '') + (extra || '') + '></label>'; }
  function announce(root, message, error) { var status = root.querySelector('.hgc-status'); if (!status) return; status.textContent = message; status.className = 'hgc-status ' + (error ? 'is-error' : 'is-success'); status.focus(); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoDate(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
  // De laadtekst blijft zichtbaar totdat er echt iets te tonen is; anders
  // staat de pagina leeg zodra de koppeling traag antwoordt (bijv. een koude
  // start van de Connect-functie kan een aantal seconden duren).
  function reveal(root) {
    var loading = root.querySelector('.hgc-reservation__loading');
    if (loading) loading.hidden = true;
    root.querySelector('.hgc-reservation__app').hidden = false;
  }
  // Redelijke standaardwaarden zodat het formulier meteen bruikbaar is, in
  // plaats van te wachten tot de Connect-koppeling antwoord geeft (die bij een
  // koude start enkele seconden kan duren). De echte naam en grenzen komen op
  // de achtergrond binnen en worden dan alsnog toegepast, zie applyInfo().
  function defaultInfo(cfg) {
    var max = new Date(); max.setDate(max.getDate() + 90);
    return { naam: cfg.name || 'Tafel reserveren', minDate: isoDate(new Date()), maxDate: isoDate(max), minGroepsgrootte: 1, maxGroepsgrootte: 12 };
  }
  function defaultEventInfo(cfg) {
    return { titel: cfg.name || 'Aanmelden', minAanmelding: 1, maxAanmelding: 12, zittingen: [] };
  }

  var DOW = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  var MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var DOW_FULL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var MONTH_FULL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  function nextDays(count) { var out = []; for (var i = 0; i < count; i++) { var d = new Date(); d.setDate(d.getDate() + i); out.push(d); } return out; }
  function formatDateLong(iso) { var p = iso.split('-'); var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); return DOW_FULL[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_FULL[d.getMonth()] + ' ' + p[0]; }
  function zittingLabel(z) {
    var d = new Date(z.datum + 'T' + z.tijd + ':00');
    var text = DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_SHORT[d.getMonth()] + ' · ' + z.tijd;
    return z.label ? text + ' — ' + z.label : text;
  }
  function logosHtml(cfg) {
    var parts = '';
    if (cfg.parkLogo) parts += '<img class="hgc-logo hgc-logo--park" src="' + esc(cfg.parkLogo) + '" alt="">';
    if (cfg.clubLogo) parts += '<img class="hgc-logo hgc-logo--club" src="' + esc(cfg.clubLogo) + '" alt="">';
    return parts;
  }
  function stepHeadHtml(num, title, variant) {
    return '<div class="hgc-step-head' + (variant === 'upcoming' ? ' hgc-step-head--upcoming' : '') + '"><span class="hgc-step-num hgc-step-num--' + variant + '">' + num + '</span><h3>' + esc(title) + '</h3></div>';
  }
  function confirmationHtml(mode, r) {
    var verb = mode === 'event' ? 'Je bent aangemeld' : 'Je tafel is gereserveerd';
    return '<div class="hgc-card hgc-confirm"><div class="hgc-checkmark">✓</div><h2>' + esc(verb) + '</h2><p>Een bevestiging is verstuurd naar <strong>' + esc(r.email) + '</strong>.</p><dl><dt>Referentie</dt><dd>' + esc(r.reserveringsnummer) + '</dd><dt>Aantal personen</dt><dd>' + r.aantalPersonen + '</dd></dl></div>';
  }

  /* ── formulierbuilder: extra vragen die de admin in Connect heeft samengesteld,
     naast de vaste naam/e-mail/telefoon/dieetwensen/gelegenheid-velden hieronder ── */
  function dynField(veld) {
    var req = veld.verplicht ? ' *' : ''; var id = 'hgc-field-' + veld.id; var reqAttr = veld.verplicht ? 'required' : '';
    if (veld.type === 'meerdereRegels') return '<label class="hgc-field"><span>' + esc(veld.label) + req + '</span><textarea id="' + id + '" rows="3" ' + reqAttr + '></textarea></label>';
    if (veld.type === 'keuzelijst') return '<label class="hgc-field"><span>' + esc(veld.label) + req + '</span><select id="' + id + '" ' + reqAttr + '><option value="">Kies…</option>' + (veld.opties || []).map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select></label>';
    if (veld.type === 'aankruisvakje') return '<label class="hgc-consent"><input id="' + id + '" type="checkbox" ' + reqAttr + '> ' + esc(veld.label) + '</label>';
    if (veld.type === 'getal') return '<label class="hgc-field"><span>' + esc(veld.label) + req + '</span><input id="' + id + '" type="number" ' + reqAttr + '></label>';
    return '<label class="hgc-field"><span>' + esc(veld.label) + req + '</span><input id="' + id + '" type="text" ' + reqAttr + '></label>';
  }
  function customFields(formVelden) { return (formVelden || []).filter(function (v) { return v.bron !== 'systeem'; }); }
  function renderDynFields(formVelden) { return customFields(formVelden).map(dynField).join(''); }
  function readDynFields(container, formVelden) {
    var antwoorden = {};
    customFields(formVelden).forEach(function (veld) {
      var el = container.querySelector('#hgc-field-' + veld.id); if (!el) return;
      antwoorden[veld.id] = veld.type === 'aankruisvakje' ? (el.checked ? 'true' : '') : el.value;
    });
    return antwoorden;
  }
  function fillCustomFields(container, formVelden, extraAntwoorden) {
    customFields(formVelden).forEach(function (veld) {
      var el = container.querySelector('#hgc-field-' + veld.id); if (!el) return;
      var raw = (extraAntwoorden || {})[veld.id] || '';
      if (veld.type === 'aankruisvakje') el.checked = raw === 'true' || raw === true; else el.value = raw;
    });
  }

  function detailsFieldsEl(cfg, formVelden) {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="hgc-grid">' + field('Naam', 'name', 'text', true, 'autocomplete="name"') + field('E-mailadres', 'email', 'email', true, 'autocomplete="email"') + field('Telefoonnummer', 'telefoon', 'tel', false, 'autocomplete="tel"') + field('Gelegenheid', 'gelegenheid', 'text', false, '') + '</div>' +
      '<label class="hgc-field"><span>Dieetwensen of allergieën</span><textarea name="dieetwensen" rows="3"></textarea></label>' +
      renderDynFields(formVelden) +
      '<label class="hgc-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>' +
      '<label class="hgc-consent"><input name="privacyAccepted" type="checkbox" required> Ik ga akkoord met de <a href="' + esc(cfg.privacyUrl || '#') + '" target="_blank" rel="noopener">privacyverklaring</a>.</label>';
    return wrap;
  }

  /**
   * Boekingswizard: stap 1 (dag + aantal personen) en stap 2 (tijd) staan
   * allebei meteen open en werken samen (tijden worden automatisch
   * opgehaald zodra dag of aantal personen wijzigt); stap 3 (gegevens)
   * klapt pas open zodra een tijd is gekozen. Dezelfde stapinhoud wordt
   * hergebruikt voor zowel de ingebouwde desktopwizard als de mobiele
   * sheet, zodat er maar één plek is waar de boekingslogica leeft.
   */
  function initWizard(root, park, cfg) {
    var app = root.querySelector('.hgc-reservation__app');
    var mq = window.matchMedia('(min-width: 760px)');
    var currentOverlay = null;
    var state = { info: defaultInfo(cfg), date: null, party: 2, slots: null, slotsForKey: null, slotsLoading: false, slotsError: null, time: null };
    state.date = state.info.minDate;

    function clampParty() {
      var min = state.info.minGroepsgrootte || 1, max = state.info.maxGroepsgrootte || 12;
      var before = state.party;
      if (state.party < min) state.party = min;
      if (state.party > max) state.party = max;
      return state.party !== before;
    }
    clampParty();

    function slotsKey() { return state.date + '|' + state.party; }
    function ensureSlots() {
      var key = slotsKey();
      if (state.slotsForKey === key) return;
      state.slots = null; state.slotsError = null; state.slotsLoading = true; state.time = null;
      render();
      api({ action: 'availability', slug: park, date: state.date, partySize: state.party }, cfg).then(function (data) {
        if (slotsKey() !== key) return;
        state.slots = data.slots || []; state.slotsForKey = key; state.slotsLoading = false;
        render();
      }).catch(function (error) {
        if (slotsKey() !== key) return;
        state.slots = []; state.slotsForKey = key; state.slotsLoading = false; state.slotsError = error.message;
        render();
      });
    }
    function onDateChange(iso) { if (state.date === iso) return; state.date = iso; ensureSlots(); }
    function onPartyChange(delta) {
      var min = state.info.minGroepsgrootte || 1, max = state.info.maxGroepsgrootte || 12;
      var next = state.party + delta;
      if (next < min || next > max) return;
      state.party = next; ensureSlots();
    }
    function onTimeChange(time) { state.time = time; render(); }

    function buildDayStrip() {
      var wrap = document.createElement('div'); wrap.className = 'hgc-day-strip';
      nextDays(6).forEach(function (date) {
        var iso = isoDate(date);
        var btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'hgc-day-pill' + (state.date === iso ? ' is-selected' : '');
        btn.innerHTML = '<span class="hgc-day-dow">' + DOW[date.getDay()] + '</span><span class="hgc-day-num">' + date.getDate() + '</span><span class="hgc-day-note">' + MONTH_SHORT[date.getMonth()] + '</span>';
        btn.addEventListener('click', function () { onDateChange(iso); });
        wrap.appendChild(btn);
      });
      return wrap;
    }
    function buildPartyStepper() {
      var min = state.info.minGroepsgrootte || 1, max = state.info.maxGroepsgrootte || 12;
      var wrap = document.createElement('div'); wrap.className = 'hgc-party-row';
      wrap.insertAdjacentHTML('beforeend', '<span class="hgc-party-label">Aantal personen</span>');
      var stepper = document.createElement('span'); stepper.className = 'hgc-stepper';
      var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.disabled = state.party <= min;
      var val = document.createElement('span'); val.className = 'hgc-stepper-value'; val.textContent = state.party;
      var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.disabled = state.party >= max;
      minus.addEventListener('click', function () { onPartyChange(-1); });
      plus.addEventListener('click', function () { onPartyChange(1); });
      stepper.appendChild(minus); stepper.appendChild(val); stepper.appendChild(plus);
      wrap.appendChild(stepper);
      var hint = document.createElement('span'); hint.className = 'hgc-party-hint';
      hint.innerHTML = 'Meer dan ' + max + ' personen?' + (cfg.phone ? ' <a href="tel:' + esc(cfg.phone.replace(/\s+/g, '')) + '">Bel ons</a>' : ' Neem contact op.');
      wrap.appendChild(hint);
      return wrap;
    }
    function buildTimeArea() {
      var wrap = document.createElement('div');
      if (state.slotsLoading) { wrap.innerHTML = '<p class="hgc-time-empty">Tijden laden…</p>'; return wrap; }
      if (state.slotsError) { wrap.innerHTML = '<p class="hgc-time-empty">' + esc(state.slotsError) + '</p>'; return wrap; }
      var slots = state.slots || [];
      if (!slots.length) { wrap.innerHTML = '<p class="hgc-time-empty">Geen tijden beschikbaar op deze dag. Kies een andere dag.</p>'; return wrap; }
      var lunch = slots.filter(function (s) { return s.time < '15:00'; });
      var dinner = slots.filter(function (s) { return s.time >= '15:00'; });
      function group(label, list) {
        if (!list.length) return;
        wrap.insertAdjacentHTML('beforeend', '<p class="hgc-time-group-label">' + esc(label) + '</p>');
        var row = document.createElement('div'); row.className = 'hgc-time-group';
        list.forEach(function (slot) {
          var btn = document.createElement('button'); btn.type = 'button';
          btn.className = 'hgc-slot' + (state.time === slot.time ? ' is-selected' : '');
          btn.textContent = slot.time;
          btn.addEventListener('click', function () { onTimeChange(slot.time); });
          row.appendChild(btn);
        });
        wrap.appendChild(row);
      }
      group('Lunch', lunch);
      group('Diner', dinner);
      return wrap;
    }
    function renderStepsInto(container) {
      container.innerHTML = '';
      container.insertAdjacentHTML('beforeend', stepHeadHtml(1, 'Wanneer en met hoeveel?', 'complete'));
      container.appendChild(buildDayStrip());
      container.appendChild(buildPartyStepper());
      container.insertAdjacentHTML('beforeend', stepHeadHtml(2, 'Kies je tijd', state.time ? 'complete' : 'active'));
      container.appendChild(buildTimeArea());
      if (state.time) {
        container.insertAdjacentHTML('beforeend', stepHeadHtml(3, 'Jouw gegevens', 'active'));
        container.appendChild(detailsFieldsEl(cfg, state.info.formVelden));
      } else {
        container.insertAdjacentHTML('beforeend', stepHeadHtml(3, 'Jouw gegevens', 'upcoming'));
        container.insertAdjacentHTML('beforeend', '<div class="hgc-step-placeholder">Openen zodra een tijd is gekozen.</div>');
      }
    }
    function summaryRowsHtml() {
      return '<div><div class="hgc-summary-key">Datum</div><div class="hgc-summary-val">' + esc(formatDateLong(state.date)) + '</div></div>' +
        '<div><div class="hgc-summary-key">Tijd</div><div class="hgc-summary-val">' + esc(state.time || 'nog te kiezen') + '</div></div>' +
        '<div><div class="hgc-summary-key">Gasten</div><div class="hgc-summary-val">' + state.party + ' persoon' + (state.party === 1 ? '' : 'en') + '</div></div>';
    }
    function footerHtml() {
      if (!cfg.phone && !cfg.address && !cfg.hoursNote) return '';
      var bits = []; if (cfg.address) bits.push(esc(cfg.address)); if (cfg.phone) bits.push(esc(cfg.phone));
      return '<div class="hgc-wizard-footer">' + (cfg.grasUrl ? '<img src="' + esc(cfg.grasUrl) + '" alt="">' : '') +
        '<div class="hgc-wizard-footer-text">' + bits.join(' · ') + (cfg.hoursNote ? '<br><span>' + esc(cfg.hoursNote) + '</span>' : '') + '</div></div>';
    }

    function wizardShellHtml() {
      var logos = logosHtml(cfg);
      return '<div class="hgc-wizard">' +
        (logos ? '<div class="hgc-wizard-logos">' + logos + '</div>' : '') +
        '<div class="hgc-wizard-hero"><div><p class="hgc-kicker">Tafel reserveren</p><h2></h2><p class="hgc-wizard-sub"></p></div><p class="hgc-wizard-step-badge"></p></div>' +
        '<div class="hgc-wizard-progress"><span></span></div>' +
        '<form class="hgc-wizard-form" novalidate><div class="hgc-wizard-body"><div class="hgc-wizard-main"></div>' +
        '<aside class="hgc-wizard-sidebar"><p class="hgc-summary-label">Jouw reservering</p><div class="hgc-summary-rows"></div><div class="hgc-summary-divider"></div>' +
        '<p class="hgc-summary-note">Je krijgt een bevestiging per e-mail met een link om te wijzigen of te annuleren.</p>' +
        '<button type="submit" class="hgc-button hgc-wizard-cta" disabled>Kies eerst een tijd</button></aside></div></form>' +
        footerHtml() +
        '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
    }
    function renderDesktop() {
      root.classList.add('is-wizard');
      if (!app.querySelector('.hgc-wizard')) {
        app.innerHTML = wizardShellHtml();
        reveal(root);
        app.querySelector('.hgc-wizard-form').addEventListener('submit', onSubmit);
      }
      var h2 = app.querySelector('.hgc-wizard-hero h2'); if (h2) h2.textContent = state.info.naam;
      var sub = app.querySelector('.hgc-wizard-sub');
      if (sub) sub.textContent = [cfg.address, cfg.hoursNote].filter(Boolean).join(' · ') || 'Kies een beschikbaar moment en vul je gegevens in.';
      var badge = app.querySelector('.hgc-wizard-step-badge');
      if (badge) badge.innerHTML = state.time ? 'Stap <span>3</span> van 3' : 'Stap <span>2</span> van 3';
      var progress = app.querySelector('.hgc-wizard-progress > span');
      if (progress) progress.style.width = state.time ? '100%' : '66%';
      renderStepsInto(app.querySelector('.hgc-wizard-main'));
      var rows = app.querySelector('.hgc-summary-rows'); if (rows) rows.innerHTML = summaryRowsHtml();
      var cta = app.querySelector('.hgc-wizard-cta');
      if (cta) { cta.disabled = !state.time; cta.textContent = state.time ? 'Reservering bevestigen' : 'Kies eerst een tijd'; }
    }

    function teaserHtml() {
      var logos = logosHtml(cfg);
      var rows = '';
      if (cfg.hoursNote) rows += '<div class="hgc-teaser-row"><span class="hgc-teaser-row-label">Openingstijden</span><span class="hgc-teaser-row-val">' + esc(cfg.hoursNote) + '</span></div>';
      if (cfg.phone) rows += '<div class="hgc-teaser-row"><span class="hgc-teaser-row-label">Telefoon</span><span class="hgc-teaser-row-val">' + esc(cfg.phone) + '</span></div>';
      return '<div class="hgc-teaser">' + (logos ? '<div class="hgc-wizard-logos">' + logos + '</div>' : '') +
        '<div class="hgc-teaser-body"><h2></h2>' + (cfg.address ? '<p>' + esc(cfg.address) + '</p>' : '') +
        (rows ? '<div class="hgc-teaser-rows">' + rows + '</div>' : '') +
        '<button type="button" class="hgc-button hgc-teaser-cta">Reserveer uw tafel</button>' +
        '<p class="hgc-teaser-note">Bevestiging per e-mail · wijzigen of annuleren via die e-mail.</p></div></div>';
    }
    function sheetHtml() {
      return '<div class="hgc-sheet"><div class="hgc-sheet-head"><span>Tafel reserveren</span><button type="button" class="hgc-sheet-close" aria-label="Sluiten">✕</button></div>' +
        '<div class="hgc-sheet-hero"><h2></h2><p>Kies een tijd en vul je gegevens in.</p></div>' +
        '<div class="hgc-sheet-progress"><span></span></div>' +
        '<form class="hgc-sheet-form" novalidate><div class="hgc-sheet-body"></div>' +
        '<div class="hgc-sheet-footer"><div class="hgc-sheet-footer-summary"></div><button type="submit" class="hgc-button" disabled>Kies eerst een tijd</button></div></form>' +
        '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
    }
    function openSheet() {
      var overlay = document.createElement('div'); overlay.className = 'hgc-overlay';
      overlay.innerHTML = sheetHtml();
      overlay.addEventListener('click', function (event) { if (event.target === overlay) closeSheet(overlay); });
      // Binnen root gehangen (niet document.body): zo erft de sheet de
      // kleuren en box-sizing van .hgc-reservation gewoon over. position:fixed
      // dekt nog steeds de hele viewport, ongeacht waar de widget in de
      // pagina staat.
      root.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      overlay.querySelector('.hgc-sheet-close').addEventListener('click', function () { closeSheet(overlay); });
      overlay.querySelector('.hgc-sheet-form').addEventListener('submit', onSubmit);
      currentOverlay = overlay;
      renderSheet();
    }
    function closeSheet(overlay) {
      document.body.style.overflow = '';
      overlay.remove();
      if (currentOverlay === overlay) currentOverlay = null;
    }
    function renderSheet() {
      if (!currentOverlay) return;
      var h2 = currentOverlay.querySelector('.hgc-sheet-hero h2'); if (h2) h2.textContent = state.info.naam;
      var progress = currentOverlay.querySelector('.hgc-sheet-progress > span'); if (progress) progress.style.width = state.time ? '100%' : '66%';
      renderStepsInto(currentOverlay.querySelector('.hgc-sheet-body'));
      var summary = currentOverlay.querySelector('.hgc-sheet-footer-summary');
      if (summary) summary.textContent = (state.time ? state.time + ' · ' : '') + state.party + ' perso' + (state.party === 1 ? 'on' : 'nen');
      var btn = currentOverlay.querySelector('.hgc-sheet-footer .hgc-button');
      if (btn) { btn.disabled = !state.time; btn.textContent = state.time ? 'Reservering bevestigen' : 'Kies eerst een tijd'; }
    }
    function renderTeaser() {
      root.classList.remove('is-wizard');
      if (!app.querySelector('.hgc-teaser')) {
        app.innerHTML = teaserHtml();
        reveal(root);
        app.querySelector('.hgc-teaser-cta').addEventListener('click', openSheet);
      }
      var h2 = app.querySelector('.hgc-teaser-body h2'); if (h2) h2.textContent = state.info.naam;
      renderSheet();
    }

    function onSubmit(event) {
      event.preventDefault();
      if (!state.time) return;
      var form = event.target;
      var container = form.closest('.hgc-wizard, .hgc-sheet');
      var btn = form.querySelector('[type="submit"]');
      var values = Object.fromEntries(new FormData(form).entries());
      values.action = 'createPublic'; values.slug = park; values.date = state.date; values.time = state.time; values.partySize = state.party;
      values.privacyAccepted = form.elements.privacyAccepted ? form.elements.privacyAccepted.checked : false;
      values.antwoorden = readDynFields(container, state.info.formVelden);
      if (btn) { btn.disabled = true; btn.textContent = 'Bezig met reserveren…'; }
      api(values, cfg).then(function (data) {
        if (container.classList.contains('hgc-sheet')) {
          container.innerHTML = confirmationHtml('restaurant', data.reservation);
        } else {
          root.classList.remove('is-wizard');
          app.innerHTML = confirmationHtml('restaurant', data.reservation);
        }
      }).catch(function (error) {
        if (btn) { btn.disabled = false; btn.textContent = 'Reservering bevestigen'; }
        announce(container, error.message, true);
      });
    }

    function render() { if (mq.matches) renderDesktop(); else renderTeaser(); }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', render);

    render();
    ensureSlots();

    return {
      applyInfo: function (info) {
        state.info = info;
        var changed = clampParty();
        render();
        if (changed) ensureSlots();
      }
    };
  }

  /**
   * Aanmeldwizard voor events (bv. een wildavond): in plaats van dag + tijd
   * kies je hier één vaste zitting uit een lijst die Connect aanlevert.
   * Dezelfde wizard-schil (desktop) en teaser+sheet-flow (mobiel) als bij
   * tafelreserveren, zodat beide vormen consistent aanvoelen.
   */
  function initEventWizard(root, slug, cfg) {
    var app = root.querySelector('.hgc-reservation__app');
    var mq = window.matchMedia('(min-width: 760px)');
    var currentOverlay = null;
    var state = { info: defaultEventInfo(cfg), zittingId: null, party: 2 };

    function clampParty() {
      var min = state.info.minAanmelding || 1, max = state.info.maxAanmelding || 12;
      var before = state.party;
      if (state.party < min) state.party = min;
      if (state.party > max) state.party = max;
      return state.party !== before;
    }
    clampParty();

    function beschikbareZittingen() { return (state.info.zittingen || []).filter(function (z) { return z.beschikbaar > 0; }); }
    function onZittingChange(id) { state.zittingId = id; render(); }
    function onPartyChange(delta) {
      var min = state.info.minAanmelding || 1, max = state.info.maxAanmelding || 12;
      var next = state.party + delta;
      if (next < min || next > max) return;
      state.party = next; render();
    }

    function buildSessionList() {
      var wrap = document.createElement('div'); wrap.className = 'hgc-session-list';
      var zittingen = beschikbareZittingen();
      if (!zittingen.length) { wrap.innerHTML = '<p class="hgc-time-empty">Er zijn helaas geen zittingen meer met plek beschikbaar.</p>'; return wrap; }
      zittingen.forEach(function (z) {
        var btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'hgc-session-option' + (state.zittingId === z.id ? ' is-selected' : '');
        btn.innerHTML = '<span class="hgc-session-option__label">' + esc(zittingLabel(z)) + '</span><span class="hgc-session-option__spots">' + z.beschikbaar + ' plekken vrij</span>';
        btn.addEventListener('click', function () { onZittingChange(z.id); });
        wrap.appendChild(btn);
      });
      return wrap;
    }
    function buildPartyStepper() {
      var min = state.info.minAanmelding || 1, max = state.info.maxAanmelding || 12;
      var wrap = document.createElement('div'); wrap.className = 'hgc-party-row';
      wrap.insertAdjacentHTML('beforeend', '<span class="hgc-party-label">Aantal personen</span>');
      var stepper = document.createElement('span'); stepper.className = 'hgc-stepper';
      var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.disabled = state.party <= min;
      var val = document.createElement('span'); val.className = 'hgc-stepper-value'; val.textContent = state.party;
      var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.disabled = state.party >= max;
      minus.addEventListener('click', function () { onPartyChange(-1); });
      plus.addEventListener('click', function () { onPartyChange(1); });
      stepper.appendChild(minus); stepper.appendChild(val); stepper.appendChild(plus);
      wrap.appendChild(stepper);
      return wrap;
    }
    function renderStepsInto(container) {
      container.innerHTML = '';
      container.insertAdjacentHTML('beforeend', stepHeadHtml(1, 'Kies een zitting', state.zittingId ? 'complete' : 'active'));
      container.appendChild(buildSessionList());
      container.insertAdjacentHTML('beforeend', stepHeadHtml(2, 'Aantal personen', 'complete'));
      container.appendChild(buildPartyStepper());
      if (state.zittingId) {
        container.insertAdjacentHTML('beforeend', stepHeadHtml(3, 'Jouw gegevens', 'active'));
        container.appendChild(detailsFieldsEl(cfg, state.info.formVelden));
      } else {
        container.insertAdjacentHTML('beforeend', stepHeadHtml(3, 'Jouw gegevens', 'upcoming'));
        container.insertAdjacentHTML('beforeend', '<div class="hgc-step-placeholder">Openen zodra een zitting is gekozen.</div>');
      }
    }
    function selectedZittingLabel() {
      var match = (state.info.zittingen || []).filter(function (item) { return item.id === state.zittingId; });
      return match.length ? zittingLabel(match[0]) : 'nog te kiezen';
    }
    function summaryRowsHtml() {
      return '<div><div class="hgc-summary-key">Zitting</div><div class="hgc-summary-val">' + esc(selectedZittingLabel()) + '</div></div>' +
        '<div><div class="hgc-summary-key">Gasten</div><div class="hgc-summary-val">' + state.party + ' persoon' + (state.party === 1 ? '' : 'en') + '</div></div>';
    }

    function wizardShellHtml() {
      var logos = logosHtml(cfg);
      return '<div class="hgc-wizard">' +
        (logos ? '<div class="hgc-wizard-logos">' + logos + '</div>' : '') +
        '<div class="hgc-wizard-hero"><div><p class="hgc-kicker">Aanmelden</p><h2></h2><p class="hgc-wizard-sub"></p></div><p class="hgc-wizard-step-badge"></p></div>' +
        '<div class="hgc-wizard-progress"><span></span></div>' +
        '<form class="hgc-wizard-form" novalidate><div class="hgc-wizard-body"><div class="hgc-wizard-main"></div>' +
        '<aside class="hgc-wizard-sidebar"><p class="hgc-summary-label">Jouw aanmelding</p><div class="hgc-summary-rows"></div><div class="hgc-summary-divider"></div>' +
        '<p class="hgc-summary-note">Je krijgt een bevestiging per e-mail met een link om te wijzigen of te annuleren.</p>' +
        '<button type="submit" class="hgc-button hgc-wizard-cta" disabled>Kies eerst een zitting</button></aside></div></form>' +
        '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
    }
    function renderDesktop() {
      root.classList.add('is-wizard');
      if (!app.querySelector('.hgc-wizard')) {
        app.innerHTML = wizardShellHtml();
        reveal(root);
        app.querySelector('.hgc-wizard-form').addEventListener('submit', onSubmit);
      }
      var h2 = app.querySelector('.hgc-wizard-hero h2'); if (h2) h2.textContent = state.info.titel;
      var sub = app.querySelector('.hgc-wizard-sub');
      if (sub) sub.textContent = state.info.introtekst || state.info.prijsInfo || 'Kies een zitting en vul je gegevens in.';
      var badge = app.querySelector('.hgc-wizard-step-badge');
      if (badge) badge.innerHTML = state.zittingId ? 'Stap <span>3</span> van 3' : 'Stap <span>2</span> van 3';
      var progress = app.querySelector('.hgc-wizard-progress > span');
      if (progress) progress.style.width = state.zittingId ? '100%' : '66%';
      renderStepsInto(app.querySelector('.hgc-wizard-main'));
      var rows = app.querySelector('.hgc-summary-rows'); if (rows) rows.innerHTML = summaryRowsHtml();
      var cta = app.querySelector('.hgc-wizard-cta');
      if (cta) { cta.disabled = !state.zittingId; cta.textContent = state.zittingId ? 'Aanmelding bevestigen' : 'Kies eerst een zitting'; }
    }

    function teaserHtml() {
      var logos = logosHtml(cfg);
      var rows = state.info.prijsInfo ? '<div class="hgc-teaser-rows"><div class="hgc-teaser-row"><span class="hgc-teaser-row-label">Prijs</span><span class="hgc-teaser-row-val">' + esc(state.info.prijsInfo) + '</span></div></div>' : '';
      return '<div class="hgc-teaser">' + (logos ? '<div class="hgc-wizard-logos">' + logos + '</div>' : '') +
        '<div class="hgc-teaser-body"><h2></h2>' + (state.info.introtekst ? '<p>' + esc(state.info.introtekst) + '</p>' : '') +
        rows +
        '<button type="button" class="hgc-button hgc-teaser-cta">Meld je aan</button>' +
        '<p class="hgc-teaser-note">Bevestiging per e-mail · wijzigen of annuleren via die e-mail.</p></div></div>';
    }
    function sheetHtml() {
      return '<div class="hgc-sheet"><div class="hgc-sheet-head"><span>Aanmelden</span><button type="button" class="hgc-sheet-close" aria-label="Sluiten">✕</button></div>' +
        '<div class="hgc-sheet-hero"><h2></h2><p>Kies een zitting en vul je gegevens in.</p></div>' +
        '<div class="hgc-sheet-progress"><span></span></div>' +
        '<form class="hgc-sheet-form" novalidate><div class="hgc-sheet-body"></div>' +
        '<div class="hgc-sheet-footer"><div class="hgc-sheet-footer-summary"></div><button type="submit" class="hgc-button" disabled>Kies eerst een zitting</button></div></form>' +
        '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
    }
    function openSheet() {
      var overlay = document.createElement('div'); overlay.className = 'hgc-overlay';
      overlay.innerHTML = sheetHtml();
      overlay.addEventListener('click', function (event) { if (event.target === overlay) closeSheet(overlay); });
      root.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      overlay.querySelector('.hgc-sheet-close').addEventListener('click', function () { closeSheet(overlay); });
      overlay.querySelector('.hgc-sheet-form').addEventListener('submit', onSubmit);
      currentOverlay = overlay;
      renderSheet();
    }
    function closeSheet(overlay) {
      document.body.style.overflow = '';
      overlay.remove();
      if (currentOverlay === overlay) currentOverlay = null;
    }
    function renderSheet() {
      if (!currentOverlay) return;
      var h2 = currentOverlay.querySelector('.hgc-sheet-hero h2'); if (h2) h2.textContent = state.info.titel;
      var progress = currentOverlay.querySelector('.hgc-sheet-progress > span'); if (progress) progress.style.width = state.zittingId ? '100%' : '66%';
      renderStepsInto(currentOverlay.querySelector('.hgc-sheet-body'));
      var summary = currentOverlay.querySelector('.hgc-sheet-footer-summary');
      if (summary) summary.textContent = state.party + ' perso' + (state.party === 1 ? 'on' : 'nen');
      var btn = currentOverlay.querySelector('.hgc-sheet-footer .hgc-button');
      if (btn) { btn.disabled = !state.zittingId; btn.textContent = state.zittingId ? 'Aanmelding bevestigen' : 'Kies eerst een zitting'; }
    }
    function renderTeaser() {
      root.classList.remove('is-wizard');
      if (!app.querySelector('.hgc-teaser')) {
        app.innerHTML = teaserHtml();
        reveal(root);
        app.querySelector('.hgc-teaser-cta').addEventListener('click', openSheet);
      }
      var h2 = app.querySelector('.hgc-teaser-body h2'); if (h2) h2.textContent = state.info.titel;
      renderSheet();
    }

    function onSubmit(event) {
      event.preventDefault();
      if (!state.zittingId) return;
      var form = event.target;
      var container = form.closest('.hgc-wizard, .hgc-sheet');
      var btn = form.querySelector('[type="submit"]');
      var values = Object.fromEntries(new FormData(form).entries());
      values.action = 'eventCreatePublic'; values.slug = slug; values.zittingId = state.zittingId; values.partySize = state.party;
      values.privacyAccepted = form.elements.privacyAccepted ? form.elements.privacyAccepted.checked : false;
      values.antwoorden = readDynFields(container, state.info.formVelden);
      if (btn) { btn.disabled = true; btn.textContent = 'Bezig met aanmelden…'; }
      api(values, cfg).then(function (data) {
        if (container.classList.contains('hgc-sheet')) {
          container.innerHTML = confirmationHtml('event', data.reservation);
        } else {
          root.classList.remove('is-wizard');
          app.innerHTML = confirmationHtml('event', data.reservation);
        }
      }).catch(function (error) {
        if (btn) { btn.disabled = false; btn.textContent = 'Aanmelding bevestigen'; }
        announce(container, error.message, true);
      });
    }

    function render() { if (mq.matches) renderDesktop(); else renderTeaser(); }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', render);

    render();

    return {
      applyInfo: function (info) {
        state.info = info;
        clampParty();
        render();
      }
    };
  }

  /* ── wijzigen/annuleren, zowel voor tafelreserveringen als event-aanmeldingen ── */
  function initManage(root, mode, slug, ref, token, cfg) {
    var app = root.querySelector('.hgc-reservation__app');

    if (mode === 'event') {
      api({ action: 'eventGetPublic', slug: slug, reservationNumber: ref, token: token }, cfg).then(function (data) {
        var r = data.reservation, formVelden = data.formVelden || [], extraAntwoorden = r.extraAntwoorden || {};
        var wijzigbaar = !!data.zitting;
        var zittingText = data.zitting ? zittingLabel(data.zitting) : '—';
        var controls = wijzigbaar ? '<form class="hgc-manage-form"><h3>Wijzigen</h3><div class="hgc-grid">' + field('Aantal personen', 'partySize', 'number', true, 'min="1" value="' + r.aantalPersonen + '"') + '</div>' + renderDynFields(formVelden) + '<div class="hgc-manage-actions"><button class="hgc-button hgc-save" type="submit">Wijziging opslaan</button><button type="button" class="hgc-button hgc-cancel">Afmelden</button></div></form>' : '<p>Online wijzigen of afmelden is niet meer mogelijk. Neem contact op.</p>';
        app.innerHTML = '<div class="hgc-card"><div class="hgc-header"><p class="hgc-kicker">Aanmelding beheren</p><h2>' + esc(r.reserveringsnummer) + '</h2></div><dl><dt>Referentie</dt><dd>' + esc(r.reserveringsnummer) + '</dd><dt>Zitting</dt><dd>' + esc(zittingText) + '</dd><dt>Personen</dt><dd>' + r.aantalPersonen + '</dd><dt>Status</dt><dd>' + esc(r.status) + '</dd></dl>' + controls + '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
        reveal(root);
        var form = app.querySelector('.hgc-manage-form');
        if (form) {
          fillCustomFields(app, formVelden, extraAntwoorden);
          form.addEventListener('submit', function (event) {
            event.preventDefault();
            var values = Object.fromEntries(new FormData(form).entries());
            values.action = 'eventUpdatePublic'; values.slug = slug; values.reservationNumber = ref; values.token = token; values.partySize = Number(values.partySize);
            values.antwoorden = readDynFields(app, formVelden);
            form.querySelector('.hgc-save').disabled = true;
            api(values, cfg).then(function () { announce(app, 'Je wijziging is opgeslagen. Je ontvangt een bevestiging per e-mail.'); window.setTimeout(function () { initManage(root, mode, slug, ref, token, cfg); }, 900); }).catch(function (error) { form.querySelector('.hgc-save').disabled = false; announce(app, error.message, true); });
          });
          var cancel = form.querySelector('.hgc-cancel');
          cancel.addEventListener('click', function () { if (!window.confirm('Weet je zeker dat je je wilt afmelden?')) return; cancel.disabled = true; api({ action: 'eventCancelPublic', slug: slug, reservationNumber: ref, token: token, reason: 'Via website afgemeld' }, cfg).then(function () { form.remove(); announce(app, 'Je bent afgemeld. Je ontvangt een bevestiging per e-mail.'); }).catch(function (error) { cancel.disabled = false; announce(app, error.message, true); }); });
        }
      }).catch(function (error) { app.innerHTML = '<div class="hgc-card"><div class="hgc-status is-error" role="alert">' + esc(error.message) + '</div></div>'; reveal(root); });
      return;
    }

    api({ action: 'getPublic', slug: slug, reservationNumber: ref, token: token }, cfg).then(function (data) {
      var r = data.reservation, formVelden = data.formVelden || [], extraAntwoorden = data.extraAntwoorden || {};
      var start = new Date(r.startAt), dateValue = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(start), timeValue = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(start);
      var controls = r.wijzigbaar ? '<form class="hgc-manage-form"><h3>Wijzigen</h3><div class="hgc-grid">' + field('Datum', 'date', 'date', true, 'value="' + esc(dateValue) + '"') + field('Aantal personen', 'partySize', 'number', true, 'min="1" value="' + r.aantalPersonen + '"') + '</div><button type="button" class="hgc-button hgc-check">Bekijk tijden</button><fieldset class="hgc-slots" hidden><legend>Beschikbare tijden</legend><div></div></fieldset><div class="hgc-grid">' + field('Telefoonnummer', 'telefoon', 'tel', false, 'value="' + esc(r.telefoon || '') + '"') + field('Gelegenheid', 'gelegenheid', 'text', false, 'value="' + esc(r.gelegenheid || '') + '"') + '</div><label class="hgc-field"><span>Dieetwensen of allergieën</span><textarea name="dieetwensen" rows="3">' + esc(r.dieetwensen || '') + '</textarea></label>' + renderDynFields(formVelden) + '<div class="hgc-manage-actions"><button class="hgc-button hgc-save" type="submit">Wijziging opslaan</button><button type="button" class="hgc-button hgc-cancel">Annuleren</button></div></form>' : '<p>Online wijzigen of annuleren is niet meer mogelijk. Neem contact op met het restaurant.</p>';
      app.innerHTML = '<div class="hgc-card"><div class="hgc-header"><p class="hgc-kicker">Reservering beheren</p><h2>' + esc(r.restaurant) + '</h2></div><dl><dt>Referentie</dt><dd>' + esc(r.reserveringsnummer) + '</dd><dt>Datum en tijd</dt><dd>' + esc(start.toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })) + '</dd><dt>Personen</dt><dd>' + r.aantalPersonen + '</dd><dt>Status</dt><dd>' + esc(r.status) + '</dd></dl>' + controls + '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
      reveal(root);
      var form = app.querySelector('.hgc-manage-form'), selected = timeValue;
      if (form) {
        fillCustomFields(app, formVelden, extraAntwoorden);
        form.querySelector('.hgc-check').addEventListener('click', function () { var date = form.elements.date.value, party = Number(form.elements.partySize.value); api({ action: 'availability', slug: slug, date: date, partySize: party, reservationNumber: ref, token: token }, cfg).then(function (result) { var slots = form.querySelector('.hgc-slots'); slots.hidden = false; slots.querySelector('div').innerHTML = result.slots.map(function (slot) { return '<button type="button" class="hgc-slot' + (slot.time === selected ? ' is-selected' : '') + '" data-time="' + esc(slot.time) + '">' + esc(slot.time) + '</button>'; }).join('') || '<p>Geen tijden beschikbaar.</p>'; slots.querySelectorAll('.hgc-slot').forEach(function (button) { button.addEventListener('click', function () { slots.querySelectorAll('.hgc-slot').forEach(function (b) { b.classList.remove('is-selected'); }); button.classList.add('is-selected'); selected = button.dataset.time; }); }); }).catch(function (error) { announce(app, error.message, true); }); });
        form.addEventListener('submit', function (event) { event.preventDefault(); var values = Object.fromEntries(new FormData(form).entries()); values.action = 'updatePublic'; values.slug = slug; values.reservationNumber = ref; values.token = token; values.partySize = Number(values.partySize); values.time = selected; values.antwoorden = readDynFields(app, formVelden); form.querySelector('.hgc-save').disabled = true; api(values, cfg).then(function () { announce(app, 'Je reservering is gewijzigd. Je ontvangt een bevestiging per e-mail.'); window.setTimeout(function () { initManage(root, mode, slug, ref, token, cfg); }, 900); }).catch(function (error) { form.querySelector('.hgc-save').disabled = false; announce(app, error.message, true); }); });
        var cancel = form.querySelector('.hgc-cancel'); cancel.addEventListener('click', function () { if (!window.confirm('Weet je zeker dat je deze reservering wilt annuleren?')) return; cancel.disabled = true; api({ action: 'cancelPublic', slug: slug, reservationNumber: ref, token: token, reason: 'Via website geannuleerd' }, cfg).then(function () { form.remove(); announce(app, 'Je reservering is geannuleerd. Je ontvangt een bevestiging per e-mail.'); }).catch(function (error) { cancel.disabled = false; announce(app, error.message, true); }); });
      }
    }).catch(function (error) { app.innerHTML = '<div class="hgc-card"><div class="hgc-status is-error" role="alert">' + esc(error.message) + '</div></div>'; reveal(root); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.hgc-reservation').forEach(function (root) {
      var app = root.querySelector('.hgc-reservation__app');
      var mode = root.dataset.mode || 'restaurant';
      var slug = root.dataset.slug || root.dataset.park;
      var ref = root.dataset.ref, token = root.dataset.token;
      var profile = mode === 'restaurant' && globalCfg.locations && globalCfg.locations[slug] ? globalCfg.locations[slug] : (globalCfg.fallbackProfile || {});
      var cfg = Object.assign({}, globalCfg, mode === 'restaurant' ? profile : {});

      if (ref && token) {
        initManage(root, mode, slug, ref, token, cfg);
        return;
      }

      if (mode === 'event') {
        var eventController = initEventWizard(root, slug, cfg);
        api({ action: 'eventPublicInfo', slug: slug }, cfg)
          .then(function (info) { eventController.applyInfo(info); })
          .catch(function (error) { announce(app.querySelector('.hgc-wizard, .hgc-teaser') || app, error.message, true); });
        return;
      }

      var controller = initWizard(root, slug, cfg);
      api({ action: 'publicInfo', slug: slug }, cfg)
        .then(function (info) { controller.applyInfo(info); })
        .catch(function (error) { announce(app.querySelector('.hgc-wizard, .hgc-teaser') || app, error.message, true); });
    });
  });
})();
