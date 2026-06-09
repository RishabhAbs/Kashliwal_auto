const http = require('http');

// Test different body structures with tallyrequest field
const tests = [
  {
    name: "GET with tallyrequest Export",
    method: "GET",
    body: {
      tallyrequest: "Export",
      static_variables: [
        { name: "svExportFormat", value: "jsonex" },
        { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
      ],
      fetch_list: ["Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"]
    }
  },
  {
    name: "POST with tallyrequest Export",
    method: "POST",
    body: {
      tallyrequest: "Export",
      static_variables: [
        { name: "svExportFormat", value: "jsonex" },
        { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
      ],
      fetch_list: ["Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"]
    }
  },
  {
    name: "GET with tallyrequest Export Data",
    method: "GET",
    body: {
      tallyrequest: "Export Data",
      static_variables: [
        { name: "svExportFormat", value: "jsonex" },
        { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
      ],
      fetch_list: ["Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"]
    }
  },
  {
    name: "POST with tallyrequest Export Data",
    method: "POST",
    body: {
      tallyrequest: "Export Data",
      static_variables: [
        { name: "svExportFormat", value: "jsonex" },
        { name: "svCurrentCompany", value: "RISHI ASSOCIATES" }
      ],
      fetch_list: ["Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"]
    }
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(test.body);
    const options = {
      hostname: '103.218.127.22',
      port: 9457,
      path: '/',
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[${test.name}] Status: ${res.statusCode}, Response: ${data.slice(0, 300)}`);
        console.log('---');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`[${test.name}] Error: ${err.message}`);
      resolve();
    });
    req.setTimeout(10000, () => { req.destroy(); resolve(); });
    req.write(bodyStr);
    req.end();
  });
}

(async () => {
  for (const test of tests) {
    await runTest(test);
  }
})();
