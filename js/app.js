/* Shared helpers used by every page: session, API calls, labels and small HTML builders. */

const LABEL = {
  status: { REPORTED: 'Reported', ASSIGNED: 'Assigned', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' },
  category: {
    FURNITURE: 'Furniture', ELECTRICAL: 'Lights & fans', WATER_LEAKAGE: 'Water leakage',
    CLEANLINESS: 'Cleanliness', NETWORK: 'Network', OTHER: 'Other'
  },
  priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' }
};
const STEPS = ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

/* ---------- session ---------- */
function getToken() { return localStorage.getItem('fmc_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('fmc_user')); } catch (e) { return null; }
}
function saveSession(data) {
  localStorage.setItem('fmc_token', data.token);
  localStorage.setItem('fmc_user', JSON.stringify({ name: data.name, email: data.email, role: data.role }));
}
function logout() {
  localStorage.removeItem('fmc_token');
  localStorage.removeItem('fmc_user');
  window.location.href = 'index.html';
}
function homeFor(user) { return user.role === 'ADMIN' ? 'admin.html' : 'dashboard.html'; }

/** Call at the top of a protected page. Returns the user, or null after redirecting. */
function requireLogin(adminPage) {
  const user = getUser();
  if (!getToken() || !user) { window.location.href = 'index.html'; return null; }
  if (adminPage && user.role !== 'ADMIN') { window.location.href = 'dashboard.html'; return null; }
  if (!adminPage && user.role === 'ADMIN') { window.location.href = 'admin.html'; return null; }
  return user;
}

/* ---------- API ---------- */
const API_BASE = (window.FMC_API_BASE || '').replace(/\/$/, '');

async function api(path, options = {}) {
  const headers = Object.assign({}, options.headers);
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers, body }));
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }

  if (res.status === 401 && token) { logout(); throw new Error('Your session has ended. Please log in again.'); }
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong (' + res.status + ')');
  return data;
}

/* ---------- small helpers ---------- */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
function statusBadge(s) { return `<span class="status status-${esc(s)}">${esc(LABEL.status[s] || s)}</span>`; }
function prioTag(p) { return `<span class="prio prio-${esc(p)}">${esc(LABEL.priority[p] || p)}</span>`; }

function notify(message, type = 'success') {
  let zone = document.getElementById('toastZone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'toastZone';
    zone.className = 'toast-zone';
    zone.setAttribute('role', 'status');
    document.body.appendChild(zone);
  }
  const el = document.createElement('div');
  el.className = `alert alert-${type} shadow-sm mb-0 py-2`;
  el.textContent = message;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

/* ---------- shared HTML builders ---------- */
function trackerHtml(status) {
  const current = STEPS.indexOf(status);
  const items = STEPS.map((step, i) => {
    let cls = '';
    if (status === 'RESOLVED' || i < current) cls = 'done';
    else if (i === current) cls = 'current';
    return `<li class="${cls}">${esc(LABEL.status[step])}</li>`;
  }).join('');
  return `<ol class="track" aria-label="Progress: ${esc(LABEL.status[status])}">${items}</ol>`;
}

function renderNav(user) {
  const links = user.role === 'ADMIN'
    ? '<a class="navlink" href="admin.html">Dashboard</a>'
    : '<a class="navlink" href="dashboard.html">My issues</a><a class="navlink" href="report.html">Report an issue</a>';
  document.getElementById('nav').innerHTML = `
    <nav class="topbar"><div class="container d-flex align-items-center gap-4 flex-wrap">
      <a class="brand" href="${homeFor(user)}">Fix<b>My</b>Campus</a>
      <div class="d-flex gap-4">${links}</div>
      <div class="ms-auto d-flex align-items-center gap-3">
        <span class="small text-muted d-none d-sm-inline">${esc(user.name)}</span>
        <button class="btn btn-sm btn-outline-secondary" onclick="logout()">Log out</button>
      </div>
    </div></nav>`;
}

/** Read-only part of the issue modal: photo, details, tracker, notes and history. */
function issueDetailHtml(detail) {
  const i = detail.issue;
  const photo = i.imageUrl ? `<p><img class="issue-photo" src="${esc(API_BASE + i.imageUrl)}" alt="Photo of the issue"></p>` : '';
  const history = detail.history.map(h => `
    <li><strong>${esc(LABEL.status[h.status])}</strong> <span class="text-muted">- ${esc(h.changedBy)}, ${esc(fmtDate(h.changedAt))}</span>
      ${h.note ? `<div>${esc(h.note)}</div>` : ''}</li>`).join('');

  return `
    <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
      ${statusBadge(i.status)} ${prioTag(i.priority)}
      <span class="text-muted small">#${i.id} &middot; ${esc(LABEL.category[i.category])}</span>
    </div>
    <h4 class="h5 mb-1">${esc(i.title)}</h4>
    <p class="text-muted small mb-3">${esc(i.location)} &middot; reported by ${esc(i.reportedByName)} on ${esc(fmtDate(i.createdAt))}</p>
    <div class="mb-4">${trackerHtml(i.status)}</div>
    <p style="white-space:pre-wrap">${esc(i.description)}</p>
    ${photo}
    <dl class="row small mb-3">
      <dt class="col-sm-3">Department</dt><dd class="col-sm-9">${i.departmentName ? esc(i.departmentName) : '<span class="text-muted">Not assigned yet</span>'}</dd>
      ${i.remarks ? `<dt class="col-sm-3">Latest note</dt><dd class="col-sm-9">${esc(i.remarks)}</dd>` : ''}
      ${i.resolvedAt ? `<dt class="col-sm-3">Resolved on</dt><dd class="col-sm-9">${esc(fmtDate(i.resolvedAt))}</dd>` : ''}
    </dl>
    <h5 class="h6 mb-3">History</h5>
    <ul class="timeline">${history}</ul>`;
}
