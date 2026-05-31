'use strict';

(function() {
  var view      = null;
  var tooltipEl = null;
  var freqTooltipEl = null;

  var FREQUENCY_TOOLTIPS = {
    low: {
      title: 'Minimum Collaborations',
      artist: '1+',
      producer: '1+'
    },
    medium: {
      title: 'Minimum Collaborations',
      artist: '3+',
      producer: '5+'
    },
    high: {
      title: 'Minimum Collaborations',
      artist: '5+',
      producer: '10+'
    }
  };

  function init() {
    console.log('[Network] init() called');
    tooltipEl = document.getElementById('network-tooltip');
    freqTooltipEl = document.getElementById('frequency-tooltip');
    if (!tooltipEl) console.warn('[Network] tooltip element not found');

    var chartEl = document.getElementById('network');
    if (!chartEl) {
      console.error('[Network] #network div not found in DOM');
      return;
    }

    vegaEmbed('#network', 'js/collaborations.json', {
      actions:  false,
      renderer: 'svg',
      hover:    false
    }).then(function(result) {
      console.log('[Network] vegaEmbed SUCCESS', result);
      view = result.view;
      window.view = view;
      window.vegaView = view;
      attachInteractions();
      attachControls();
      attachSearch();
    }).catch(function(err) {
      console.error('[Network] vegaEmbed FAILED', err);
      var el = document.getElementById('network');
      if (el) {
        el.innerHTML = '<p style="color:red;font-family:Arial;padding:20px;font-size:14px;">Network ERROR: ' + err.message + '<br><br>Check browser console for full details.</p>';
      }
    });
  }

  /* ─── INTERACTIONS ──────────────────────────────────────────── */

  function attachInteractions() {
    if (!view) return;

    view.addEventListener('mouseover', function(event, item) {
      if (item && item.datum && item.datum.collaborator) {
        showTooltip(item.datum, event);
      } else if (item && item.datum && item.datum.name === 'Travis Scott') {
        showCentralTooltip(event);
      }
    });

    view.addEventListener('mousemove', function(event, item) {
      if (item && tooltipEl && tooltipEl.classList.contains('visible')) {
        positionTooltip(event);
      }
    });

    view.addEventListener('mouseout', function() {
      hideTooltip();
    });
  }

  function showTooltip(d, event) {
    if (!tooltipEl) return;

    var careerTotal  = d.career_total || 0;
    var yearTotal    = d.total        || 0;
    var role         = d.role ? d.role.charAt(0).toUpperCase() + d.role.slice(1) : '';
    var cluster      = d.cluster || '';

    var yearSignal   = view.signal('selectedYear');
    var yearLabel    = yearSignal === 'all' ? 'In View' : 'In ' + yearSignal;

    var showArtists  = view.signal('showArtists');
    var showProducers = view.signal('showProducers');
    var bothVisible  = showArtists && showProducers;

    var dualRoleNote = (d.is_dual_role && bothVisible)
      ? '<div class="tt-also-role">Also appears as ' + (d.role === 'artist' ? 'producer' : 'artist') + '</div>'
      : '';

    tooltipEl.innerHTML =
      '<div class="tt-name">'  + escapeHTML(d.name || d.collaborator) + '</div>' +
      '<div class="tt-role">'  + escapeHTML(role) + '</div>' +
      dualRoleNote +
      (cluster && cluster !== 'Other' && d.role !== 'producer' ? '<div class="tt-cluster">' + escapeHTML(cluster) + '</div>' : '') +
      '<div class="tt-stats">' +
        '<div class="tt-stat">' +
          '<span class="tt-stat-label">Career Total</span>' +
          '<span class="tt-stat-value">' + careerTotal + '</span>' +
        '</div>' +
        '<div class="tt-stat">' +
          '<span class="tt-stat-label">' + escapeHTML(yearLabel) + '</span>' +
          '<span class="tt-stat-value">' + yearTotal + '</span>' +
        '</div>' +
      '</div>';

    tooltipEl.classList.add('visible');
    positionTooltip(event);
  }

  function showCentralTooltip(event) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML =
      '<div class="tt-name">Travis Scott</div>' +
      '<div class="tt-role">Central Artist</div>' +
      '<div class="tt-stats">'
      '</div>';
    tooltipEl.classList.add('visible');
    positionTooltip(event);
  }

  function positionTooltip(event) {
    if (!tooltipEl) return;
    var r = tooltipEl.getBoundingClientRect();
    var prefersLeft = event.clientX > window.innerWidth * 0.66 || event.clientX + r.width + 32 > window.innerWidth - 10;
    var x = prefersLeft ? event.clientX - r.width - 16 : event.clientX + 16;
    var y = event.clientY + 16;
    r = tooltipEl.getBoundingClientRect();
    if (prefersLeft && x < 10) x = event.clientX + 16;
    if (!prefersLeft && x + r.width > window.innerWidth - 10) x = event.clientX - r.width - 16;
    if (x + r.width  > window.innerWidth  - 10) x = event.clientX - r.width  - 16;
    if (y + r.height > window.innerHeight - 10) y = event.clientY - r.height - 16;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = y + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /* ─── CONTROLS ──────────────────────────────────────────────── */

  function attachControls() {
    if (!view) { console.error('[Network] cannot attach controls — view is null'); return; }

    var roleButtons  = document.querySelectorAll('#role-toggles .toggle-btn');
    var freqButtons  = document.querySelectorAll('#frequency-toggles .toggle-btn');
    var yearSelect   = document.getElementById('year-select');

    setupYearDropdown(yearSelect);

    roleButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        this.classList.toggle('active');
        var artistsBtn   = document.querySelector('#role-toggles [data-role="artist"]');
        var producersBtn = document.querySelector('#role-toggles [data-role="producer"]');
        var artistsOn    = artistsBtn.classList.contains('active');
        var producersOn  = producersBtn.classList.contains('active');

        if (!artistsOn && !producersOn) { this.classList.add('active'); return; }

        view.signal('showArtists',   artistsOn);
        view.signal('showProducers', producersOn);
        view.runAsync();
      });
    });

    freqButtons.forEach(function(btn) {
      var frequency = btn.getAttribute('data-frequency');

      if (frequency && frequency !== 'all') {
        btn.addEventListener('mouseenter', function() {
          showFrequencyTooltip(this);
        });

        btn.addEventListener('mousemove', function() {
          positionFrequencyTooltip(this);
        });

        btn.addEventListener('mouseleave', hideFrequencyTooltip);
        btn.addEventListener('focus', function() {
          showFrequencyTooltip(this);
        });
        btn.addEventListener('blur', hideFrequencyTooltip);
      }

      btn.addEventListener('click', function() {
        freqButtons.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        view.signal('selectedFrequency', this.getAttribute('data-frequency'));
        view.runAsync();
      });
    });

    if (yearSelect) {
      yearSelect.addEventListener('change', function() {
        syncYearDropdownLabel(this.value);
        view.signal('selectedYear', this.value);
        view.runAsync();
      });
    }
  }

  function setupYearDropdown(yearSelect) {
    if (!yearSelect) return;
    if (document.getElementById('year-dropdown-trigger')) return;

    var controlGroup = yearSelect.parentElement;
    if (!controlGroup) return;

    var shell = document.createElement('div');
    shell.className = 'year-dropdown-shell';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'year-dropdown-trigger';
    trigger.className = 'year-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var menu = document.createElement('div');
    menu.id = 'year-dropdown-menu';
    menu.className = 'year-dropdown-menu';
    menu.setAttribute('role', 'listbox');

    Array.prototype.slice.call(yearSelect.options).forEach(function(option) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'year-dropdown-option';
      item.setAttribute('role', 'option');
      item.setAttribute('data-value', option.value);
      item.textContent = option.textContent;
      if (option.selected) item.classList.add('active');

      item.addEventListener('click', function() {
        selectYearValue(yearSelect, this.getAttribute('data-value'));
        closeYearDropdown(trigger, menu);
      });

      menu.appendChild(item);
    });

    trigger.addEventListener('click', function() {
      var isOpen = menu.classList.contains('visible');
      if (isOpen) {
        closeYearDropdown(trigger, menu);
      } else {
        openYearDropdown(trigger, menu);
      }
    });

    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeYearDropdown(trigger, menu);
      }
    });

    document.addEventListener('click', function(e) {
      if (!shell.contains(e.target)) {
        closeYearDropdown(trigger, menu);
      }
    });

    yearSelect.insertAdjacentElement('afterend', shell);
    shell.appendChild(trigger);
    shell.appendChild(menu);
    yearSelect.classList.add('year-dropdown-native');
    syncYearDropdownLabel(yearSelect.value);
  }

  function openYearDropdown(trigger, menu) {
    trigger.setAttribute('aria-expanded', 'true');
    menu.classList.add('visible');
  }

  function closeYearDropdown(trigger, menu) {
    trigger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('visible');
  }

  function syncYearDropdownLabel(value) {
    var trigger = document.getElementById('year-dropdown-trigger');
    var menu = document.getElementById('year-dropdown-menu');
    if (!trigger || !menu) return;

    var selectedOption = document.querySelector('#year-select option[value="' + value + '"]');
    trigger.textContent = selectedOption ? selectedOption.textContent : 'All Years';

    Array.prototype.forEach.call(menu.querySelectorAll('.year-dropdown-option'), function(optionButton) {
      var active = optionButton.getAttribute('data-value') === value;
      optionButton.classList.toggle('active', active);
      optionButton.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function selectYearValue(yearSelect, value) {
    if (!yearSelect) return;
    yearSelect.value = value;
    syncYearDropdownLabel(value);
    var event;
    if (typeof Event === 'function') {
      event = new Event('change', { bubbles: true });
    } else {
      event = document.createEvent('Event');
      event.initEvent('change', true, true);
    }
    yearSelect.dispatchEvent(event);
  }

  function showFrequencyTooltip(btn) {
    if (!freqTooltipEl) return;
    var frequency = btn.getAttribute('data-frequency');
    var details = FREQUENCY_TOOLTIPS[frequency];
    if (!details) return;

    freqTooltipEl.innerHTML =
      '<div class="tt-name">' + details.title + '</div>' +
      '<div class="tt-stats">' +
        '<div class="tt-stat">' +
          '<span class="tt-stat-label">Artists</span>' +
          '<span class="tt-stat-value">' + details.artist + '</span>' +
        '</div>' +
        '<div class="tt-stat">' +
          '<span class="tt-stat-label">Producers</span>' +
          '<span class="tt-stat-value">' + details.producer + '</span>' +
        '</div>' +
      '</div>';

    freqTooltipEl.classList.add('visible');
    positionFrequencyTooltip(btn);
  }

  function positionFrequencyTooltip(btn) {
    if (!freqTooltipEl || !btn) return;

    var rect = btn.getBoundingClientRect();
    var tipRect = freqTooltipEl.getBoundingClientRect();
    var gap = 1;
    var x = rect.left + rect.width / 2 - tipRect.width / 2;
    var y = rect.bottom + gap;

    if (x < 10) x = 10;
    if (x + tipRect.width > window.innerWidth - 10) x = window.innerWidth - tipRect.width - 10;

    if (y + tipRect.height > window.innerHeight - 10) {
      x = rect.right + gap;
      y = rect.top + (rect.height / 2) - (tipRect.height / 2);

      if (x + tipRect.width > window.innerWidth - 10) {
        x = rect.left - tipRect.width - gap;
      }

      if (x < 10) x = 10;
      if (y < 10) y = 10;
      if (y + tipRect.height > window.innerHeight - 10) y = window.innerHeight - tipRect.height - 10;
    }

    freqTooltipEl.style.left = x + 'px';
    freqTooltipEl.style.top = y + 'px';
  }

  function hideFrequencyTooltip() {
    if (freqTooltipEl) freqTooltipEl.classList.remove('visible');
  }

  /* ─── SEARCH ────────────────────────────────────────────────── */

  function attachSearch() {
    if (!view) return;

    var searchInput = document.getElementById('search-input');
    var clearBtn    = document.getElementById('search-clear');
    var noResultsEl = document.getElementById('search-no-results');

    if (!searchInput) { console.warn('[Network] search input not found'); return; }

    searchInput.addEventListener('input', function() {
      var term = this.value.trim();
      view.signal('searchTerm', term);
      view.runAsync();

      if (clearBtn) clearBtn.style.display = term ? 'block' : 'none';

      if (noResultsEl) {
        if (term) {
          var data      = view.data('nodes_positioned');
          var lowerTerm = term.toLowerCase();
          var hasMatch  = data.some(function(d) {
            return d.name && d.name.toLowerCase().indexOf(lowerTerm) >= 0;
          });
          noResultsEl.style.display = hasMatch ? 'none' : 'block';
        } else {
          noResultsEl.style.display = 'none';
        }
      }
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        this.value = '';
        view.signal('searchTerm', '');
        view.runAsync();
        if (noResultsEl) noResultsEl.style.display = 'none';
        if (clearBtn)    clearBtn.style.display = 'none';
        this.blur();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        view.signal('searchTerm', '');
        view.runAsync();
        if (noResultsEl) noResultsEl.style.display = 'none';
        clearBtn.style.display = 'none';
        searchInput.focus();
      });
    }
  }

  /* ─── BOOT ──────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();