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

console.log('Loading official Region V GeoJSON boundary polygons...');
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

const csvText = fs.readFileSync('agents_sheet_raw.csv', 'utf8');
const lines = csvText.split(/\r?\n/);

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

const latIdx = 1;
const lngIdx = 2;
const nameIdx = 3;
const ownerIdx = 4;
const phoneIdx = 6;
const addrIdx = 7;
const kelIdx = 8;
const kecIdx = 9;
const cityIdx = 10;
const zipIdx = 11;
const provIdx = 12;
const areaIdx = 13;
const codeIdx = 14;

const validRegionVAgents = [];
const invalidGpsAgents = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const row = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
  if (row.length < 3) continue;

  const latVal = parseFloat(row[latIdx]);
  const lngVal = parseFloat(row[lngIdx]);

  if (isNaN(latVal) || isNaN(lngVal)) continue;

  const ptLatLng = [latVal, lngVal];
  const ptLngLat = [lngVal, latVal];

  // STRICT PHYSICAL POLYGON CHECK (NO TEXT OVERRIDE!)
  let isPhysicallyInsideRegionV = false;
  let detectedRegion = '';

  // 1. Check City Polygons ([lat, lng])
  for (const item of cityPolygons) {
    if (item.poly && isPtInPoly(ptLatLng, item.poly)) {
      isPhysicallyInsideRegionV = true;
      detectedRegion = item.name;
      break;
    }
  }

  // 2. Check Kecamatan FeatureCollection ([lng, lat])
  if (!isPhysicallyInsideRegionV) {
    for (const feat of kecFeatures) {
      if (feat.geometry && feat.geometry.coordinates) {
        if (checkPtInNestedCoords(ptLngLat, feat.geometry.coordinates)) {
          isPhysicallyInsideRegionV = true;
          detectedRegion = feat.properties ? (feat.properties.WAKADM || feat.properties.NAMOBJ || row[cityIdx]) : row[cityIdx];
          break;
        }
      }
    }
  }

  const agentObj = {
    id: '',
    kodeAgen: row[codeIdx] || '',
    nama: row[nameIdx] || `Agen Mandiri ${i}`,
    pemilik: row[ownerIdx] || '',
    telepon: row[phoneIdx] || '',
    lat: Number(latVal.toFixed(6)),
    lng: Number(lngVal.toFixed(6)),
    alamat: row[addrIdx] || '',
    kelurahan: row[kelIdx] || '',
    kecamatan: row[kecIdx] || '',
    kota: row[cityIdx] || detectedRegion,
    kodePos: row[zipIdx] || '',
    provinsi: row[provIdx] || '',
    areaCluster: row[areaIdx] || ''
  };

  if (isPhysicallyInsideRegionV) {
    validRegionVAgents.push(agentObj);
  } else {
    invalidGpsAgents.push(agentObj);
  }
}

// Re-assign IDs for valid agents
validRegionVAgents.forEach((a, idx) => {
  a.id = `AGN_${String(idx + 1).padStart(4, '0')}`;
});

console.log('==================================================');
console.log('✅ STRICTLY VERIFIED GPS IN REGION V:', validRegionVAgents.length);
console.log('❌ REJECTED (Invalid GPS / Outside Polygon):', invalidGpsAgents.length);
console.log('==================================================');

console.log('\nSample REJECTED Agents with faulty GPS coordinates (e.g. TOKO POJOK JAMU in Tangerang):');
invalidGpsAgents.slice(0, 15).forEach(a => {
  console.log(` - ${a.nama} [GPS: ${a.lat}, ${a.lng}] (Text says: ${a.kecamatan}, ${a.kota})`);
});

const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL MANDIRI AGENTS DATABASE (${validRegionVAgents.length} Strictly Validated GPS Agents) */\nwindow.MASTER_AGENTS_DATA = ${JSON.stringify(validRegionVAgents, null, 2)};\n`;
fs.writeFileSync('master_agents_data.js', jsContent);
fs.writeFileSync('master_agents_data.json', JSON.stringify(validRegionVAgents, null, 2));

console.log('\n🎉 Successfully saved updated master_agents_data.js & master_agents_data.json!');
