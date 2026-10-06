document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const statusEl = document.getElementById('signup-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    const name = document.getElementById('signup-name').value.trim();
    const title = document.getElementById('signup-title').value.trim();

    if (!email || !password || !name) {
      statusEl.textContent = '이메일, 비밀번호, 이름을 입력하세요.';
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
    if (password.length < 6) {
      statusEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
      statusEl.style.color = 'var(--text-muted)';
      return;
    }
    if (password !== passwordConfirm) {
      statusEl.textContent = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
      statusEl.style.color = 'var(--text-muted)';
      return;
    }

    statusEl.textContent = '가입 처리 중...';
    statusEl.style.color = '';

    try {
      const salt = Auth.generateSalt();
      const password_hash = await Auth.hashPassword(password, salt);

      const { error } = await DB_UTILS.users.insert({
        username: email, // 이메일을 username으로 사용
        email: email, // email 필드도 별도로 저장
        password_hash,
        salt,
        name,
        title: title || null,
        approved: false,
        is_admin: false
      });

      if (error) throw error;

      if (typeof notifyRequestEmail === 'function') {
        notifyRequestEmail({ type: 'signup_request', username: email, email: email, name, title: title || '' });
      }
      statusEl.textContent = '가입 요청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.';
      statusEl.style.color = '';
      form.reset();
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.code === '23505' || err.message && err.message.includes('already exists')) {
        statusEl.textContent = '이미 사용 중인 이메일입니다.';
      } else {
        statusEl.textContent = '가입 실패: ' + (err.message || '오류가 발생했습니다.');
      }
      statusEl.style.color = 'var(--text-muted)';
    }
  });
});
