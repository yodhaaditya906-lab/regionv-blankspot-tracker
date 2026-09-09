const fs = require('fs');

// Load parsed 93 branches
const branches = JSON.parse(fs.readFileSync('parsed_user_branches.json', 'utf8'));
console.log('Loaded branches:', branches.length);

async function searchNominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MandiriPreciseGeocoder/2.0'
      }
    });
    if (res.ok) {
      const items = await res.json();
      if (items && items.length > 0) return items[0];
    }
  } catch(e) {}
  return null;
}

async function run() {
  const results = [];
  for (let i = 0; i < branches.length; i++) {
    const b = branches[i];
    console.log(`[${i+1}/${branches.length}] Processing: ${b.kcp}...`);

    // Build targeted queries
    const q1 = `Bank Mandiri ${b.kcp}`;
    const q2 = `${b.kcp}, ${b.city}`;
    const q3 = `${b.alamat}, ${b.city}`;

    let hit = await searchNominatim(q1);
    if (!hit) hit = await searchNominatim(q2);
    if (!hit) hit = await searchNominatim(q3);

    if (hit) {
      console.log(`  -> GOT: ${hit.display_name} [${hit.lat}, ${hit.lon}]`);
      results.push({
        ...b,
        foundName: hit.display_name,
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon)
      });
    } else {
      console.log(`  -> NO MATCH for ${b.kcp}`);
      results.push({
        ...b,
        foundName: 'None',
        lat: null,
        lng: null
      });
    }
    await new Promise(r => setTimeout(r, 1100)); // Respect 1.1s Nominatim rate limit
  }

  fs.writeFileSync('nominatim_geocoded_93_units.json', JSON.stringify(results, null, 2));
  console.log('🎉 Finished geocoding all 93 units! Saved to nominatim_geocoded_93_units.json');
}

run();
