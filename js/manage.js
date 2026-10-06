let allRows = [];
let currentLowLevel = 'l1';
let currentMidLevel = 'l1';
let currentStudentIdPrefix = ''; // 학번 앞 4자리 필터 (빈 문자열 = 전체)

// 공통 유틸리티 함수는 config.js에서 가져옴

document.addEventListener('DOMContentLoaded', () => {
  // 초기 빈 테이블 렌더링
  renderLowAchievementTable([]);
  renderMidAchievementTable([]);
  
  // 레벨 선택 변경 이벤트
  document.getElementById('low-level-select').addEventListener('change', (e) => {
    currentLowLevel = e.target.value;
    const filtered = filterLowAchievement(filterByPrefix(allRows));
    renderLowAchievementTable(filtered);
  });
  
  document.getElementById('mid-level-select').addEventListener('change', (e) => {
    currentMidLevel = e.target.value;
    const filtered = filterMidAchievement(filterByPrefix(allRows));
    renderMidAchievementTable(filtered);
  });

  const prefixSelect = document.getElementById('manage-student-id-prefix');
  if (prefixSelect) {
    prefixSelect.addEventListener('change', (e) => {
      currentStudentIdPrefix = e.target.value || '';
      const lowFiltered = filterLowAchievement(filterByPrefix(allRows));
      const midFiltered = filterMidAchievement(filterByPrefix(allRows));
      renderLowAchievementTable(lowFiltered);
      renderMidAchievementTable(midFiltered);
    });
  }
  
  // 데이터 로드
  fetchAllRows();
});

function renderLowAchievementTable(rows) {
  const thead = document.querySelector('#low-achievement-table thead');
  const tbody = document.querySelector('#low-achievement-table tbody');
  const statusEl = document.getElementById('low-status');
  
  if (!thead || !tbody || !statusEl) {
    console.error('테이블 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 헤더 렌더링 (항상 표시)
  thead.innerHTML = `
    <tr>
      <th>학번</th>
      <th>이름</th>
      ${SUBJECTS.map((key, index) => `<th>${getSubjectName(index + 1)}</th>`).join('')}
    </tr>
  `;
  
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 20px; color: var(--text-muted);">달성도 '하'가 있는 학생이 없습니다. (레벨: ${currentLowLevel})</td></tr>`;
    statusEl.textContent = '0건';
    return;
  }
  
  // 바디 렌더링 (현재 레벨 기준)
  tbody.innerHTML = rows.map((row) => {
    if (!row || !row.rawData) {
      console.warn('row 또는 rawData가 없습니다:', row);
      return '';
    }
    
    const achievementCells = SUBJECTS.map((key, index) => {
      const achievementKey = getAchievementKey(currentLowLevel, index);
      const achievement = row.rawData[achievementKey] || '-';
      const displayAch = getDisplayAchievement(achievement);
      // 현재 달성도가 '하'인 경우(재시험 형식 '중(하)' 등 포함) 연한 파란색 배경
      const cellClass = displayAch === '하' ? 'low-achievement-cell' : '';
      return `<td class="${cellClass}">${achievement}</td>`;
    }).join('');
    
    return `
      <tr>
        <td>${row.student_id || '-'}</td>
        <td>${(row.rawData && row.rawData.student_name) ? row.rawData.student_name : '-'}</td>
        ${achievementCells}
      </tr>
    `;
  }).join('');
  
  statusEl.textContent = `${rows.length}건 (레벨: ${currentLowLevel})`;
}

function renderMidAchievementTable(rows) {
  const thead = document.querySelector('#mid-achievement-table thead');
  const tbody = document.querySelector('#mid-achievement-table tbody');
  const statusEl = document.getElementById('mid-status');
  
  if (!thead || !tbody || !statusEl) {
    console.error('테이블 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 헤더 렌더링 (항상 표시)
  thead.innerHTML = `
    <tr>
      <th>학번</th>
      <th>이름</th>
      ${SUBJECTS.map((key, index) => `<th>${getSubjectName(index + 1)}</th>`).join('')}
    </tr>
  `;
  
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 20px; color: var(--text-muted);">달성도 '중'이 있는 학생이 없습니다. (레벨: ${currentMidLevel})</td></tr>`;
    statusEl.textContent = '0건';
    return;
  }
  
  // 바디 렌더링 (현재 레벨 기준)
  tbody.innerHTML = rows.map((row) => {
    if (!row || !row.rawData) {
      console.warn('row 또는 rawData가 없습니다:', row);
      return '';
    }
    
    const achievementCells = SUBJECTS.map((key, index) => {
      const achievementKey = getAchievementKey(currentMidLevel, index);
      const achievement = row.rawData[achievementKey] || '-';
      const displayAch = getDisplayAchievement(achievement);
      // 현재 달성도가 '중' 또는 '하'인 경우(재시험 형식 포함) 연한 파란색 배경
      const cellClass = (displayAch === '중' || displayAch === '하') ? 'low-achievement-cell' : '';
      return `<td class="${cellClass}">${achievement}</td>`;
    }).join('');
    
    return `
      <tr>
        <td>${row.student_id || '-'}</td>
        <td>${(row.rawData && row.rawData.student_name) ? row.rawData.student_name : '-'}</td>
        ${achievementCells}
      </tr>
    `;
  }).join('');
  
  statusEl.textContent = `${rows.length}건 (레벨: ${currentMidLevel})`;
}

// 학번 앞 4자리로 필터 (빈 문자열이면 전체)
function filterByPrefix(rows) {
  if (!currentStudentIdPrefix) return rows;
  return rows.filter((row) => {
    const sid = String(row.student_id || '').trim();
    return sid.slice(0, 4) === currentStudentIdPrefix;
  });
}

// 데이터에서 학번 앞 4자리 목록 추출 (드롭다운용)
function getStudentIdPrefixes(rows) {
  const set = new Set();
  (rows || []).forEach((row) => {
    const sid = String(row.student_id || '').trim();
    if (sid.length >= 4) set.add(sid.slice(0, 4));
  });
  return Array.from(set).sort();
}

function filterLowAchievement(rows) {
  return rows.filter((row) => {
    // 현재 레벨의 달성도에 '하'가 하나라도 있는지 확인 (재시험 형식 '중(하)' 등은 괄호 앞 기준)
    return SUBJECTS.some((key, index) => {
      const achievementKey = getAchievementKey(currentLowLevel, index);
      const displayAch = getDisplayAchievement(row.rawData[achievementKey]);
      return displayAch === '하';
    });
  });
}

function filterMidAchievement(rows) {
  return rows.filter((row) => {
    // 현재 레벨의 달성도에 '중' 또는 '하'가 하나라도 있는지 확인 (재시험 형식 포함)
    return SUBJECTS.some((key, index) => {
      const achievementKey = getAchievementKey(currentMidLevel, index);
      const displayAch = getDisplayAchievement(row.rawData[achievementKey]);
      return displayAch === '중' || displayAch === '하';
    });
  });
}

async function fetchAllRows() {
  const lowStatusEl = document.getElementById('low-status');
  const midStatusEl = document.getElementById('mid-status');
  
  if (!lowStatusEl || !midStatusEl) {
    console.error('상태 요소를 찾을 수 없습니다.');
    return;
  }
  
  lowStatusEl.textContent = '불러오는 중...';
  midStatusEl.textContent = '불러오는 중...';
  
  try {
    console.log('데이터를 불러오는 중...');
    const { data, error } = await DB_UTILS.fetchAllGrades({ orderBy: 'student_id', ascending: true });

    if (error) {
      console.error('Supabase 오류:', error);
      throw error;
    }

    console.log(`총 ${data ? data.length : 0}건의 데이터를 불러왔습니다.`);

    if (!data || data.length === 0) {
      console.log('데이터가 없습니다.');
      renderLowAchievementTable([]);
      renderMidAchievementTable([]);
      lowStatusEl.textContent = '0건 (데이터 없음)';
      midStatusEl.textContent = '0건 (데이터 없음)';
      return;
    }

    allRows = data.map((row) => {
      // 원본 데이터만 보관 (레벨별 정규화는 필요 없음)
      return {
        id: row.id,
        student_id: row.student_id,
        rawData: row, // 원본 데이터 보관 (모든 레벨의 달성도 포함)
      };
    });

    // 학번 앞 4자리 드롭다운 옵션 채우기
    const prefixSelect = document.getElementById('manage-student-id-prefix');
    if (prefixSelect) {
      const prefixes = getStudentIdPrefixes(allRows);
      const currentValue = prefixSelect.value || '';
      prefixSelect.innerHTML = '<option value="">전체</option>' + prefixes.map((p) => '<option value="' + p + '">' + p + '</option>').join('');
      if (prefixes.indexOf(currentValue) !== -1) prefixSelect.value = currentValue;
      else currentStudentIdPrefix = '';
    }
    
    console.log(`정규화된 데이터: ${allRows.length}건`);
    
    // 달성도 '하'가 있는 학생 필터링 (학번 앞 4자리 + 현재 레벨 기준)
    const lowAchievementRows = filterLowAchievement(filterByPrefix(allRows));
    console.log(`달성도 '하'가 있는 학생: ${lowAchievementRows.length}건 (레벨: ${currentLowLevel})`);
    renderLowAchievementTable(lowAchievementRows);
    
    // 달성도 '중'이 있는 학생 필터링 (학번 앞 4자리 + 현재 레벨 기준)
    const midAchievementRows = filterMidAchievement(filterByPrefix(allRows));
    console.log(`달성도 '중'이 있는 학생: ${midAchievementRows.length}건 (레벨: ${currentMidLevel})`);
    renderMidAchievementTable(midAchievementRows);
    
  } catch (err) {
    console.error('fetchAllRows 오류:', err);
    if (lowStatusEl) lowStatusEl.textContent = `오류: ${err.message}`;
    if (midStatusEl) midStatusEl.textContent = `오류: ${err.message}`;
    
    // 오류 발생 시에도 빈 테이블은 표시
    renderLowAchievementTable([]);
    renderMidAchievementTable([]);
  }
}
