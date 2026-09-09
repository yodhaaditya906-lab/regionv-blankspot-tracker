const fs = require('fs');

const kecs = [
  'Babakan Madang', 'Bojonggede', 'Caringin', 'Cariu', 'Ciampea', 'Ciawi', 
  'Cibinong', 'Cibungbulang', 'Cigombong', 'Cigudeg', 'Cijeruk', 'Cileungsi', 
  'Ciomas', 'Cisarua', 'Ciseeng', 'Citeureup', 'Dramaga', 'Gunung Putri', 
  'Gunung Sindur', 'Jasinga', 'Jonggol', 'Kemang', 'Klapanunggal', 'Leuwiliang', 
  'Leuwisadeng', 'Megamendung', 'Nanggung', 'Pamijahan', 'Parung', 'Parung Panjang', 
  'Ranca Bungur', 'Rumpin', 'Sukajaya', 'Sukamakmur', 'Sukaraja', 'Tajurhalang', 
  'Tamansari', 'Tanjungsari', 'Tenjo', 'Tenjolaya'
];

function convertCoords(coords, type) {
  if (type === 'Polygon') {
    return coords[0].map(p => [parseFloat(p[1].toFixed(7)), parseFloat(p[0].toFixed(7))]);
  } else if (type === 'MultiPolygon') {
    return coords.map(poly => poly[0].map(p => [parseFloat(p[1].toFixed(7)), parseFloat(p[0].toFixed(7))]));
  }
  return [];
}

async function fetchKecBoundary(name) {
  const q = `${name}, Kabupaten Bogor, Indonesia`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MandiriTracker/9.0' }
    });
    const items = await res.json();
    if (items && items.length > 0) {
      // Find item with class === 'boundary'
      for (const item of items) {
        if (item.class === 'boundary' && item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')) {
          console.log(`[FOUND BOUNDARY] ${name} => ${item.display_name} (${item.geojson.type})`);
          return {
            name: name,
            displayName: item.display_name,
            coords: convertCoords(item.geojson.coordinates, item.geojson.type)
          };
        }
      }
      // Fallback: any item with Polygon/MultiPolygon
      for (const item of items) {
        if (item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')) {
          console.log(`[FALLBACK POLY] ${name} => ${item.display_name} (${item.geojson.type})`);
          return {
            name: name,
            displayName: item.display_name,
            coords: convertCoords(item.geojson.coordinates, item.geojson.type)
          };
        }
      }
    }
  } catch(e) {
    console.error(`[Error] ${name}:`, e.message);
  }
  return null;
}

async function run() {
  const result = {};
  console.log(`Starting fetch for ${kecs.length} Kabupaten Bogor kecamatan boundaries...`);
  for (let i = 0; i < kecs.length; i++) {
    const name = kecs[i];
    console.log(`[${i+1}/${kecs.length}] Fetching boundary for: ${name}...`);
    const data = await fetchKecBoundary(name);
    if (data) {
      result[name] = data;
    } else {
      console.log(`  -> FAILED for ${name}`);
    }
    await new Promise(r => setTimeout(r, 1100)); // Respect 1.1s Nominatim rate limit
  }

  console.log(`🎉 Successfully fetched ${Object.keys(result).length} kecamatan boundary shapes!`);
  fs.writeFileSync('real_kab_bogor_kecamatan_polygons.json', JSON.stringify(result, null, 2));
}

run();
