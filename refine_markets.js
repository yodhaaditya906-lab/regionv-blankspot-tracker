const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('master_markets_data.json', 'utf8'));

const excludeKeywords = [
  'simpang susun', 'stasiun', 'halte', 'terminal', 'jembatan', 'pertigaan', 
  'perempatan', 'jalan ', 'gang ', 'gg.', 'tol ', 'flyover', 'underpass', 'gerbang tol'
];

const cleaned = [];
const seenNames = new Set();

raw.forEach(m => {
  const nameLower = m.nama.toLowerCase();

  // Exclude unwanted places
  if (excludeKeywords.some(kw => nameLower.includes(kw))) return;

  // Must contain "pasar" or "market"
  if (!nameLower.includes('pasar') && !nameLower.includes('market') && !nameLower.includes('induk')) return;

  // Deduplicate nearby markets with same name
  const key = `${m.nama.trim().toLowerCase()}_${m.lat.toFixed(2)}_${m.lng.toFixed(2)}`;
  if (seenNames.has(key)) return;
  seenNames.add(key);

  let type = 'Pasar Tradisional';
  if (nameLower.includes('induk')) {
    type = 'Pasar Induk';
  } else if (nameLower.includes('modern') || nameLower.includes('plaza') || nameLower.includes('mall') || nameLower.includes('groserindo')) {
    type = 'Pasar Modern';
  }

  cleaned.push({
    id: `MKT_${String(cleaned.length + 1).padStart(3, '0')}`,
    nama: m.nama.trim(),
    type: type,
    lat: m.lat,
    lng: m.lng,
    alamat: m.alamat !== 'Region V' ? m.alamat : 'Region V'
  });
});

console.log('Final refined markets count:', cleaned.length);

const jsContent = `/* BANK MANDIRI REGION V - OFFICIAL REAL MARKET DATABASE (${cleaned.length} Markets) */\nwindow.MASTER_MARKETS_DATA = ${JSON.stringify(cleaned, null, 2)};\n`;
fs.writeFileSync('master_markets_data.js', jsContent);
fs.writeFileSync('master_markets_data.json', JSON.stringify(cleaned, null, 2));

console.log('Saved refined master_markets_data.js successfully!');
