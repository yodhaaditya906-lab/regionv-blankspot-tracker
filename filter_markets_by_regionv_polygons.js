const fs = require('fs');

// Point-in-Polygon Ray Casting Algorithm
function isPtInPoly(pt, vs) {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    if (!vs[i] || !vs[j]) continue;
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    if (typeof xi !== 'number' || typeof yi !== 'number') continue;
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkPointInCoords(pt, coords) {
  if (!Array.isArray(coords) || coords.length === 0) return false;
  if (typeof coords[0][0] === 'number') {
    return isPtInPoly(pt, coords);
  }
  return coords.some(sub => checkPointInCoords(pt, sub));
}

function checkPointInGeoJSON(pt, geojson) {
  if (!geojson || !geojson.features) return false;
  return geojson.features.some(feature => {
    if (!feature.geometry || !feature.geometry.coordinates) return false;
    return checkPointInCoords(pt, feature.geometry.coordinates);
  });
}

function loadGeoJSON(filePath, varName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = {};
  const fn = new Function('window', code);
  fn(sandbox);
  return sandbox[varName];
}

console.log('Loading Region V GeoJSON boundaries...');
const jakselGeo = loadGeoJSON('jaksel_real_geojson.js', 'JAKSEL_REAL_GEOJSON');
const depokGeo = loadGeoJSON('depok_real_geojson.js', 'DEPOK_REAL_GEOJSON');
const kotaBogorGeo = loadGeoJSON('kota_bogor_real_geojson.js', 'KOTA_BOGOR_REAL_GEOJSON');
const kabBogorGeo = loadGeoJSON('kab_bogor_real_geojson.js', 'KAB_BOGOR_REAL_GEOJSON');
const kecGeo = loadGeoJSON('kecamatan_real_geojson.js', 'KECAMATAN_REAL_GEOJSON');

const regionVGeoJSONs = [jakselGeo, depokGeo, kotaBogorGeo, kabBogorGeo, kecGeo].filter(Boolean);

console.log('Loading current master_markets_data.json...');
const markets = JSON.parse(fs.readFileSync('master_markets_data.json', 'utf8'));
console.log('Total markets before spatial filtering:', markets.length);

const validRegionVMarkets = [];
const removedMarkets = [];

markets.forEach(m => {
  const pt = [m.lng, m.lat]; // GeoJSON format: [longitude, latitude]
  
  let isInsideRegionV = false;
  for (const geo of regionVGeoJSONs) {
    if (checkPointInGeoJSON(pt, geo)) {
      isInsideRegionV = true;
      break;
    }
  }

  if (isInsideRegionV) {
    validRegionVMarkets.push(m);
  } else {
    removedMarkets.push(m);
  }
});

console.log('==================================================');
console.log('✅ Kept (Inside Region V: Jaksel, Depok, Bogor):', validRegionVMarkets.length);
console.log('❌ Removed (Outside Region V):', removedMarkets.length);
console.log('==================================================');

if (removedMarkets.length > 0) {
  console.log('\nSample removed markets (Outside Region V):');
  removedMarkets.slice(0, 15).forEach(m => console.log(` - ${m.nama} [${m.lat}, ${m.lng}]`));
}

// Re-assign clean IDs without modifying any existing market properties
validRegionVMarkets.forEach((m, idx) => {
  m.id = `MKT_${String(idx + 1).padStart(3, '0')}`;
});

const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL REAL MARKET DATABASE (${validRegionVMarkets.length} Markets in Jaksel, Depok, Bogor) */\nwindow.MASTER_MARKETS_DATA = ${JSON.stringify(validRegionVMarkets, null, 2)};\n`;
fs.writeFileSync('master_markets_data.js', jsContent);
fs.writeFileSync('master_markets_data.json', JSON.stringify(validRegionVMarkets, null, 2));

console.log('\n🎉 Successfully updated master_markets_data.js & master_markets_data.json with strict Region V spatial boundary filtering!');
