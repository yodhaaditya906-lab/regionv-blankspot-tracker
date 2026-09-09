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

async function fetchKec(name) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('Kecamatan ' + name + ', Kabupaten Bogor, Jawa Barat, Indonesia')}&format=json&polygon_geojson=1&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Mandiri/5.0' }
    });
    const items = await res.json();
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')) {
          console.log(`[OK] ${name} => ${item.display_name} (${item.geojson.type})`);
          return {
            name: name,
            displayName: item.display_name,
            type: item.geojson.type,
            rawCoordinates: item.geojson.coordinates
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
  for (let i = 0; i < kecs.length; i++) {
    const name = kecs[i];
    console.log(`[${i+1}/${kecs.length}] Querying Nominatim for: ${name}...`);
    const data = await fetchKec(name);
    if (data) {
      result[name] = data;
    } else {
      console.log(`  -> Retry without Kecamatan prefix for ${name}...`);
      const retry = await fetchKec(name + ', Kabupaten Bogor, Jawa Barat');
      if (retry) result[name] = retry;
    }
    await new Promise(r => setTimeout(r, 1100));
  }
  fs.writeFileSync('nominatim_kab_bogor_kecamatan_full.json', JSON.stringify(result, null, 2));
  console.log(`🎉 Saved ${Object.keys(result).length} kecamatan polygons to nominatim_kab_bogor_kecamatan_full.json!`);
}

run();
