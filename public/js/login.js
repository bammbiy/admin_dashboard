document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const message = document.getElementById('loginMessage');

  message.textContent = '';

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    location.href = '/dashboard.html';
    return;
  }

  const data = await res.json().catch(() => ({}));
  message.textContent = data.message || '로그인에 실패했습니다.';
});
