const fs = require('fs');

async function testOverpass() {
  const query = `[out:json][timeout:60];
(
  relation["boundary"="administrative"]["admin_level"="7"]["name"~"Kecamatan"];
  relation["boundary"="administrative"]["admin_level"="7"]["name"~"Cibinong|Bojonggede|Cisarua|Cigombong|Parung|Gunung Sindur|Ciampea|Dramaga|Leuwiliang|Kemang|Ciomas|Citeureup|Gunung Putri|Cileungsi|Klapanunggal|Babakan Madang|Sukaraja|Ciseeng|Rumpin|Jasinga|Cariu|Jonggol|Sukamakmur|Tajurhalang|Megamendung|Ciawi|Caringin|Cijeruk|Nanggung|Pamijahan|Tenjo|Tenjolaya|Tamansari|Tanjungsari|Sukajaya|Leuwisadeng|Cibungbulang|Parung Panjang|Ranca Bungur"];
);
out geom;`;

  console.log('Sending query to Overpass API...');
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
      if (!res.ok) {
        console.log('HTTP error:', res.status);
        continue;
      }
      const json = await res.json();
      console.log('Got elements count:', json.elements.length);
      fs.writeFileSync('overpass_kab_bogor_raw.json', JSON.stringify(json, null, 2));
      return json;
    } catch(e) {
      console.error('Error with endpoint', ep, ':', e.message);
    }
  }
}

testOverpass();
