// Lightweight JSON-file "database". Safe for serverless environments (Vercel / AWS Lambda / local).

const fs = require('fs');
const path = require('path');

const isVercel = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const ORIGINAL_DB = path.join(__dirname, '..', 'data', 'db.json');
const DB_FILE = isVercel
  ? path.join('/tmp', 'db.json')
  : ORIGINAL_DB;

let SEED_DATA = null;
try {
  SEED_DATA = require('../data/db.json');
} catch (e) {
  SEED_DATA = null;
}

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
  const fallback = JSON.parse(JSON.stringify(SEED_DATA || EMPTY));
  try {
    if (isVercel) {
      if (!fs.existsSync(DB_FILE)) {
        try {
          const dir = path.dirname(DB_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2));
        } catch (e) {}
        inMemoryDb = fallback;
        return inMemoryDb;
      }
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(content);
      // Ensure all arrays are present
      inMemoryDb.users = inMemoryDb.users || [];
      inMemoryDb.accounts = inMemoryDb.accounts || [];
      inMemoryDb.leads = inMemoryDb.leads || [];
      inMemoryDb.campaigns = inMemoryDb.campaigns || [];
      inMemoryDb.logs = inMemoryDb.logs || [];

      // Merge seed users if missing in /tmp
      if (SEED_DATA && Array.isArray(SEED_DATA.users)) {
        for (const u of SEED_DATA.users) {
          if (!inMemoryDb.users.some(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase())) {
            inMemoryDb.users.push(u);
          }
        }
      }
      if (SEED_DATA && Array.isArray(SEED_DATA.leads)) {
        for (const l of SEED_DATA.leads) {
          if (!inMemoryDb.leads.some(x => x.id === l.id)) {
            inMemoryDb.leads.push(l);
          }
        }
      }
      if (SEED_DATA && Array.isArray(SEED_DATA.accounts)) {
        for (const a of SEED_DATA.accounts) {
          if (!inMemoryDb.accounts.some(x => x.id === a.id)) {
            inMemoryDb.accounts.push(a);
          }
        }
      }
      if (SEED_DATA && Array.isArray(SEED_DATA.campaigns)) {
        for (const c of SEED_DATA.campaigns) {
          if (!inMemoryDb.campaigns.some(x => x.id === c.id)) {
            inMemoryDb.campaigns.push(c);
          }
        }
      }
      if (SEED_DATA && Array.isArray(SEED_DATA.logs)) {
        for (const lg of SEED_DATA.logs) {
          if (!inMemoryDb.logs.some(x => x.id === lg.id)) {
            inMemoryDb.logs.push(lg);
          }
        }
      }
      return inMemoryDb;
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2));
      inMemoryDb = fallback;
      return inMemoryDb;
    }
    inMemoryDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return inMemoryDb;
  } catch (err) {
    inMemoryDb = fallback;
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
