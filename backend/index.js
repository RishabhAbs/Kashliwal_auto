const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const TALLY_URL = process.env.TALLY_URL || 'http://localhost:9000';
const TALLY_COMPANY = process.env.TALLY_COMPANY || 'RISHI ASSOCIATES';
const TALLY_CASH_LEDGER = process.env.TALLY_CASH_LEDGER || 'Cash';

app.use(cors());
app.use(express.json());

// Database connection config
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

let dbPool;
let localAddedTransactions = [];

// Connect to MySQL and initialize database & tables
const initializeDatabase = async () => {
  const dbName = process.env.DB_NAME || 'abstechnologieso_abskashliwal';
  const credentialsToTry = [
    { user: dbConfig.user, password: dbConfig.password, label: 'Configured .env credentials' },
    { user: 'root', password: 'password', label: 'Local Docker credentials (root / password)' },
    { user: 'root', password: '', label: 'Local Generic credentials (root / no password)' }
  ];

  let connected = false;
  for (const creds of credentialsToTry) {
    let config = { ...dbConfig, user: creds.user, password: creds.password };
    try {
      console.log(`Connecting using ${creds.label}...`);
      
      // 1. Try to create the database if possible
      try {
        const connection = await mysql.createConnection(config);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.end();
      } catch (dbCreateError) {
        console.log(`[Database Setup - ${creds.label}] Database creation skipped/not allowed (${dbCreateError.message}).`);
      }

      // 2. Try to connect directly to the database
      const tmpPool = mysql.createPool({
        ...config,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test query to verify connection — only assign dbPool on success
      await tmpPool.query('SELECT 1');
      dbPool = tmpPool;
      console.log(`Successfully connected to database pool using ${creds.label}!`);
      connected = true;
      break; // Success! Exit loop.
    } catch (err) {
      console.log(`Connection attempt failed for ${creds.label}: ${err.message}`);
    }
  }

  if (!connected) {
    console.error('CRITICAL: Database initialization failed for all configured and fallback credentials.');
    return;
  }

  // Helper: add a column to a table only if it doesn't already exist
  const addColumnIfMissing = async (table, column, definition) => {
    try {
      const [cols] = await dbPool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if (cols.length === 0) {
        await dbPool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`[Migration] Added column "${column}" to "${table}"`);
      }
    } catch (e) {
      console.error(`[Migration] Failed to add "${column}" to "${table}": ${e.message}`);
    }
  };

  try {
    // 4. Create "users" table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        address TEXT,
        city VARCHAR(100) DEFAULT '',
        state VARCHAR(100) DEFAULT '',
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Verified/Created "users" table.');
    // Auto-migrate: ensure all columns exist even on older installs
    await addColumnIfMissing('users', 'email',   'VARCHAR(255) DEFAULT ""');
    await addColumnIfMissing('users', 'address',  'TEXT');
    await addColumnIfMissing('users', 'city',     'VARCHAR(100) DEFAULT ""');
    await addColumnIfMissing('users', 'state',    'VARCHAR(100) DEFAULT ""');
    await addColumnIfMissing('users', 'phone',    'VARCHAR(50) NOT NULL DEFAULT ""');
    await addColumnIfMissing('users', 'role',         'VARCHAR(50) NOT NULL DEFAULT "EMPLOYEE"');
    await addColumnIfMissing('users', 'status',       'VARCHAR(50) NOT NULL DEFAULT "ACTIVE"');
    await addColumnIfMissing('users', 'created_at',   'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('users', 'cash_ledger',  'VARCHAR(255) DEFAULT ""');
    await addColumnIfMissing('users', 'group_ledger', 'VARCHAR(255) DEFAULT ""');
    await addColumnIfMissing('users', 'permissions',  'TEXT DEFAULT ""');

    // 5. Create "ledger_master" table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ledger_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        \`group\` VARCHAR(255) DEFAULT '',
        beat VARCHAR(255) DEFAULT '',
        personName VARCHAR(255) DEFAULT '',
        mobile VARCHAR(50) DEFAULT '',
        address TEXT,
        city VARCHAR(100) DEFAULT '',
        pincode VARCHAR(20) DEFAULT '',
        state VARCHAR(100) DEFAULT '',
        gstin VARCHAR(50) DEFAULT '',
        panNo VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Verified/Created "ledger_master" table.');
    await addColumnIfMissing('ledger_master', 'beat',        'VARCHAR(255) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'personName',  'VARCHAR(255) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'mobile',      'VARCHAR(50) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'address',     'TEXT');
    await addColumnIfMissing('ledger_master', 'city',        'VARCHAR(100) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'pincode',     'VARCHAR(20) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'state',       'VARCHAR(100) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'gstin',       'VARCHAR(50) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'panNo',       'VARCHAR(50) DEFAULT ""');
    await addColumnIfMissing('ledger_master', 'created_at',  'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // 5b. Create "tally_transactions" table to persist local transaction entries
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS tally_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`date\` VARCHAR(50) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`ledgerName\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(15,2) NOT NULL,
        \`remark\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Verified/Created "tally_transactions" table.');
    await addColumnIfMissing('tally_transactions', 'remark',     'TEXT');
    await addColumnIfMissing('tally_transactions', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // Credit Sales tables
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS credit_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voucher_no VARCHAR(100) NOT NULL,
        \`date\` DATE NOT NULL,
        party VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Verified/Created "credit_sales" table.');

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS credit_sale_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credit_sale_id INT NOT NULL,
        payment_date DATE NOT NULL,
        paid_amount DECIMAL(15,2) NOT NULL,
        vch_type VARCHAR(100),
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (credit_sale_id) REFERENCES credit_sales(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Verified/Created "credit_sale_payments" table.');
    // Add vch_type column if not exists (for existing DBs)
    try { await dbPool.query("ALTER TABLE credit_sale_payments ADD COLUMN vch_type VARCHAR(100) AFTER paid_amount"); } catch(e) { /* already exists */ }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS md_sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`date\` DATE,
        vch_type VARCHAR(100),
        party VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Verified/Created "md_sales" table.');

    // 6. Seed default super admin user if empty (to allow initial login)
    const [userRows] = await dbPool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('Seeding default super admin user...');
      await dbPool.query(
        'INSERT INTO users (name, phone, email, address, city, state, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['Super Admin', '9999999999', 'admin@kashliwal.com', 'Kashliwal Towers', 'Guwahati', 'Assam', 'admin', 'admin123', 'ADMIN', 'ACTIVE']
      );
      console.log('Seeding default super admin user complete.');
    }
  } catch (tableErr) {
    console.error('Error during table setup or seeding:', tableErr.message);
  }
};

// Execute initialization — server starts only after DB is ready
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('FATAL: Could not initialize database. Server will not start.', err.message);
  process.exit(1);
});

// Helper to extract content of XML tags
const extractTag = (xmlString, tag) => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xmlString.match(regex);
  return match ? match[1].trim() : '';
};

// Helper to extract value from a Tally JSON object dynamically
const getJSONValue = (item, tag) => {
  if (!item) return '';
  const upperTag = tag.toUpperCase();
  const lowerTag = tag.toLowerCase();
  const camelTag = tag.charAt(0).toLowerCase() + tag.slice(1);
  
  // Helper to unwrap Tally gateway value objects like { type: "String", value: "Sundry Debtors" }
  const unwrap = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'object' && val.value !== undefined) return String(val.value).trim();
    if (typeof val === 'object') return null; // skip objects without .value
    return String(val).trim();
  };

  // Try direct properties on item
  const directKeys = [tag, upperTag, lowerTag, camelTag];
  for (const key of directKeys) {
    const result = unwrap(item[key]);
    if (result !== null && result !== '') return result;
  }
  
  // Try properties on item.metadata
  if (item.metadata) {
    for (const key of directKeys) {
      const result = unwrap(item.metadata[key]);
      if (result !== null && result !== '') return result;
    }
  }
  
  return '';
};

// API ENDPOINTS

// ----------------- USERS / EMPLOYEES ENDPOINTS -----------------

// User login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required.' });
  try {
    const [rows] = await dbPool.query('SELECT * FROM users WHERE username = ? AND status = "ACTIVE"', [username]);
    if (!rows.length) return res.json({ success: false, message: 'Invalid credentials.' });
    const user = rows[0];
    if (password !== user.password) return res.json({ success: false, message: 'Invalid credentials.' });
    res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role, permissions: user.permissions || '', cash_ledger: user.cash_ledger || '', group_ledger: user.group_ledger || '', email: user.email || '', phone: user.phone || '', status: user.status || 'ACTIVE' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM users ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new user (with secure hashed password!)
app.post('/api/users', async (req, res) => {
  const { name, phone, email, address, city, state, username, password, role, status, cash_ledger, group_ledger } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ success: false, message: 'Name, Username, and Password are required.' });
  }
  try {
    const [result] = await dbPool.query(
      'INSERT INTO users (name, phone, email, address, city, state, username, password, role, status, cash_ledger, group_ledger) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, phone || '', email || '', address || '', city || '', state || '', username, password, role || 'EMPLOYEE', status || 'ACTIVE', cash_ledger || '', group_ledger || '']
    );
    res.json({ success: true, message: 'User created successfully', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user details
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, city, state, username, password, role, status, cash_ledger, group_ledger } = req.body;
  try {
    if (password && password.trim() !== '') {
      await dbPool.query(
        'UPDATE users SET name=?, phone=?, email=?, address=?, city=?, state=?, username=?, password=?, role=?, status=?, cash_ledger=?, group_ledger=? WHERE id=?',
        [name, phone, email, address, city, state, username, password, role, status, cash_ledger || '', group_ledger || '', id]
      );
    } else {
      await dbPool.query(
        'UPDATE users SET name=?, phone=?, email=?, address=?, city=?, state=?, username=?, role=?, status=?, cash_ledger=?, group_ledger=? WHERE id=?',
        [name, phone, email, address, city, state, username, role, status, cash_ledger || '', group_ledger || '', id]
      );
    }
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset user password
app.put('/api/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || !password.trim()) return res.status(400).json({ success: false, message: 'Password required.' });
  try {
    await dbPool.query('UPDATE users SET password = ? WHERE id = ?', [password.trim(), id]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle user active status
app.put('/api/users/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await dbPool.query('SELECT status FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const newStatus = rows[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await dbPool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, newStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ----------------- LEDGER MASTER ENDPOINTS -----------------

// Fetch all ledgers
app.get('/api/ledgers', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM ledger_master ORDER BY name ASC');
    res.json({
      success: true,
      source: 'MySQL Database',
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create single ledger manually
app.post('/api/ledgers', async (req, res) => {
  const { name, group, beat, personName, mobile, address, city, pincode, state, gstin, panNo } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Ledger name is required.' });
  }
  try {
    const [result] = await dbPool.query(
      'INSERT INTO ledger_master (name, `group`, beat, personName, mobile, address, city, pincode, state, gstin, panNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, group || '', beat || '', personName || '', mobile || '', address || '', city || '', pincode || '', state || '', gstin || '', panNo || '']
    );
    res.json({ success: true, message: 'Ledger created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Edit single ledger manually
app.put('/api/ledgers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, group, beat, personName, mobile, address, city, pincode, state, gstin, panNo } = req.body;
  try {
    await dbPool.query(
      'UPDATE ledger_master SET name=?, `group`=?, beat=?, personName=?, mobile=?, address=?, city=?, pincode=?, state=?, gstin=?, panNo=? WHERE id=?',
      [name, group, beat, personName, mobile, address, city, pincode, state, gstin, panNo, id]
    );
    res.json({ success: true, message: 'Ledger updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete single ledger
app.delete('/api/ledgers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query('DELETE FROM ledger_master WHERE id = ?', [id]);
    res.json({ success: true, message: 'Ledger deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync from Tally and update/overwrite MySQL database
app.post('/api/ledgers/sync', async (req, res) => {
  // Tally gateway expects POST request with JSON body
  const tallyRequestBody = JSON.stringify({
    static_variables: [
      { name: "svExportFormat", value: "jsonex" },
      { name: "svCurrentCompany", value: TALLY_COMPANY }
    ],
    fetch_list: [
      "Name", "Parent", "StateName", "LedgerPhone", "GstinNo", "IncomeTaxNumber", "BeatName"
    ]
  });

  try {
    console.log(`Syncing ledgers from Tally gateway at: ${TALLY_URL}`);

    // Use Node's http module for Tally gateway request
    const tallyUrl = new URL(TALLY_URL);
    const httpModule = tallyUrl.protocol === 'https:' ? require('https') : require('http');
    const zlib = require('zlib');

    const responseText = await new Promise((resolve, reject) => {
      const options = {
        hostname: tallyUrl.hostname,
        port: tallyUrl.port,
        path: tallyUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(tallyRequestBody),
          'Accept': '*/*',
          'User-Agent': 'PostmanRuntime/7.37.0',
          'Connection': 'keep-alive',
          'tallyrequest': 'Export',
          'type': 'Collection',
          'id': 'Ledger'
        }
      };

      const request = httpModule.request(options, (response) => {
        let chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const raw = Buffer.concat(chunks);
          const encoding = response.headers['content-encoding'];
          if (encoding === 'gzip') {
            zlib.gunzip(raw, (err, decoded) => {
              if (err) return reject(new Error('Failed to decompress Tally response'));
              resolve(decoded.toString());
            });
          } else {
            resolve(raw.toString());
          }
        });
      });

      request.on('error', (err) => reject(err));
      request.setTimeout(120000, () => {
        request.destroy();
        reject(new Error('Request timed out after 120 seconds'));
      });
      request.write(tallyRequestBody);
      request.end();
    });

    console.log('Tally Response Preview:', responseText.slice(0, 500));

    let jsonData = null;
    try {
      jsonData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Tally server returned invalid response: ${responseText.slice(0, 200)}`);
    }

    // Check for error response from Tally gateway
    if (jsonData.status === '0' && jsonData.error_list) {
      throw new Error(`Tally gateway error: ${jsonData.error_list.join(', ')}`);
    }

    let importedCount = 0;

    // Extract ledger collection from response
    let ledgerItems = [];
    if (jsonData && jsonData.data && Array.isArray(jsonData.data.collection)) {
      ledgerItems = jsonData.data.collection;
    } else if (jsonData && Array.isArray(jsonData.collection)) {
      ledgerItems = jsonData.collection;
    } else if (jsonData && Array.isArray(jsonData.data)) {
      ledgerItems = jsonData.data;
    } else if (Array.isArray(jsonData)) {
      ledgerItems = jsonData;
    }

    console.log(`Found ${ledgerItems.length} ledger items from Tally gateway.`);

    // 1. Fetch all existing ledgers in a single query
    const [existingLedgers] = await dbPool.query('SELECT id, name FROM ledger_master');
    const existingMap = new Map();
    for (const row of existingLedgers) {
      existingMap.set(row.name, row.id);
    }

    // 2. Process records in chunks of 50 in parallel to prevent DB overhead/timeouts
    const batchSize = 50;
    for (let i = 0; i < ledgerItems.length; i += batchSize) {
      const chunk = ledgerItems.slice(i, i + batchSize);
      await Promise.all(chunk.map(async (item) => {
        let name = '';
        if (item.metadata && item.metadata.name) {
          name = item.metadata.name;
        } else if (item.name) {
          name = item.name;
        } else if (item.languagename && item.languagename[0] && Array.isArray(item.languagename[0].name)) {
          name = item.languagename[0].name[1] || item.languagename[0].name[0] || '';
        }

        if (name && typeof name === 'string') {
          name = name.trim();
        }

        if (name) {
          const group = getJSONValue(item, 'parent') || getJSONValue(item, 'group') || '—';
          const beat = getJSONValue(item, 'beatname') || '—';
          const mobile = getJSONValue(item, 'ledgerphone') || '—';
          const state = getJSONValue(item, 'statename') || 'Assam';
          const gstin = getJSONValue(item, 'gstinno') || '—';
          const panNo = getJSONValue(item, 'incometaxnumber') || '—';

          const existingId = existingMap.get(name);
          if (existingId !== undefined) {
            await dbPool.query(
              'UPDATE ledger_master SET `group`=?, beat=?, mobile=?, state=?, gstin=?, panNo=? WHERE id=?',
              [group, beat, mobile, state, gstin, panNo, existingId]
            );
          } else {
            const [result] = await dbPool.query(
              'INSERT INTO ledger_master (name, `group`, beat, mobile, state, gstin, panNo) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [name, group, beat, mobile, state, gstin, panNo]
            );
            existingMap.set(name, result.insertId);
          }
          importedCount++;
        }
      }));
    }

    const [allLedgers] = await dbPool.query('SELECT * FROM ledger_master ORDER BY name ASC');
    res.json({
      success: true,
      message: `Successfully synced ${importedCount} ledgers from Tally ERP!`,
      count: allLedgers.length,
      data: allLedgers
    });

  } catch (error) {
    console.error('Tally sync error:', error.message);
    const isDbError = error.message.includes('Access denied') || error.message.includes('ER_') || error.message.includes('ECONNREFUSED') && error.message.includes('3306');
    const msg = isDbError
      ? `Database error during sync: ${error.message}. Please check MySQL credentials in .env and ensure the DB user has ALL PRIVILEGES on the database.`
      : `Failed to connect with Tally server: ${error.message}. Please make sure Tally is running and accessible at ${TALLY_URL} and the company "${TALLY_COMPANY}" is open.`;
    res.status(500).json({ success: false, message: msg });
  }
});

// Post a Voucher (Receipt/Payment) to Tally
app.post('/api/tally/voucher', async (req, res) => {
  const { type, ledgerName, amount, remark } = req.body;

  if (!type || !ledgerName || !amount) {
    return res.status(400).json({ success: false, message: 'Type, Ledger Name, and Amount are required.' });
  }

  // Format date to YYYYMMDD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const vchType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(); // "Receipt" or "Payment"
  const amtStr = parseFloat(amount).toFixed(2);

  // Build ledger entries matching Postman-confirmed JSON format
  // Receipt: Party Cr (isdeemedpositive=false, +amount), Cash Dr (isdeemedpositive=true, -amount)
  // Payment: Party Dr (isdeemedpositive=true, -amount), Cash Cr (isdeemedpositive=false, +amount)
  const isReceipt = vchType === 'Receipt';
  const tallyBody = {
    tallymessage: [
      {
        metadata: {
          type: 'Voucher',
          vchtype: vchType,
          action: 'Create',
          objview: 'Accounting Voucher View'
        },
        date: dateStr,
        effectivedate: dateStr,
        vchstatusdate: dateStr,
        vouchertypename: vchType,
        Narration: remark || '',
        partyledgername: ledgerName,
        allledgerentries: [
          {
            ledgername: ledgerName,
            isdeemedpositive: !isReceipt,
            ispartyledger: true,
            amount: isReceipt ? amtStr : `-${amtStr}`
          },
          {
            ledgername: TALLY_CASH_LEDGER,
            isdeemedpositive: isReceipt,
            ispartyledger: true,
            amount: isReceipt ? `-${amtStr}` : amtStr
          }
        ]
      }
    ]
  };

  // Helper to persist transaction locally in MySQL database
  const insertToLocalDb = async () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDateStr = `${dd}-${months[today.getMonth()]}-${yyyy}`;
    try {
      await dbPool.query(
        'INSERT INTO tally_transactions (date, type, ledgerName, amount, remark) VALUES (?, ?, ?, ?, ?)',
        [formattedDateStr, vchType, ledgerName, parseFloat(amount), remark || '—']
      );
      console.log('Saved transaction to MySQL.');
    } catch (dbErr) {
      console.error('Error saving to MySQL:', dbErr.message);
    }
  };

  try {
    console.log(`Posting ${vchType} voucher → ${TALLY_URL} | Company: ${TALLY_COMPANY}`);
    console.log('Payload:', JSON.stringify(tallyBody, null, 2));

    const rawResponse = await new Promise((resolve, reject) => {
      const tallyUrl = new URL(TALLY_URL);
      const httpModule = tallyUrl.protocol === 'https:' ? require('https') : require('http');
      const bodyBuffer = Buffer.from(JSON.stringify(tallyBody), 'utf8');

      const options = {
        hostname: tallyUrl.hostname,
        port: parseInt(tallyUrl.port) || 9021,
        path: tallyUrl.pathname || '/',
        method: 'POST',
        headers: {
          'content-type':   'application/json',
          'Content-Length': bodyBuffer.length,
          'User-Agent':     'PostmanRuntime/7.37.0',
          'Accept':         '*/*',
          'Connection':     'keep-alive',
          'Version':        '1',
          'tallyrequest':   'import',
          'type':           'Data',
          'Id':             'Vouchers'
        }
      };

      const request = httpModule.request(options, (resp) => {
        let data = '';
        resp.on('data', chunk => { data += chunk.toString(); });
        resp.on('end', () => resolve(data));
      });

      request.on('error', reject);
      request.setTimeout(15000, () => { request.destroy(); reject(new Error('Tally request timed out')); });
      request.write(bodyBuffer);
      request.end();
    });

    console.log('Tally Response:', rawResponse.slice(0, 600));

    // Gateway returns JSON: { status, data: { import_result: { created, exceptions, ... } } }
    let tallyRes;
    try { tallyRes = JSON.parse(rawResponse); } catch (_) { tallyRes = null; }

    const created    = tallyRes?.data?.import_result?.created    ?? 0;
    const altered    = tallyRes?.data?.import_result?.altered    ?? 0;
    const exceptions = tallyRes?.data?.import_result?.exceptions ?? 0;
    const errors     = tallyRes?.data?.import_result?.errors     ?? 0;
    const vchNumber  = tallyRes?.data?.import_result?.vchnumber  ?? '';

    console.log(`Tally import_result: created=${created}, altered=${altered}, exceptions=${exceptions}, errors=${errors}`);

    if (created > 0 || altered > 0) {
      await insertToLocalDb();
      const action = created > 0 ? 'created' : 'updated';
      const vchInfo = vchNumber ? ` (Voucher #${vchNumber})` : '';
      res.json({ success: true, message: `${vchType} voucher ${action} in Tally successfully!${vchInfo}` });
    } else {
      res.status(400).json({
        success: false,
        message: `Tally could not save the voucher (exceptions: ${exceptions}, errors: ${errors}). Check that ledger "${ledgerName}" exists in Tally company "${TALLY_COMPANY}".`
      });
    }
  } catch (error) {
    console.error('Tally post voucher error:', error.message);
    res.status(503).json({
      success: false,
      message: `Tally is unreachable. Check that Tally is running at ${TALLY_URL}.`
    });
  }
});

// Fetch Cash Book data from Tally (Group Summary — dspaccbody format)
// Shared helper: POST a Collection request to Tally gateway (same pattern as working ledger sync)
// Fetch Ledger Vouchers for a given ledger using proven GET + type:Data approach
const tallyLedgerVouchersFetch = (ledgerName, fromVal, toVal) => {
  const bodyJson = JSON.stringify({
    static_variables: [
      { name: 'svExportFormat',   value: 'jsonex' },
      { name: 'svFromDate',       value: fromVal },
      { name: 'svToDate',         value: toVal },
      { name: 'ledgername',       value: ledgerName },
      { name: 'svCurrentCompany', value: TALLY_COMPANY }
    ],
    tdlmessage: [{ definitions: [{ metadata: { name: 'Ledger Vouchers', type: 'Report', ismodify: true }, attributes: [{ 'Export Empty Fields': 'No' }] }] }]
  });
  const bodyBuffer = Buffer.from(bodyJson, 'utf8');
  const tallyUrl   = new URL(TALLY_URL);
  const httpModule = tallyUrl.protocol === 'https:' ? require('https') : require('http');
  const zlib       = require('zlib');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: tallyUrl.hostname,
      port:     parseInt(tallyUrl.port) || 9021,
      path:     tallyUrl.pathname || '/',
      method:   'GET',
      headers: {
        'content-type':   'application/json',
        'Content-Length': bodyBuffer.length,
        'Accept':         '*/*',
        'version':        '1',
        'Type':           'Data',
        'Id':             'Ledger Vouchers',
        'tallyrequest':   'export'
      }
    };

    const request = httpModule.request(options, (resp) => {
      let chunks = [];
      resp.on('data', chunk => chunks.push(chunk));
      resp.on('end', () => {
        const raw = Buffer.concat(chunks);
        const enc = resp.headers['content-encoding'];
        if (enc === 'gzip') {
          zlib.gunzip(raw, (err, decoded) => {
            if (err) return reject(new Error('gzip decompress failed'));
            resolve(decoded.toString());
          });
        } else {
          resolve(raw.toString());
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(30000, () => { request.destroy(); reject(new Error('Tally request timed out')); });
    request.write(bodyBuffer);
    request.end();
  });
};

// Parse dspvchdetail array from a Ledger Vouchers response
const parseLedgerVoucherItems = (rawText) => {
  let jsonData;
  try { jsonData = JSON.parse(rawText); } catch (e) { return []; }
  if (jsonData?.status === '0') return [];
  const lvbody = jsonData?.data?.lvbody || jsonData?.lvbody || {};
  const details = lvbody?.dspvchdetail || jsonData?.data?.dspvchdetail || [];
  return Array.isArray(details) ? details : (details ? [details] : []);
};

app.get('/api/tally/cashbook', async (req, res) => {
  const { fromDate, toDate, ledger } = req.query;
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fromVal = fromDate || '20260401';
  const toVal   = toDate   || `${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;
  const ledgerName = ledger || TALLY_CASH_LEDGER;

  try {
    const fromTally = toTallyDate(fromVal);
    const toTally   = toTallyDate(toVal);
    console.log(`Fetching cash book (${ledgerName}) from Tally [${fromTally} → ${toTally}]`);

    const rawResponse = await tallyLedgerVouchersFetch(ledgerName, fromTally, toTally);
    const details = parseLedgerVoucherItems(rawResponse);

    const receipts = [], payments = [];
    for (const item of details) {
      const dr = Math.abs(parseFloat(item.dspvchdramt || 0));
      const cr = Math.abs(parseFloat(item.dspvchcramt || 0));
      const particulars = item.dspvchledaccount || '—';
      const date = item.dspvchdate || '—';
      const vchType = (item.dspvchtype || '').toLowerCase();
      if (dr > 0 || vchType === 'receipt') receipts.push({ date, particulars, amount: dr || cr });
      else if (cr > 0 || vchType === 'payment') payments.push({ date, particulars, amount: cr || dr });
    }

    console.log(`Cash book: ${receipts.length} receipts, ${payments.length} payments`);
    res.json({ success: true, receipts, payments });
  } catch (error) {
    console.error('Cash book error:', error.message);
    res.status(503).json({ success: false, message: error.message, receipts: [], payments: [] });
  }
});

// Fetch Vouchers (Receipts/Payments) from local MySQL DB
app.get('/api/tally/transactions', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM tally_transactions ORDER BY created_at DESC'
    );
    const transactions = rows.map(row => ({
      id: row.id,
      date: row.date,
      type: row.type,
      ledgerName: row.ledgerName,
      amount: parseFloat(row.amount),
      remark: row.remark || '—'
    }));
    console.log(`Transactions from DB: ${transactions.length} total`);
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error.message);
    res.status(503).json({ success: false, data: [], message: error.message });
  }
});

// Fetch Vouchers for a specific Ledger from Tally (JSON gateway)
app.get('/api/tally/vouchers/:ledgerName', async (req, res) => {
  const { ledgerName } = req.params;
  const { fromDate, toDate } = req.query;
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fromRaw = fromDate || '20260401';
  const toRaw   = toDate   || `${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;
  const fromVal = toTallyDate(fromRaw);
  const toVal   = toTallyDate(toRaw);

  try {
    console.log(`Fetching ledger vouchers for "${ledgerName}" [${fromVal}→${toVal}]`);

    const rawResponse = await tallyLedgerVouchersFetch(ledgerName, fromVal, toVal);

    let jsonData;
    try { jsonData = JSON.parse(rawResponse); }
    catch (e) { throw new Error(`Non-JSON response: ${rawResponse.slice(0, 150)}`); }

    if (jsonData?.status === '0') {
      throw new Error(`Tally error: ${(jsonData.error_list || []).join(', ')}`);
    }

    const lvbody = jsonData?.data?.lvbody || jsonData?.lvbody || {};

    // Safely handle single-object or array dspvchdetail
    const rawDetails = lvbody?.dspvchdetail || jsonData?.data?.dspvchdetail || jsonData?.dspvchdetail;
    const details = Array.isArray(rawDetails) ? rawDetails : (rawDetails ? [rawDetails] : []);
    console.log(`Ledger vouchers: ${details.length} entries`);

    // Opening balance
    const opeRaw   = lvbody?.lvopebal || lvbody?.lvopbal || lvbody?.lvopeningbal || {};
    const opeRawDr = parseFloat(opeRaw?.lvopebaldr?.lvopebaldramt ?? opeRaw?.dspcldramt?.dspcldramta ?? opeRaw?.dramta ?? opeRaw?.lvopebaldr ?? 0);
    const opeRawCr = parseFloat(opeRaw?.lvopebalcr?.lvopebalcramt ?? opeRaw?.dspclcramt?.dspclcramta ?? opeRaw?.cramta ?? opeRaw?.lvopebalcr ?? 0);
    const opeDr = opeRawDr > 0 ? opeRawDr : 0;
    const opeCr = opeRawDr < 0 ? Math.abs(opeRawDr) : (opeRawCr > 0 ? opeRawCr : 0);

    // Closing balance
    const clsRaw   = lvbody?.lvclsbal || lvbody?.lvclbal || lvbody?.lvclosingbal || {};
    const clsRawDr = parseFloat(clsRaw?.lvclsbaldr?.lvclsbaldramt ?? clsRaw?.dspcldramt?.dspcldramta ?? clsRaw?.dramta ?? clsRaw?.lvclsbaldr ?? 0);
    const clsRawCr = parseFloat(clsRaw?.lvclsbalcr?.lvclsbalcramt ?? clsRaw?.dspclcramt?.dspclcramta ?? clsRaw?.cramta ?? clsRaw?.lvclsbalcr ?? 0);
    const clsDr = clsRawDr > 0 ? clsRawDr : 0;
    const clsCr = clsRawDr < 0 ? Math.abs(clsRawDr) : (clsRawCr > 0 ? clsRawCr : 0);

    let idCounter = 1;
    const transactions = details.map(item => {
      const drAmt = parseFloat(item.dspvchdramt || 0);
      const crAmt = parseFloat(item.dspvchcramt || 0);
      const amount = Math.abs(drAmt) > 0 ? Math.abs(drAmt) : Math.abs(crAmt);
      return {
        id:         idCounter++,
        date:       item.dspvchdate || '—',
        type:       item.dspvchtype || '—',
        vchNo:      item.dspvchno || '—',
        ledgerName: item.dspvchledaccount || '—',
        amount,
        debit:      Math.abs(drAmt),
        credit:     Math.abs(crAmt),
        remark:     item.dspvchnarration || item.dspvchref || '—'
      };
    });

    res.json({
      success: true,
      data: transactions,
      opening: { debit: opeDr, credit: opeCr },
      closing: { debit: clsDr, credit: clsCr }
    });
  } catch (error) {
    console.error('Ledger vouchers error:', error.message);
    res.status(503).json({ success: false, data: [], message: error.message });
  }
});

// Fetch Ledger Outstandings from Tally
app.get('/api/tally/outstanding/:ledgerName', async (req, res) => {
  const { ledgerName } = req.params;
  const { fromDate, toDate } = req.query;
  const fromVal = fromDate ? toTallyDate(fromDate) : null;
  const toVal   = toDate   ? toTallyDate(toDate)   : null;

  const staticVars = [
    { name: 'svExportFormat',   value: 'jsonex' },
    { name: 'ledgername',       value: ledgerName },
    { name: 'svCurrentCompany', value: TALLY_COMPANY }
  ];
  if (fromVal) staticVars.push({ name: 'svFromDate', value: fromVal });
  if (toVal)   staticVars.push({ name: 'svToDate',   value: toVal });

  const bodyJson = JSON.stringify({ static_variables: staticVars });

  try {
    console.log(`Fetching ledger outstanding for "${ledgerName}" [${fromVal || 'all'} → ${toVal || 'all'}]`);
    const url = new URL(TALLY_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 9021,
      path: url.pathname || '/',
      method: 'GET',
      headers: {
        'version': '1',
        'Type': 'Data',
        'Id': 'Ledger Outstandings',
        'tallyrequest': 'export',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyJson)
      }
    };

    const rawResponse = await new Promise((resolve, reject) => {
      const httpModule = require('http');
      const req2 = httpModule.request(options, (resp) => {
        const chunks = [];
        resp.on('data', chunk => chunks.push(chunk));
        resp.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      req2.on('error', reject);
      req2.setTimeout(15000, () => { req2.destroy(); reject(new Error('Tally request timed out')); });
      req2.write(bodyJson);
      req2.end();
    });

    let jsonData;
    try { jsonData = JSON.parse(rawResponse); } catch (e) { console.log('[Outstanding] parse error:', e.message); jsonData = {}; }

    const body = jsonData?.data?.ledbillbody || jsonData?.ledbillbody || {};

    const parseItem = (item, isOnAccount = false) => {
      const fixed = item?.billfixed || {};
      const billop = parseFloat(Array.isArray(item?.billop) ? item.billop[0] : item?.billop) || 0;
      const billcl = parseFloat(Array.isArray(item?.billcl) ? item.billcl[0] : item?.billcl) || 0;
      return {
        date: fixed?.billdate || '—',
        refNo: fixed?.billref || '—',
        openingAmt: Math.abs(billop),
        pendingAmt: Math.abs(billcl),
        isDebit: billop >= 0,
        dueOn: item?.billdue || '—',
        overdueDays: isOnAccount ? null : (parseInt(item?.billoverdue) || 0),
        isOnAccount
      };
    };

    const billDetails = Array.isArray(body?.billdetail) ? body.billdetail : (body?.billdetail ? [body.billdetail] : []);
    const onAccRaw = body?.billonaccdetail;
    const onAccArr = Array.isArray(onAccRaw) ? onAccRaw : (onAccRaw ? [onAccRaw] : []);

    const bills = [
      ...billDetails.map(item => parseItem(item, false)),
      ...onAccArr.map(item => parseItem(item, true))
    ].map((b, idx) => ({ id: idx + 1, ...b }));

    console.log(`[Outstanding] ${bills.length} bills for "${ledgerName}" (${billDetails.length} billdetail + ${onAccArr.length} onAcc)`);
    res.json({ success: true, data: bills });
  } catch (error) {
    console.error('Ledger outstanding error:', error.message);
    res.json({ success: false, message: error.message, data: [] });
  }
});

// Convert YYYYMMDD → DD-MMM-YYYY (Tally's native date format)
const toTallyDate = (yyyymmdd) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const s = String(yyyymmdd);
  if (s.length !== 8) return s;
  const day   = s.slice(6, 8);
  const month = months[parseInt(s.slice(4, 6), 10) - 1] || s.slice(4, 6);
  const year  = s.slice(0, 4);
  return `${day}-${month}-${year}`;
};

// Fetch Group Summary (Outstanding) from Tally
app.get('/api/tally/outstanding', async (req, res) => {
  const { fromDate, toDate } = req.query;
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayRaw = `${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;

  // Cap dates at today — future dates have no transactions so would show stale data
  const capDate = raw => (raw && raw <= todayRaw) ? raw : todayRaw;
  const fromRaw = capDate(fromDate || '20260401');
  const toRaw   = capDate(toDate   || todayRaw);
  const fromVal = toTallyDate(fromRaw);
  const toVal   = toTallyDate(toRaw);

  const bodyJson = JSON.stringify({
    static_variables: [
      { name: 'svExportFormat',   value: 'jsonex' },
      { name: 'svFromDate',       value: fromVal },
      { name: 'svToDate',         value: toVal },
      { name: 'IsLedgerWise',     value: 'Yes' },
      { name: 'svCurrentCompany', value: TALLY_COMPANY }
    ],
    tdlmessage: [
      {
        definitions: [
          {
            metadata: { name: 'Ledger Vouchers', type: 'Report', ismodify: true },
            attributes: [{ 'Export Empty Fields': 'No' }]
          }
        ]
      }
    ]
  });

  try {
    console.log(`Fetching Group Summary from Tally [${fromVal} → ${toVal}]`);

    const tallyUrl = new URL(TALLY_URL);
    const httpModule = require('http');

    const rawResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: tallyUrl.hostname,
        port:     parseInt(tallyUrl.port) || 9021,
        path:     tallyUrl.pathname || '/',
        method:   'GET',
        headers: {
          'content-type':  'application/json',
          'version':       '1',
          'Type':          'Data',
          'Id':            'Group Summary',
          'tallyrequest':  'export',
          'Content-Length': Buffer.byteLength(bodyJson)
        }
      };

      const request = httpModule.request(options, (resp) => {
        console.log(`Outstanding HTTP status: ${resp.statusCode}`);
        const chunks = [];
        resp.on('data', chunk => chunks.push(chunk));
        resp.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });

      request.on('error', reject);
      request.setTimeout(30000, () => { request.destroy(); reject(new Error('Tally request timed out')); });
      request.write(bodyJson);
      request.end();
    });

    console.log('Group Summary response preview:', rawResponse.slice(0, 800));

    let jsonData;
    try { jsonData = JSON.parse(rawResponse); }
    catch (e) { throw new Error(`Non-JSON response: ${rawResponse.slice(0, 200)}`); }

    if (jsonData?.status === '0') {
      throw new Error(`Tally error: ${(jsonData.error_list || []).join(', ')}`);
    }

    // Try multiple known paths for dspaccline
    const bodySection = jsonData?.data?.dspaccbody || jsonData?.dspaccbody || {};
    let lines = bodySection?.dspaccline || [];
    if (!Array.isArray(lines)) lines = lines ? [lines] : [];

    // Fallback: search top-level keys if still empty
    if (lines.length === 0) {
      const topKeys = Object.keys(jsonData?.data || jsonData || {});
      console.log(`[Outstanding] top-level keys: ${topKeys.join(', ')}`);
      const bodyKeys = Object.keys(bodySection);
      console.log(`[Outstanding] dspaccbody keys: ${bodyKeys.join(', ')}`);
    }

    console.log(`Outstanding: ${lines.length} lines from Tally [${fromVal} → ${toVal}]`);

    const rows = [];
    for (const line of lines) {
      const name = line?.dspaccname?.dspdispname || line?.dspdispname || '';
      if (!name) continue;
      const infoArr = Array.isArray(line?.dspaccinfo) ? line.dspaccinfo : (line?.dspaccinfo ? [line.dspaccinfo] : []);
      if (infoArr.length === 0) {
        // Some Tally versions put amounts directly on the line
        const drRaw = parseFloat(line?.dspcldramt?.dspcldramta || line?.dspcldramta || 0);
        const crRaw = parseFloat(line?.dspclcramt?.dspclcramta || line?.dspclcramta || 0);
        let debit = 0, credit = 0;
        if (drRaw > 0) debit = drRaw; else if (drRaw < 0) credit = Math.abs(drRaw);
        if (crRaw > 0) credit = crRaw;
        rows.push({ name, debit, credit });
        continue;
      }
      for (const info of infoArr) {
        const drRaw = parseFloat(info?.dspcldramt?.dspcldramta || 0);
        const crRaw = parseFloat(info?.dspclcramt?.dspclcramta || 0);
        let debit = 0, credit = 0;
        if (drRaw > 0) debit = drRaw;
        else if (drRaw < 0) credit = Math.abs(drRaw);
        if (crRaw > 0) credit = crRaw;
        rows.push({ name, debit, credit });
      }
    }

    const topKeys = Object.keys(jsonData?.data || jsonData || {});
    res.json({ success: true, data: rows, fromDate: fromVal, toDate: toVal, _debug: { linesCount: lines.length, topKeys } });
  } catch (error) {
    console.error('Outstanding error:', error.message);
    res.status(503).json({ success: false, message: error.message, data: [] });
  }
});

// ── Credit Sales ──────────────────────────────────────────────────────────────

// List all credit sales with total paid and balance
app.get('/api/credit-sales', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT cs.*,
        COALESCE(SUM(p.paid_amount), 0) AS total_paid,
        (cs.amount - COALESCE(SUM(p.paid_amount), 0)) AS balance
      FROM credit_sales cs
      LEFT JOIN credit_sale_payments p ON p.credit_sale_id = cs.id
      GROUP BY cs.id
      ORDER BY cs.date DESC, cs.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Create a credit sale entry
app.post('/api/credit-sales', async (req, res) => {
  const { voucher_no, date, party, amount } = req.body;
  if (!voucher_no || !date || !party || !amount) {
    return res.json({ success: false, message: 'All fields required.' });
  }
  try {
    const [result] = await dbPool.query(
      'INSERT INTO credit_sales (voucher_no, date, party, amount) VALUES (?, ?, ?, ?)',
      [voucher_no, date, party, parseFloat(amount)]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Update a credit sale entry
app.put('/api/credit-sales/:id', async (req, res) => {
  const { voucher_no, date, party, amount } = req.body;
  try {
    await dbPool.query(
      'UPDATE credit_sales SET voucher_no=?, date=?, party=?, amount=? WHERE id=?',
      [voucher_no, date, party, parseFloat(amount), req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Delete a credit sale entry (payments cascade)
app.delete('/api/credit-sales/:id', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM credit_sales WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Get payments for a credit sale
app.get('/api/credit-sales/:id/payments', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM credit_sale_payments WHERE credit_sale_id=? ORDER BY payment_date ASC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Add a payment to a credit sale
app.post('/api/credit-sales/:id/payments', async (req, res) => {
  const { payment_date, paid_amount, vch_type, remark } = req.body;
  if (!payment_date || !paid_amount) {
    return res.json({ success: false, message: 'Date and amount required.' });
  }
  try {
    const [result] = await dbPool.query(
      'INSERT INTO credit_sale_payments (credit_sale_id, payment_date, paid_amount, vch_type, remark) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, payment_date, parseFloat(paid_amount), vch_type || null, remark || '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Delete a payment
app.delete('/api/credit-sales/:saleId/payments/:payId', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM credit_sale_payments WHERE id=? AND credit_sale_id=?', [req.params.payId, req.params.saleId]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// ── MD Sales ──────────────────────────────────────────────────────────────────

app.get('/api/md-sales', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM md_sales ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (e) { res.json({ success: false, message: e.message, data: [] }); }
});

app.post('/api/md-sales', async (req, res) => {
  const { date, vch_type, party, amount } = req.body;
  if (!party || !amount) return res.json({ success: false, message: 'Party and Amount are required.' });
  try {
    const [result] = await dbPool.query(
      'INSERT INTO md_sales (`date`, vch_type, party, amount) VALUES (?, ?, ?, ?)',
      [date || null, vch_type || null, party, parseFloat(amount)]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.put('/api/md-sales/:id', async (req, res) => {
  const { date, vch_type, party, amount } = req.body;
  try {
    await dbPool.query(
      'UPDATE md_sales SET `date`=?, vch_type=?, party=?, amount=? WHERE id=?',
      [date || null, vch_type || null, party, parseFloat(amount), req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

app.delete('/api/md-sales/:id', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM md_sales WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Tally TCP ping — call GET /api/tally/ping to test raw connectivity
app.get('/api/tally/ping', (req, res) => {
  const net = require('net');
  const tallyUrl = new URL(TALLY_URL);
  const host = tallyUrl.hostname;
  const port = parseInt(tallyUrl.port) || 80;
  const start = Date.now();
  const socket = new net.Socket();
  socket.setTimeout(5000);
  socket.on('connect', () => {
    const ms = Date.now() - start;
    socket.destroy();
    res.json({ connected: true, ms, host, port, url: TALLY_URL });
  });
  socket.on('timeout', () => { socket.destroy(); res.json({ connected: false, error: 'TCP timeout (5s)', host, port }); });
  socket.on('error',   (e) => { res.json({ connected: false, error: e.message, host, port }); });
  socket.connect(port, host);
});

// Server is started inside initializeDatabase().then() above
