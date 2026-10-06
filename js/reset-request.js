const RESET_TABLE = 'password_reset_requests';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-request-form');
  const statusEl = document.getElementById('reset-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();

    if (!email) {
      statusEl.textContent = '이메일을 입력하세요.';
      statusEl.style.color = 'var(--text-muted)';
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      statusEl.textContent = '올바른 이메일 형식을 입력하세요.';
      statusEl.style.color = 'var(--text-muted)';
      return;
    }

    statusEl.textContent = '요청 처리 중...';
    statusEl.style.color = '';

    try {
      // 이메일로 사용자 확인
      const { data: user, error: userError } = await DB_UTILS.users.fetchByEmail(email);
      if (userError) throw userError;
      if (!user) {
        statusEl.textContent = '해당 이메일로 가입된 계정이 없습니다.';
        statusEl.style.color = 'var(--text-muted)';
        return;
      }

      const { error } = await DB_UTILS.insertPasswordResetRequest({
        username: user.username || null,
        email,
        token: null,
        used: false
      });

      if (error) throw error;

      if (typeof notifyRequestEmail === 'function') {
        notifyRequestEmail({ type: 'password_reset_request', username: user.username || email, email });
      }
      statusEl.textContent = '요청이 접수되었습니다. 확인 후 입력하신 이메일로 안내드리겠습니다.';
      statusEl.style.color = '';
      form.reset();
    } catch (err) {
      console.error(err);
      statusEl.textContent = '요청 실패: ' + (err.message || '오류가 발생했습니다.');
      statusEl.style.color = 'var(--text-muted)';
    }
  });
});
