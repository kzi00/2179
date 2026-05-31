'use strict';

/* ── Notes by CSV date key (CSV can't store arrays cleanly) ── */
var NOTES = {
  "21/05/2013": [
    "Debut mixtape released through Grand Hustle and Epic Records",
    "Featured collaborations with T.I., 2 Chainz, and Wale",
    "Established Scott's atmospheric production signature"
  ],
  "18/08/2014": [
    "Free mixtape released to build anticipation for his debut album",
    "Marked a shift toward darker, more experimental sonic textures",
    "Later certified platinum upon official streaming release in 2024"
  ],
  "4/09/2015": [
    "Debut studio album peaking at #3 on the Billboard 200",
    "Concept album exploring fame, identity, and disillusionment",
    "Introduced 'Antidote', his first top-twenty single"
  ],
  "2/09/2016": [
    "First album to debut at #1 on the Billboard 200",
    "Title pays homage to R&B vocalist Brian McKnight",
    "Solidified Scott's mainstream commercial position"
  ],
  "21/12/2017": [
    "Collaborative album with Migos rapper Quavo",
    "Released without prior promotion, peaking at #3 on Billboard 200",
    "Demonstrated the rising influence of Atlanta-Houston cross-collaboration"
  ],
  "3/08/2018": [
    "Debuted at #1 on the Billboard 200 with 537,000 album-equivalent units",
    "Lead single 'SICKO MODE' became his first #1 on the Hot 100",
    "Marked his global mainstream breakthrough and cultural watershed"
  ],
  "27/12/2019": [
    "Compilation album showcasing his Cactus Jack record label roster",
    "Debuted at #1 on the Billboard 200 in its first tracking week",
    "Strengthened his identity as a label executive and curator"
  ],
  "28/07/2023": [
    "Long-anticipated fourth studio album released after a five-year gap",
    "Debuted at #1 globally with the largest opening week of 2023",
    "Featured collaborations with Beyoncé, Drake, and The Weeknd"
  ],
  "23/08/2024": [
    "Official streaming reissue of the 2014 mixtape",
    "Debuted at #2 globally even though the songs were previously released",
    "Certified platinum following its commercial release"
  ],
  "13/07/2025": [
    "Sequel compilation expanding the Cactus Jack collective's catalogue",
    "Reflects continued expansion of Scott's label and production empire",
    "Released alongside the conclusion of his Circus Maximus world tour"
  ]
};

var LINE_Y = 160, COVER_SIZE = 44;
var GLOBAL_POINT_SHIFT = 30;
var DATE_OFFSETS = {
  '21/05/2013': 0,
  '21/12/2017': 0,
  '3/08/2018': 18
};
var tooltipEl, hideTimer;

/* ── BOOT ───────────────────────────────────── */

function init() {
  tooltipEl = document.getElementById('release-tooltip');

  fetch('data/timeline.csv')
    .then(function (r) { return r.text(); })
    .then(function (text) {
      var releases = parseCSV(text);
      return vegaEmbed('#timeline', 'js/timeline.json', { actions: false, renderer: 'svg' })
        .then(function (result) {
          var view = result.view;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              positionReleases(view, releases);
              window.addEventListener('resize', debounce(function () {
                positionReleases(view, releases);
              }, 100));
            });
          });
        });
    });
}

/* ── POSITION OVERLAYS ──────────────────────── */

function positionReleases(view, releases) {
  var overlay = document.getElementById('release-overlay');
  if (!overlay || !view) return;

  var xScale;
  try { xScale = view.scale('x'); } catch (e) { return; }
  if (typeof xScale !== 'function') return;

  overlay.innerHTML = '';

  releases.forEach(function (r) {
    var x = xScale(parseDate(r.date));
    if (isNaN(x)) return;

    var adjustedX = x + GLOBAL_POINT_SHIFT + (DATE_OFFSETS[r.date] || 0);

    var item = document.createElement('div');
    item.className = 'release-item ' + (r.label_position === 'above' ? 'label-above' : 'label-below');
    item.style.cssText = 'left:' + adjustedX + 'px;top:' + (LINE_Y - COVER_SIZE / 2) + 'px;height:' + COVER_SIZE + 'px;margin-left:-70px';

    var wrap = document.createElement('div');
    wrap.className = 'release-cover-wrap';
    var img = document.createElement('img');
    img.className = 'release-cover';
    img.src = r.image_url;
    img.alt = r.title_wrapped.replace(/\|/g, ' ');
    img.onload = function () { this.classList.add('loaded'); };
    img.onerror = function () { this.style.visibility = 'hidden'; };
    img.addEventListener('mouseenter', function () { showTooltip(r, this); });
    img.addEventListener('mouseleave', function () { scheduleHide(); });
    wrap.appendChild(img);

    var label = document.createElement('div');
    label.className = 'release-label';

    var titleEl = document.createElement('div');
    titleEl.className = 'release-title';
    r.title_wrapped.split('|').forEach(function (line) {
      var span = document.createElement('span');
      span.className = 'title-line';
      span.textContent = line.trim();
      titleEl.appendChild(span);
    });

    var dateEl = document.createElement('div');
    dateEl.className = 'release-date';
    dateEl.textContent = expandDate(r.formatted_date);

    label.appendChild(titleEl);
    label.appendChild(dateEl);
    item.appendChild(wrap);
    item.appendChild(label);
    overlay.appendChild(item);
  });
}

/* ── TOOLTIP ────────────────────────────────── */

function showTooltip(r, coverEl) {
  if (!tooltipEl) return;
  clearTimeout(hideTimer);

  var year = parseDate(r.date).getFullYear();
  var notes = NOTES[r.date] || [];
  var notesHtml = notes.length
    ? '<ul class="tooltip-notes">' + notes.map(function (n) { return '<li class="tooltip-note">' + n + '</li>'; }).join('') + '</ul>'
    : '';

  tooltipEl.innerHTML =
    '<div class="tooltip-header">' +
      '<img class="tooltip-cover" src="' + r.image_url + '" alt="">' +
      '<div class="tooltip-meta">' +
        '<div class="tooltip-title">' + r.title_wrapped.replace(/\|/g, ' ') + '</div>' +
        '<div class="tooltip-meta-row">' +
          '<span class="tooltip-year">' + year + '</span>' +
          '<span class="tooltip-divider">&middot;</span>' +
          '<span class="tooltip-type">' + r.type + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' + notesHtml;

  var frame = document.querySelector('.timeline-frame');
  if (!frame) return;

  requestAnimationFrame(function () {
    var fRect = frame.getBoundingClientRect();
    var cRect = coverEl.getBoundingClientRect();
    var cx = cRect.left - fRect.left + cRect.width / 2;
    var cy = cRect.top - fRect.top + cRect.height / 2;
    var tw = tooltipEl.offsetWidth, th = tooltipEl.offsetHeight;
    var tx = cx + COVER_SIZE / 2 + 20;
    var ty = cy - th / 2;
    if (tx + tw > frame.offsetWidth - 10) tx = cx - COVER_SIZE / 2 - 20 - tw;
    if (tx < 10) tx = 10;
    if (ty < 0) ty = 0;
    if (ty + th > frame.offsetHeight) ty = frame.offsetHeight - th;
    tooltipEl.style.left = tx + 'px';
    tooltipEl.style.top = ty + 'px';
    tooltipEl.classList.add('visible');
  });
}

function scheduleHide() {
  hideTimer = setTimeout(function () {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }, 80);
}

/* ── CSV PARSER ─────────────────────────────── */

function parseCSV(text) {
  var lines = text.trim().split('\n');
  var headers = csvLine(lines[0]);
  return lines.slice(1).map(function (line) {
    var vals = csvLine(line);
    var obj = {};
    headers.forEach(function (h, i) { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  });
}

function csvLine(line) {
  var result = [], current = '', inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

/* ── HELPERS ────────────────────────────────── */

function parseDate(s) {
  var p = s.split('/');
  return new Date(+p[2], +p[1] - 1, +p[0]);
}

function expandDate(s) {
  var p = s.split('-');
  var yr = +p[2];
  return p[0] + ' ' + p[1].toUpperCase() + ' ' + (yr < 100 ? 2000 + yr : yr);
}

function debounce(fn, ms) {
  var t;
  return function () { clearTimeout(t); t = setTimeout(fn, ms); };
}

/* ── START ──────────────────────────────────── */

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();