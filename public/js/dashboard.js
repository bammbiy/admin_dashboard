fetch('/api/users')
  .then(res => res.json())
  .then(data => {
    document.getElementById('userList').innerText = JSON.stringify(data, null, 2);
  });
