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

// Kecamatan Centroid lookup table to auto-correct faulty GPS coordinates for agents in Jaksel/Depok/Bogor
const kecCentroids = {
  'jagakarsa': [-6.3424, 106.8242],
  'pasar minggu': [-6.2894, 106.8391],
  'cilandak': [-6.2917, 106.7972],
  'kebayoran lama': [-6.2391, 106.7829],
  'kebayoran baru': [-6.2447, 106.7981],
  'mampang prapatan': [-6.2505, 106.8239],
  'pancoran': [-6.2625, 106.8436],
  'tebet': [-6.2372, 106.8445],
  'setiabudi': [-6.2137, 106.8297],
  'pesanggrahan': [-6.2525, 106.7601],
  'sawangan': [-6.4024, 106.7571],
  'cinere': [-6.3686, 106.7801],
  'limo': [-6.3705, 106.7885],
  'pancoran mas': [-6.3986, 106.8185],
  'sukmajaya': [-6.3951, 106.8488],
  'beji': [-6.3651, 106.8215],
  'cilodong': [-6.4251, 106.8425],
  'cimanggis': [-6.3651, 106.8651],
  'tapos': [-6.4151, 106.8751],
  'cipayung': [-6.4351, 106.7951],
  'bojongsari': [-6.4151, 106.7451],
  'bogor barat': [-6.5824, 106.7621],
  'bogor timur': [-6.6124, 106.8121],
  'bogor selatan': [-6.6324, 106.8021],
  'bogor utara': [-6.5624, 106.8121],
  'bogor tengah': [-6.5951, 106.7951],
  'tanah sareal': [-6.5651, 106.7851],
  'cibinong': [-6.4824, 106.8521],
  'citeureup': [-6.4751, 106.8851],
  'sukaraja': [-6.5551, 106.8351],
  'babakan madang': [-6.5751, 106.8851],
  'bojong gede': [-6.4851, 106.7951],
  'tajurhalang': [-6.4751, 106.7651],
  'parung': [-6.4251, 106.7351],
  'ciseeng': [-6.4251, 106.6851],
  'gunung sindur': [-6.3651, 106.6951],
  'ciawi': [-6.6651, 106.8551],
  'megamendung': [-6.6651, 106.9251],
  'cisarua': [-6.7051, 106.9551],
  'cijeruk': [-6.6951, 106.7951],
  'cigombong': [-6.7451, 106.7851],
  'tamansari': [-6.6451, 106.7651],
  'ciomas': [-6.6051, 106.7651],
  'dramaga': [-6.5851, 106.7351],
  'ciampea': [-6.5551, 106.6951],
  'cibungbulang': [-6.5651, 106.6451],
  'pamijahan': [-6.6351, 106.6451],
  'leuwiliang': [-6.5651, 106.6251],
  'leuwisadeng': [-6.5651, 106.5851],
  'nanggung': [-6.6151, 106.5351],
  'cigudeg': [-6.5451, 106.5251],
  'jasinga': [-6.4851, 106.4551],
  'tenjo': [-6.3751, 106.4651],
  'tenjolaya': [-6.6451, 106.7051],
  'parung panjang': [-6.3451, 106.5651],
  'rumpin': [-6.4551, 106.6051],
  'gunung putri': [-6.4251, 106.9151],
  'cileungsi': [-6.4051, 106.9651],
  'jonggol': [-6.4551, 107.0551],
  'sukamakmur': [-6.5551, 107.0251],
  'cariu': [-6.5151, 107.1351],
  'tanjungsari': [-6.5851, 107.1451]
};

const finalRegionVAgents = [];
let correctedCount = 0;
let excludedNonRegionVCount = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const row = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
  if (row.length < 3) continue;

  let latVal = parseFloat(row[latIdx]);
  let lngVal = parseFloat(row[lngIdx]);
  const cityStr = row[cityIdx] || '';
  const kecStr = row[kecIdx] || '';
  const addrStr = row[addrIdx] || '';

  const cityLower = cityStr.toLowerCase();
  const kecLower = kecStr.toLowerCase();

  // Exclude non-Region V cities explicitly (Bekasi, Tangerang, Jakarta Timur, Jakarta Barat, Jakarta Pusat, Jakarta Utara)
  if (cityLower.includes('bekasi') || cityLower.includes('tangerang') || cityLower.includes('barat') || cityLower.includes('pusat') || cityLower.includes('timur') || cityLower.includes('utara')) {
    excludedNonRegionVCount++;
    continue;
  }

  // Must belong to Region V (Jaksel, Depok, Kota Bogor, Kab Bogor)
  const isDeclaredRegionV = cityLower.includes('jakarta selatan') || cityLower.includes('depok') || cityLower.includes('bogor') || kecCentroids[kecLower] !== undefined;

  if (!isDeclaredRegionV) {
    excludedNonRegionVCount++;
    continue;
  }

  // Test if current GPS coordinates physically land inside Region V polygon
  let isGpsValid = (!isNaN(latVal) && !isNaN(lngVal)) && isInsideRegionVPolygons(latVal, lngVal);

  if (!isGpsValid && isDeclaredRegionV) {
    // Faulty GPS coordinate! (e.g. TOKO POJOK JAMU with lat -6.219, lng 106.497)
    // Auto-correct GPS coordinates to the centroid of its declared Kecamatan!
    if (kecCentroids[kecLower]) {
      const [cLat, cLng] = kecCentroids[kecLower];
      // Add slight random offset (0.002 ~ 200m) so multiple agents in same kecamatan don't stack on top of each other
      const hash = (i * 37) % 100;
      const angle = (hash / 100) * 2 * Math.PI;
      const dist = 0.001 + (hash % 15) * 0.0003;
      
      latVal = Number((cLat + Math.sin(angle) * dist).toFixed(6));
      lngVal = Number((cLng + Math.cos(angle) * dist).toFixed(6));
      isGpsValid = true;
      correctedCount++;
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
      kecamatan: kecStr,
      kota: cityStr || 'Region V',
      kodePos: row[zipIdx] || '',
      provinsi: row[provIdx] || '',
      areaCluster: row[areaIdx] || ''
    });
  }
}

console.log('==================================================');
console.log('🎉 TOTAL MANDIRI AGENTS IN REGION V:', finalRegionVAgents.length);
console.log('🔧 Auto-corrected Faulty GPS Rows (e.g. Jagakarsa):', correctedCount);
console.log('❌ Excluded Non-Region V Agents (Bekasi, Tangerang, etc.):', excludedNonRegionVCount);
console.log('==================================================');

const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL MANDIRI AGENTS DATABASE (${finalRegionVAgents.length} Agents) */\nwindow.MASTER_AGENTS_DATA = ${JSON.stringify(finalRegionVAgents, null, 2)};\n`;
fs.writeFileSync('master_agents_data.js', jsContent);
fs.writeFileSync('master_agents_data.json', JSON.stringify(finalRegionVAgents, null, 2));

console.log('🎉 Successfully saved master_agents_data.js & master_agents_data.json!');
