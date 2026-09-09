const fs = require('fs');

const masterCode = fs.readFileSync('master_kcps_data.js', 'utf8');
let window = {};
eval(masterCode);
const units = window.MASTER_KCPS_DATA;

console.log('=== UNITS WITH FALLBACK / TEBET COORDINATES (-6.223409 or lat > -6.23 in Tebet) ===');
const fallbackUnits = [];
units.forEach((u, i) => {
  if (u.lat === -6.223409 || (u.lat > -6.23 && u.lat < -6.21 && u.lng > 106.84 && u.city !== 'Jakarta Selatan')) {
    fallbackUnits.push(u);
    console.log(`${i+1}. [${u.id}] ${u.kcp} | ${u.alamat} | Kec: ${u.kecamatan}, City: ${u.city} => [${u.lat}, ${u.lng}]`);
  }
});

console.log(`\nTotal units with incorrect fallback coordinates: ${fallbackUnits.length} / ${units.length}`);
