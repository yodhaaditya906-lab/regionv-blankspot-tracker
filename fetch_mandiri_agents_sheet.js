const fs = require('fs');

const SHEET_ID = '1xx5SJyV_1aWj1OElcG-GVlTGyIxa_E9Ry2Hz9GQxfYU';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

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

async function fetchAgentsSheet() {
  console.log('Fetching Mandiri Agents Google Sheet CSV...');
  let csvText = '';

  try {
    let res = await fetch(CSV_URL);
    if (!res.ok) {
      console.log('gviz endpoint failed, trying export endpoint...');
      res = await fetch(EXPORT_URL);
    }
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    csvText = await res.text();
    fs.writeFileSync('agents_sheet_raw.csv', csvText);
    console.log('Successfully downloaded raw CSV (Length:', csvText.length, 'bytes)');
  } catch (e) {
    console.error('Failed to fetch CSV from Google Sheets:', e.message);
    return;
  }

  // Parse CSV (supporting multiline & quoted fields)
  const lines = csvText.split(/\r?\n/);
  console.log('Total CSV lines:', lines.length);

  // Simple CSV parser
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
  console.log('CSV Headers:', headers);

  // Find column indices
  const findIdx = (names) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));

  const latIdx = findIdx(['latitude', 'lat']);
  const lngIdx = findIdx(['longitude', 'long', 'lng']);
  const nameIdx = findIdx(['nama agen', 'nama_agen', 'nama', 'agent']);
  const addrIdx = findIdx(['alamat agen', 'alamat_agen', 'alamat']);
  const kelIdx = findIdx(['kelurahan', 'kel']);
  const kecIdx = findIdx(['kecamatan', 'kec']);
  const cityIdx = findIdx(['kota', 'kabupaten', 'kab']);
  const zipIdx = findIdx(['kode pos', 'kodepos', 'pos']);
  const provIdx = findIdx(['provinsi', 'prov']);
  const areaIdx = findIdx(['area', 'cluster']);

  console.log('Column indices:', { latIdx, lngIdx, nameIdx, addrIdx, kelIdx, kecIdx, cityIdx, zipIdx, provIdx, areaIdx });

  // Load Region V GeoJSON boundaries for spatial filtering
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

  const rawAgents = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
    if (row.length < 2) continue;

    const latVal = parseFloat(row[latIdx]);
    const lngVal = parseFloat(row[lngIdx]);

    if (isNaN(latVal) || isNaN(lngVal)) continue;

    rawAgents.push({
      nama: row[nameIdx] || `Agen Mandiri ${i}`,
      lat: Number(latVal.toFixed(6)),
      lng: Number(lngVal.toFixed(6)),
      alamat: row[addrIdx] || '',
      kelurahan: row[kelIdx] || '',
      kecamatan: row[kecIdx] || '',
      kota: row[cityIdx] || '',
      kodePos: row[zipIdx] || '',
      provinsi: row[provIdx] || '',
      areaCluster: row[areaIdx] || ''
    });
  }

  console.log('Successfully parsed valid agent records with GPS coordinates:', rawAgents.length);

  // Spatial Filter against Region V boundaries
  const insideAgents = [];
  const outsideAgents = [];

  rawAgents.forEach((ag, idx) => {
    const ptLatLng = [ag.lat, ag.lng];
    const ptLngLat = [ag.lng, ag.lat];

    let isInside = false;
    let matchedRegion = ag.kota;

    for (const item of cityPolygons) {
      if (item.poly && isPtInPoly(ptLatLng, item.poly)) {
        isInside = true;
        matchedRegion = item.name;
        break;
      }
    }

    if (!isInside) {
      for (const feat of kecFeatures) {
        if (feat.geometry && feat.geometry.coordinates) {
          if (checkPtInNestedCoords(ptLngLat, feat.geometry.coordinates)) {
            isInside = true;
            matchedRegion = feat.properties ? (feat.properties.WAKADM || feat.properties.NAMOBJ || ag.kota) : ag.kota;
            break;
          }
        }
      }
    }

    // Also check text matching if city/kecamatan string mentions Jaksel, Depok, or Bogor
    if (!isInside && ag.kota) {
      const cityLower = ag.kota.toLowerCase();
      if (cityLower.includes('jakarta selatan') || cityLower.includes('depok') || cityLower.includes('bogor')) {
        isInside = true;
      }
    }

    if (isInside) {
      ag.id = `AGN_${String(insideAgents.length + 1).padStart(4, '0')}`;
      if (!ag.kota) ag.kota = matchedRegion;
      insideAgents.push(ag);
    } else {
      outsideAgents.push(ag);
    }
  });

  console.log('==================================================');
  console.log('✅ KEPT Mandiri Agents (Inside Region V):', insideAgents.length);
  console.log('❌ REMOVED Agents (Outside Region V):', outsideAgents.length);
  console.log('==================================================');

  if (insideAgents.length > 0) {
    console.log('\nSample Kept Agents:');
    insideAgents.slice(0, 5).forEach(a => console.log(` - ${a.nama} [${a.lat}, ${a.lng}] (${a.kecamatan}, ${a.kota})`));
  }

  // Save JS and JSON artifacts
  const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL MANDIRI AGENTS DATABASE (${insideAgents.length} Agents) */\nwindow.MASTER_AGENTS_DATA = ${JSON.stringify(insideAgents, null, 2)};\n`;
  fs.writeFileSync('master_agents_data.js', jsContent);
  fs.writeFileSync('master_agents_data.json', JSON.stringify(insideAgents, null, 2));

  console.log('🎉 Successfully generated master_agents_data.js & master_agents_data.json!');
}

fetchAgentsSheet();
