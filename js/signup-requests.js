document.addEventListener('DOMContentLoaded', () => {
  const session = Auth.getSession();
  if (!session || !session.is_admin) {
    window.location.href = 'view.html';
    return;
  }

  loadPendingRequests();
  loadResetRequests();
});

async function loadPendingRequests() {
  const statusEl = document.getElementById('signup-requests-status');
  const tbody = document.querySelector('#signup-requests-table tbody');
  const emptyEl = document.getElementById('signup-requests-empty');

  statusEl.textContent = '가입 요청 목록을 불러오는 중...';
  statusEl.style.color = '';
  tbody.innerHTML = '';
  emptyEl.style.display = 'none';

  try {
    const { data: rows, error } = await DB_UTILS.users.fetchPendingApprovals();

    if (error) throw error;

    statusEl.textContent = '';

    if (!rows || rows.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const dateStr = formatDate(row.created_at, true);
        return `
          <tr data-id="${row.id}">
            <td>${escapeHtml(row.username || '')}</td>
            <td>${escapeHtml(row.name || '')}</td>
            <td>${escapeHtml(row.title || '-')}</td>
            <td>${dateStr}</td>
            <td>
            <button type="button" class="primary approve-btn" data-id="${row.id}" style="padding: 6px 12px; font-size: 13px;">승인</button>
            <button type="button" class="secondary delete-btn" data-id="${row.id}" style="padding: 6px 12px; font-size: 13px; margin-left: 6px;">삭제</button>
          </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.approve-btn').forEach((btn) => {
      btn.addEventListener('click', () => approveRequest(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteRequest(btn.dataset.id));
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = '목록을 불러오지 못했습니다: ' + (err.message || '오류');
    statusEl.style.color = 'var(--text-muted)';
  }
}

async function approveRequest(userId) {
  const statusEl = document.getElementById('signup-requests-status');
  statusEl.textContent = '승인 처리 중...';
  statusEl.style.color = '';

  try {
    // 먼저 사용자 정보 가져오기
    const { data: userData, error: fetchError } = await DB_UTILS.users.fetchById(userId);
    if (fetchError) throw fetchError;
    if (!userData) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    const { error } = await DB_UTILS.users.update(userId, { approved: true });

    if (error) throw error;

    // 사용자에게 승인 완료 이메일 발송
    if (typeof sendUserEmail === 'function') {
      const userEmail = userData.email || userData.username;
      if (userEmail) {
        sendUserEmail({
          type: 'signup_approved',
          to_email: userEmail,
          username: userData.username || userEmail,
          name: userData.name || ''
        });
      }
    }

    statusEl.textContent = '승인되었습니다.';
    statusEl.style.color = '';
    loadPendingRequests();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '승인 실패: ' + (err.message || '오류');
    statusEl.style.color = 'var(--text-muted)';
  }
}

async function deleteRequest(userId) {
  if (!confirm('이 가입 요청을 삭제하면 목록에서 제거됩니다. 계속할까요?')) return;
  const statusEl = document.getElementById('signup-requests-status');
  statusEl.textContent = '삭제 처리 중...';
  statusEl.style.color = '';

  try {
    const { error } = await DB_UTILS.users.delete(userId);

    if (error) throw error;

    statusEl.textContent = '삭제되었습니다.';
    statusEl.style.color = '';
    loadPendingRequests();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '삭제 실패: ' + (err.message || '오류');
    statusEl.style.color = 'var(--text-muted)';
  }
}

async function loadResetRequests() {
  const statusEl = document.getElementById('reset-requests-status');
  const tbody = document.querySelector('#reset-requests-table tbody');
  const emptyEl = document.getElementById('reset-requests-empty');

  if (!statusEl || !tbody || !emptyEl) return;

  statusEl.textContent = '비밀번호 초기화 요청 목록을 불러오는 중...';
  statusEl.style.color = '';
  tbody.innerHTML = '';
  emptyEl.style.display = 'none';

  try {
    // 비밀번호 재설정 요청 조회
    const { data: rows, error } = await DB_UTILS.fetchAllResetRequests();

    if (error) throw error;

    statusEl.textContent = '';

    if (!rows || rows.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const dateStr = formatDate(row.created_at, true);
        let statusStr = '대기';
        if (row.used === true) statusStr = '비밀번호 변경 완료';
        else if (row.approved === true) statusStr = '승인됨 (재설정 대기)';
        const statusClass = row.used === true ? 'color: var(--text-muted);' : '';
        const showApproveBtn = row.approved !== true && row.used !== true;
        return `
          <tr data-id="${row.id}">
            <td>${escapeHtml(row.username || '-')}</td>
            <td>${escapeHtml(row.email || '')}</td>
            <td>${dateStr}</td>
            <td style="${statusClass}">${statusStr}</td>
            <td>
            ${showApproveBtn ? `<button type="button" class="primary approve-reset-btn" data-id="${row.id}" style="padding: 6px 12px; font-size: 13px;">승인</button>` : ''}
            <button type="button" class="secondary delete-reset-btn" data-id="${row.id}" style="padding: 6px 12px; font-size: 13px; margin-left: 6px;">삭제</button>
          </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.approve-reset-btn').forEach((btn) => {
      btn.addEventListener('click', () => approveResetRequest(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-reset-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteResetRequest(btn.dataset.id));
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = '목록을 불러오지 못했습니다: ' + (err.message || '오류');
    statusEl.style.color = 'var(--text-muted)';
  }
}

async function deleteResetRequest(requestId) {
  if (!confirm('이 비밀번호 초기화 요청을 삭제하면 목록에서 제거됩니다. 계속할까요?')) return;
  const statusEl = document.getElementById('reset-requests-status');
  statusEl.textContent = '삭제 처리 중...';
  statusEl.style.color = '';

  try {
    const { error } = await DB_UTILS.deletePasswordResetRequest(requestId);

    if (error) throw error;

    statusEl.textContent = '삭제되었습니다.';
    statusEl.style.color = '';
    loadResetRequests();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '삭제 실패: ' + (err.message || '오류');
    statusEl.style.color = 'var(--text-muted)';
  }
}

async function approveResetRequest(requestId) {
  const statusEl = document.getElementById('reset-requests-status');
  statusEl.textContent = '승인 처리 중...';
  statusEl.style.color = '';

  try {
    // 먼저 요청 정보 가져오기
    const { data: requestData, error: fetchError } = await DB_UTILS.fetchPasswordResetRequestById(requestId);
    if (fetchError) throw fetchError;
    if (!requestData) {
      throw new Error('요청 정보를 찾을 수 없습니다.');
    }

    const { error } = await DB_UTILS.updatePasswordResetRequest(requestId, { approved: true });

    if (error) throw error;

    // 사용자에게 승인 완료 이메일 발송
    if (typeof sendUserEmail === 'function' && requestData.email) {
      sendUserEmail({
        type: 'password_reset_approved',
        to_email: requestData.email,
        username: requestData.username || requestData.email
      });
    }

    statusEl.textContent = '비밀번호 초기화 요청이 승인되었습니다.';
    statusEl.style.color = '';
    loadResetRequests();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '승인 실패: ' + (err.message || '오류');
    statusEl.style.color = 'var(--text-muted)';
  }
}

// escapeHtml 함수는 config.js에서 제공됨
