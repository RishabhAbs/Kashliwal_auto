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

console.log('Sending request...');

const options = {
  hostname: '103.218.127.22',
  port: 9457,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Accept': '*/*',
    'User-Agent': 'PostmanRuntime/7.37.0',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  }
};

const req = http.request(options, (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const raw = Buffer.concat(chunks);
    const encoding = res.headers['content-encoding'];
    console.log('Content-Encoding:', encoding);
    console.log('Status:', res.statusCode);
    console.log('RespStatus header:', res.headers['respstatus']);

    if (encoding === 'gzip') {
      zlib.gunzip(raw, (err, decoded) => {
        if (err) {
          console.log('Gunzip error:', err.message);
          return;
        }
        const text = decoded.toString();
        console.log('Response length:', text.length);
        console.log('Response Preview:', text.slice(0, 1000));
      });
    } else {
      console.log('Response:', raw.toString().slice(0, 1000));
    }
  });
});

req.on('error', (err) => console.log('Error:', err.message));
req.write(body);
req.end();
