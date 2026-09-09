const https = require('https');
const fs = require('fs');

const query = `[out:json][timeout:90];
area["name"="Kota Depok"]->.searchArea;
relation["boundary"="administrative"](area.searchArea);
out geom;`;

const endpoint = 'https://overpass.kumi.systems/api/interpreter';
console.log('Querying all administrative relations in Kota Depok...');

const fullUrl = endpoint + '?data=' + encodeURIComponent(query);
const req = https.get(fullUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MandiriTracker/2.0'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    if (res.statusCode === 200) {
      fs.writeFileSync('all_depok_admin_overpass.json', body, 'utf8');
      const data = JSON.parse(body);
      console.log('🎉 Got elements count:', data.elements ? data.elements.length : 0);
      data.elements.forEach(e => {
        console.log(`ID: ${e.id} | Name: "${e.tags ? e.tags.name : ''}" | Level: ${e.tags ? e.tags.admin_level : ''} | Members: ${e.members ? e.members.length : 0}`);
      });
    } else {
      console.log('Response body preview:', body.slice(0, 300));
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
