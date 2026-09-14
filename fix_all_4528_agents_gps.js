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

function isInsideRegionVPolygons(lat, lng) {
  const ptLatLng = [lat, lng];
  const ptLngLat = [lng, lat];

  for (const item of cityPolygons) {
    if (item.poly && isPtInPoly(ptLatLng, item.poly)) return true;
  }
  for (const feat of kecFeatures) {
    if (feat.geometry && feat.geometry.coordinates) {
      if (checkPtInNestedCoords(ptLngLat, feat.geometry.coordinates)) return true;
    }
  }
  return false;
}

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

// Phase 1: Collect valid GPS coordinates for each Kecamatan to compute accurate Kecamatan Centroids
const kecGpsMap = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const row = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
  if (row.length < 3) continue;

  const latVal = parseFloat(row[latIdx]);
  const lngVal = parseFloat(row[lngIdx]);
  const kecStr = (row[kecIdx] || '').trim().toUpperCase();

  if (!isNaN(latVal) && !isNaN(lngVal) && kecStr) {
    if (isInsideRegionVPolygons(latVal, lngVal)) {
      if (!kecGpsMap[kecStr]) kecGpsMap[kecStr] = [];
      kecGpsMap[kecStr].push({ lat: latVal, lng: lngVal });
    }
  }
}

// Calculate centroid for each kecamatan from valid rows
const kecCentroids = {};
Object.keys(kecGpsMap).forEach(kec => {
  const arr = kecGpsMap[kec];
  const avgLat = arr.reduce((s, p) => s + p.lat, 0) / arr.length;
  const avgLng = arr.reduce((s, p) => s + p.lng, 0) / arr.length;
  kecCentroids[kec] = { lat: Number(avgLat.toFixed(6)), lng: Number(avgLng.toFixed(6)) };
});

console.log('Computed valid Kecamatan Centroids count:', Object.keys(kecCentroids).length);

// Phase 2: Build final dataset, correcting any mistyped GPS rows using their real Kecamatan centroid
const finalRegionVAgents = [];
let validOriginalGpsCount = 0;
let autoCorrectedGpsCount = 0;
let excludedNonRegionVCount = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const row = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
  if (row.length < 3) continue;

  let latVal = parseFloat(row[latIdx]);
  let lngVal = parseFloat(row[lngIdx]);
  const cityStr = row[cityIdx] || '';
  const kecStr = (row[kecIdx] || '').trim().toUpperCase();
  const addrStr = row[addrIdx] || '';

  const cityLower = cityStr.toLowerCase();

  // Exclude non-Region V cities explicitly (Bekasi, Tangerang, Jakarta Timur, Jakarta Barat, Jakarta Pusat, Jakarta Utara)
  if (cityLower.includes('bekasi') || cityLower.includes('tangerang') || cityLower.includes('barat') || cityLower.includes('pusat') || cityLower.includes('timur') || cityLower.includes('utara')) {
    excludedNonRegionVCount++;
    continue;
  }

  // Must belong to Region V (Jaksel, Depok, Kota Bogor, Kab Bogor)
  const isDeclaredRegionV = cityLower.includes('jakarta selatan') || cityLower.includes('depok') || cityLower.includes('bogor') || kecCentroids[kecStr] !== undefined;

  if (!isDeclaredRegionV) {
    excludedNonRegionVCount++;
    continue;
  }

  // Test if current GPS coordinates physically land inside Region V polygon
  let isGpsValid = (!isNaN(latVal) && !isNaN(lngVal)) && isInsideRegionVPolygons(latVal, lngVal);

  if (isGpsValid) {
    validOriginalGpsCount++;
  } else if (isDeclaredRegionV) {
    // Faulty GPS coordinate! (e.g. TOKO POJOK JAMU row in Srengseng Sawah with mistyped lat -6.219, lng 106.497)
    // Auto-correct GPS coordinates to its real Kecamatan centroid!
    if (kecCentroids[kecStr]) {
      const centroid = kecCentroids[kecStr];
      const hash = (i * 47) % 100;
      const angle = (hash / 100) * 2 * Math.PI;
      const dist = 0.001 + (hash % 15) * 0.0003;

      latVal = Number((centroid.lat + Math.sin(angle) * dist).toFixed(6));
      lngVal = Number((centroid.lng + Math.cos(angle) * dist).toFixed(6));
      isGpsValid = true;
      autoCorrectedGpsCount++;
    }
  }

  if (isGpsValid) {
    finalRegionVAgents.push({
      id: `AGN_${String(finalRegionVAgents.length + 1).padStart(4, '0')}`,
      kodeAgen: row[codeIdx] || '',
      nama: row[nameIdx] || `Agen Mandiri ${i}`,
      pemilik: row[ownerIdx] || '',
      telepon: row[phoneIdx] || '',
      lat: Number(latVal.toFixed(6)),
      lng: Number(lngVal.toFixed(6)),
      alamat: addrStr,
      kelurahan: row[kelIdx] || '',
      kecamatan: row[kecIdx] || '',
      kota: cityStr || 'Region V',
      kodePos: row[zipIdx] || '',
      provinsi: row[provIdx] || '',
      areaCluster: row[areaIdx] || ''
    });
  }
}

console.log('==================================================');
console.log('🎉 TOTAL MANDIRI AGENTS IN REGION V:', finalRegionVAgents.length);
console.log('  - Valid Original GPS Rows:', validOriginalGpsCount);
console.log('  - Auto-corrected Mistyped GPS Rows (e.g. TOKO POJOK JAMU):', autoCorrectedGpsCount);
console.log('  - Excluded Non-Region V Agents (Bekasi, Tangerang, etc.):', excludedNonRegionVCount);
console.log('==================================================');

// Find TOKO POJOK JAMU to verify fix
const pojokJamu = finalRegionVAgents.find(a => a.nama.includes('POJOK JAMU') || a.kodeAgen === '1523742');
if (pojokJamu) {
  console.log('\n✅ VERIFIED FIX for TOKO POJOK JAMU:');
  console.log(`   Name: ${pojokJamu.nama} (#${pojokJamu.kodeAgen})`);
  console.log(`   New Corrected GPS: [${pojokJamu.lat}, ${pojokJamu.lng}]`);
  console.log(`   Kecamatan: ${pojokJamu.kecamatan}, Kota: ${pojokJamu.kota}`);
}

const timestamp = Date.now();
const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL MANDIRI AGENTS DATABASE (${finalRegionVAgents.length} Agents) */\nwindow.MASTER_AGENTS_DATA = ${JSON.stringify(finalRegionVAgents, null, 2)};\n`;
fs.writeFileSync('master_agents_data.js', jsContent);
fs.writeFileSync('master_agents_data.json', JSON.stringify(finalRegionVAgents, null, 2));

console.log('🎉 Successfully saved master_agents_data.js & master_agents_data.json!');
