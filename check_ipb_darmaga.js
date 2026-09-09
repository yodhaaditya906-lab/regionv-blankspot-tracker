const fs = require('fs');

const csvText = fs.readFileSync('user_branches_raw.csv', 'utf8');
console.log('=== SEARCHING IPB / DARMAGA IN CSV ===');
csvText.split(/\r?\n/).forEach((line, idx) => {
  if (line.toLowerCase().includes('ipb') || line.toLowerCase().includes('darmaga') || line.toLowerCase().includes('dramaga')) {
    console.log(`Line ${idx+1}: ${line}`);
  }
});

const masterCode = fs.readFileSync('master_kcps_data.js', 'utf8');
let window = {};
eval(masterCode);
console.log('\n=== SEARCHING IPB / DARMAGA IN MASTER_KCPS_DATA ===');
window.MASTER_KCPS_DATA.forEach(u => {
  if (u.kcp.toLowerCase().includes('ipb') || u.kcp.toLowerCase().includes('darmaga') || u.kcp.toLowerCase().includes('dramaga')) {
    console.log(`${u.kcp} | Alamat: ${u.alamat} | Lat/Lng: [${u.lat}, ${u.lng}]`);
  }
});
