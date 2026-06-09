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

// Try tallyrequest as a HEADER instead of body field
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
    'tallyrequest': 'Export'
  }
};

function handleResponse(res) {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const raw = Buffer.concat(chunks);
    const encoding = res.headers['content-encoding'];
    if (encoding === 'gzip') {
      zlib.gunzip(raw, (err, decoded) => {
        if (err) { console.log('Gunzip error:', err.message); return; }
        const text = decoded.toString();
        console.log('Response length:', text.length);
        console.log('Response:', text.slice(0, 1000));
      });
    } else {
      console.log('Response:', raw.toString().slice(0, 1000));
    }
  });
}

console.log('Test 1: tallyrequest as header...');
const req1 = http.request(options, handleResponse);
req1.on('error', (err) => console.log('Error:', err.message));
req1.write(body);
req1.end();
