const https = require('https');
const fs = require('fs');

const query = `[out:json][timeout:20];
area["name"="Kota Depok"]->.a;
relation["boundary"="administrative"](area.a);
out tags;`;

const url = 'https://overpass.kumi.systems/api/interpreter?data=' + encodeURIComponent(query);

https.get(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MandiriTracker/2.0' }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const data = JSON.parse(body);
      console.log('Got relations count:', data.elements.length);
      data.elements.forEach(e => {
        console.log(`Relation ID: ${e.id} | Name: "${e.tags ? e.tags.name : ''}" | Level: ${e.tags ? e.tags.admin_level : ''}`);
      });
      fs.writeFileSync('depok_relation_ids.json', body, 'utf8');
    } else {
      console.log('Status:', res.statusCode, body.slice(0, 200));
    }
  });
});
