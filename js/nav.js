/**
 * 모든 페이지에서 동일한 상단 네비게이션을 표시합니다.
 * 드롭다운 그룹 + 단일 링크. 로그인/회원가입/비밀번호초기화 페이지에서는 네비 숨김.
 */
(function () {
  var NAV_ITEMS = [
    {
      type: 'dropdown',
      label: '성적 입력',
      items: [
        { id: 'input', href: 'input.html', label: '성적 입력/수정' },
        { id: 'retake', href: 'retake.html', label: '재시험 성적 입력' }
      ]
    },
    {
      type: 'dropdown',
      label: '성적 조회',
      items: [
        { id: 'view', href: 'view.html', label: '성적 조회' },
        { id: 'summary', href: 'summary.html', label: '성적 요약' },
        { id: 'manage', href: 'manage.html', label: '관리 필요' },
        { id: 'retake-list', href: 'retake-list.html', label: '재시험 인원 조회' }
      ]
    },
    { type: 'link', id: 'board', href: 'board.html', label: '게시판' },
    { type: 'link', id: 'signup-requests', href: 'signup-requests.html', label: '가입 요청 관리', adminOnly: true }
  ];

  function getCurrentId() {
    var path = typeof window !== 'undefined' && window.location && window.location.pathname;
    if (!path) return '';
    var name = path.split('/').pop() || path;
    if (name === 'input.html' || name === 'preview.html') return 'input';
    if (name === 'view.html') return 'view';
    if (name === 'summary.html') return 'summary';
    if (name === 'manage.html') return 'manage';
    if (name === 'retake.html') return 'retake';
    if (name === 'retake-list.html') return 'retake-list';
    if (name === 'board.html' || name === 'board-detail.html' || name === 'board-write.html') return 'board';
    if (name === 'signup-requests.html') return 'signup-requests';
    return '';
  }

  function itemIsActive(item, current) {
    return item.id === current;
  }

  function dropdownHasActive(items, current) {
    return items.some(function (item) { return item.id === current; });
  }

  function render() {
    var nav = document.querySelector('.global-nav');
    if (!nav) return;
    if (typeof Auth !== 'undefined' && Auth.isPublicPage()) {
      nav.innerHTML = '';
      nav.style.display = 'none';
      return;
    }
    nav.style.display = '';
    var session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
    var isAdmin = session && session.is_admin;
    var current = nav.getAttribute('data-current') || getCurrentId();

    var parts = [];
    NAV_ITEMS.forEach(function (entry) {
      if (entry.adminOnly && !isAdmin) return;

      if (entry.type === 'dropdown') {
        var activeClass = dropdownHasActive(entry.items, current) ? ' is-active' : '';
        parts.push('<div class="nav-dropdown">');
        parts.push('<button type="button" class="nav-dropdown-trigger' + activeClass + '" aria-haspopup="true" aria-expanded="false">' + entry.label + '</button>');
        parts.push('<div class="nav-dropdown-panel" role="menu">');
        entry.items.forEach(function (item) {
          var aClass = item.id === current ? ' is-active' : '';
          parts.push('<a href="' + item.href + '" class="nav-dropdown-link' + aClass + '" role="menuitem">' + item.label + '</a>');
        });
        parts.push('</div></div>');
      } else {
        var linkActive = entry.id === current ? ' class="is-active"' : '';
        parts.push('<a href="' + entry.href + '"' + linkActive + '>' + entry.label + '</a>');
      }
    });

    var html = parts.join('');
    if (session) {
      html += ' <a href="login.html" id="nav-logout" class="nav-logout">로그아웃</a>';
    }
    nav.innerHTML = html;

    // 드롭다운: 클릭으로 토글, 다른 드롭다운 클릭 시 기존 것 닫기, 바깥 클릭 시 닫기
    var allDropdowns = nav.querySelectorAll('.nav-dropdown');

    function closeDropdown(dd) {
      var t = dd.querySelector('.nav-dropdown-trigger');
      var p = dd.querySelector('.nav-dropdown-panel');
      if (p) p.classList.remove('is-open');
      if (t) t.setAttribute('aria-expanded', 'false');
    }

    function closeAllExcept(exceptDropdown) {
      allDropdowns.forEach(function (dd) {
        if (dd !== exceptDropdown) closeDropdown(dd);
      });
    }

    allDropdowns.forEach(function (dropdown) {
      var trigger = dropdown.querySelector('.nav-dropdown-trigger');
      var panel = dropdown.querySelector('.nav-dropdown-panel');
      if (!trigger || !panel) return;

      function close() {
        closeDropdown(dropdown);
      }
      function toggle() {
        var isOpen = panel.classList.contains('is-open');
        closeAllExcept(isOpen ? dropdown : null);
        if (!isOpen) {
          panel.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        } else {
          close();
        }
      }

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      });

      document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target)) close();
      });
    });

    var logoutLink = document.getElementById('nav-logout');
    if (logoutLink) {
      logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof Auth !== 'undefined') Auth.clearSession();
        window.location.href = 'login.html';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
