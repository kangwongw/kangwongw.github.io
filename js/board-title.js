/**
 * 로그인 없이 게시판(announcements) "1번 글" 제목만 가져와 표시.
 * - 목록에서 첫 번째 = 최신 글(created_at 내림차순 1건)의 제목을 표시합니다.
 * 네비/메뉴에는 노출하지 않는 단독 페이지용.
 */
(function () {
  const BOARD_TABLE = 'announcements';

  async function loadFirstPostTitle() {
    const titleEl = document.getElementById('title-output');
    const errorEl = document.getElementById('title-error');

    if (!titleEl) return;

    try {
      if (!window.db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      const snapshot = await window.db.collection(BOARD_TABLE)
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        titleEl.textContent = '(게시글이 없습니다.)';
        titleEl.style.color = 'var(--text-muted)';
        return;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      if (data && data.title != null) {
        titleEl.textContent = data.title;
        titleEl.style.color = '';
      } else {
        titleEl.textContent = '(게시글이 없습니다.)';
        titleEl.style.color = 'var(--text-muted)';
      }
    } catch (err) {
      console.error(err);
      titleEl.style.display = 'none';
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = '제목을 불러오지 못했습니다: ' + (err.message || '오류');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFirstPostTitle);
  } else {
    loadFirstPostTitle();
  }
})();
