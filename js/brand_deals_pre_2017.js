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

		if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQuotes) {
			if (ch === '\r') i++;
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

	if (cur !== '' || row.length) {
		row.push(cur);
		rows.push(row);
	}

	if (rows.length === 0) return [];

	const header = rows[0].map(h => h.trim());
	const data = rows.slice(1).map(r => {
		const obj = {};
		for (let j = 0; j < header.length; j++) {
			let value = r[j] !== undefined ? r[j] : '';
			value = value.trim();
			obj[header[j]] = value;
		}
		return obj;
	});

	for (const item of data) {
		if (item.year !== undefined) item.year = item.year === '' ? null : +item.year;
		if (item.month !== undefined) item.month = item.month === '' ? null : +item.month;
		if (item.search_result_count !== undefined) {
			item.search_result_count = item.search_result_count === '' ? null : +item.search_result_count;
		}
	}

	return data;
}

async function loadAndEmbed() {
	try {
		const specResp = await fetch('js/brand_deals_pre_2017.json');
		const spec = await specResp.json();

		const candidates = [
			'data/brand_deals_search_result.csv',
			'../data/brand_deals_search_result.csv'
		];
		let csvText = null;
		const cacheBust = Date.now();

		for (const candidate of candidates) {
			try {
				const response = await fetch(candidate + '?t=' + cacheBust);
				if (!response.ok) continue;
				csvText = await response.text();
				break;
			} catch (error) {
				// try next candidate
			}
		}

		if (!csvText) throw new Error('CSV fetch failed for all candidate paths');

		const parsed = await parseBrandDealsCSV(csvText);

		// compute numeric year_position for each row and set a symmetric x-domain around 2013-2016
		const yearPositions = parsed.map(d => (d.year != null && d.month != null) ? (d.year + (d.month - 1) / 12) : null).filter(v => v != null);
		if (yearPositions.length > 0 && Array.isArray(spec.scales)) {
			// Set strict domain from July 2012 to 2017
			for (const s of spec.scales) {
				if (s.name === 'x') {
					s.domain = [2012.5, 2017];
					s.nice = false;
					s.zero = false;
				}
			}
		}

		if (Array.isArray(spec.data) && spec.data.length > 0) {
			spec.data[0].values = parsed;
			delete spec.data[0].url;
			delete spec.data[0].format;
		}

		await vegaEmbed('#brand-deals-pre-2017', spec, {
			actions: false,
			renderer: 'svg'
		});
	} catch (error) {
		console.error('brand_deals_pre_2017 embed error:', error);
		vegaEmbed('#brand-deals-pre-2017', 'js/brand_deals_pre_2017.json', {
			actions: false,
			renderer: 'svg'
		});
	}
}

loadAndEmbed();
