require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const db = require('./src/db');
const { requireLogin } = require('./src/auth');
const mailer = require('./src/mailer');
const social = require('./src/social');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- PUBLIC ROUTES ----------
// Root → public landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});
// /login alias
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// Backward compat: old /index.html link → /login.html
app.get('/index.html', (req, res) => {
  res.redirect(301, '/login.html');
});

const upload = multer({ dest: path.join(__dirname, 'uploads') });

// ---------- OTP STORE (in-memory, keyed by email) ----------
// { email: { otp, expiresAt, name, attempts } }
const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- AUTH ----------

// STEP 1: Request OTP (pre-signup verification)
app.post('/api/auth/send-otp', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are all required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const data = db.load();
  if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  // Rate limiting: don't resend within 60 seconds
  const existing = otpStore.get(email.toLowerCase());
  if (existing && (existing.expiresAt - 9 * 60 * 1000) > Date.now()) {
    const waitSec = Math.ceil(((existing.expiresAt - 9 * 60 * 1000) - Date.now()) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another code.` });
  }

  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(password, 10);
  otpStore.set(email.toLowerCase(), {
    otp,
    passwordHash,
    name,
    email,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  });

  try {
    await mailer.sendOtpEmail(email, otp, name);
  } catch (e) {
    console.error('OTP email error:', e.message);
    // Still proceed — OTP is in console/store even if email delivery fails
  }

  res.json({
    ok: true,
    demo: !process.env.SYSTEM_SMTP_USER,
    demoOtp: !process.env.SYSTEM_SMTP_USER ? otp : undefined
  });
});


// STEP 2: Verify OTP and complete signup
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const entry = otpStore.get(email.toLowerCase());
  if (!entry) {
    return res.status(400).json({ error: 'No pending verification for this email. Please request a new code.' });
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 5) {
    otpStore.delete(email.toLowerCase());
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (String(otp).trim() !== String(entry.otp)) {
    const remaining = 5 - entry.attempts;
    return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` });
  }

  // OTP correct — create the user account
  const data = db.load();
  if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    otpStore.delete(email.toLowerCase());
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  const user = {
    id: db.nextId(),
    name: entry.name,
    email: entry.email,
    passwordHash: entry.passwordHash,
    isVerified: true,
    createdAt: new Date().toISOString()
  };
  data.users.push(user);
  db.save(data);
  otpStore.delete(email.toLowerCase());

  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email, isVerified: true });
});

// RESEND OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const entry = otpStore.get(email.toLowerCase());
  if (!entry) {
    return res.status(400).json({ error: 'No pending verification. Please start signup again.' });
  }

  // Rate limit: 60 second cooldown
  const sentAt = entry.expiresAt - 10 * 60 * 1000;
  if (Date.now() - sentAt < 60 * 1000) {
    const waitSec = Math.ceil(60 - (Date.now() - sentAt) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSec}s before resending.` });
  }

  const newOtp = generateOtp();
  entry.otp = newOtp;
  entry.expiresAt = Date.now() + 10 * 60 * 1000;
  entry.attempts = 0;
  otpStore.set(email.toLowerCase(), entry);

  try {
    await mailer.sendOtpEmail(email, newOtp, entry.name);
  } catch (e) {
    console.error('Resend OTP error:', e.message);
  }

  res.json({
    ok: true,
    demo: !process.env.SYSTEM_SMTP_USER,
    demoOtp: !process.env.SYSTEM_SMTP_USER ? newOtp : undefined
  });
});


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const data = db.load();
  const user = data.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, email: user.email, isVerified: user.isVerified || false });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireLogin, (req, res) => {
  const data = db.load();
  const user = data.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ id: user.id, name: user.name, email: user.email, isVerified: user.isVerified || false });
});

// ---------- CONNECTED ACCOUNTS (email + social) ----------

app.get('/api/accounts', requireLogin, (req, res) => {
  const data = db.load();
  const accounts = data.accounts
    .filter(a => a.userId === req.session.userId)
    .map(a => ({ ...a, smtpPass: undefined })); // never send the password back
  res.json(accounts);
});

app.post('/api/accounts/connect', requireLogin, async (req, res) => {
  const { platform, handle, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
  if (!platform || !handle) {
    return res.status(400).json({ error: 'Platform and handle/email are required.' });
  }

  if (platform === 'email') {
    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'SMTP email and password (or app password) are required to connect email.' });
    }
    try {
      await mailer.verifyAccount({ smtpHost, smtpPort, smtpUser, smtpPass });
    } catch (e) {
      return res.status(400).json({ error: 'Could not verify SMTP login. Check host/port/app-password. (' + e.message + ')' });
    }
  }

  const data = db.load();
  const existing = data.accounts.find(a => a.userId === req.session.userId && a.platform === platform);
  const record = {
    id: existing ? existing.id : db.nextId(),
    userId: req.session.userId,
    platform,
    handle,
    smtpHost: smtpHost || null,
    smtpPort: smtpPort || null,
    smtpUser: smtpUser || null,
    smtpPass: smtpPass || null,
    connectedAt: new Date().toISOString()
  };
  if (existing) {
    Object.assign(existing, record);
  } else {
    data.accounts.push(record);
  }
  db.save(data);
  res.json({ ...record, smtpPass: undefined });
});

app.delete('/api/accounts/:platform', requireLogin, (req, res) => {
  const data = db.load();
  data.accounts = data.accounts.filter(a => !(a.userId === req.session.userId && a.platform === req.params.platform));
  db.save(data);
  res.json({ ok: true });
});

// ---------- LEADS ----------

app.get('/api/leads', requireLogin, (req, res) => {
  const data = db.load();
  res.json(data.leads.filter(l => l.userId === req.session.userId));
});

app.post('/api/leads/upload', requireLogin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  let records;
  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    return res.status(400).json({ error: 'Could not parse CSV: ' + e.message });
  } finally {
    fs.unlink(req.file.path, () => {});
  }

  const data = db.load();
  const added = [];
  for (const r of records) {
    const lead = {
      id: db.nextId(),
      userId: req.session.userId,
      name: r.name || r.Name || '',
      email: r.email || r.Email || '',
      instagram: r.instagram || r.Instagram || '',
      facebook: r.facebook || r.Facebook || '',
      twitter: r.twitter || r.Twitter || '',
      linkedin: r.linkedin || r.LinkedIn || r.Linkedin || '',
      source: r.source || 'csv-upload',
      createdAt: new Date().toISOString()
    };
    data.leads.push(lead);
    added.push(lead);
  }
  db.save(data);
  res.json({ added: added.length, leads: added });
});

app.post('/api/leads/manual', requireLogin, (req, res) => {
  const { name, email, instagram, facebook, twitter, linkedin } = req.body;
  if (!name) return res.status(400).json({ error: 'Lead name is required.' });
  const data = db.load();
  const lead = {
    id: db.nextId(),
    userId: req.session.userId,
    name, email: email || '', instagram: instagram || '', facebook: facebook || '',
    twitter: twitter || '', linkedin: linkedin || '', source: 'manual',
    createdAt: new Date().toISOString()
  };
  data.leads.push(lead);
  db.save(data);
  res.json(lead);
});

app.delete('/api/leads/:id', requireLogin, (req, res) => {
  const data = db.load();
  data.leads = data.leads.filter(l => !(l.id === req.params.id && l.userId === req.session.userId));
  db.save(data);
  res.json({ ok: true });
});

// ---------- CAMPAIGNS ----------

app.get('/api/campaigns', requireLogin, (req, res) => {
  const data = db.load();
  const campaigns = data.campaigns.filter(c => c.userId === req.session.userId);
  const withLogs = campaigns.map(c => ({
    ...c,
    logs: data.logs.filter(l => l.campaignId === c.id)
  }));
  res.json(withLogs);
});

app.post('/api/campaigns', requireLogin, (req, res) => {
  const { name, channel, subject, message, leadIds } = req.body;
  if (!name || !channel || !message || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Name, channel, message and at least one lead are required.' });
  }
  const data = db.load();
  const campaign = {
    id: db.nextId(),
    userId: req.session.userId,
    name, channel, subject: subject || '', message, leadIds,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  data.campaigns.push(campaign);
  db.save(data);
  res.json(campaign);
});

app.post('/api/campaigns/:id/launch', requireLogin, async (req, res) => {
  const data = db.load();
  const campaign = data.campaigns.find(c => c.id === req.params.id && c.userId === req.session.userId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

  const account = data.accounts.find(a => a.userId === req.session.userId && a.platform === campaign.channel);
  if (!account) {
    return res.status(400).json({ error: `Connect a ${campaign.channel} account before launching this campaign.` });
  }

  const leads = data.leads.filter(l => campaign.leadIds.includes(l.id));
  const results = [];

  for (const lead of leads) {
    let result;
    try {
      if (campaign.channel === 'email') {
        if (!lead.email) {
          result = { success: false, detail: 'Lead has no email address on file.' };
        } else {
          await mailer.sendMail(account, {
            to: lead.email,
            subject: campaign.subject || campaign.name,
            text: campaign.message.replace(/\{\{name\}\}/g, lead.name || 'there')
          });
          result = { success: true, detail: `Email sent to ${lead.email}` };
        }
      } else {
        const handle = lead[campaign.channel];
        if (!handle) {
          result = { success: false, detail: `Lead has no ${campaign.channel} handle on file.` };
        } else {
          result = await social.send(campaign.channel, handle, campaign.message.replace(/\{\{name\}\}/g, lead.name || 'there'));
        }
      }
    } catch (e) {
      result = { success: false, detail: e.message };
    }

    const log = {
      id: db.nextId(),
      campaignId: campaign.id,
      leadId: lead.id,
      platform: campaign.channel,
      success: !!result.success,
      detail: result.detail,
      sentAt: new Date().toISOString()
    };
    data.logs.push(log);
    results.push(log);
  }

  campaign.status = 'sent';
  campaign.launchedAt = new Date().toISOString();
  db.save(data);
  res.json({ campaign, results });
});

// ---------- DASHBOARD ----------

app.get('/api/dashboard/stats', requireLogin, (req, res) => {
  const data = db.load();
  const userId = req.session.userId;
  const platforms = ['email', 'instagram', 'facebook', 'twitter', 'linkedin'];

  const campaignIds = data.campaigns.filter(c => c.userId === userId).map(c => c.id);
  const logs = data.logs.filter(l => campaignIds.includes(l.campaignId));

  const byPlatform = platforms.map(p => {
    const platformLogs = logs.filter(l => l.platform === p);
    return {
      platform: p,
      connected: !!data.accounts.find(a => a.userId === userId && a.platform === p),
      sent: platformLogs.filter(l => l.success).length,
      failed: platformLogs.filter(l => !l.success).length
    };
  });

  const recentActivity = logs
    .slice()
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, 15)
    .map(l => {
      const lead = data.leads.find(x => x.id === l.leadId);
      const campaign = data.campaigns.find(x => x.id === l.campaignId);
      return { ...l, leadName: lead ? lead.name : 'Unknown lead', campaignName: campaign ? campaign.name : 'Unknown campaign' };
    });

  res.json({
    totalLeads: data.leads.filter(l => l.userId === userId).length,
    totalCampaigns: data.campaigns.filter(c => c.userId === userId).length,
    totalSent: logs.filter(l => l.success).length,
    totalFailed: logs.filter(l => !l.success).length,
    byPlatform,
    recentActivity,
    demoMode: social.DEMO_MODE
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Oureach.ai running at http://localhost:${PORT}`);
    console.log(`📧 OTP Emails: ${process.env.SYSTEM_SMTP_USER ? 'LIVE (via ' + process.env.SYSTEM_SMTP_USER + ')' : 'DEMO (OTPs logged to console)'}`);
    console.log(`🌐 DEMO_MODE=${social.DEMO_MODE} (social sends are ${social.DEMO_MODE ? 'simulated' : 'real'})`);
    console.log(`\nPress Ctrl+C to stop.\n`);
  });
}

module.exports = app;

