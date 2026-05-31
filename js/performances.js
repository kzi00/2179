'use strict';

const performancesEmbed = vegaEmbed('#performances-chart', 'js/performances.json', {
  actions: false,
  renderer: 'svg'
});

performancesEmbed.then(({ view }) => {
  const modeButtons = Array.from(document.querySelectorAll('[data-performances-mode]'));
  const sliderGroup = document.querySelector('.performances-slider-group');
  const yearSlider = document.getElementById('performances-year-slider');
  const yearValue = document.getElementById('performances-year-value');

  if (!modeButtons.length || !sliderGroup || !yearSlider || !yearValue) {
    return;
  }

  const setMode = (mode) => {
    modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.performancesMode === mode);
    });

    sliderGroup.classList.toggle('is-hidden', mode !== 'year');
    view.signal('mode', mode).runAsync();
  };

  const setYear = (year) => {
    yearValue.textContent = String(year);
    view.signal('selectedYear', year).runAsync();
  };

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMode(button.dataset.performancesMode);
    });
  });

  yearSlider.addEventListener('input', (event) => {
    const year = Number(event.target.value);
    setYear(year);
  });

  setMode('all');
  setYear(Number(yearSlider.value));

  window.addEventListener('resize', () => {
    view.resize().runAsync();
  });
}).catch((error) => {
  console.error('Unable to render performances chart', error);
});
