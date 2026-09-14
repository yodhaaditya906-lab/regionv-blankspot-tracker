const fs = require('fs');

async function fetchMarketsFromNominatim(queryStr) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=100&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MandiriRegionVBlankspotTracker/1.0 (contact@mandiri.co.id)' }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Nominatim error for', queryStr, e.message);
    return [];
  }
}

async function fetchMarketsFromOverpass() {
  const query = `[out:json][timeout:60];
(
  node["amenity"="marketplace"](-6.8,106.4,-6.1,107.1);
  way["amenity"="marketplace"](-6.8,106.4,-6.1,107.1);
  node["name"~"Pasar",i](-6.8,106.4,-6.1,107.1);
  way["name"~"Pasar",i](-6.8,106.4,-6.1,107.1);
);
out center;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter'
  ];

  for (const ep of endpoints) {
    console.log('Trying Overpass endpoint:', ep);
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MandiriRegionVBlankspotTracker/1.0'
        },
        body: 'data=' + encodeURIComponent(query)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.elements && json.elements.length > 0) {
          console.log('Overpass succeeded with', json.elements.length, 'elements!');
          return json.elements;
        }
      }
    } catch(e) {
      console.log('Overpass endpoint error:', e.message);
    }
  }
  return [];
}

async function main() {
  console.log('🚀 Starting Market Data Collection for Region V (Jaksel, Depok, Bogor)...');

  let rawElements = await fetchMarketsFromOverpass();

  // If Overpass is rate limited, fallback to Nominatim searches across Region V
  if (!rawElements || rawElements.length === 0) {
    console.log('Overpass rate-limited, falling back to Nominatim API queries...');
    const searchQueries = [
      'Pasar Jakarta Selatan',
      'Pasar Depok',
      'Pasar Kota Bogor',
      'Pasar Kabupaten Bogor',
      'Pasar Kebayoran',
      'Pasar Tebet',
      'Pasar Pasar Minggu',
      'Pasar Cibinong',
      'Pasar Parung',
      'Pasar Cileungsi',
      'Pasar Cisarua',
      'Pasar Sawangan',
      'Pasar Cimanggis',
      'Pasar Citeureup',
      'Pasar Ciawi'
    ];

    rawElements = [];
    for (const q of searchQueries) {
      console.log('Querying Nominatim for:', q);
      const results = await fetchMarketsFromNominatim(q);
      rawElements.push(...results);
      // Friendly pause to respect Nominatim rate limit
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log('Total raw market objects collected:', rawElements.length);

  const processedMarkets = [];
  const seenKeys = new Set();

  rawElements.forEach((el, index) => {
    let rawName = '';
    let lat = null;
    let lng = null;
    let displayAddr = '';

    if (el.tags) {
      // Overpass format
      rawName = el.tags.name || el.tags['name:id'] || '';
      lat = el.lat || (el.center && el.center.lat);
      lng = el.lon || (el.center && el.center.lon);
      displayAddr = el.tags['addr:street'] || el.tags['addr:full'] || 'Region V';
    } else if (el.display_name) {
      // Nominatim format
      rawName = el.display_name.split(',')[0];
      lat = parseFloat(el.lat);
      lng = parseFloat(el.lon);
      displayAddr = el.display_name;
    }

    if (!rawName || !lat || !lng) return;

    // Filter out bus stops, train stations, or non-markets
    const nameLower = rawName.toLowerCase();
    if (nameLower.includes('stasiun') || nameLower.includes('halte') || nameLower.includes('terminal')) return;
    if (!nameLower.includes('pasar') && !nameLower.includes('market') && !nameLower.includes('plaza') && !nameLower.includes('induk')) return;

    // Deduplicate
    const key = `${rawName.trim().toLowerCase()}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    let type = 'Pasar Tradisional';
    if (nameLower.includes('induk')) {
      type = 'Pasar Induk';
    } else if (nameLower.includes('modern') || nameLower.includes('plaza') || nameLower.includes('mall') || nameLower.includes('groserindo')) {
      type = 'Pasar Modern';
    }

    processedMarkets.push({
      id: `MKT_${String(processedMarkets.length + 1).padStart(3, '0')}`,
      nama: rawName.trim(),
      type: type,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      alamat: displayAddr
    });
  });

  console.log('✨ Cleaned & Unique Markets Count:', processedMarkets.length);

  const jsContent = `/* BANK MANDIRI REGION V - AUTOMATICALLY FETCHED REAL MARKET DATABASE */\nwindow.MASTER_MARKETS_DATA = ${JSON.stringify(processedMarkets, null, 2)};\n`;
  fs.writeFileSync('master_markets_data.js', jsContent);
  fs.writeFileSync('master_markets_data.json', JSON.stringify(processedMarkets, null, 2));

  console.log('✅ Successfully created master_markets_data.js & master_markets_data.json!');
}

main();
