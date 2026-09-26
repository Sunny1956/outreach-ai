// Lightweight JSON-file "database". Safe for serverless environments (Vercel / AWS Lambda / local).

const fs = require('fs');
const path = require('path');

const isVercel = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const ORIGINAL_DB = path.join(__dirname, '..', 'data', 'db.json');
const DB_FILE = isVercel
  ? path.join('/tmp', 'db.json')
  : ORIGINAL_DB;

const EMPTY = {
  users: [],
  accounts: [],   // connected email / social accounts per user
  leads: [],      // uploaded lead lists per user
  campaigns: [],  // outreach campaigns per user
  logs: []        // per-lead send results for a campaign
};

let inMemoryDb = null;

function load() {
  if (inMemoryDb) return inMemoryDb;
  try {
    if (!fs.existsSync(DB_FILE)) {
      if (isVercel && fs.existsSync(ORIGINAL_DB)) {
        try {
          const content = fs.readFileSync(ORIGINAL_DB, 'utf-8');
          fs.writeFileSync(DB_FILE, content);
          inMemoryDb = JSON.parse(content);
          return inMemoryDb;
        } catch (e) {
          try {
            inMemoryDb = JSON.parse(fs.readFileSync(ORIGINAL_DB, 'utf-8'));
            return inMemoryDb;
          } catch (err) {}
        }
      }
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
      } catch (e) {}
      inMemoryDb = JSON.parse(JSON.stringify(EMPTY));
      return inMemoryDb;
    }
    inMemoryDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return inMemoryDb;
  } catch (err) {
    inMemoryDb = JSON.parse(JSON.stringify(EMPTY));
    return inMemoryDb;
  }
}

function save(data) {
  inMemoryDb = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    // Graceful fallback for read-only environments
  }
}

let nextIdCounter = Date.now();
function nextId() {
  nextIdCounter += 1;
  return String(nextIdCounter);
}

module.exports = { load, save, nextId };
