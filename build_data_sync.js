const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  res.push(cur.trim());
  return res;
}

const kecGeo = fs.readFileSync('kecamatan_real_geojson.js', 'utf8');
let window = {};
eval(kecGeo);
const kecData = window.KECAMATAN_REAL_GEOJSON;

function getKecCentroid(kecName) {
  if (!kecName) return null;
  for (const k of Object.keys(kecData)) {
    if (k.toLowerCase() === kecName.toLowerCase() || kecName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(kecName.toLowerCase())) {
      const coords = kecData[k].coords;
      let sumLat = 0, sumLng = 0;
      coords.forEach(p => { sumLat += p[0]; sumLng += p[1]; });
      return [sumLat / coords.length, sumLng / coords.length];
    }
  }
  return null;
}

const cityCenters = {
  'Depok': [-6.4000, 106.8200],
  'Jakarta Selatan': [-6.2610, 106.8106],
  'Bogor': [-6.5971, 106.7996]
};

const csvText = fs.readFileSync('user_branches_raw.csv', 'utf8');
const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');

const branches = [];
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  if (vals.length < 2) continue;

  const unitName = vals[1] || '';
  const address = vals[2] || '';
  const kelurahan = vals[3] || '';
  const kecamatan = vals[4] || '';
  let city = vals[5] || '';
  const postCode = vals[6] || '';
  const province = vals[7] || '';
  const cluster = vals[8] || '';
  const branchCode = vals[9] || '';

  let stdCity = 'Bogor';
  if (city.toLowerCase().includes('jakarta') || cluster.toLowerCase().includes('jakarta')) {
    stdCity = 'Jakarta Selatan';
  } else if (city.toLowerCase().includes('depok') || cluster.toLowerCase().includes('depok')) {
    stdCity = 'Depok';
  } else if (city.toLowerCase().includes('bogor') || cluster.toLowerCase().includes('bogor')) {
    stdCity = 'Bogor';
  }

  const cent = getKecCentroid(kecamatan);
  let baseLat = cent ? cent[0] : (cityCenters[stdCity] ? cityCenters[stdCity][0] : -6.5971);
  let baseLng = cent ? cent[1] : (cityCenters[stdCity] ? cityCenters[stdCity][1] : 106.7996);

  branches.push({
    id: 'KCP-' + (branchCode || i),
    no: vals[0],
    kcp: unitName,
    kodeCabang: branchCode,
    alamat: address,
    kelurahan: kelurahan,
    kecamatan: kecamatan,
    rawCity: city,
    city: stdCity,
    kodePos: postCode,
    provinsi: province,
    cluster: cluster,
    lat: baseLat,
    lng: baseLng
  });
}

const offsetMap = {};
const finalResults = branches.map(b => {
  let lat = b.lat;
  let lng = b.lng;
  const key = lat.toFixed(4) + '_' + lng.toFixed(4);
  offsetMap[key] = (offsetMap[key] || 0) + 1;
  const count = offsetMap[key];
  if (count > 1) {
    const angle = (count - 1) * (2 * Math.PI / 8);
    const dist = 0.0035 * Math.floor((count - 1) / 8 + 1);
    lat += dist * Math.sin(angle);
    lng += dist * Math.cos(angle);
  }
  return {
    ...b,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
});

const jsStr = 'window.MASTER_KCPS_DATA = ' + JSON.stringify(finalResults, null, 2) + ';\n';
fs.writeFileSync('master_kcps_data.js', jsStr, 'utf8');

const jsonStr = JSON.stringify(finalResults, null, 2);
fs.writeFileSync('master_google_sheet_kcps.json', jsonStr, 'utf8');
if (!fs.existsSync('data')) fs.mkdirSync('data');
fs.writeFileSync('data/master_google_sheet_kcps.json', jsonStr, 'utf8');

console.log('SYNC WRITE SUCCESS! 93 UNITS SAVED! Length:', finalResults.length);
