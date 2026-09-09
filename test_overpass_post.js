const https = require('https');
const fs = require('fs');

const query = `[out:json][timeout:60];
(
  relation["boundary"="administrative"]["name"~"Kalibaru|Sukamaju|Jatimulya|Kalimulya"];
);
out geom;`;

const postData = 'data=' + encodeURIComponent(query);

const options = {
  hostname: 'overpass-api.de',
  port: 443,
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'MandiriApp/1.0 (Contact: admin@mandiri.co.id)'
  }
};

console.log('Sending POST to overpass-api.de for Cilodong kelurahans...');
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    if (res.statusCode === 200) {
      const data = JSON.parse(body);
      console.log('🎉 SUCCESS! Got elements count:', data.elements ? data.elements.length : 0);
      data.elements.forEach(e => {
        console.log(`ID: ${e.id} | Name: "${e.tags ? e.tags.name : ''}" | Level: ${e.tags ? e.tags.admin_level : ''} | Members: ${e.members ? e.members.length : 0}`);
      });
      fs.writeFileSync('cilodong_kelurahans_osm.json', body, 'utf8');
    } else {
      console.log('Body:', body.slice(0, 300));
    }
  });
});

req.on('error', (e) => console.error('Req error:', e.message));
req.write(postData);
req.end();
