const fs = require('fs');

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

// Handles MultiPolygons or nested array of polygons (e.g. GeoJSON coordinates [lng, lat])
function checkPtInNestedCoords(pt, coords) {
  if (!Array.isArray(coords) || coords.length === 0) return false;
  if (typeof coords[0][0] === 'number') {
    return isPtInPoly(pt, coords);
  }
  return coords.some(sub => checkPtInNestedCoords(pt, sub));
}

function loadGeoJSON(filePath, varName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = {};
  const fn = new Function('window', code);
  fn(sandbox);
  return sandbox[varName];
}

const jaksel = loadGeoJSON('jaksel_real_geojson.js', 'JAKSEL_OFFICIAL_REAL_GEOJSON');
const depok = loadGeoJSON('depok_real_geojson.js', 'DEPOK_OFFICIAL_REAL_GEOJSON');
const kotaBogor = loadGeoJSON('kota_bogor_real_geojson.js', 'KOTA_BOGOR_OFFICIAL_REAL_GEOJSON');
const kabBogor = loadGeoJSON('kab_bogor_real_geojson.js', 'KAB_BOGOR_OFFICIAL_REAL_GEOJSON');
const kecGeo = loadGeoJSON('kecamatan_real_geojson.js', 'KECAMATAN_REAL_GEOJSON');

const cityPolygons = [
  { name: 'Jakarta Selatan', poly: jaksel },
  { name: 'Depok', poly: depok },
  { name: 'Kota Bogor', poly: kotaBogor },
  { name: 'Kabupaten Bogor', poly: kabBogor }
];

const kecFeatures = (kecGeo && kecGeo.features) ? kecGeo.features : [];

const rawMarkets = JSON.parse(fs.readFileSync('master_markets_data.json', 'utf8'));
console.log('Total input markets:', rawMarkets.length);

const insideMarkets = [];
const outsideMarkets = [];

rawMarkets.forEach(m => {
  const ptLatLng = [m.lat, m.lng]; // [lat, lng] for official city boundary polygons
  const ptLngLat = [m.lng, m.lat]; // [lng, lat] for standard GeoJSON features

  let isInside = false;
  let matchedRegion = '';

  // 1. Check City Polygons ([lat, lng])
  for (const item of cityPolygons) {
    if (item.poly && isPtInPoly(ptLatLng, item.poly)) {
      isInside = true;
      matchedRegion = item.name;
      break;
    }
  }

  // 2. Check Kecamatan FeatureCollection ([lng, lat]) if not yet matched
  if (!isInside) {
    for (const feat of kecFeatures) {
      if (feat.geometry && feat.geometry.coordinates) {
        if (checkPtInNestedCoords(ptLngLat, feat.geometry.coordinates)) {
          isInside = true;
          matchedRegion = feat.properties ? (feat.properties.WAKADM || feat.properties.NAMOBJ || 'Kecamatan Region V') : 'Region V';
          break;
        }
      }
    }
  }

  if (isInside) {
    m.wilayah = matchedRegion;
    insideMarkets.push(m);
  } else {
    outsideMarkets.push(m);
  }
});

console.log('==============================================');
console.log('✅ KEPT (Strictly Inside Region V):', insideMarkets.length);
console.log('❌ REMOVED (Outside Region V - Tangerang, Bekasi, Jakbar, Jakpus, Jaktim):', outsideMarkets.length);
console.log('==============================================');

console.log('\nSample KEPT Markets (Inside Region V):');
insideMarkets.slice(0, 15).forEach(m => console.log(` - ${m.nama} [${m.lat}, ${m.lng}] (${m.wilayah})`));

console.log('\nSample REMOVED Markets (Outside Region V):');
outsideMarkets.slice(0, 15).forEach(m => console.log(` - ${m.nama} [${m.lat}, ${m.lng}]`));

// Save filtered results
insideMarkets.forEach((m, idx) => {
  m.id = `MKT_${String(idx + 1).padStart(3, '0')}`;
});

const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL REAL MARKET DATABASE (${insideMarkets.length} Markets Strictly Inside Jaksel, Depok, Bogor) */\nwindow.MASTER_MARKETS_DATA = ${JSON.stringify(insideMarkets, null, 2)};\n`;
fs.writeFileSync('master_markets_data.js', jsContent);
fs.writeFileSync('master_markets_data.json', JSON.stringify(insideMarkets, null, 2));

console.log('\n🎉 Successfully filtered and saved master_markets_data.js!');
