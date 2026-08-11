// Lightweight JSON-file "database". No native compilation needed, so it
// installs and deploys anywhere (Render, Railway, Replit, a college lab PC).
// For a real production app you'd swap this for Postgres/MySQL, but the
// shape of the data (collections of plain objects) would stay the same.

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const EMPTY = {
  users: [],
  accounts: [],   // connected email / social accounts per user
  leads: [],      // uploaded lead lists per user
  campaigns: [],  // outreach campaigns per user
  logs: []        // per-lead send results for a campaign
};

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let nextIdCounter = Date.now();
function nextId() {
  nextIdCounter += 1;
  return String(nextIdCounter);
}

module.exports = { load, save, nextId };
