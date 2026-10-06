const BOARD_TABLE = 'announcements';
const PAGE_SIZE = 10;

let boardPosts = [];
let filteredPosts = [];
let currentPage = 1;
let selectedPostId = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
  // 탭 전환: 페이지별 기능 안내 / 게시글 보기
  const tabButtons = document.querySelectorAll('.board-tabs .tab-button');
  const tabPanels = document.querySelectorAll('#board-tab-content-guide, #board-tab-content-posts');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById('board-tab-content-' + tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  fetchBoardPosts();

  document.getElementById('board-search-btn').addEventListener('click', handleSearch);
  document.getElementById('board-search-input').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  });

  document.getElementById('board-refresh-btn').addEventListener('click', () => {
    document.getElementById('board-search-input').value = '';
    currentPage = 1;
    fetchBoardPosts();
  });

  document.getElementById('board-write-btn').addEventListener('click', () => {
    window.location.href = 'board-write.html';
  });

  document.getElementById('board-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderBoardTable();
    }
  });

  document.getElementById('board-next-page').addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
    if (currentPage < totalPages) {
      currentPage += 1;
      renderBoardTable();
    }
  });
});

async function fetchBoardPosts() {
  if (isLoading) return;
  isLoading = true;
  const statusEl = document.getElementById('board-status');
  statusEl.textContent = '게시글을 불러오는 중입니다...';

  try {
    const { data, error } = await DB_UTILS.fetchAllAnnouncements({ orderBy: 'created_at', ascending: false });

    if (error) throw error;

    // Firestore Timestamp 처리
    const getDate = (timestamp) => {
      if (!timestamp) return new Date(0);
      if (timestamp.toDate) return timestamp.toDate();
      if (timestamp instanceof Date) return timestamp;
      return new Date(timestamp);
    };
    
    boardPosts = (data || []).sort((a, b) => {
      const aPinned = a.is_pinned === true ? 1 : 0;
      const bPinned = b.is_pinned === true ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return getDate(b.created_at) - getDate(a.created_at);
    });
    filteredPosts = [...boardPosts];
    currentPage = 1;
    renderBoardTable();
    statusEl.textContent = `총 ${filteredPosts.length}건의 게시글이 있습니다.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `게시글을 불러오지 못했습니다: ${err.message}`;
  } finally {
    isLoading = false;
  }
}

function handleSearch() {
  const keyword = document.getElementById('board-search-input').value.trim().toLowerCase();
  if (!keyword) {
    filteredPosts = [...boardPosts];
  } else {
    filteredPosts = boardPosts.filter((post) => {
      return (
        post.title?.toLowerCase().includes(keyword) ||
        post.author?.toLowerCase().includes(keyword)
      );
    });
  }
  currentPage = 1;
  renderBoardTable();
}

function renderBoardTable() {
  const tbody = document.querySelector('#board-table tbody');
  const statusEl = document.getElementById('board-status');
  const totalCountEl = document.getElementById('board-total-count');
  const paginationInfo = document.getElementById('board-pagination-info');

  totalCountEl.textContent = filteredPosts.length;

  if (!filteredPosts.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 32px; color: var(--text-muted); text-align: center;">등록된 게시글이 없습니다.</td></tr>`;
    paginationInfo.textContent = '0 / 0';
    toggleDetail(false);
    statusEl.textContent = '게시글이 없습니다. 새로운 글을 등록해 주세요.';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = filteredPosts.slice(startIndex, startIndex + PAGE_SIZE);

  // 오래된 글이 1번이 되도록: created_at 오름차순으로 1,2,3,... 부여 후 매핑
  const getDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  };
  const byCreatedAsc = [...filteredPosts].sort((a, b) => getDate(a.created_at) - getDate(b.created_at));
  const postNumberMap = new Map();
  byCreatedAsc.forEach((p, i) => postNumberMap.set(p.id, i + 1));

  tbody.innerHTML = paginatedRows
    .map((post) => {
      const number = postNumberMap.get(post.id) ?? '-';
      const noticeBadge = post.is_pinned === true ? '<span class="board-notice-badge">공지</span> ' : '';
      return `
        <tr data-id="${post.id}" class="${post.is_pinned ? 'board-row-notice' : ''}">
          <td>${number}</td>
          <td class="board-title-cell" style="cursor: pointer;">${noticeBadge}${post.title}</td>
          <td>${post.author}</td>
          <td>${formatDate(post.created_at)}</td>
          <td>${post.views ?? 0}</td>
        </tr>
      `;
    })
    .join('');

  paginationInfo.textContent = `${currentPage} / ${totalPages}`;

  tbody.querySelectorAll('tr').forEach((row) => {
    const titleCell = row.querySelector('.board-title-cell');
    titleCell.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = row.dataset.id;
      window.location.href = `board-detail.html?id=${postId}`;
    });
  });

  statusEl.textContent = `총 ${filteredPosts.length}건 중 ${paginatedRows.length}건을 표시합니다.`;
}


// formatDate와 formatContent 함수는 config.js에서 제공됨

