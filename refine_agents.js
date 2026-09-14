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

const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());

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

const regionVAgents = [];
const nonRegionVAgents = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const row = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
  if (row.length < 3) continue;

  const latVal = parseFloat(row[latIdx]);
  const lngVal = parseFloat(row[lngIdx]);

  if (isNaN(latVal) || isNaN(lngVal)) continue;

  const cityStr = row[cityIdx] || '';
  const kecStr = row[kecIdx] || '';

  const ptLatLng = [latVal, lngVal];
  const ptLngLat = [lngVal, latVal];

  let isInside = false;
  let detectedCity = cityStr;

  // Check 1: Polygon intersection with official Jaksel, Depok, Kota Bogor, Kab Bogor boundaries
  for (const item of cityPolygons) {
    if (item.poly && isPtInPoly(ptLatLng, item.poly)) {
      isInside = true;
      detectedCity = item.name;
      break;
    }
  }

  // Check 2: Kecamatan FeatureCollection ([lng, lat])
  if (!isInside) {
    for (const feat of kecFeatures) {
      if (feat.geometry && feat.geometry.coordinates) {
        if (checkPtInNestedCoords(ptLngLat, feat.geometry.coordinates)) {
          isInside = true;
          detectedCity = feat.properties ? (feat.properties.WAKADM || feat.properties.NAMOBJ || cityStr) : cityStr;
          break;
        }
      }
    }
  }

  // Check 3: Text check - explicitly exclude Bekasi, Tangerang, Jakbar, Jakpus, Jaktim, Jakut
  const cityLower = cityStr.toLowerCase();
  if (cityLower.includes('bekasi') || cityLower.includes('tangerang') || cityLower.includes('barat') || cityLower.includes('pusat') || cityLower.includes('timur') || cityLower.includes('utara')) {
    isInside = false; // Strictly override if city name is clearly non-Region V
  } else if (!isInside && (cityLower.includes('jakarta selatan') || cityLower.includes('depok') || cityLower.includes('bogor'))) {
    isInside = true;
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
    kecamatan: kecStr,
    kota: detectedCity || cityStr,
    kodePos: row[zipIdx] || '',
    provinsi: row[provIdx] || '',
    areaCluster: row[areaIdx] || ''
  };

  if (isInside) {
    regionVAgents.push(agentObj);
  } else {
    nonRegionVAgents.push(agentObj);
  }
}

// Re-assign IDs
regionVAgents.forEach((a, idx) => {
  a.id = `AGN_${String(idx + 1).padStart(4, '0')}`;
});

console.log('==================================================');
console.log('✅ Strictly KEPT Mandiri Agents in Region V:', regionVAgents.length);
console.log('❌ Excluded Agents (Outside Region V):', nonRegionVAgents.length);
console.log('==================================================');

if (regionVAgents.length > 0) {
  console.log('\nSample Kept Mandiri Agents (Inside Region V):');
  regionVAgents.slice(0, 10).forEach(a => console.log(` - ${a.nama} [${a.lat}, ${a.lng}] (${a.kecamatan}, ${a.kota})`));
}

const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL MANDIRI AGENTS DATABASE (${regionVAgents.length} Agents) */\nwindow.MASTER_AGENTS_DATA = ${JSON.stringify(regionVAgents, null, 2)};\n`;
fs.writeFileSync('master_agents_data.js', jsContent);
fs.writeFileSync('master_agents_data.json', JSON.stringify(regionVAgents, null, 2));

console.log('🎉 Successfully saved master_agents_data.js & master_agents_data.json with strict Region V filtering!');
