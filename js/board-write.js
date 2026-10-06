const BOARD_TABLE = 'announcements';

function getAuthorFromSession() {
  const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
  if (!session) return '';
  const title = (session.title || '').trim();
  const name = (session.name || '').trim();
  if (title && name) return `[${title}]${name}`;
  if (name) return name;
  return '';
}

document.addEventListener('DOMContentLoaded', () => {
  const authorInput = document.getElementById('board-author');
  const author = getAuthorFromSession();
  if (authorInput) authorInput.value = author;

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'board.html';
  });

  document.getElementById('cancel-btn').addEventListener('click', () => {
    if (confirm('작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?')) {
      window.location.href = 'board.html';
    }
  });

  document.getElementById('board-form').addEventListener('submit', handleCreatePost);
});

async function handleCreatePost(event) {
  event.preventDefault();
  const statusEl = document.getElementById('board-form-status');
  statusEl.textContent = '게시글을 등록하는 중입니다...';

  const title = document.getElementById('board-title').value.trim();
  const author = getAuthorFromSession();
  const content = document.getElementById('board-content').value.trim();

  if (!title || !content) {
    statusEl.textContent = '제목과 내용을 입력해 주세요.';
    statusEl.style.color = 'var(--text-muted)';
    return;
  }
  if (!author) {
    statusEl.textContent = '로그인 정보(이름)가 없습니다. 다시 로그인해 주세요.';
    statusEl.style.color = 'var(--text-muted)';
    return;
  }

  try {
    const { data, error } = await DB_UTILS.insertAnnouncement({
      title,
      author,
      content,
    });

    if (error) throw error;

    statusEl.textContent = '게시글이 등록되었습니다. 목록으로 이동합니다...';
    statusEl.style.color = '';
    
    setTimeout(() => {
      window.location.href = 'board.html';
    }, 1000);
  } catch (err) {
    console.error(err);
    statusEl.textContent = `등록 실패: ${err.message}`;
    statusEl.style.color = 'var(--text-muted)';
  }
}


















