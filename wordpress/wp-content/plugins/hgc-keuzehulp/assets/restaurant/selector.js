(function () {
  'use strict';

  document.querySelectorAll('[data-hgc-location-selector]').forEach(function (selector) {
    var search = selector.querySelector('[data-hgc-location-search]');
    var cards = Array.prototype.slice.call(selector.querySelectorAll('[data-hgc-location-card]'));
    var count = selector.querySelector('[data-hgc-location-count]');
    var empty = selector.querySelector('[data-hgc-location-empty]');

    if (!search) return;

    function filterLocations() {
      var query = search.value.trim().toLocaleLowerCase('nl');
      var visible = 0;

      cards.forEach(function (card) {
        var matches = !query || (card.dataset.search || '').toLocaleLowerCase('nl').indexOf(query) !== -1;
        card.hidden = !matches;
        if (matches) visible += 1;
      });

      if (count) count.textContent = query ? visible + ' van ' + cards.length + ' locaties' : cards.length + ' locaties';
      if (empty) empty.hidden = visible !== 0;
    }

    search.addEventListener('input', filterLocations);
    search.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && search.value) {
        search.value = '';
        filterLocations();
      }
    });
  });
})();
