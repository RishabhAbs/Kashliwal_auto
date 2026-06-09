const http = require('http');

const body = JSON.stringify({
  static_variables: [
    { name: "svExportFormat", value: "jsonex" },
    { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
  ],
  fetch_list: [
    "Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"
  ]
});

console.log('Sending body:', body);

const options = {
  hostname: '103.218.127.22',
  port: 9457,
  path: '/',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response length:', data.length);
    console.log('Response Preview:', data.slice(0, 500));
  });
});

req.on('error', (err) => console.log('Error:', err.message));
req.write(body);
req.end();
