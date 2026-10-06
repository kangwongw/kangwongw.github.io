/**
 * 재시험 인원 조회: 재시험한 학생만 표시, 각 과목 셀에 "5(하) -> 9(상)" 형식으로 표시
 */
(function () {
  let allRows = [];
  let currentLevel = 'l1';

  // 공통 유틸리티 함수는 config.js에서 가져옴
  // formatScoreCell 함수 사용

  // 해당 레벨에서 재시험 이력이 하나라도 있는지
  function hasRetakeInLevel(rawData, level) {
    for (let idx = 0; idx < SUBJECTS.length; idx++) {
      const scoreKey = getSubjectKey(level, idx);
      const achKey = getAchievementKey(level, idx);
      if (isRetakeScore(rawData[scoreKey]) || isRetakeAchievement(rawData[achKey])) return true;
    }
    return false;
  }

  function filterRetakeRows(rows) {
    return rows.filter(function (row) {
      return row && row.rawData && hasRetakeInLevel(row.rawData, currentLevel);
    });
  }

  function renderTable(rows) {
    const thead = document.querySelector('#retake-list-table thead');
    const tbody = document.querySelector('#retake-list-table tbody');
    const statusEl = document.getElementById('retake-list-status');
    if (!thead || !tbody || !statusEl) return;

    thead.innerHTML =
      '<tr><th>학번</th><th>이름</th>' +
      SUBJECTS.map(function (_, index) {
        return '<th>' + getSubjectName(index + 1) + '</th>';
      }).join('') +
      '</tr>';

    if (!rows || rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="20" style="text-align: center; padding: 20px; color: var(--text-muted);">재시험 이력이 있는 학생이 없습니다. (레벨: ' +
        currentLevel.toUpperCase() +
        ')</td></tr>';
      statusEl.textContent = '0건';
      return;
    }

    tbody.innerHTML = rows
      .map(function (row) {
        const raw = row.rawData;
        const nameDisplay = raw && raw.student_name ? raw.student_name : '-';
        const cells = SUBJECTS.map(function (_, index) {
          const scoreKey = getSubjectKey(currentLevel, index);
          const achKey = getAchievementKey(currentLevel, index);
          const text = formatScoreCell(raw[scoreKey], raw[achKey]);
          return '<td class="retake-list-cell">' + text + '</td>';
        }).join('');
        return '<tr><td>' + (row.student_id || '-') + '</td><td>' + nameDisplay + '</td>' + cells + '</tr>';
      })
      .join('');
    statusEl.textContent = rows.length + '건 (레벨: ' + currentLevel.toUpperCase() + ')';
  }

  async function fetchAll() {
    const statusEl = document.getElementById('retake-list-status');
    statusEl.textContent = '불러오는 중...';
    try {
      const { data, error } = await DB_UTILS.fetchAllGrades({ orderBy: 'student_id', ascending: true });
      if (error) throw error;
      allRows = (data || []).map(function (row) {
        return { student_id: row.student_id, rawData: row };
      });
      const filtered = filterRetakeRows(allRows);
      renderTable(filtered);
    } catch (err) {
      console.error(err);
      statusEl.textContent = '불러오기 실패: ' + (err.message || err);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderTable([]);
    fetchAll();
    document.getElementById('retake-list-level').addEventListener('change', function (e) {
      currentLevel = e.target.value;
      var filtered = filterRetakeRows(allRows);
      renderTable(filtered);
    });
  });
})();
