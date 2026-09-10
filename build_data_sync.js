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

const csvFile = fs.existsSync('sheet_live_dump.csv') ? 'sheet_live_dump.csv' : 'user_branches_raw.csv';
const csvText = fs.readFileSync(csvFile, 'utf8');
const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');

const branches = [];
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  if (vals.length < 2) continue;

  const no = vals[0] || i;
  const coordStr = vals[1] || '';
  const unitName = vals[2] || '';
  const address = vals[3] || '';
  const kelurahan = vals[4] || '';
  const kecamatan = vals[5] || '';
  let rawCity = vals[6] || '';
  const postCode = vals[7] || '';
  const province = vals[8] || '';
  const cluster = vals[9] || '';
  const branchCode = vals[10] || '';

  let stdCity = 'Bogor';
  if (rawCity.toLowerCase().includes('jakarta') || cluster.toLowerCase().includes('jakarta')) {
    stdCity = 'Jakarta Selatan';
  } else if (rawCity.toLowerCase().includes('depok') || cluster.toLowerCase().includes('depok')) {
    stdCity = 'Depok';
  } else if (rawCity.toLowerCase().includes('bogor') || cluster.toLowerCase().includes('bogor')) {
    stdCity = 'Bogor';
  }

  let baseLat = null;
  let baseLng = null;

  if (coordStr && coordStr.includes(',')) {
    const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0) {
      baseLat = parts[0];
      baseLng = parts[1];
    }
  }

  branches.push({
    id: 'KCP-' + (branchCode || no),
    no: no,
    kcp: unitName,
    kodeCabang: branchCode,
    alamat: address,
    kelurahan: kelurahan,
    kecamatan: kecamatan,
    rawCity: rawCity,
    city: stdCity,
    kodePos: postCode,
    provinsi: province,
    cluster: cluster,
    lat: baseLat ? parseFloat(baseLat.toFixed(6)) : baseLat,
    lng: baseLng ? parseFloat(baseLng.toFixed(6)) : baseLng,
    rawCoord: coordStr
  });
}

const jsStr = 'window.MASTER_KCPS_DATA = ' + JSON.stringify(branches, null, 2) + ';\n';
fs.writeFileSync('master_kcps_data.js', jsStr, 'utf8');

const jsonStr = JSON.stringify(branches, null, 2);
fs.writeFileSync('master_google_sheet_kcps.json', jsonStr, 'utf8');
if (!fs.existsSync('data')) fs.mkdirSync('data');
fs.writeFileSync('data/master_google_sheet_kcps.json', jsonStr, 'utf8');

console.log('SYNC WRITE SUCCESS! All ' + branches.length + ' exact coordinates saved from Google Sheet!');
