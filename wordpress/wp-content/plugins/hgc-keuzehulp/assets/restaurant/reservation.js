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
  function announce(root, message, error) { var status = root.querySelector('.hgc-status'); status.textContent = message; status.className = 'hgc-status ' + (error ? 'is-error' : 'is-success'); status.focus(); }
  // De laadtekst blijft zichtbaar totdat er echt iets te tonen is; anders
  // staat de pagina leeg zodra de koppeling traag antwoordt (bijv. een koude
  // start van de Connect-functie kan een aantal seconden duren).
  function reveal(root) {
    var loading = root.querySelector('.hgc-reservation__loading');
    if (loading) loading.hidden = true;
    root.querySelector('.hgc-reservation__app').hidden = false;
  }
  function initBooking(root, park, info) {
    var app = root.querySelector('.hgc-reservation__app');
    app.innerHTML = '<div class="hgc-card"><div class="hgc-header"><p class="hgc-kicker">Tafel reserveren</p><h2>' + esc(info.naam) + '</h2><p>Kies een beschikbaar moment en vul je gegevens in.</p></div><form class="hgc-form"><div class="hgc-grid">' + field('Datum', 'date', 'date', true, 'min="' + esc(info.minDate) + '" max="' + esc(info.maxDate) + '"') + field('Aantal personen', 'partySize', 'number', true, 'min="' + info.minGroepsgrootte + '" max="' + info.maxGroepsgrootte + '" value="2"') + '</div><button class="hgc-button hgc-check" type="button">Bekijk tijden</button><fieldset class="hgc-slots" hidden><legend>Beschikbare tijden</legend><div></div></fieldset><div class="hgc-details" hidden><div class="hgc-grid">' + field('Naam', 'name', 'text', true, 'autocomplete="name"') + field('E-mailadres', 'email', 'email', true, 'autocomplete="email"') + field('Telefoonnummer', 'phone', 'tel', false, 'autocomplete="tel"') + field('Gelegenheid', 'occasion', 'text', false, '') + '</div><label class="hgc-field"><span>Dieetwensen of allergieën</span><textarea name="dietary" rows="3"></textarea></label><label class="hgc-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label class="hgc-consent"><input name="privacyAccepted" type="checkbox" required> Ik ga akkoord met de <a href="' + esc(cfg.privacyUrl || '#') + '" target="_blank" rel="noopener">privacyverklaring</a>.</label><button class="hgc-button" type="submit">Reservering bevestigen</button></div></form><div class="hgc-status" tabindex="-1" role="status" aria-live="polite"></div></div>';
    reveal(root);
    var form = app.querySelector('form'), slots = app.querySelector('.hgc-slots'), details = app.querySelector('.hgc-details'), selected = '';
    app.querySelector('.hgc-check').addEventListener('click', function () {
      var date = form.elements.date.value, party = Number(form.elements.partySize.value); if (!date || !party) { announce(app, 'Kies eerst een datum en aantal personen.', true); return; }
      announce(app, 'Beschikbaarheid laden…');
      api({ action: 'availability', slug: park, date: date, partySize: party }).then(function (data) {
        slots.hidden = false; details.hidden = true; selected = '';
        slots.querySelector('div').innerHTML = data.slots.length ? data.slots.map(function (slot) { return '<button type="button" class="hgc-slot" data-time="' + esc(slot.time) + '">' + esc(slot.time) + '</button>'; }).join('') : '<p>Geen tijden beschikbaar. Kies een andere datum.</p>';
        slots.querySelectorAll('.hgc-slot').forEach(function (button) { button.addEventListener('click', function () { slots.querySelectorAll('.hgc-slot').forEach(function (b) { b.classList.remove('is-selected'); }); button.classList.add('is-selected'); selected = button.dataset.time; details.hidden = false; details.querySelector('input').focus(); }); });
        announce(app, data.slots.length ? 'Kies een van de beschikbare tijden.' : 'Geen tijden beschikbaar.', !data.slots.length);
      }).catch(function (error) { announce(app, error.message, true); });
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault(); if (!selected) { announce(app, 'Kies eerst een tijdstip.', true); return; }
      var values = Object.fromEntries(new FormData(form).entries()); values.action = 'createPublic'; values.slug = park; values.time = selected; values.partySize = Number(values.partySize); values.privacyAccepted = form.elements.privacyAccepted.checked;
      var submit = form.querySelector('[type="submit"]'); submit.disabled = true; submit.textContent = 'Bezig met reserveren…';
      api(values).then(function (data) { app.innerHTML = '<div class="hgc-card hgc-confirm"><div class="hgc-checkmark">✓</div><h2>Je tafel is gereserveerd</h2><p>Een bevestiging is verstuurd naar <strong>' + esc(data.reservation.email) + '</strong>.</p><dl><dt>Referentie</dt><dd>' + esc(data.reservation.reserveringsnummer) + '</dd><dt>Aantal personen</dt><dd>' + data.reservation.aantalPersonen + '</dd></dl></div>'; }).catch(function (error) { submit.disabled = false; submit.textContent = 'Reservering bevestigen'; announce(app, error.message, true); });
    });
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
      } else {
        api({ action: 'publicInfo', slug: park })
          .then(function (info) { initBooking(root, park, info); })
          .catch(function (error) { app.innerHTML = '<div class="hgc-card"><div class="hgc-status is-error" role="alert">' + esc(error.message) + '</div></div>'; reveal(root); });
      }
    });
  });
})();
