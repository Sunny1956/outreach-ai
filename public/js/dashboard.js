/* =====================================================
   dashboard.js — Oureach.ai dashboard logic
   Features: platform grid, leads, campaigns, activity,
             notification system, live lead search
   ===================================================== */

const PLATFORM_ICONS = {
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18v12H3z"/><path d="M3 6l9 7 9-7"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-9h3l.5-4H13V6.5c0-1.15.32-1.93 1.97-1.93H16.5V1.08C16.19 1.04 15.14 1 13.92 1 11.4 1 9.66 2.54 9.66 5.31V9H7v4h2.66v9H13z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 3H21l-6.5 7.4L22 21h-6.4l-5-6.5L4.7 21H2.6l6.9-7.9L2 3h6.5l4.5 6z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.3c0-1.27-.02-2.9-1.77-2.9-1.78 0-2.05 1.39-2.05 2.82V21H9z"/></svg>'
};

// =====================================================
// NOTIFICATION MANAGER
// Stores notifications in localStorage, keyed by userId
// =====================================================
const NotifManager = (() => {
  let userId = null;
  const MAX = 40;

  function storageKey() { return `oureach_notifs_${userId}`; }

  function load() {
    if (!userId) return [];
    try { return JSON.parse(localStorage.getItem(storageKey()) || '[]'); }
    catch { return []; }
  }

  function save(list) {
    if (!userId) return;
    localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, MAX)));
  }

  function init(uid) {
    userId = uid;
    render();
  }

  // type: 'success' | 'error' | 'info' | 'warning'
  function push(message, type = 'info') {
    const list = load();
    list.unshift({ id: Date.now() + Math.random(), message, type, read: false, ts: new Date().toISOString() });
    save(list);
    render();
    // Also flash the toast
    toast(message, type);
  }

  function markAllRead() {
    const list = load().map(n => ({ ...n, read: true }));
    save(list);
    render();
  }

  function unreadCount() {
    return load().filter(n => !n.read).length;
  }

  function render() {
    const list = load();
    const badge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    const markAllBtn = document.getElementById('markAllBtn');
    if (!badge || !notifList) return;

    const count = unreadCount();
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.toggle('hidden', count === 0);

    if (list.length === 0) {
      notifList.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      if (markAllBtn) markAllBtn.style.display = 'none';
      return;
    }

    if (markAllBtn) markAllBtn.style.display = count > 0 ? 'block' : 'none';

    notifList.innerHTML = list.map(n => `
      <div class="notif-item notif-${n.type} ${n.read ? 'read' : 'unread'}">
        <div class="notif-item-icon">${notifIcon(n.type)}</div>
        <div class="notif-item-body">
          <div class="notif-item-msg">${escHtml(n.message)}</div>
          <div class="notif-item-time">${relativeTime(n.ts)}</div>
        </div>
        ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
      </div>
    `).join('');
  }

  function notifIcon(type) {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>'
    };
    return icons[type] || icons.info;
  }

  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  return { init, push, markAllRead, render };
})();

// =====================================================
// HELPERS
// =====================================================
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightMatch(text, query) {
  if (!query) return escHtml(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escHtml(text).replace(new RegExp(`(${safe})`, 'gi'), '<mark class="hl">$1</mark>');
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'campaignModal') populateLeadChecklist();
  if (id === 'accountsModal') renderConnectedList();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function toast(msg, type = 'info') {
  const colors = { success: 'var(--green)', error: 'var(--coral)', warning: 'var(--amber)', info: 'var(--slate)' };
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = `<span class="toast-accent" style="background:${colors[type]||colors.info}"></span>${escHtml(msg)}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-in'));
  setTimeout(() => { t.classList.remove('toast-in'); setTimeout(() => t.remove(), 300); }, 3500);
}

// Notification panel toggle + close on outside click
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    NotifManager.render();
  }
}
function markAllRead() {
  NotifManager.markAllRead();
}
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('notifPanel').classList.add('hidden');
  }
});

// =====================================================
// STATE + BOOT
// =====================================================
let STATE = { accounts: [], leads: [], campaigns: [] };
let currentUserId = null;
let leadSearchQuery = '';
let leadSearchDebounce = null;

async function boot() {
  const me = await fetch('/api/me');
  if (!me.ok) { window.location.href = '/login.html'; return; }
  const user = await me.json();
  currentUserId = user.id;
  document.getElementById('userName').textContent = user.name;
  const badge = document.getElementById('verifiedBadge');
  if (badge) { badge.classList.toggle('hidden', !user.isVerified); }

  // Init notification manager with user ID
  NotifManager.init(user.id);

  await refreshAll();
}

async function refreshAll() {
  const [stats, accounts, leads, campaigns] = await Promise.all([
    fetch('/api/dashboard/stats').then(r => r.json()),
    fetch('/api/accounts').then(r => r.json()),
    fetch('/api/leads').then(r => r.json()),
    fetch('/api/campaigns').then(r => r.json())
  ]);
  STATE.accounts = accounts; STATE.leads = leads; STATE.campaigns = campaigns;

  document.getElementById('demoNote').textContent = stats.demoMode
    ? 'Demo mode: email sends for real, social sends are simulated until API keys are added.'
    : 'Live mode: all connected channels send for real.';

  document.getElementById('statLeads').textContent = stats.totalLeads;
  document.getElementById('statCampaigns').textContent = stats.totalCampaigns;
  document.getElementById('statSent').textContent = stats.totalSent;
  document.getElementById('statFailed').textContent = stats.totalFailed;

  // Platform grid
  const grid = document.getElementById('platformGrid');
  grid.innerHTML = stats.byPlatform.map(p => `
    <div class="card platform-card">
      <div class="head">
        <div class="p-icon p-${p.platform}">${PLATFORM_ICONS[p.platform]}</div>
        <div>
          <div class="name">${p.platform}</div>
          <span class="badge ${p.connected ? 'badge-green' : 'badge-slate'}">${p.connected ? 'Connected' : 'Not connected'}</span>
        </div>
      </div>
      <div class="metrics"><span>Sent</span><b>${p.sent}</b></div>
      <div class="metrics"><span>Failed</span><b>${p.failed}</b></div>
    </div>
  `).join('');

  // Activity feed
  const feed = document.getElementById('activityFeed');
  feed.innerHTML = stats.recentActivity.length ? stats.recentActivity.map(a => `
    <div class="activity-item">
      <div class="p-icon p-${a.platform}" style="width:28px;height:28px;">${PLATFORM_ICONS[a.platform]}</div>
      <div>
        <div><b>${escHtml(a.campaignName)}</b> → ${escHtml(a.leadName)} <span class="badge ${a.success ? 'badge-green' : 'badge-coral'}">${a.success ? 'sent' : 'failed'}</span></div>
        <div class="meta">${escHtml(a.detail)} · ${new Date(a.sentAt).toLocaleString()}</div>
      </div>
    </div>
  `).join('') : '<div class="empty">No outreach sent yet. Launch a campaign to see activity here.</div>';

  // Render leads with current search query
  renderLeads(leadSearchQuery);

  // Campaigns
  const campCard = document.getElementById('campaignsCard');
  campCard.innerHTML = campaigns.length ? campaigns.slice().reverse().map(c => `
    <div class="campaign-row">
      <div>
        <div class="lead-name">${escHtml(c.name)}</div>
        <div class="lead-handles">
          <span class="badge badge-amber">${c.channel}</span>
          <span class="badge ${c.status === 'sent' ? 'badge-green' : 'badge-slate'}">${c.status}</span>
          <span>${c.leadIds.length} lead(s)</span>
        </div>
      </div>
      ${c.status === 'draft'
        ? `<button class="btn btn-primary btn-sm" onclick="launchCampaign('${c.id}')">Launch</button>`
        : `<span class="badge badge-slate">Launched ${new Date(c.launchedAt).toLocaleString()}</span>`}
    </div>
  `).join('') : '<div class="empty">No campaigns yet. Create one to start reaching your leads.</div>';
}

// =====================================================
// LEADS RENDER + SEARCH
// =====================================================
function renderLeads(query) {
  const leadsList = document.getElementById('leadsList');
  const countEl = document.getElementById('leadSearchCount');
  const all = STATE.leads.slice().reverse();
  const q = (query || '').toLowerCase().trim();

  const filtered = q
    ? all.filter(l => [l.name, l.email, l.instagram, l.twitter, l.facebook, l.linkedin]
        .some(v => v && v.toLowerCase().includes(q)))
    : all;

  // Update count
  if (countEl) {
    if (q) {
      countEl.textContent = `${filtered.length} of ${all.length} lead${all.length !== 1 ? 's' : ''}`;
      countEl.style.display = 'block';
    } else {
      countEl.textContent = all.length > 8 ? `Showing 8 of ${all.length} leads` : '';
      countEl.style.display = all.length > 8 ? 'block' : 'none';
    }
  }

  const display = q ? filtered : filtered.slice(0, 8);

  leadsList.innerHTML = display.length ? display.map(l => `
    <div class="lead-row">
      <div>
        <div class="lead-name">${highlightMatch(l.name, q)}</div>
        <div class="lead-handles">
          ${l.email ? `<span>${highlightMatch(l.email, q)}</span>` : ''}
          ${l.instagram ? `<span>ig:${highlightMatch(l.instagram, q)}</span>` : ''}
          ${l.twitter ? `<span>tw:${highlightMatch(l.twitter, q)}</span>` : ''}
          ${l.linkedin ? `<span>in:${highlightMatch(l.linkedin, q)}</span>` : ''}
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteLead('${l.id}')">Remove</button>
    </div>
  `).join('') : (q
    ? '<div class="empty">No leads match your search.</div>'
    : '<div class="empty">No leads yet.</div>');
}

function onLeadSearch(value) {
  leadSearchQuery = value;
  const clearBtn = document.getElementById('leadSearchClear');
  if (clearBtn) clearBtn.classList.toggle('hidden', !value);
  clearTimeout(leadSearchDebounce);
  leadSearchDebounce = setTimeout(() => renderLeads(value), 220);
}

function clearLeadSearch() {
  const input = document.getElementById('leadSearchInput');
  if (input) { input.value = ''; input.focus(); }
  onLeadSearch('');
}

// =====================================================
// ACCOUNTS
// =====================================================
function renderAcctFields() {
  const p = document.getElementById('acctPlatform').value;
  document.getElementById('acctFieldsEmail').classList.toggle('hidden', p !== 'email');
  document.getElementById('acctFieldsSocial').classList.toggle('hidden', p === 'email');
}

function renderConnectedList() {
  const el = document.getElementById('connectedList');
  el.innerHTML = STATE.accounts.length ? STATE.accounts.map(a => `
    <div class="lead-row">
      <div><div class="lead-name" style="text-transform:capitalize;">${a.platform}</div><div class="lead-handles"><span>${escHtml(a.handle)}</span></div></div>
      <button class="btn btn-danger btn-sm" onclick="disconnectAccount('${a.platform}')">Disconnect</button>
    </div>
  `).join('') : '<div class="empty">Nothing connected yet.</div>';
}

async function connectAccount() {
  const platform = document.getElementById('acctPlatform').value;
  const errEl = document.getElementById('acctError'); errEl.textContent = '';
  const payload = { platform };
  if (platform === 'email') {
    payload.smtpHost = document.getElementById('smtpHost').value;
    payload.smtpPort = document.getElementById('smtpPort').value;
    payload.smtpUser = document.getElementById('smtpUser').value;
    payload.smtpPass = document.getElementById('smtpPass').value;
    payload.handle = payload.smtpUser;
  } else {
    payload.handle = document.getElementById('socialHandle').value;
  }
  const res = await fetch('/api/accounts/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await res.json();
  if (!res.ok) { errEl.textContent = body.error; return; }
  NotifManager.push(`${platform} account connected`, 'success');
  await refreshAll();
  renderConnectedList();
}

async function disconnectAccount(platform) {
  await fetch('/api/accounts/' + platform, { method: 'DELETE' });
  NotifManager.push(`${platform} account disconnected`, 'info');
  await refreshAll();
  renderConnectedList();
}

// =====================================================
// LEADS CRUD
// =====================================================
async function uploadCsv() {
  const fileInput = document.getElementById('csvFile');
  const errEl = document.getElementById('leadsError'); errEl.textContent = '';
  if (!fileInput.files.length) { errEl.textContent = 'Choose a CSV file first.'; return; }
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  const res = await fetch('/api/leads/upload', { method: 'POST', body: fd });
  const body = await res.json();
  if (!res.ok) { errEl.textContent = body.error; return; }
  NotifManager.push(`${body.added} lead${body.added !== 1 ? 's' : ''} imported from CSV`, 'success');
  await refreshAll();
}

async function addLeadManual() {
  const errEl = document.getElementById('leadsError'); errEl.textContent = '';
  const payload = {
    name: document.getElementById('leadName').value,
    email: document.getElementById('leadEmail').value,
    instagram: document.getElementById('leadInstagram').value,
    facebook: document.getElementById('leadFacebook').value,
    twitter: document.getElementById('leadTwitter').value,
    linkedin: document.getElementById('leadLinkedin').value
  };
  const res = await fetch('/api/leads/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await res.json();
  if (!res.ok) { errEl.textContent = body.error; return; }
  NotifManager.push(`Lead "${payload.name}" added`, 'success');
  ['leadName', 'leadEmail', 'leadInstagram', 'leadFacebook', 'leadTwitter', 'leadLinkedin'].forEach(id => document.getElementById(id).value = '');
  await refreshAll();
}

async function deleteLead(id) {
  const lead = STATE.leads.find(l => l.id === id);
  await fetch('/api/leads/' + id, { method: 'DELETE' });
  NotifManager.push(`Lead "${lead ? lead.name : id}" removed`, 'info');
  await refreshAll();
}

// =====================================================
// CAMPAIGNS
// =====================================================
function populateLeadChecklist() {
  const el = document.getElementById('leadCheckList');
  el.innerHTML = STATE.leads.length ? STATE.leads.map(l => `
    <label><input type="checkbox" value="${l.id}"> ${escHtml(l.name)} <span class="mono" style="color:var(--slate-dim); font-size:0.72rem;">${l.email || l.instagram || l.twitter || ''}</span></label>
  `).join('') : '<div class="empty">Add leads first.</div>';
}

async function createCampaign() {
  const errEl = document.getElementById('campError'); errEl.textContent = '';
  const leadIds = Array.from(document.querySelectorAll('#leadCheckList input:checked')).map(i => i.value);
  const payload = {
    name: document.getElementById('campName').value,
    channel: document.getElementById('campChannel').value,
    subject: document.getElementById('campSubject').value,
    message: document.getElementById('campMessage').value,
    leadIds
  };
  const res = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await res.json();
  if (!res.ok) { errEl.textContent = body.error; return; }
  NotifManager.push(`Campaign "${payload.name}" created — launch it when ready`, 'info');
  closeModal('campaignModal');
  await refreshAll();
}

async function launchCampaign(id) {
  const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' });
  const body = await res.json();
  if (!res.ok) {
    NotifManager.push(body.error || 'Campaign launch failed', 'error');
    return;
  }
  const sent = body.results.filter(r => r.success).length;
  const failed = body.results.filter(r => !r.success).length;
  NotifManager.push(
    `Campaign "${body.campaign.name}" launched — ${sent} sent, ${failed} failed`,
    failed > 0 && sent === 0 ? 'error' : failed > 0 ? 'warning' : 'success'
  );
  await refreshAll();
}

// =====================================================
// AUTH
// =====================================================
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// Campaign channel toggle
document.getElementById('campChannel').addEventListener('change', (e) => {
  document.getElementById('campSubjectField').style.display = e.target.value === 'email' ? 'block' : 'none';
});

boot();
