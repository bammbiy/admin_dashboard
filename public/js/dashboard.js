const roleLevels = {
  viewer: 1,
  manager: 2,
  admin: 3
};

const state = {
  users: [],
  logs: [],
  auditLogs: [],
  ips: [],
  keywordTracker: null,
  signalMap: null,
  moderationQueue: [],
  gameAnalytics: null,
  discordStatus: null,
  me: null
};

const $ = (selector) => document.querySelector(selector);

function can(minimumRole) {
  return roleLevels[state.me?.role] >= roleLevels[minimumRole];
}

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

  if (res.status === 204) return null;
  return res.json();
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR');
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function severityLabel(severity) {
  return {
    critical: '치명',
    high: '높음',
    medium: '주의',
    low: '낮음'
  }[severity] || severity;
}

function renderMetrics() {
  $('#totalUsers').textContent = state.users.length;
  $('#queueCount').textContent = state.moderationQueue.filter((item) => item.status === 'pending').length;
  $('#keywordCount').textContent = state.keywordTracker?.trendKeywords?.length || 0;
  $('#gameSessionCount').textContent = state.gameAnalytics?.totalSessions || 0;
  $('#averageGameTime').textContent = formatMinutes(state.gameAnalytics?.averageSessionMinutes || 0);
}

function renderDiscordStatus() {
  const element = $('#discordStatus');
  if (!element || !state.discordStatus) return;

  const labels = {
    ready: 'Discord: 연결됨',
    starting: 'Discord: 연결 중',
    disabled: 'Discord: 샘플 모드',
    error: 'Discord: 연결 오류'
  };
  element.textContent = labels[state.discordStatus.state] || 'Discord: 상태 확인 필요';
  element.classList.toggle('connected', state.discordStatus.connected);
}

function renderPermissions() {
  document.querySelectorAll('.manager-only').forEach((element) => {
    element.classList.toggle('is-hidden', !can('manager'));
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tabs button, .tab-panel').forEach((item) => item.classList.remove('active'));
  document.querySelector(`.nav-tabs button[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
}

function renderTrendKeywords() {
  const keywords = state.keywordTracker?.trendKeywords || [];
  const markup = keywords
    .map((item) => `
      <button class="keyword-chip" data-keyword="${escapeHtml(item.keyword)}" type="button">
        ${escapeHtml(item.keyword)}
        <span>${item.count}</span>
      </button>
    `)
    .join('');

  $('#trendKeywords').innerHTML = markup || '<p class="empty">감지된 키워드가 없습니다.</p>';
  $('#keywordSuggestions').innerHTML = markup || '<p class="empty">키워드 후보가 없습니다.</p>';
}

function renderChannelSignals() {
  const channels = state.keywordTracker?.channelCounts || [];
  const rows = channels
    .map((item) => `
      <article class="mini-row">
        <strong>${escapeHtml(item.channel)}</strong>
        <span>${item.count}회</span>
      </article>
    `)
    .join('');

  $('#channelSignals').innerHTML = rows || '<p class="empty">채널 신호가 없습니다.</p>';
  $('#keywordChannels').innerHTML = rows || '<p class="empty">채널 신호가 없습니다.</p>';
}

function renderKeywordMatches() {
  const matches = state.keywordTracker?.matches || [];
  $('#keywordInput').value = state.keywordTracker?.keyword || '';
  $('#keywordMatches').innerHTML = matches
    .map((message) => `
      <article class="message-card ${escapeHtml(message.severity)}">
        <div>
          <strong>${escapeHtml(message.channel)}</strong>
          <span>${escapeHtml(message.author)} · ${formatDate(message.createdAt)}</span>
        </div>
        <p>${escapeHtml(message.content)}</p>
        <small>반응 ${message.reactions} · 답글 ${message.replyCount} · 위험도 ${message.score}</small>
      </article>
    `)
    .join('') || '<p class="empty">해당 키워드가 포함된 메시지가 없습니다.</p>';
}

function renderPriorityQueue() {
  const items = state.moderationQueue.filter((item) => item.status === 'pending').slice(0, 4);
  $('#priorityQueue').innerHTML = items
    .map((item) => `
      <article class="queue-mini">
        <strong>${escapeHtml(item.channel)}</strong>
        <span class="risk-badge ${escapeHtml(item.severity)}">${item.score} / ${severityLabel(item.severity)}</span>
        <p>${escapeHtml(item.author)}: ${escapeHtml(item.content)}</p>
      </article>
    `)
    .join('') || '<p class="empty">처리할 제재 후보가 없습니다.</p>';
}

function renderSignalMap() {
  if (!state.signalMap) return;

  const nodes = state.signalMap.nodes || [];
  const edges = state.signalMap.edges || [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const lines = edges
    .map((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return '';
      return `<line x1="${from.x}%" y1="${from.y}%" x2="${to.x}%" y2="${to.y}%" />`;
    })
    .join('');

  $('#signalKeyword').value = state.signalMap.keyword;
  $('#signalMap').innerHTML = `
    <svg class="signal-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
    ${nodes.map((node) => `
      <button class="signal-node ${escapeHtml(node.type)} ${node.score >= 55 ? 'hot' : ''}"
        style="left:${node.x}%; top:${node.y}%"
        title="${escapeHtml(node.label)}"
        type="button">
        <span>${escapeHtml(node.type)}</span>
        <strong>${escapeHtml(node.label)}</strong>
      </button>
    `).join('')}
  `;
}

function renderSignalTimeline() {
  const timeline = state.signalMap?.timeline || [];
  $('#signalTimeline').innerHTML = timeline
    .map((item) => `
      <article class="timeline-item">
        <span>${formatDate(item.createdAt)}</span>
        <strong>${escapeHtml(item.channel)}</strong>
        <p>${escapeHtml(item.author)} · 위험도 ${item.score}</p>
        <small>${escapeHtml(item.content)}</small>
      </article>
    `)
    .join('') || '<p class="empty">해당 키워드의 확산 기록이 없습니다.</p>';
}

function renderSignal() {
  renderSignalMap();
  renderSignalTimeline();
}

function renderModerationQueue() {
  $('#moderationQueue').innerHTML = state.moderationQueue
    .map((item) => {
      const evidence = item.policies
        .map((policy) => `
          <li>
            <strong>${escapeHtml(policy.label)}</strong>
            <span>${escapeHtml(policy.keywords.join(', '))}</span>
            <small>${escapeHtml(policy.evidence || item.content)}</small>
          </li>
        `)
        .join('');
      const controls = item.status === 'pending' && can('manager')
        ? `
          <div class="action-row">
            <button data-action="warn" data-target="${escapeHtml(item.targetId)}" type="button">경고</button>
            <button data-action="timeout" data-target="${escapeHtml(item.targetId)}" type="button">타임아웃</button>
            <button class="danger-button" data-action="suspend" data-target="${escapeHtml(item.targetId)}" type="button">활동정지</button>
            <button class="secondary-button" data-action="ignore" data-target="${escapeHtml(item.targetId)}" type="button">무시</button>
          </div>
        `
        : `<span class="muted-action">${item.status === 'pending' ? '조치 권한 없음' : `처리됨: ${escapeHtml(item.action?.action || item.status)}`}</span>`;

      return `
        <article class="moderation-card ${escapeHtml(item.severity)}">
          <div class="moderation-head">
            <div>
              <span class="content-type">${escapeHtml(item.channel)}</span>
              <h3>${escapeHtml(item.author)}</h3>
              <p>${formatDate(item.createdAt)}</p>
            </div>
            <span class="risk-badge ${escapeHtml(item.severity)}">${item.score} / ${severityLabel(item.severity)}</span>
          </div>
          <p class="content-excerpt">${escapeHtml(item.content)}</p>
          <ul class="evidence-list">${evidence}</ul>
          ${controls}
        </article>
      `;
    })
    .join('') || '<p class="empty">분석된 제재 후보가 없습니다.</p>';
}

function renderGameAnalytics() {
  const analytics = state.gameAnalytics;
  if (!analytics) return;

  $('#gameStats').innerHTML = analytics.gameStats
    .map((game) => `
      <article class="game-row">
        <div>
          <strong>${escapeHtml(game.game)}</strong>
          <span>${game.players}명 · ${game.sessions}세션</span>
        </div>
        <b>${formatMinutes(game.totalMinutes)}</b>
      </article>
    `)
    .join('') || '<p class="empty">게임 세션이 없습니다.</p>';

  $('#channelInterest').innerHTML = analytics.channelInterest
    .map((item) => `
      <article class="mini-row">
        <strong>${escapeHtml(item.channel)}</strong>
        <span>${item.messages} messages</span>
      </article>
    `)
    .join('');

  $('#memberGameStats').innerHTML = analytics.memberStats
    .map((member) => `
      <article class="member-card">
        <span>${escapeHtml(member.discordTag)}</span>
        <strong>${escapeHtml(member.displayName)}</strong>
        <p>선호 게임: ${escapeHtml(member.favoriteGame)}</p>
        <p>총 플레이: ${formatMinutes(member.totalMinutes)} · 평균 ${formatMinutes(member.averageMinutes)}</p>
        <p>같이 자주 함: ${escapeHtml(member.topPartyMember)}</p>
      </article>
    `)
    .join('');
}

function renderUsers() {
  const keyword = $('#userSearch').value.trim().toLowerCase();
  const rows = state.users
    .filter((user) => `${user.username} ${user.name} ${user.role} ${user.status}`.toLowerCase().includes(keyword))
    .map((user) => {
      const canChangeStatus = can('manager') && (state.me.role === 'admin' || user.role !== 'admin');
      const canDelete = can('admin') && user.username !== state.me.username;
      const statusControl = canChangeStatus
        ? `<button class="status-pill ${escapeHtml(user.status)}" data-action="toggle-user" data-id="${escapeHtml(user.id)}" type="button">${escapeHtml(user.status)}</button>`
        : `<span class="status-pill ${escapeHtml(user.status)}">${escapeHtml(user.status)}</span>`;
      const deleteControl = canDelete
        ? `<button class="danger-button" data-action="delete-user" data-id="${escapeHtml(user.id)}" type="button">삭제</button>`
        : '<span class="muted-action">권한 없음</span>';

      return `
        <tr>
          <td>${escapeHtml(user.username)}</td>
          <td>${escapeHtml(user.name)}</td>
          <td><span class="badge">${escapeHtml(user.role)}</span></td>
          <td>${statusControl}</td>
          <td>${formatDate(user.lastLoginAt)}</td>
          <td>${deleteControl}</td>
        </tr>
      `;
    })
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

function renderAuditLogs() {
  $('#auditTable').innerHTML = state.auditLogs
    .map((log) => `
      <tr>
        <td>${formatDate(log.timestamp)}</td>
        <td>${escapeHtml(log.actor)}</td>
        <td><span class="badge">${escapeHtml(log.role)}</span></td>
        <td>${escapeHtml(log.action)}</td>
        <td>${escapeHtml(log.target)}</td>
        <td>${escapeHtml(log.detail || '-')}</td>
      </tr>
    `)
    .join('') || '<tr><td colspan="6" class="empty">감사 로그가 없습니다.</td></tr>';
}

function renderIps() {
  $('#ipsTable').innerHTML = state.ips
    .map((entry) => {
      const deleteControl = can('manager')
        ? `<button class="danger-button" data-action="delete-ip" data-ip="${escapeHtml(entry.ip)}" type="button">해제</button>`
        : '<span class="muted-action">권한 없음</span>';

      return `
        <tr>
          <td>${escapeHtml(entry.ip)}</td>
          <td>${escapeHtml(entry.reason)}</td>
          <td>${formatDate(entry.createdAt)}</td>
          <td>${deleteControl}</td>
        </tr>
      `;
    })
    .join('') || '<tr><td colspan="4" class="empty">차단된 IP가 없습니다.</td></tr>';
}

function renderAll() {
  renderPermissions();
  renderMetrics();
  renderTrendKeywords();
  renderChannelSignals();
  renderKeywordMatches();
  renderPriorityQueue();
  renderSignal();
  renderModerationQueue();
  renderGameAnalytics();
  renderUsers();
  renderLogs();
  renderAuditLogs();
  renderIps();
}

function getLogQuery() {
  const params = new URLSearchParams();
  const ip = $('#filterIp').value.trim();
  const method = $('#filterMethod').value;
  const status = $('#filterStatus').value.trim();
  if (ip) params.set('ip', ip);
  if (method) params.set('method', method);
  if (status) params.set('status', status);
  return params.toString() ? `?${params.toString()}` : '';
}

async function loadLogs() {
  state.logs = await api(`/api/logs${getLogQuery()}`);
  renderLogs();
}

async function loadAuditLogs() {
  state.auditLogs = await api('/api/logs/audit');
  renderAuditLogs();
}

async function loadKeyword(keyword = '') {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  state.keywordTracker = await api(`/api/intelligence/keyword-tracker${query}`);
  renderTrendKeywords();
  renderChannelSignals();
  renderKeywordMatches();
  renderMetrics();
}

async function loadSignal(keyword = '') {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  state.signalMap = await api(`/api/intelligence/signal-map${query}`);
  renderSignal();
}

async function loadModerationQueue() {
  state.moderationQueue = await api('/api/intelligence/moderation-queue');
  renderModerationQueue();
  renderPriorityQueue();
  renderMetrics();
}

async function loadGames() {
  state.gameAnalytics = await api('/api/intelligence/game-analytics');
  renderGameAnalytics();
  renderMetrics();
}

async function loadDashboard() {
  state.me = await api('/api/auth/me');
  state.users = await api('/api/users');
  state.logs = await api('/api/logs');
  state.auditLogs = await api('/api/logs/audit');
  state.ips = await api('/api/ip-blocks');
  state.keywordTracker = await api('/api/intelligence/keyword-tracker');
  state.signalMap = await api('/api/intelligence/signal-map');
  state.moderationQueue = await api('/api/intelligence/moderation-queue');
  state.gameAnalytics = await api('/api/intelligence/game-analytics');
  state.discordStatus = await api('/api/intelligence/discord-status');

  $('#currentUser').textContent = `${state.me.name} / ${state.me.role}`;
  $('#welcomeTitle').textContent = `${state.me.name}님, 서버 활동 신호를 확인하세요.`;
  renderDiscordStatus();
  renderAll();
}

document.querySelectorAll('.nav-tabs button').forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

document.querySelectorAll('[data-tab-jump]').forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tabJump));
});

document.addEventListener('click', async (event) => {
  const keywordButton = event.target.closest('button[data-keyword]');
  if (!keywordButton) return;

  const keyword = keywordButton.dataset.keyword;
  await loadKeyword(keyword);
  await loadSignal(keyword);
  switchTab('keyword');
});

$('#keywordSearchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const keyword = $('#keywordInput').value.trim();
  await loadKeyword(keyword);
  await loadSignal(keyword);
  showToast('키워드 추적 결과를 업데이트했습니다.');
});

$('#signalSearchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadSignal($('#signalKeyword').value.trim());
  showToast('Signal Map을 업데이트했습니다.');
});

$('#refreshModeration').addEventListener('click', async () => {
  await loadModerationQueue();
  showToast('모더레이션 큐를 새로 불러왔습니다.');
});

$('#refreshGames').addEventListener('click', async () => {
  await loadGames();
  showToast('게임 활동 분석을 새로 불러왔습니다.');
});

$('#moderationQueue').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const actionLabels = {
    warn: '디스코드 정책 위반 경고',
    timeout: '디스코드 타임아웃 권장 조치',
    suspend: '반복 위험 메시지로 활동정지',
    ignore: '관리자 검토 후 예외 처리'
  };

  try {
    await api(`/api/intelligence/moderation-queue/${encodeURIComponent(button.dataset.target)}/action`, {
      method: 'POST',
      body: JSON.stringify({
        action: button.dataset.action,
        reason: actionLabels[button.dataset.action]
      })
    });

    state.users = await api('/api/users');
    await loadModerationQueue();
    await loadAuditLogs();
    renderUsers();
    showToast('디스코드 모더레이션 조치를 기록했습니다.');
  } catch (error) {
    showToast(error.message);
  }
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
    await loadAuditLogs();
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
    await loadAuditLogs();
    renderUsers();
    renderMetrics();
  } catch (error) {
    showToast(error.message);
  }
});

$('#logFilterForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadLogs();
  showToast('로그 필터를 적용했습니다.');
});

$('#clearLogFilters').addEventListener('click', async () => {
  $('#filterIp').value = '';
  $('#filterMethod').value = '';
  $('#filterStatus').value = '';
  await loadLogs();
  showToast('로그 필터를 초기화했습니다.');
});

$('#refreshLogs').addEventListener('click', async () => {
  await loadLogs();
  showToast('로그를 새로 불러왔습니다.');
});

$('#refreshAuditLogs').addEventListener('click', async () => {
  await loadAuditLogs();
  showToast('감사 로그를 새로 불러왔습니다.');
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
    await loadAuditLogs();
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
    await loadAuditLogs();
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
