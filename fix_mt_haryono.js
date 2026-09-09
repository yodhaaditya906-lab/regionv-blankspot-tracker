const fs = require('fs');
const path = require('path');

const code = fs.readFileSync('master_kcps_data.js', 'utf8');
let window = {};
eval(code);
const data = window.MASTER_KCPS_DATA;

data.forEach(item => {
  if (item.kcp.toLowerCase().includes('m.t. haryono') || item.alamat.toLowerCase().includes('m.t. haryono')) {
    item.lat = -6.241850;
    item.lng = 106.845600;
    item.geocodedBy = 'exact_google_maps_pin';
  }
});

const jsonStr = JSON.stringify(data, null, 2);
const jsStr = 'window.MASTER_KCPS_DATA = ' + jsonStr + ';\n';

fs.writeFileSync('master_kcps_data.js', jsStr, 'utf8');
fs.writeFileSync('master_google_sheet_kcps.json', jsonStr, 'utf8');
if (!fs.existsSync('data')) fs.mkdirSync('data');
fs.writeFileSync('data/master_google_sheet_kcps.json', jsonStr, 'utf8');

const syncDir = 'c:/Users/Yodha Adytia/Documents/Magang di Mandiri (KSM)/ksmbankmandiri/regionv-blankspot-tracker';
if (fs.existsSync(syncDir)) {
  fs.writeFileSync(path.join(syncDir, 'master_kcps_data.js'), jsStr, 'utf8');
  fs.writeFileSync(path.join(syncDir, 'master_google_sheet_kcps.json'), jsonStr, 'utf8');
  if (fs.existsSync(path.join(syncDir, 'data'))) {
    fs.writeFileSync(path.join(syncDir, 'data/master_google_sheet_kcps.json'), jsonStr, 'utf8');
  }
}

const mtHaryono = data.find(i => i.kcp.includes('M.T. Haryono'));
console.log('✅ FIXED MT Haryono Unit exact coordinates:', mtHaryono.lat, mtHaryono.lng);
