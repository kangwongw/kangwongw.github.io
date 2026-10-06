document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const statusEl = document.getElementById('login-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      statusEl.textContent = '아이디와 비밀번호를 입력하세요.';
      statusEl.style.color = 'var(--text-muted)';
      return;
    }

    statusEl.textContent = '로그인 중...';
    statusEl.style.color = '';

    try {
      const { data: user, error } = await DB_UTILS.users.fetchByUsername(username);

      if (error) throw error;
      if (!user) {
        statusEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
        statusEl.style.color = 'var(--text-muted)';
        return;
      }

      const ok = await Auth.verifyPassword(password, user.salt, user.password_hash);
      if (!ok) {
        statusEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
        statusEl.style.color = 'var(--text-muted)';
        return;
      }

      if (user.approved !== true) {
        statusEl.textContent = '가입 요청이 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.';
        statusEl.style.color = 'var(--text-muted)';
        return;
      }

      Auth.setSession({
        username: user.username,
        name: user.name || '',
        title: user.title || '',
        is_admin: user.is_admin === true
      });
      statusEl.textContent = '';
      window.location.href = 'view.html';
    } catch (err) {
      console.error(err);
      statusEl.textContent = '로그인 실패: ' + (err.message || '오류가 발생했습니다.');
      statusEl.style.color = 'var(--text-muted)';
    }
  });
});
