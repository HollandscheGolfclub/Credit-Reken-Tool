(function (blocks, element, components, blockEditor) {
  var el = element.createElement;
  blocks.registerBlockType('hgc/restaurant-reserveren', {
    title: 'HGC Restaurant Reserveren', icon: 'food', category: 'widgets',
    attributes: { park: { type: 'string', default: '' } },
    edit: function (props) {
      return el('div', { className: props.className },
        el(blockEditor.InspectorControls, {}, el(components.PanelBody, { title: 'Instellingen' }, el(components.TextControl, { label: 'Parkcode', value: props.attributes.park, onChange: function (value) { props.setAttributes({ park: value }); } }))),
        el('div', { style: { border: '1px solid #ddd', borderRadius: '12px', padding: '24px' } }, el('strong', {}, 'HGC Restaurant Reserveren'), el('p', {}, props.attributes.park ? 'Park: ' + props.attributes.park : 'Gebruikt de standaard parkcode.'))
      );
    }, save: function () { return null; }
  });
})(window.wp.blocks, window.wp.element, window.wp.components, window.wp.blockEditor);
