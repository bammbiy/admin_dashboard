const state = {
  users: [],
  logs: [],
  ips: [],
  me: null
};

const $ = (selector) => document.querySelector(selector);

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (res.status === 401) {
    location.href = '/';
    return null;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || '요청을 처리하지 못했습니다.');
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMetrics() {
  $('#totalUsers').textContent = state.users.length;
  $('#activeUsers').textContent = state.users.filter((user) => user.status === 'active').length;
  $('#totalLogs').textContent = state.logs.length;
  $('#blockedIps').textContent = state.ips.length;
}

function renderUsers() {
  const keyword = $('#userSearch').value.trim().toLowerCase();
  const rows = state.users
    .filter((user) => `${user.username} ${user.name} ${user.role}`.toLowerCase().includes(keyword))
    .map((user) => `
      <tr>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.name)}</td>
        <td><span class="badge">${escapeHtml(user.role)}</span></td>
        <td>
          <button class="status-pill ${escapeHtml(user.status)}" data-action="toggle-user" data-id="${escapeHtml(user.id)}" type="button">
            ${escapeHtml(user.status)}
          </button>
        </td>
        <td>${formatDate(user.lastLoginAt)}</td>
        <td>
          <button class="danger-button" data-action="delete-user" data-id="${escapeHtml(user.id)}" type="button">삭제</button>
        </td>
      </tr>
    `)
    .join('');

  $('#usersTable').innerHTML = rows || '<tr><td colspan="6" class="empty">사용자가 없습니다.</td></tr>';
}

function renderLogs() {
  $('#logsTable').innerHTML = state.logs
    .map((log) => `
      <tr>
        <td>${formatDate(log.timestamp)}</td>
        <td>${escapeHtml(log.ip || '-')}</td>
        <td>${escapeHtml(log.method || '-')}</td>
        <td>${escapeHtml(log.url || log.raw || '-')}</td>
        <td><span class="status-code">${escapeHtml(log.status || '-')}</span></td>
      </tr>
    `)
    .join('') || '<tr><td colspan="5" class="empty">로그가 없습니다.</td></tr>';
}

function renderIps() {
  $('#ipsTable').innerHTML = state.ips
    .map((entry) => `
      <tr>
        <td>${escapeHtml(entry.ip)}</td>
        <td>${escapeHtml(entry.reason)}</td>
        <td>${formatDate(entry.createdAt)}</td>
        <td><button class="danger-button" data-action="delete-ip" data-ip="${escapeHtml(entry.ip)}" type="button">해제</button></td>
      </tr>
    `)
    .join('') || '<tr><td colspan="4" class="empty">차단된 IP가 없습니다.</td></tr>';
}

async function loadDashboard() {
  state.me = await api('/api/auth/me');
  state.users = await api('/api/users');
  state.logs = await api('/api/logs');
  state.ips = await api('/api/ip-blocks');

  $('#currentUser').textContent = `${state.me.name} / ${state.me.role}`;
  $('#welcomeTitle').textContent = `${state.me.name}님, 좋은 하루입니다.`;

  renderMetrics();
  renderUsers();
  renderLogs();
  renderIps();
}

document.querySelectorAll('.nav-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-tabs button, .tab-panel').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active');
  });
});

$('#userSearch').addEventListener('input', renderUsers);

$('#userForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: $('#newUsername').value.trim(),
        name: $('#newName').value.trim(),
        password: $('#newPassword').value,
        role: $('#newRole').value,
        status: 'active'
      })
    });

    event.target.reset();
    state.users = await api('/api/users');
    renderUsers();
    renderMetrics();
    showToast('사용자를 추가했습니다.');
  } catch (error) {
    showToast(error.message);
  }
});

$('#usersTable').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const user = state.users.find((item) => item.id === button.dataset.id);
  if (!user) return;

  try {
    if (button.dataset.action === 'toggle-user') {
      await api(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: user.status === 'active' ? 'disabled' : 'active' })
      });
      showToast('사용자 상태를 변경했습니다.');
    }

    if (button.dataset.action === 'delete-user') {
      await api(`/api/users/${user.id}`, { method: 'DELETE' });
      showToast('사용자를 삭제했습니다.');
    }

    state.users = await api('/api/users');
    renderUsers();
    renderMetrics();
  } catch (error) {
    showToast(error.message);
  }
});

$('#refreshLogs').addEventListener('click', async () => {
  state.logs = await api('/api/logs');
  renderLogs();
  renderMetrics();
  showToast('로그를 새로 불러왔습니다.');
});

$('#ipForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await api('/api/ip-blocks', {
      method: 'POST',
      body: JSON.stringify({
        ip: $('#blockIp').value.trim(),
        reason: $('#blockReason').value.trim()
      })
    });

    event.target.reset();
    state.ips = await api('/api/ip-blocks');
    renderIps();
    renderMetrics();
    showToast('IP를 차단했습니다.');
  } catch (error) {
    showToast(error.message);
  }
});

$('#ipsTable').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="delete-ip"]');
  if (!button) return;

  try {
    await api(`/api/ip-blocks/${encodeURIComponent(button.dataset.ip)}`, { method: 'DELETE' });
    state.ips = await api('/api/ip-blocks');
    renderIps();
    renderMetrics();
    showToast('IP 차단을 해제했습니다.');
  } catch (error) {
    showToast(error.message);
  }
});

$('#logoutButton').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  location.href = '/';
});

loadDashboard().catch((error) => showToast(error.message));
