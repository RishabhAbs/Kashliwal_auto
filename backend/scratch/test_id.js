const http = require('http');
const zlib = require('zlib');

const body = JSON.stringify({
  static_variables: [
    { name: "svExportFormat", value: "jsonex" },
    { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
  ],
  fetch_list: [
    "Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"
  ]
});

function makeRequest(label, headers) {
  return new Promise((resolve) => {
    const options = {
      hostname: '103.218.127.22',
      port: 9457,
      path: '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept': '*/*',
        'User-Agent': 'PostmanRuntime/7.37.0',
        'Connection': 'keep-alive',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        const encoding = res.headers['content-encoding'];
        if (encoding === 'gzip') {
          zlib.gunzip(raw, (err, decoded) => {
            if (err) { console.log(`[${label}] Gunzip error:`, err.message); resolve(); return; }
            const text = decoded.toString();
            console.log(`[${label}] Length: ${text.length}`);
            console.log(`[${label}]:`, text.slice(0, 500));
            resolve();
          });
        } else {
          const text = raw.toString();
          console.log(`[${label}] Length: ${text.length}`);
          console.log(`[${label}]:`, text.slice(0, 500));
          resolve();
        }
      });
    });
    req.on('error', (err) => { console.log(`[${label}] Error:`, err.message); resolve(); });
    req.setTimeout(15000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  // The gateway maps Tally XML headers to HTTP headers:
  // tallyrequest = Export, type = Collection, id = collection name
  await makeRequest('Collection+Ledger', { 
    tallyrequest: 'Export', 
    type: 'Collection', 
    id: 'Ledger' 
  });
  await makeRequest('Collection+LedgerColl', { 
    tallyrequest: 'Export', 
    type: 'Collection', 
    id: 'LedgerColl' 
  });
  await makeRequest('Collection+ListOfLedgers', { 
    tallyrequest: 'Export', 
    type: 'Collection', 
    id: 'List of Ledgers' 
  });
})();
