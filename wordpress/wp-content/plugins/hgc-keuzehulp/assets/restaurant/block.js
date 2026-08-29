(function (blocks, element, components, blockEditor) {
  var el = element.createElement;
  var config = window.HGCRestaurantBlock || {};
  var options = [{ value: '', label: 'Standaard restaurant' }].concat(config.locations || []);
  blocks.registerBlockType('hgc/restaurant-reserveren', {
    title: 'HGC Restaurant Reserveren', icon: 'food', category: 'widgets',
    attributes: { park: { type: 'string', default: '' } },
    edit: function (props) {
      var currentOptions = options.slice();
      if (props.attributes.park && !currentOptions.some(function (option) { return option.value === props.attributes.park; })) {
        currentOptions.push({ value: props.attributes.park, label: props.attributes.park + ' (bestaande parkcode)' });
      }
      return el('div', { className: props.className },
        el(blockEditor.InspectorControls, {}, el(components.PanelBody, { title: 'Instellingen' }, el(components.SelectControl, { label: 'Restaurant / baan', value: props.attributes.park, options: currentOptions, onChange: function (value) { props.setAttributes({ park: value }); } }))),
        el('div', { style: { border: '1px solid #ddd', borderRadius: '12px', padding: '24px' } }, el('strong', {}, 'HGC Restaurant Reserveren'), el('p', {}, props.attributes.park ? 'Park: ' + props.attributes.park : 'Gebruikt het standaard restaurant.'))
      );
    }, save: function () { return null; }
  });
})(window.wp.blocks, window.wp.element, window.wp.components, window.wp.blockEditor);
