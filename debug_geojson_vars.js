const fs = require('fs');

function checkFile(filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const sandbox = {};
  const fn = new Function('window', code);
  fn(sandbox);
  console.log(`=== ${filename} ===`);
  Object.keys(sandbox).forEach(k => {
    const val = sandbox[k];
    console.log(`- window.${k}: type=${typeof val}, isArray=${Array.isArray(val)}, length=${val ? val.length : 0}`);
  });
}

checkFile('jaksel_real_geojson.js');
checkFile('depok_real_geojson.js');
checkFile('kota_bogor_real_geojson.js');
checkFile('kab_bogor_real_geojson.js');
checkFile('kecamatan_real_geojson.js');
