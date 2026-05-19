'use strict';

(function() {
  var view      = null;
  var tooltipEl = null;

  function init() {
    console.log('[Network] init() called');
    tooltipEl = document.getElementById('network-tooltip');
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
    var x = event.clientX + 16;
    var y = event.clientY + 16;
    var r = tooltipEl.getBoundingClientRect();
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
      btn.addEventListener('click', function() {
        freqButtons.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        view.signal('selectedFrequency', this.getAttribute('data-frequency'));
        view.runAsync();
      });
    });

    if (yearSelect) {
      yearSelect.addEventListener('change', function() {
        view.signal('selectedYear', this.value);
        view.runAsync();
      });
    }
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