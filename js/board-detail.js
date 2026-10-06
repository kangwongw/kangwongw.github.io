const BOARD_TABLE = 'announcements';
let currentPostId = null;
let currentPost = null;
let orderedPosts = []; // 목록 순서(공지 우선, 최신순) { id, title }

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  
  if (!postId) {
    alert('게시글을 찾을 수 없습니다.');
    window.location.href = 'board.html';
    return;
  }
  
  currentPostId = postId;
  fetchPostListThenDetail();
  
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'board.html';
  });
  
  document.getElementById('delete-btn').addEventListener('click', handleDeletePost);
});

// 목록 순서(공지 우선, 최신순)로 id 배열을 가져온 뒤 상세 조회
async function fetchPostListThenDetail() {
  const statusEl = document.getElementById('board-status');
  statusEl.textContent = '게시글을 불러오는 중입니다...';
  
  try {
    const { data: listData, error: listError } = await DB_UTILS.fetchAllAnnouncements({ orderBy: 'created_at', ascending: false });
    
    if (listError) throw listError;
    
    const sorted = (listData || []).sort((a, b) => {
      const aPinned = a.is_pinned === true ? 1 : 0;
      const bPinned = b.is_pinned === true ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      
      // Firestore Timestamp 처리
      const getDate = (timestamp) => {
        if (!timestamp) return new Date(0);
        if (timestamp.toDate) return timestamp.toDate();
        if (timestamp instanceof Date) return timestamp;
        return new Date(timestamp);
      };
      
      return getDate(b.created_at) - getDate(a.created_at);
    });
    orderedPosts = sorted.map((p) => ({ id: String(p.id), title: p.title || '' }));
    
    await fetchPostDetail();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `게시글을 불러오지 못했습니다: ${err.message}`;
  }
}

async function fetchPostDetail() {
  const statusEl = document.getElementById('board-status');
  
  try {
    const { data, error } = await DB_UTILS.fetchAnnouncementById(currentPostId);
    
    if (error) throw error;
    
    if (!data) {
      alert('게시글을 찾을 수 없습니다.');
      window.location.href = 'board.html';
      return;
    }
    
    currentPost = data;
    
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
      deleteBtn.style.display = data.is_pinned === true ? 'none' : '';
    }
    
    await incrementViewCount(data);
    
    document.getElementById('board-detail-title').textContent = data.title;
    document.getElementById('board-detail-meta').textContent = `${data.author} · ${formatDate(data.created_at, true)}`;
    document.getElementById('board-detail-views').textContent = (data.views ?? 0) + 1;
    const bodyEl = document.getElementById('board-detail-body');
    if (bodyEl) {
      bodyEl.innerHTML = data.content || '';
    }
    
    renderPrevNextLinks();
    statusEl.textContent = '';
  } catch (err) {
    console.error(err);
    statusEl.textContent = `게시글을 불러오지 못했습니다: ${err.message}`;
  }
}

function renderPrevNextLinks() {
  const idx = orderedPosts.findIndex((p) => p.id === String(currentPostId));
  const prevPost = idx > 0 ? orderedPosts[idx - 1] : null;
  const nextPost = idx >= 0 && idx < orderedPosts.length - 1 ? orderedPosts[idx + 1] : null;
  
  const prevEl = document.getElementById('board-prev-link');
  const nextEl = document.getElementById('board-next-link');
  // escapeHtml 함수는 config.js에서 제공됨
  
  if (prevEl) {
    if (prevPost) {
      const title = escapeHtml(prevPost.title);
      const short = title.length > 30 ? title.slice(0, 30) + '…' : title;
      prevEl.innerHTML = `<a href="board-detail.html?id=${encodeURIComponent(prevPost.id)}" class="board-prev-next-link">← 이전글: ${short}</a>`;
      prevEl.style.display = '';
    } else {
      prevEl.innerHTML = '';
      prevEl.style.display = 'none';
    }
  }
  if (nextEl) {
    if (nextPost) {
      const title = escapeHtml(nextPost.title);
      const short = title.length > 30 ? title.slice(0, 30) + '…' : title;
      nextEl.innerHTML = `<a href="board-detail.html?id=${encodeURIComponent(nextPost.id)}" class="board-prev-next-link">다음글: ${short} →</a>`;
      nextEl.style.display = '';
    } else {
      nextEl.innerHTML = '';
      nextEl.style.display = 'none';
    }
  }
}

async function incrementViewCount(post) {
  try {
    const newViews = (post.views ?? 0) + 1;
      await DB_UTILS.updateAnnouncement(String(post.id), { views: newViews });
  } catch (err) {
    console.error('조회수 업데이트 실패:', err);
  }
}

async function handleDeletePost() {
  if (!currentPostId) {
    alert('삭제할 게시글을 찾을 수 없습니다.');
    return;
  }
  if (currentPost && currentPost.is_pinned === true) {
    alert('공지(고정) 글은 삭제할 수 없습니다.');
    return;
  }

  if (!confirm('이 게시글을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
    return;
  }

  const statusEl = document.getElementById('board-status');
  statusEl.textContent = '게시글을 삭제하는 중입니다...';

  try {
      const { error } = await DB_UTILS.deleteAnnouncement(currentPostId);

    if (error) throw error;

    alert('게시글이 삭제되었습니다.');
    window.location.href = 'board.html';
  } catch (err) {
    console.error(err);
    statusEl.textContent = `삭제 실패: ${err.message}`;
  }
}

// formatDate는 config.js에서 가져옴


















