const fs = require('fs');

console.log('--- VERIFICATION START ---');
const appCode = fs.readFileSync('app.js', 'utf8');

const testKecs = ['Cibinong', 'Cileungsi', 'Cigombong', 'Cisarua', 'Bojonggede', 'Gunung Putri', 'Parung'];
testKecs.forEach(k => {
  console.log(`Checking app.js for '${k}':`, appCode.includes(`'${k}'`));
});

const geoRaw = fs.readFileSync('kecamatan_real_geojson.js', 'utf8');
const totalMatches = (geoRaw.match(/"name":/g) || []).length;
console.log('Total kecamatan objects in kecamatan_real_geojson.js:', totalMatches);
console.log('--- VERIFICATION COMPLETE ---');
