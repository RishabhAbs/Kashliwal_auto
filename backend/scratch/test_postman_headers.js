const http = require('http');

// Exact body from Postman screenshot
const body = JSON.stringify({
  static_variables: [
    { name: "svExportFormat", value: "jsonex" },
    { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
  ],
  fetch_list: [
    "Name"
  ]
});

console.log('Body length:', body.length);
console.log('Body:', body);

// Try POST instead of GET - maybe Postman collection has a pre-request script changing it
const methods = ['GET', 'POST', 'PUT'];

for (const method of methods) {
  ((m) => {
    const options = {
      hostname: '103.218.127.22',
      port: 9457,
      path: '/',
      method: m,
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
        const data = Buffer.concat(chunks).toString();
        console.log(`[${m}] Status: ${res.statusCode}`);
        console.log(`[${m}] Response Headers:`, JSON.stringify(res.headers));
        console.log(`[${m}] Response: ${data.slice(0, 500)}`);
        console.log('---');
      });
    });

    req.on('error', (err) => {
      console.log(`[${m}] Error: ${err.message}`);
    });
    req.write(body);
    req.end();
  })(method);
}
