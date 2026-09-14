const fs = require('fs');

const csvText = fs.readFileSync('agents_sheet_raw.csv', 'utf8');
const lines = csvText.split(/\r?\n/);

lines.forEach((line, idx) => {
  if (line.includes('SRENGSENG') || line.includes('POJOK') || line.includes('JAMU') || line.includes('ANDRIAN')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
