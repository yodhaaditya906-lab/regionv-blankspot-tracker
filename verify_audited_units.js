const fs = require('fs');

const code = fs.readFileSync('master_kcps_data.js', 'utf8');
let window = {};
eval(code);

const units = window.MASTER_KCPS_DATA;
console.log('--- VERIFICATION START ---');
console.log('Total units in master_kcps_data.js:', units.length);

const targets = [
  'Jakarta Saharjo 1',
  'Jakarta M.T. Haryono 1',
  'Jakarta World Trade Center 1',
  'Jakarta Tebet Supomo 1',
  'Depok Universitas Indonesia 1'
];

targets.forEach(t => {
  const u = units.find(x => x.kcp === t);
  if (u) {
    console.log(`✅ ${u.kcp} => [${u.lat}, ${u.lng}] (${u.alamat})`);
  } else {
    console.log(`❌ Not found: ${t}`);
  }
});
console.log('--- VERIFICATION END ---');
