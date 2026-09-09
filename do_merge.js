const fs = require('fs');

console.log('Loading kecamatan_real_geojson.js...');
const currentGeoRaw = fs.readFileSync('kecamatan_real_geojson.js', 'utf8');
let window = {};
eval(currentGeoRaw);

const currentMap = window.KECAMATAN_REAL_GEOJSON;
console.log('Current kecamatan count:', Object.keys(currentMap).length);

const kabBogorPolys = JSON.parse(fs.readFileSync('real_kab_bogor_kecamatan_polygons.json', 'utf8'));
console.log('Kab Bogor polys count to merge:', Object.keys(kabBogorPolys).length);

let addedCount = 0;
let updatedCount = 0;

Object.keys(kabBogorPolys).forEach(name => {
  const item = kabBogorPolys[name];
  if (!currentMap[name]) {
    addedCount++;
  } else {
    updatedCount++;
  }
  currentMap[name] = {
    name: item.name,
    displayName: item.displayName,
    coords: item.coords
  };
});

console.log(`Added ${addedCount} new kecamatans, updated ${updatedCount} existing kecamatans.`);
console.log('Total kecamatan in dataset after merge:', Object.keys(currentMap).length);

const outContent = 'window.KECAMATAN_REAL_GEOJSON = ' + JSON.stringify(currentMap, null, 2) + ';\n';

const path1 = 'c:/Users/Yodha Adytia/Documents/Magang di Mandiri (KSM)/regionv-blankspot-tracker/kecamatan_real_geojson.js';
const path2 = 'c:/Users/Yodha Adytia/Documents/Magang di Mandiri (KSM)/ksmbankmandiri/regionv-blankspot-tracker/kecamatan_real_geojson.js';

fs.writeFileSync(path1, outContent, 'utf8');
if (fs.existsSync('c:/Users/Yodha Adytia/Documents/Magang di Mandiri (KSM)/ksmbankmandiri/regionv-blankspot-tracker')) {
  fs.writeFileSync(path2, outContent, 'utf8');
}

console.log('🎉 Successfully saved merged kecamatan_real_geojson.js to both workspace locations!');
