(function () {
  'use strict';

  const SPEC_PATH = 'js/tours.json';
  const CONTAINER  = '#tours-chart';

  const EMBED_OPTS = {
    actions: false,
    renderer: 'svg',
    tooltip: {
      theme: 'custom'
    },
    config: {
      autosize: {
        type: 'fit',
        contains: 'padding',
        resize: true
      }
    }
  };

  function renderToursChart() {
    const el = document.querySelector(CONTAINER);
    if (!el) {
      console.warn('[tours.js] Container not found:', CONTAINER);
      return;
    }

    fetch(SPEC_PATH)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ' + SPEC_PATH);
        return res.json();
      })
      .then(function (spec) {
        return vegaEmbed(CONTAINER, spec, EMBED_OPTS);
      })
      .then(function (result) {
        console.log('[tours.js] Chart rendered successfully.');
      })
      .catch(function (err) {
        console.error('[tours.js] Render error:', err);
        el.innerHTML =
          '<p style="color:#6b6259;font-family:Georgia,serif;padding:2rem;">' +
          'Chart failed to load.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderToursChart);
  } else {
    renderToursChart();
  }
})();