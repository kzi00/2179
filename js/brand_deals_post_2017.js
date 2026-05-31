'use strict';

async function parseBrandDealsCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  let cur = '';
  let row = [];
  let inQuotes = false;

  while (i < len) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
      i++;
      continue;
    }

    if ((ch === '\n' || (ch === '\r' && text[i+1] === '\n')) && !inQuotes) {
      // handle CRLF
      if (ch === '\r') i++; // skip \r, next loop will see \n and advance
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  // last field
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const header = rows[0].map(h => h.trim());
  const data = rows.slice(1).map(r => {
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      let v = r[j] !== undefined ? r[j] : '';
      v = v.trim();
      obj[header[j]] = v;
    }
    return obj;
  });

  // Convert numeric columns
  for (const d of data) {
    if (d.year !== undefined) d.year = d.year === '' ? null : +d.year;
    if (d.month !== undefined) d.month = d.month === '' ? null : +d.month;
    if (d.gdelt_peak !== undefined) d.gdelt_peak = d.gdelt_peak === '' ? null : +d.gdelt_peak;
  }

  return data;
}

async function loadAndEmbed() {
  try {
    // Fetch the spec template
    const specResp = await fetch('js/brand_deals_post_2017.json');
    const spec = await specResp.json();

    // Try several possible CSV filenames and add a cache-busting query param
    const candidates = [
      'data/brand_deals_gdelt.csv',
      'data/gdelt_brand_deals.csv',
      'data/brand_deals.csv',
      'data/brand-deals.csv'
    ];
    let csvText = null;
    const t = Date.now();
    for (const cand of candidates) {
      try {
        const resp = await fetch(cand + '?t=' + t);
        if (!resp.ok) continue;
        csvText = await resp.text();
        break;
      } catch (e) {
        // ignore and try next
      }
    }
    if (!csvText) throw new Error('CSV fetch failed for all candidate paths');
    const parsed = await parseBrandDealsCSV(csvText);

    // Ensure all rows preserved and numeric conversions done
    spec.data = { values: parsed };

    // Embed with the assembled spec object
    await vegaEmbed('#brand-deals', spec, { actions: false, renderer: 'svg' });
  } catch (err) {
    // Fallback: try to embed the JSON directly (if fetch failed)
    console.error('brand_deals embed error:', err);
    vegaEmbed('#brand-deals', 'js/brand_deals_post_2017.json', { actions: false, renderer: 'svg' });
  }
}

loadAndEmbed();
