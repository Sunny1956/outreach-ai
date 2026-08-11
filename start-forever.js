/**
 * start-forever.js
 * ----------------
 * Supervisor script that keeps server.js running forever.
 * On crash/exit, it waits 1 second then restarts automatically.
 * Run with:  node start-forever.js
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVER = path.join(__dirname, 'server.js');
let restartCount = 0;
let child = null;

function formatTime() {
  return new Date().toLocaleTimeString('en-IN', { hour12: false });
}

function start() {
  restartCount++;
  const label = restartCount === 1 ? 'Starting' : `Restarting (attempt #${restartCount})`;
  console.log(`\n[${formatTime()}] [supervisor] ${label} server.js ...\n`);

  child = spawn('node', [SERVER], {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env
  });

  child.on('exit', (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      console.log(`\n[${formatTime()}] [supervisor] Server stopped by signal (${signal}). Exiting supervisor.`);
      process.exit(0);
    }
    console.log(`\n[${formatTime()}] [supervisor] ⚠️  server.js exited (code=${code}). Restarting in 1 second...`);
    setTimeout(start, 1000);
  });

  child.on('error', (err) => {
    console.error(`\n[${formatTime()}] [supervisor] ❌ Failed to start server: ${err.message}`);
    console.log(`[${formatTime()}] [supervisor] Retrying in 3 seconds...`);
    setTimeout(start, 3000);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${formatTime()}] [supervisor] SIGINT received — shutting down server...`);
  if (child) child.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${formatTime()}] [supervisor] SIGTERM received — shutting down server...`);
  if (child) child.kill('SIGTERM');
  process.exit(0);
});

console.log('╔══════════════════════════════════════════╗');
console.log('║     Oureach.ai Forever Process Supervisor    ║');
console.log('╚══════════════════════════════════════════╝');
console.log('Server will auto-restart on any crash. Press Ctrl+C to stop.\n');

start();
