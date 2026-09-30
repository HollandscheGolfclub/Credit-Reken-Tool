(function () {
  'use strict';
  // Zelfde grens als reservation.js: daarboven de wizard, daaronder teaser + sheet.
  var desktop = window.matchMedia('(min-width: 760px)');

  document.addEventListener('DOMContentLoaded', function () {
    var fab = document.querySelector('[data-hgc-table-fab]');
    if (!fab) return;
    var modal = document.querySelector('[data-hgc-table-modal]');
    // Staat er al een boekbare widget in de pagina zelf, dan gebruiken we die; de
    // footer-widget wordt in dat geval door PHP niet eens gerenderd.
    var inline = null;
    document.querySelectorAll('.hgc-reservation[data-mode="restaurant"]').forEach(function (root) {
      if (!inline && !root.closest('[data-hgc-table-modal]') && !root.dataset.ref) inline = root;
    });
    var root = inline || (modal && modal.querySelector('.hgc-reservation'));
    if (!root) { fab.hidden = true; return; }
    var lastFocus = null;

    function openSheet() {
      var cta = root.querySelector('.hgc-teaser-cta');
      if (!cta) return false;
      cta.click();
      return true;
    }
    function openModal() {
      lastFocus = document.activeElement;
      modal.classList.add('is-open');
      fab.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var close = modal.querySelector('[data-hgc-table-modal-close]');
      if (close) close.focus();
    }
    function closeModal() {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open');
      fab.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function onOpen() {
      // Tot de eerste klik is de verborgen widget ook voor schermlezers weg.
      if (modal) modal.removeAttribute('aria-hidden');
      if (inline) {
        if (!desktop.matches && openSheet()) return;
        inline.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Op een telefoon direct de sheet van de widget; valt die (nog) niet te openen,
      // dan toch het venster, zodat de knop nooit "niets" doet.
      if (!desktop.matches && openSheet()) return;
      openModal();
    }

    fab.querySelectorAll('[data-hgc-table-fab-open]').forEach(function (btn) { btn.addEventListener('click', onOpen); });
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('[data-hgc-table-modal-close]')) closeModal();
      });
      document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });
      // Venster open en het scherm wordt smal (draaien van een tablet): dan hoort de sheet
      // erbij, niet een half zichtbaar venster.
      if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', function () { if (!desktop.matches) closeModal(); });
    }
  });
})();
