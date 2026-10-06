let allGradeData = [];
let selectedGraduateYear = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchGrades();
  
  document.getElementById('refresh-btn').addEventListener('click', () => {
    fetchGrades();
  });
  
  document.getElementById('graduate-year-select').addEventListener('change', (e) => {
    selectedGraduateYear = e.target.value === '' ? null : parseInt(e.target.value);
    renderSummaryTable();
  });

  // 학번 목록 모달 닫기
  const summaryModal = document.getElementById('summary-student-modal');
  const summaryModalClose = document.getElementById('summary-modal-close');
  if (summaryModalClose) summaryModalClose.addEventListener('click', () => { if (summaryModal) summaryModal.style.display = 'none'; });
  if (summaryModal) summaryModal.addEventListener('click', (e) => { if (e.target === summaryModal) summaryModal.style.display = 'none'; });
});

async function fetchGrades() {
  const statusEl = document.getElementById('summary-status');
  statusEl.textContent = '데이터를 불러오는 중...';

  try {
    const { data, error } = await DB_UTILS.fetchAllGrades({ orderBy: 'student_id', ascending: true });

    if (error) throw error;

    allGradeData = data || [];
    
    // 졸업 연도 목록 추출 및 드롭다운 채우기
    const graduateYears = new Set();
    allGradeData.forEach(row => {
      if (row.graduate_year !== null && row.graduate_year !== undefined) {
        graduateYears.add(parseInt(row.graduate_year));
      }
    });
    
    const sortedYears = Array.from(graduateYears).sort((a, b) => a - b);
    const yearSelect = document.getElementById('graduate-year-select');
    
    // 기존 옵션 유지 (전체 옵션)
    const existingOptions = yearSelect.querySelectorAll('option');
    existingOptions.forEach(opt => {
      if (opt.value !== '') opt.remove();
    });
    
    sortedYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
    
    // 통계 테이블 렌더링
    renderSummaryTable();
    
    statusEl.textContent = `총 ${allGradeData.length}건의 데이터를 불러왔습니다.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `불러오기 실패: ${err.message}`;
  }
}

function renderSummaryTable() {
  // 선택된 졸업 연도에 해당하는 데이터 필터링
  let filteredData = allGradeData;
  if (selectedGraduateYear !== null) {
    filteredData = allGradeData.filter(row => {
      return row.graduate_year !== null && row.graduate_year !== undefined && 
             parseInt(row.graduate_year) === selectedGraduateYear;
    });
  }
  
  // 총 인원수 계산
  const totalCount = filteredData.length;
  
  // 상태 업데이트
  const statusEl = document.getElementById('summary-status');
  const yearText = selectedGraduateYear !== null ? `${selectedGraduateYear}년 졸업` : '전체';
  statusEl.textContent = `${yearText} 기준 총 ${totalCount}명`;
  
  // 각 레벨별로 테이블 렌더링
  renderLevelTable('l1', 'L1', filteredData, totalCount);
  renderLevelTable('l2', 'L2', filteredData, totalCount);
  renderLevelTable('l3', 'L3', filteredData, totalCount);
}

function renderLevelTable(levelId, levelName, filteredData, totalCount) {
  const tbody = document.querySelector(`#${levelId}-summary-table tbody`);
  const statusEl = document.getElementById(`${levelId}-status`);
  
  if (!tbody || !statusEl) return;
  
  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">데이터가 없습니다.</td></tr>';
    statusEl.textContent = '0건';
    return;
  }
  
  const level = levelName.toLowerCase();
  
  // 1) 수강과목 기준 → 2) 핵심술기 과목 → 3) 수강년도 순으로 그룹화
  // 키: "수강과목|핵심술기과목|수강년도" (점수에서 추출한 수강과목, 해당 열의 핵심술기 과목명, 수강년도)
  const groupMap = new Map();
  
  filteredData.forEach((row) => {
    SUBJECTS.forEach((subjectKey, index) => {
      const subjectNum = index + 1;
      const coreSubjectName = getSubjectName(subjectNum); // 핵심술기 과목 e.g. "1_활력징후"
      const achievementKey = getAchievementKey(level, index);
      const levelSubjectKey = getSubjectKey(level, index);
      
      const scoreValue = row[levelSubjectKey];
      const achievementRaw = row[achievementKey];
      const achievement = (achievementRaw != null && String(achievementRaw).indexOf('(') > 0)
        ? String(achievementRaw).trim().slice(0, String(achievementRaw).indexOf('('))
        : (achievementRaw || '');
      
      if (scoreValue === null || scoreValue === undefined || String(scoreValue).trim() === '') return;
      
      const strValue = String(scoreValue);
      const match = strValue.match(/^\d+(?:\.\d+)?(?:\(([^,]*),\s*([^)]*)\))?$/);
      let year = '-';
      let courseName = '-'; // 수강과목 (점수 괄호 안 두 번째 값)
      if (match) {
        if (match[1]) year = match[1].trim() || '-';
        if (match[2]) courseName = match[2].trim() || '-';
      }
      
      const mapKey = courseName + '|' + coreSubjectName + '|' + year;
      if (!groupMap.has(mapKey)) {
        groupMap.set(mapKey, {
          subjectName: courseName,
          coreSubject: coreSubjectName,
          year: year,
          high: 0,
          mid: 0,
          low: 0,
          highIds: [],
          midIds: [],
          lowIds: []
        });
      }
      const g = groupMap.get(mapKey);
      const sid = row.student_id != null ? String(row.student_id).trim() : '';
      if (achievement === '상') { g.high++; if (sid) g.highIds.push(sid); }
      else if (achievement === '중') { g.mid++; if (sid) g.midIds.push(sid); }
      else if (achievement === '하') { g.low++; if (sid) g.lowIds.push(sid); }
    });
  });
  
  const rows = Array.from(groupMap.values()).map((g) => {
    const total = g.high + g.mid + g.low;
    const highP = total > 0 ? ((g.high / total) * 100).toFixed(2) : '0.00';
    const midP = total > 0 ? ((g.mid / total) * 100).toFixed(2) : '0.00';
    const lowP = total > 0 ? ((g.low / total) * 100).toFixed(2) : '0.00';
    return {
      level: levelName,
      subjectName: g.subjectName,
      subject: g.coreSubject,
      year: g.year === '-' ? '-' : g.year + '년',
      high: g.high + '(' + highP + ')',
      mid: g.mid + '(' + midP + ')',
      low: g.low + '(' + lowP + ')',
      highIds: g.highIds || [],
      midIds: g.midIds || [],
      lowIds: g.lowIds || []
    };
  });
  
  // 정렬: 1) 수강과목(과목명) 2) 핵심술기 과목 3) 수강년도(내림차순)
  const sortedRows = [...rows].sort((a, b) => {
    const nameA = a.subjectName || '-';
    const nameB = b.subjectName || '-';
    if (nameA !== nameB) {
      if (nameA === '-') return 1;
      if (nameB === '-') return -1;
      const c = nameA.localeCompare(nameB, 'ko');
      if (c !== 0) return c;
    }
    const subjA = a.subject || '';
    const subjB = b.subject || '';
    if (subjA !== subjB) return subjA.localeCompare(subjB, 'ko');
    const yearA = a.year || '-';
    const yearB = b.year || '-';
    if (yearA === '-' && yearB !== '-') return 1;
    if (yearA !== '-' && yearB === '-') return -1;
    if (yearA === '-' && yearB === '-') return 0;
    const numA = parseInt(String(yearA).replace('년', ''), 10);
    const numB = parseInt(String(yearB).replace('년', ''), 10);
    return (numB - numA);
  });
  
  const groupedRows = [];
  let previousSubjectName = null;
  let previousSubject = null;
  let previousYear = null;
  
  sortedRows.forEach((row, index) => {
    const currentSubjectName = row.subjectName || '-';
    const currentSubject = row.subject || '';
    const currentYear = row.year || '-';
    
    // 과목명이 바뀌면 새 그룹
    const isNewGroup = index === 0 || previousSubjectName !== currentSubjectName;
    
    // 같은 과목명 내에서 과목이 바뀌면 과목을 표시
    const isNewSubject = isNewGroup || previousSubject !== currentSubject;
    
    // 같은 과목 내에서 연도가 바뀌면 과목명과 과목을 표시하지 않음 (이미 처리됨)
    
    // 표시할 값 결정
    let showSubjectName = '';
    let showSubject = '';
    
    if (isNewGroup) {
      // 새 그룹이면 과목명 표시
      showSubjectName = currentSubjectName !== '-' ? currentSubjectName : '';
    }
    
    if (isNewSubject) {
      // 새 과목이면 과목 표시
      showSubject = currentSubject;
    }
    
    if (isNewGroup) {
      previousSubjectName = currentSubjectName;
    }
    previousSubject = currentSubject;
    previousYear = currentYear;
    
    groupedRows.push({
      level: row.level,
      subjectName: showSubjectName,
      subject: showSubject,
      year: currentYear,
      high: row.high,
      mid: row.mid,
      low: row.low,
      highIds: row.highIds || [],
      midIds: row.midIds || [],
      lowIds: row.lowIds || [],
      isFirstInGroup: isNewGroup,
      isNewGroup: isNewGroup
    });
  });
  
  // 테이블 렌더링 (과목명은 합쳐지고, 과목과 연도는 각각 별도 행)
  const highIdsStr = (row) => (row.highIds && row.highIds.length) ? row.highIds.join(',') : '';
  const midIdsStr = (row) => (row.midIds && row.midIds.length) ? row.midIds.join(',') : '';
  const lowIdsStr = (row) => (row.lowIds && row.lowIds.length) ? row.lowIds.join(',') : '';

  tbody.innerHTML = groupedRows.map((row, rowIndex) => {
    const rowStyle = row.isNewGroup 
      ? `style="border-top: 3px solid #003d7a;"` 
      : '';
    
    const subjectNameStyle = row.isFirstInGroup && row.subjectName && row.subjectName !== '-'
      ? `style="font-weight: 700; color: #003d7a;"`
      : '';
    
    const highIds = highIdsStr(row);
    const midIds = midIdsStr(row);
    const lowIds = lowIdsStr(row);
    const clickableClass = 'summary-clickable';
    const highTd = highIds ? `<td class="${clickableClass}" data-achievement="상" data-ids="${highIds}" style="cursor: pointer; text-decoration: underline;" title="클릭 시 학번 목록">${row.high}</td>` : `<td>${row.high}</td>`;
    const midTd = midIds ? `<td class="${clickableClass}" data-achievement="중" data-ids="${midIds}" style="cursor: pointer; text-decoration: underline;" title="클릭 시 학번 목록">${row.mid}</td>` : `<td>${row.mid}</td>`;
    const lowTd = lowIds ? `<td class="${clickableClass}" data-achievement="하" data-ids="${lowIds}" style="cursor: pointer; text-decoration: underline;" title="클릭 시 학번 목록">${row.low}</td>` : `<td>${row.low}</td>`;

    return `
      <tr ${rowStyle}>
        <td>${row.level}</td>
        <td ${subjectNameStyle}>${row.subjectName || ''}</td>
        <td>${row.subject || ''}</td>
        <td>${row.year || '-'}</td>
        ${highTd}
        ${midTd}
        ${lowTd}
      </tr>
    `;
  }).join('');

  // 상/중/하 셀 클릭 시 학번 목록 팝업
  tbody.querySelectorAll('.summary-clickable').forEach((td) => {
    td.addEventListener('click', function () {
      const achievement = this.getAttribute('data-achievement');
      const idsStr = this.getAttribute('data-ids') || '';
      const ids = idsStr ? idsStr.split(',').filter(Boolean) : [];
      showSummaryStudentModal(achievement, ids);
    });
  });
  
  statusEl.textContent = `${totalCount}건`;
}

function showSummaryStudentModal(achievement, studentIds) {
  const modal = document.getElementById('summary-student-modal');
  const titleEl = document.getElementById('summary-modal-title');
  const listEl = document.getElementById('summary-modal-list');
  if (!modal || !titleEl || !listEl) return;
  titleEl.textContent = achievement + ' (' + studentIds.length + '명)';
  listEl.innerHTML = studentIds.map((sid) => {
    const row = allGradeData.find((r) => String(r.student_id).trim() === sid);
    const name = row && row.student_name ? row.student_name : '';
    const display = name ? sid + ' (' + name + ')' : sid;
    return '<li style="padding: 8px 0; border-bottom: 1px solid var(--border-color);">' + display + '</li>';
  }).join('');
  if (studentIds.length === 0) {
    listEl.innerHTML = '<li style="padding: 8px 0; color: var(--text-muted);">해당 인원이 없습니다.</li>';
  }
  modal.style.display = 'flex';
}

