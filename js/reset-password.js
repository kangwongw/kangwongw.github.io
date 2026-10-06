let pendingResetRequestId = null;
let pendingEmail = null;
let pendingUsername = null;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-password-form');
  const statusEl = document.getElementById('reset-password-status');
  const modal = document.getElementById('new-password-modal');
  const newPasswordForm = document.getElementById('new-password-form');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-password-email').value.trim();
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

    statusEl.textContent = '확인 중...';
    statusEl.style.color = '';

    try {
      const { data: requestData, error } = await DB_UTILS.fetchLatestApprovedResetRequest(email);

      if (error) throw error;

      if (!requestData) {
        statusEl.textContent = '승인된 비밀번호 초기화 요청이 없습니다. 먼저 비밀번호 초기화 요청을 한 뒤 관리자 승인을 기다려 주세요.';
        statusEl.style.color = 'var(--text-muted)';
        return;
      }

      // 이메일로 사용자 정보 가져오기
      const { data: userData, error: userError } = await DB_UTILS.users.fetchByEmail(email);
      if (userError) throw userError;
      if (!userData) {
        statusEl.textContent = '해당 이메일로 가입된 계정이 없습니다.';
        statusEl.style.color = 'var(--text-muted)';
        return;
      }

      pendingResetRequestId = requestData.id;
      pendingEmail = email;
      pendingUsername = userData.username || email;
      statusEl.textContent = '';
      document.getElementById('new-password').value = '';
      document.getElementById('new-password-confirm').value = '';
      modal.style.display = 'flex';
    } catch (err) {
      console.error(err);
      statusEl.textContent = '오류: ' + (err.message || '확인 실패');
      statusEl.style.color = 'var(--text-muted)';
    }
  });

  modalCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    pendingResetRequestId = null;
    pendingEmail = null;
    pendingUsername = null;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      pendingResetRequestId = null;
      pendingEmail = null;
      pendingUsername = null;
    }
  });

  newPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const newPasswordConfirm = document.getElementById('new-password-confirm').value;

    if (newPassword.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!pendingEmail || !pendingUsername || !pendingResetRequestId) {
      alert('세션이 만료되었습니다. 이메일을 다시 입력해 주세요.');
      modal.style.display = 'none';
      return;
    }

    try {
      const salt = Auth.generateSalt();
      const password_hash = await Auth.hashPassword(newPassword, salt);

      // 이메일로 사용자 정보 가져오기
      const { data: userData } = await DB_UTILS.users.fetchByEmail(pendingEmail);
      if (!userData || !userData.id) {
        throw new Error('해당 이메일의 사용자를 찾을 수 없어 비밀번호를 저장하지 못했습니다. 가입 요청이 승인된 계정인지 확인해 주세요.');
      }
      const { data: updatedRows, error: updateUserError } = await DB_UTILS.users.update(userData.id, { password_hash, salt });

      if (updateUserError) throw updateUserError;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('해당 이메일의 사용자를 찾을 수 없어 비밀번호를 저장하지 못했습니다. 가입 요청이 승인된 계정인지 확인해 주세요.');
      }

      const { error: updateResetError } = await DB_UTILS.updatePasswordResetRequest(pendingResetRequestId, { used: true });

      if (updateResetError) throw updateResetError;

      // 비밀번호 재설정 완료 알림
      if (typeof notifyRequestEmail === 'function') {
        notifyRequestEmail({ 
          type: 'password_reset_completed', 
          username: pendingUsername,
          email: pendingEmail,
          resetTime: new Date().toLocaleString('ko-KR')
        });
      }

      modal.style.display = 'none';
      pendingResetRequestId = null;
      pendingEmail = null;
      pendingUsername = null;
      statusEl.textContent = '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.';
      statusEl.style.color = '';
      document.getElementById('reset-password-form').reset();
    } catch (err) {
      console.error(err);
      alert('비밀번호 변경 실패: ' + (err.message || '오류가 발생했습니다.'));
    }
  });
});
