(function () {
  'use strict';
  var cfg = window.HGCRestaurant || {};
  var labels = { SLOT_UNAVAILABLE: 'Dit tijdstip is zojuist volgeboekt. Kies een ander moment.', LOCATION_CLOSED: 'Het restaurant is op dit moment gesloten.', PARTY_TOO_LARGE: 'Voor deze groepsgrootte kun je het beste rechtstreeks contact opnemen.', RATE_LIMITED: 'Je hebt te veel aanvragen gedaan. Probeer het over een minuut opnieuw.' };
  function esc(value) { var node = document.createElement('span'); node.textContent = String(value == null ? '' : value); return node.innerHTML; }
  function api(payload) {
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
  function defaultInfo() {
    var max = new Date(); max.setDate(max.getDate() + 90);
    return { naam: 'Tafel reserveren', minDate: isoDate(new Date()), maxDate: isoDate(max), minGroepsgrootte: 1, maxGroepsgrootte: 12 };
  }

  var DOW = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  var MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var DOW_FULL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var MONTH_FULL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  function nextDays(count) { var out = []; for (var i = 0; i < count; i++) { var d = new Date(); d.setDate(d.getDate() + i); out.push(d); } return out; }
  function formatDateLong(iso) { var p = iso.split('-'); var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); return DOW_FULL[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_FULL[d.getMonth()] + ' ' + p[0]; }
  function logosHtml() {
    var parts = '';
    if (cfg.parkLogo) parts += '<img class="hgc-logo hgc-logo--park" src="' + esc(cfg.parkLogo) + '" alt="">';
    if (cfg.clubLogo) parts += '<img class="hgc-logo hgc-logo--club" src="' + esc(cfg.clubLogo) + '" alt="">';
    return parts;
  }
  function stepHeadHtml(num, title, variant) {
    return '<div class="hgc-step-head' + (variant === 'upcoming' ? ' hgc-step-head--upcoming' : '') + '"><span class="hgc-step-num hgc-step-num--' + variant + '">' + num + '</span><h3>' + esc(title) + '</h3></div>';
  }
  function confirmationHtml(r) {
    return '<div class="hgc-card hgc-confirm"><div class="hgc-checkmark">✓</div><h2>Je tafel is gereserveerd</h2><p>Een bevestiging is verstuurd naar <strong>' + esc(r.email) + '</strong>.</p><dl><dt>Referentie</dt><dd>' + esc(r.reserveringsnummer) + '</dd><dt>Aantal personen</dt><dd>' + r.aantalPersonen + '</dd></dl></div>';
  }
  function detailsFieldsEl() {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="hgc-grid">' + field('Naam', 'name', 'text', true, 'autocomplete="name"') + field('E-mailadres', 'email', 'email', true, 'autocomplete="email"') + field('Telefoonnummer', 'phone', 'tel', false, 'autocomplete="tel"') + field('Gelegenheid', 'occasion', 'text', false, '') + '</div>' +
      '<label class="hgc-field"><span>Dieetwensen of allergieën</span><textarea name="dietary" rows="3"></textarea></label>' +
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
  function initWizard(root, park) {
    var app = root.querySelector('.hgc-reservation__app');
    var mq = window.matchMedia('(min-width: 760px)');
    var currentOverlay = null;
    var state = { info: defaultInfo(), date: null, party: 2, slots: null, slotsForKey: null, slotsLoading: false, slotsError: null, time: null };
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
      api({ action: 'availability', slug: park, date: state.date, partySize: state.party }).then(function (data) {
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
        container.appendChild(detailsFieldsEl());
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
      var logos = logosHtml();
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
      var logos = logosHtml();
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
      if (btn) { btn.disabled = true; btn.textContent = 'Bezig met reserveren…'; }
      api(values).then(function (data) {
        if (container.classList.contains('hgc-sheet')) {
          container.innerHTML = confirmationHtml(data.reservation);
        } else {
          root.classList.remove('is-wizard');
          app.innerHTML = confirmationHtml(data.reservation);
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

  function initManage(root, park, ref, token) {
    var app = root.querySelector('.hgc-reservation__app');
    api({ action: 'getPublic', slug: park, reservationNumber: ref, token: token }).then(function (data) {
      var r = data.reservation, start = new Date(r.startAt), dateValue = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(start), timeValue = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(start);
      var controls = r.wijzigbaar ? '<form class="hgc-manage-form"><h3>Wijzigen</h3><div class="hgc-grid">' + field('Datum', 'date', 'date', true, 'value="' + esc(dateValue) + '"') + field('Aantal personen', 'partySize', 'number', true, 'min="1" value="' + r.aantalPersonen + '"') + '</div><button type="button" class="hgc-button hgc-check">Bekijk tijden</button><fieldset class="hgc-slots" hidden><legend>Beschikbare tijden</legend><div></div></fieldset><div class="hgc-grid">' + field('Telefoonnummer', 'phone', 'tel', false, 'value="' + esc(r.telefoon || '') + '"') + field('Gelegenheid', 'occasion', 'text', false, 'value="' + esc(r.gelegenheid || '') + '"') + '</div><label class="hgc-field"><span>Dieetwensen of allergieën</span><textarea name="dietary" rows="3">' + esc(r.dieetwensen || '') + '</textarea></label><div class="hgc-manage-actions"><button class="hgc-button hgc-save" type="submit">Wijziging opslaan</button><button type="button" class="hgc-button hgc-cancel">Annuleren</button></div></form>' : '<p>Online wijzigen of annuleren is niet meer mogelijk. Neem contact op met het restaurant.</p>';
      app.innerHTML = '<div class="hgc-card"><div class="hgc-header"><p class="hgc-kicker">Reservering beheren</p><h2>' + esc(r.restaurant) + '</h2></div><dl><dt>Referentie</dt><dd>' + esc(r.reserveringsnummer) + '</dd><dt>Datum en tijd</dt><dd>' + esc(start.toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' })) + '</dd><dt>Personen</dt><dd>' + r.aantalPersonen + '</dd><dt>Status</dt><dd>' + esc(r.status) + '</dd></dl>' + controls + '<div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
      reveal(root);
      var form = app.querySelector('.hgc-manage-form'), selected = timeValue;
      if (form) {
        form.querySelector('.hgc-check').addEventListener('click', function () { var date = form.elements.date.value, party = Number(form.elements.partySize.value); api({ action: 'availability', slug: park, date: date, partySize: party, reservationNumber: ref, token: token }).then(function (result) { var slots = form.querySelector('.hgc-slots'); slots.hidden = false; slots.querySelector('div').innerHTML = result.slots.map(function (slot) { return '<button type="button" class="hgc-slot' + (slot.time === selected ? ' is-selected' : '') + '" data-time="' + esc(slot.time) + '">' + esc(slot.time) + '</button>'; }).join('') || '<p>Geen tijden beschikbaar.</p>'; slots.querySelectorAll('.hgc-slot').forEach(function (button) { button.addEventListener('click', function () { slots.querySelectorAll('.hgc-slot').forEach(function (b) { b.classList.remove('is-selected'); }); button.classList.add('is-selected'); selected = button.dataset.time; }); }); }).catch(function (error) { announce(app, error.message, true); }); });
        form.addEventListener('submit', function (event) { event.preventDefault(); var values = Object.fromEntries(new FormData(form).entries()); values.action = 'updatePublic'; values.slug = park; values.reservationNumber = ref; values.token = token; values.partySize = Number(values.partySize); values.time = selected; form.querySelector('.hgc-save').disabled = true; api(values).then(function () { announce(app, 'Je reservering is gewijzigd. Je ontvangt een bevestiging per e-mail.'); window.setTimeout(function () { initManage(root, park, ref, token); }, 900); }).catch(function (error) { form.querySelector('.hgc-save').disabled = false; announce(app, error.message, true); }); });
        var cancel = form.querySelector('.hgc-cancel'); cancel.addEventListener('click', function () { if (!window.confirm('Weet je zeker dat je deze reservering wilt annuleren?')) return; cancel.disabled = true; api({ action: 'cancelPublic', slug: park, reservationNumber: ref, token: token, reason: 'Via website geannuleerd' }).then(function () { form.remove(); announce(app, 'Je reservering is geannuleerd. Je ontvangt een bevestiging per e-mail.'); }).catch(function (error) { cancel.disabled = false; announce(app, error.message, true); }); });
      }
    }).catch(function (error) { app.innerHTML = '<div class="hgc-card"><div class="hgc-status is-error" role="alert">' + esc(error.message) + '</div></div>'; reveal(root); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.hgc-reservation').forEach(function (root) {
      var app = root.querySelector('.hgc-reservation__app');
      var park = root.dataset.park, ref = root.dataset.ref, token = root.dataset.token;
      if (ref && token) {
        initManage(root, park, ref, token);
        return;
      }
      var controller = initWizard(root, park);
      api({ action: 'publicInfo', slug: park })
        .then(function (info) { controller.applyInfo(info); })
        .catch(function (error) { announce(app.querySelector('.hgc-wizard, .hgc-teaser') || app, error.message, true); });
    });
  });
})();
