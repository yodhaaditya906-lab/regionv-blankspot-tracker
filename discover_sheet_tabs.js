const fs = require('fs');

async function discoverSheetTabs() {
  const url = 'https://docs.google.com/spreadsheets/d/1xx5SJyV_1aWj1OElcG-GVlTGyIxa_E9Ry2Hz9GQxfYU/edit?usp=sharing';
  console.log('Fetching Google Sheet HTML to discover all worksheet tabs & GIDs...');
  
  const res = await fetch(url);
  const html = await res.text();

  fs.writeFileSync('sheet_page_raw.html', html);

  // Extract sheet names and GIDs using regex
  const gids = [];
  const regex = /"sheetId":(\d+)|gid=(\d+)|"name":"([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1] || match[2] || match[3]) {
      gids.push(match[0]);
    }
  }

  console.log('Found GID matches in HTML:');
  console.log([...new Set(gids)].slice(0, 30));
}

discoverSheetTabs();
