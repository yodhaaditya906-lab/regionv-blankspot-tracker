const fs = require('fs');

const code = fs.readFileSync('master_kcps_data.js', 'utf8');
let window = {};
eval(code);
const units = window.MASTER_KCPS_DATA;

console.log('=== ALL 93 UNITS LIST ===');
units.forEach((u, i) => {
  console.log(`${i+1}. [${u.id}] ${u.kcp} | Alamat: ${u.alamat} | Kec: ${u.kecamatan}, Kota: ${u.city} | Current: [${u.lat}, ${u.lng}]`);
});
