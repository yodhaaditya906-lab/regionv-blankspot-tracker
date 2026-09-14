const fs = require('fs');

const csvText = fs.readFileSync('agents_sheet_raw.csv', 'utf8');
const lines = csvText.split(/\r?\n/);
console.log('Total lines in raw CSV:', lines.length);

const keywords = ['JAGAKARSA', 'SRENGSENG', 'JAMU', 'PASAR MINGGU', 'CILANDAK', 'TEBET', 'MAMPANG', 'SETIABUDI', 'KEBAYORAN', 'BOGOR', 'DEPOK'];

keywords.forEach(kw => {
  const matches = lines.filter(l => l.toUpperCase().includes(kw));
  console.log(`Keyword "${kw}": ${matches.length} matches`);
  if (matches.length > 0) {
    console.log(`  Sample match: ${matches[0].substring(0, 120)}`);
  }
});
