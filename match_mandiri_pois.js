const fs = require('fs');

// 1. Read user_branches_raw.csv
const csvText = fs.readFileSync('user_branches_raw.csv', 'utf8');

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

const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
const branches = [];
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  if (vals.length < 2) continue;
  const unitName = vals[1] || '';
  const address = vals[2] || '';
  const kelurahan = vals[3] || '';
  const kecamatan = vals[4] || '';
  const city = vals[5] || '';
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

  branches.push({
    no: vals[0],
    id: 'KCP-' + (branchCode || i),
    kcp: unitName,
    kodeCabang: branchCode,
    alamat: address,
    kelurahan: kelurahan,
    kecamatan: kecamatan,
    rawCity: city,
    city: stdCity,
    kodePos: postCode,
    provinsi: province,
    cluster: cluster
  });
}

// 2. Read OSM Mandiri POIs
const osmPois = JSON.parse(fs.readFileSync('osm_mandiri_pois_raw.json', 'utf8'));
console.log('Total OSM Bank Mandiri POIs:', osmPois.length);

const matchedUnits = [];

branches.forEach((b, idx) => {
  const kcpLower = b.kcp.toLowerCase();
  const addrLower = b.alamat.toLowerCase();
  const branchNameClean = kcpLower.replace(/bogor|depok|jakarta|1|2|3|4|5|kcp/g, '').trim();

  let bestMatch = null;
  let bestScore = 0;

  osmPois.forEach(poi => {
    const lat = poi.lat || (poi.center ? poi.center.lat : null);
    const lon = poi.lon || (poi.center ? poi.center.lon : null);
    if (!lat || !lon) return;

    const tags = poi.tags || {};
    const poiName = (tags.name || '').toLowerCase();
    const poiBranch = (tags['branch'] || tags['official_name'] || tags['description'] || '').toLowerCase();
    const fullPoiStr = (poiName + ' ' + poiBranch + ' ' + JSON.stringify(tags)).toLowerCase();

    // Matching score
    let score = 0;
    if (branchNameClean && fullPoiStr.includes(branchNameClean)) score += 50;
    if (addrLower && fullPoiStr.includes(addrLower.slice(0, 15))) score += 40;
    if (b.kecamatan && fullPoiStr.includes(b.kecamatan.toLowerCase())) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { lat, lon, name: tags.name, tags };
    }
  });

  if (bestScore >= 50 && bestMatch) {
    console.log(`[OSM MATCH ${bestScore}%] ${b.kcp} => ${bestMatch.name} [${bestMatch.lat}, ${bestMatch.lon}]`);
    matchedUnits.push({
      ...b,
      lat: parseFloat(bestMatch.lat.toFixed(6)),
      lng: parseFloat(bestMatch.lon.toFixed(6)),
      source: 'OSM_MATCH'
    });
  } else {
    matchedUnits.push({
      ...b,
      lat: null,
      lng: null,
      source: 'NEED_GEOCODE'
    });
  }
});

const matchedCount = matchedUnits.filter(u => u.source === 'OSM_MATCH').length;
console.log(`\n🎉 Matched ${matchedCount} / ${branches.length} branches directly to real OSM Bank Mandiri POIs!`);
fs.writeFileSync('osm_matched_branches.json', JSON.stringify(matchedUnits, null, 2));
