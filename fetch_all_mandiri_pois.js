const fs = require('fs');

async function fetchAllMandiriPOIs() {
  const query = `[out:json][timeout:60];
(
  node["amenity"="bank"]["name"~"Mandiri"](-6.8,106.6,-6.1,107.0);
  way["amenity"="bank"]["name"~"Mandiri"](-6.8,106.6,-6.1,107.0);
);
out center;`;

  console.log('Fetching all Bank Mandiri POIs from OpenStreetMap in Region V area...');
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];

  for (const ep of endpoints) {
    console.log('Trying endpoint:', ep);
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!res.ok) continue;
      const json = await res.json();
      console.log('Got Mandiri POIs count:', json.elements.length);
      fs.writeFileSync('osm_mandiri_pois_raw.json', JSON.stringify(json.elements, null, 2));
      return json.elements;
    } catch(e) {
      console.log('Error:', e.message);
    }
  }
}

fetchAllMandiriPOIs();
