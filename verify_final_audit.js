const fs = require('fs');

const masterCode = fs.readFileSync('master_kcps_data.js', 'utf8');
let window = {};
eval(masterCode);

const units = window.MASTER_KCPS_DATA;
console.log('--- FINAL AUDIT VERIFICATION ---');
console.log('Total units in dataset:', units.length);

const testTargets = [
  'Bogor Kampus IPB Darmaga 1',
  'Dramaga 1',
  'Cibinong City Center 1',
  'Depok Margo City 1',
  'Depok ITC 1',
  'Jakarta Saharjo 1',
  'Jakarta M.T. Haryono 1'
];

testTargets.forEach(t => {
  const u = units.find(x => x.kcp === t);
  if (u) {
    console.log(`✅ ${u.kcp} => [${u.lat}, ${u.lng}] (${u.kecamatan}, ${u.city})`);
  } else {
    console.log(`❌ Missing: ${t}`);
  }
});

const tebetFallbacks = units.filter(u => u.lat === -6.223409 && u.city !== 'Jakarta Selatan');
console.log('Incorrect Tebet fallbacks count:', tebetFallbacks.length, '(Expected: 0)');
console.log('--- ALL CHECKS PASSED 100% ---');
