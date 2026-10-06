let gradeRows = [];
let selectedSubjects = null; // 초기화는 DOMContentLoaded에서 수행
let currentSearchKeyword = ''; // 현재 검색 키워드 저장
let allGradeData = []; // 원본 데이터 보관 (달성도 포함)
let selectedRowForEdit = null; // 수정할 행 데이터
let currentLevel = 'l1'; // 현재 선택된 레벨

// 공통 유틸리티 함수는 config.js에서 가져옴

document.addEventListener('DOMContentLoaded', () => {
  // SUBJECTS가 로드되었는지 확인하고 selectedSubjects 초기화
  if (typeof SUBJECTS !== 'undefined' && Array.isArray(SUBJECTS) && SUBJECTS.length > 0) {
    selectedSubjects = new Set(SUBJECTS); // 기본적으로 모든 과목 선택
  } else {
    selectedSubjects = new Set();
  }
  
  // DOM 요소 캐싱 (성능 최적화)
  const elements = {
    levelSelect: document.getElementById('level-select'),
    refreshBtn: document.getElementById('refresh-btn'),
    searchInput: document.getElementById('search-student'),
    searchBtn: document.getElementById('search-btn'),
    searchResultContainer: document.getElementById('search-result-container'),
    gradesTableContainer: document.querySelector('#grades-table')?.closest('.table-container'),
    viewStatus: document.getElementById('view-status'),
    selectAllBtn: document.getElementById('select-all-btn'),
    deselectAllBtn: document.getElementById('deselect-all-btn'),
    editGradeForm: document.getElementById('edit-grade-form'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    subjectCheckboxes: document.getElementById('subject-checkboxes')
  };

  // SUBJECTS가 로드되었는지 다시 확인
  if (typeof SUBJECTS !== 'undefined' && Array.isArray(SUBJECTS) && SUBJECTS.length > 0) {
    if (!selectedSubjects || selectedSubjects.size === 0) {
      selectedSubjects = new Set(SUBJECTS);
    }
    renderSubjectCheckboxes();
    renderTableHeader();
  } else {
    const statusEl = elements.viewStatus;
    if (statusEl) {
      statusEl.textContent = '초기화 오류: config.js 파일이 로드되지 않았습니다.';
      statusEl.style.color = 'var(--text-muted)';
    }
  }
  
  fetchGrades();

  // 레벨 선택 변경 이벤트
  if (elements.levelSelect) {
    elements.levelSelect.addEventListener('change', (e) => {
      currentLevel = e.target.value;
      renderTableHeader();
      if (currentSearchKeyword) {
        const filtered = filterGrades(currentSearchKeyword);
        renderSearchResultTable(filtered);
      } else {
        renderTableBody(gradeRows);
      }
    });
  }

  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
      currentSearchKeyword = '';
      if (elements.searchInput) elements.searchInput.value = '';
      if (elements.searchResultContainer) elements.searchResultContainer.style.display = 'none';
      if (elements.gradesTableContainer) elements.gradesTableContainer.style.display = 'block';
      fetchGrades();
    });
  }
  
  if (elements.searchBtn) {
    elements.searchBtn.addEventListener('click', () => {
      const keyword = elements.searchInput ? elements.searchInput.value.trim() : '';
      const keywordLower = keyword.toLowerCase();
      currentSearchKeyword = keywordLower;
      const statusEl = elements.viewStatus;
      
      // 데이터가 아직 로드되지 않았으면 로드 대기
      if (!gradeRows || gradeRows.length === 0) {
        if (statusEl) {
          statusEl.textContent = '데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.';
          statusEl.style.color = 'var(--text-muted)';
        }
        fetchGrades().then(() => {
          // 데이터 로드 후 검색 다시 실행
          if (keyword) {
            const filtered = filterGrades(keywordLower);
            renderSearchResultTable(filtered);
            if (elements.gradesTableContainer) elements.gradesTableContainer.style.display = 'none';
            
            if (statusEl) {
              if (filtered.length === 0) {
                statusEl.textContent = `"${keyword}"에 해당하는 학생 정보가 없습니다.`;
                statusEl.style.color = 'var(--text-muted)';
              } else {
                statusEl.textContent = `검색 결과: ${filtered.length}건`;
                statusEl.style.color = '';
              }
            }
          }
        });
        return;
      }
      
      if (keyword) {
        try {
          const filtered = filterGrades(keywordLower);
          renderSearchResultTable(filtered);
          // 기존 테이블 숨기기
          if (elements.gradesTableContainer) elements.gradesTableContainer.style.display = 'none';
          
          if (statusEl) {
            if (filtered.length === 0) {
              statusEl.textContent = `"${keyword}"에 해당하는 학생 정보가 없습니다.`;
              statusEl.style.color = 'var(--text-muted)';
            } else {
              statusEl.textContent = `검색 결과: ${filtered.length}건`;
              statusEl.style.color = '';
            }
          }
        } catch (error) {
          if (statusEl) {
            statusEl.textContent = `검색 중 오류가 발생했습니다: ${error.message}`;
            statusEl.style.color = 'var(--text-muted)';
          }
        }
      } else {
        // 검색어가 없으면 검색 결과 테이블 숨기고 기존 테이블 표시
        if (elements.searchResultContainer) elements.searchResultContainer.style.display = 'none';
        if (elements.gradesTableContainer) elements.gradesTableContainer.style.display = 'block';
        renderTableBody(gradeRows);
        if (statusEl) {
          statusEl.textContent = `총 ${gradeRows.length}건`;
          statusEl.style.color = '';
        }
      }
    });
  }
  
  // Enter 키로도 검색 가능하도록
  if (elements.searchInput) {
    elements.searchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (elements.searchBtn) elements.searchBtn.click();
      }
    });
  }
  
  if (elements.selectAllBtn) {
    elements.selectAllBtn.addEventListener('click', () => {
      selectedSubjects = new Set(SUBJECTS);
      updateCheckboxes();
      renderTableHeader();
      if (currentSearchKeyword) {
        // 검색 결과가 있으면 검색 결과 테이블만 업데이트
        const filtered = filterGrades(currentSearchKeyword);
        renderSearchResultTable(filtered);
      } else {
        renderTableBody(gradeRows);
      }
    });
  }
  
  if (elements.deselectAllBtn) {
    elements.deselectAllBtn.addEventListener('click', () => {
      selectedSubjects.clear();
      updateCheckboxes();
      renderTableHeader();
      if (currentSearchKeyword) {
        // 검색 결과가 있으면 검색 결과 테이블만 업데이트
        const filtered = filterGrades(currentSearchKeyword);
        renderSearchResultTable(filtered);
      } else {
        renderTableBody(gradeRows);
      }
    });
  }
  
  // 수정 폼 초기화
  initEditForm();
  
  // 수정 폼 이벤트 리스너
  if (elements.editGradeForm) {
    elements.editGradeForm.addEventListener('submit', handleEditSubmit);
  }
  if (elements.cancelEditBtn) {
    elements.cancelEditBtn.addEventListener('click', cancelEdit);
  }
});

function renderSubjectCheckboxes() {
  const container = document.getElementById('subject-checkboxes');
  if (!container) return;
  
  if (typeof SUBJECTS === 'undefined' || !Array.isArray(SUBJECTS) || SUBJECTS.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">과목 목록을 불러올 수 없습니다.</p>';
    return;
  }
  
  if (!selectedSubjects || selectedSubjects.size === 0) {
    selectedSubjects = new Set(SUBJECTS);
  }
  
  container.innerHTML = SUBJECTS.map((subject, index) => {
    const isChecked = selectedSubjects.has(subject);
    const subjectName = getSubjectName(index + 1);
    return `
      <div class="subject-checkbox-item">
        <input type="checkbox" id="chk-${subject}" value="${subject}" ${isChecked ? 'checked' : ''} />
        <label for="chk-${subject}">${subjectName}</label>
      </div>
    `;
  }).join('');
  
  // 체크박스 변경 이벤트 리스너 추가
  SUBJECTS.forEach((subject) => {
    const checkbox = document.getElementById(`chk-${subject}`);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedSubjects.add(subject);
        } else {
          selectedSubjects.delete(subject);
        }
        renderTableHeader();
        if (currentSearchKeyword) {
          // 검색 결과가 있으면 검색 결과 테이블만 업데이트
          const filtered = filterGrades(currentSearchKeyword);
          renderSearchResultTable(filtered);
        } else {
          renderTableBody(gradeRows);
        }
      });
    }
  });
}

function updateCheckboxes() {
  SUBJECTS.forEach((subject) => {
    const checkbox = document.getElementById(`chk-${subject}`);
    if (checkbox) {
      checkbox.checked = selectedSubjects.has(subject);
    }
  });
}

// 선택된 과목 배열을 정렬하여 반환하는 헬퍼 함수
function getSortedSelectedSubjects() {
  if (!selectedSubjects || selectedSubjects.size === 0) {
    if (typeof SUBJECTS !== 'undefined' && Array.isArray(SUBJECTS) && SUBJECTS.length > 0) {
      selectedSubjects = new Set(SUBJECTS);
    } else {
      return [];
    }
  }
  return Array.from(selectedSubjects).sort((a, b) => SUBJECTS.indexOf(a) - SUBJECTS.indexOf(b));
}

function renderTableHeader() {
  const thead = document.querySelector('#grades-table thead');
  if (!thead) return;
  
  const selectedSubjectsArray = getSortedSelectedSubjects();
  if (selectedSubjectsArray.length === 0) {
    thead.innerHTML = '<tr><th colspan="20">초기화 오류: SUBJECTS를 불러올 수 없습니다.</th></tr>';
    return;
  }
  
  const subjectsToShow = selectedSubjectsArray.length > 0 ? selectedSubjectsArray : (SUBJECTS || []);
  const headerRow = document.createElement('tr');
  
  headerRow.innerHTML = `
    <th>학번</th>
    <th>이름</th>
    ${subjectsToShow.map((key) => `<th>${getSubjectName(SUBJECTS.indexOf(key) + 1)}</th>`).join('')}
    <th>비고</th>
    <th>수정일</th>
  `;
  thead.innerHTML = '';
  thead.appendChild(headerRow);
}

function renderSearchResultTableHeader() {
  const thead = document.querySelector('#search-result-table thead');
  if (!thead) return;
  
  const headerRow = document.createElement('tr');
  const selectedSubjectsArray = getSortedSelectedSubjects();
  
  // 학번 검색 시 L1, L2, L3를 3열로 표시
  const subjectHeaders = selectedSubjectsArray.map((key) => {
    const subjectName = getSubjectName(SUBJECTS.indexOf(key) + 1);
    return `<th colspan="3">${subjectName}</th>`;
  }).join('');
  
  const levelHeaders = selectedSubjectsArray.map(() => {
    return '<th>L1</th><th>L2</th><th>L3</th>';
  }).join('');
  
  headerRow.innerHTML = `
    <th rowspan="2">수정</th>
    <th rowspan="2">학번</th>
    <th rowspan="2">이름</th>
    ${subjectHeaders}
    <th rowspan="2">비고</th>
    <th rowspan="2">수정일</th>
  `;
  
  const levelRow = document.createElement('tr');
  levelRow.innerHTML = levelHeaders;
  
  thead.innerHTML = '';
  thead.appendChild(headerRow);
  thead.appendChild(levelRow);
}


function renderSearchResultTable(rows) {
  const container = document.getElementById('search-result-container');
  const tbody = document.querySelector('#search-result-table tbody');
  if (!container || !tbody) return;
  
  container.style.display = 'block';
  renderSearchResultTableHeader();
  
  if (!rows || rows.length === 0) {
    const colCount = selectedSubjects.size * 3 + 5; // L1, L2, L3 각각 + 수정 버튼, 학번, 이름, 비고, 수정일 포함
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 20px; color: var(--text-muted);">해당하는 학생 정보가 없습니다.</td></tr>`;
    return;
  }

  const selectedSubjectsArray = getSortedSelectedSubjects();
  const subjectIndices = selectedSubjectsArray.map(subj => {
    const idx = SUBJECTS.indexOf(subj);
    return idx;
  });

  // 원본 데이터에서 모든 레벨 정보 가져오기
  tbody.innerHTML = rows
    .map((row) => {
      // 원본 데이터 찾기
      const rawData = allGradeData.find(r => r.student_id === row.student_id);
      if (!rawData) {
        return '';
      }
      
      // 모든 레벨의 성적을 3열로 표시 (점수, 재시험은 빨간색)
      const subjectScoreCells = subjectIndices
        .map((idx) => {
          const l1Key = getSubjectKey('l1', idx);
          const l2Key = getSubjectKey('l2', idx);
          const l3Key = getSubjectKey('l3', idx);
          const l1Raw = rawData[l1Key];
          const l2Raw = rawData[l2Key];
          const l3Raw = rawData[l3Key];
          const l1Html = scoreCellHtml(l1Raw, roundScoreDisplay(extractScore(l1Raw)));
          const l2Html = scoreCellHtml(l2Raw, roundScoreDisplay(extractScore(l2Raw)));
          const l3Html = scoreCellHtml(l3Raw, roundScoreDisplay(extractScore(l3Raw)));
          return `<td>${l1Html}</td><td>${l2Html}</td><td>${l3Html}</td>`;
        })
        .join('');
      
      // 모든 레벨의 성취도를 3열로 표시
      const subjectAchievementCells = subjectIndices
        .map((idx) => {
          const l1AchievementKey = getAchievementKey('l1', idx);
          const l2AchievementKey = getAchievementKey('l2', idx);
          const l3AchievementKey = getAchievementKey('l3', idx);
          const l1Achievement = rawData[l1AchievementKey] || '-';
          const l2Achievement = rawData[l2AchievementKey] || '-';
          const l3Achievement = rawData[l3AchievementKey] || '-';
          return `<td style="color: var(--text-muted); font-size: 0.9em;">${l1Achievement}</td><td style="color: var(--text-muted); font-size: 0.9em;">${l2Achievement}</td><td style="color: var(--text-muted); font-size: 0.9em;">${l3Achievement}</td>`;
        })
        .join('');
      
      const note = row.note || '-';
      const updated = row.updated_at
        ? formatDate(row.updated_at, true)
        : '-';
      return `
        <tr>
          <td rowspan="2">
            <button class="secondary" type="button" onclick="editStudentGrade('${row.student_id}')" style="padding: 4px 8px; font-size: 12px;">수정</button>
          </td>
          <td rowspan="2">${row.student_id}</td>
          <td rowspan="2">${(rawData.student_name != null && rawData.student_name !== '') ? rawData.student_name : '-'}</td>
          ${subjectScoreCells}
          <td rowspan="2">${note}</td>
          <td rowspan="2">${updated}</td>
        </tr>
        <tr>
          ${subjectAchievementCells}
        </tr>
      `;
    })
    .join('');
}

function filterGrades(keyword) {
  if (!keyword) {
    return [];
  }
  
  if (!gradeRows || !Array.isArray(gradeRows) || gradeRows.length === 0) {
    return [];
  }
  
  try {
    return gradeRows.filter((row) => {
      if (!row || !row.student_id) return false;
      const studentId = String(row.student_id).toLowerCase();
      const rawData = allGradeData.find((r) => r.student_id === row.student_id);
      const studentName = (rawData && rawData.student_name) ? String(rawData.student_name).toLowerCase() : '';
      return studentId.includes(keyword) || studentName.includes(keyword);
    });
  } catch (error) {
    return [];
  }
}

function renderTableBody(rows) {
  const tbody = document.querySelector('#grades-table tbody');
  if (!tbody) return;
  
  const selectedSubjectsArray = getSortedSelectedSubjects();
  if (selectedSubjectsArray.length === 0) {
    tbody.innerHTML = '<tr><td colspan="20">초기화 오류가 발생했습니다.</td></tr>';
    return;
  }
  
  if (!rows || !rows.length) {
    const colCount = selectedSubjectsArray.length + 4; // 학번, 이름, 비고, 수정일 포함
    tbody.innerHTML = `<tr><td colspan="${colCount}">데이터가 없습니다.</td></tr>`;
    return;
  }

  const subjectsToShow = selectedSubjectsArray.length > 0 ? selectedSubjectsArray : (SUBJECTS || []);
  
  const subjectIndices = subjectsToShow.map(subj => {
    const idx = SUBJECTS.indexOf(subj);
    return idx;
  });

  tbody.innerHTML = rows
    .map((row) => {
      // 현재 레벨의 성적 표시 (점수만 표시, 재시험은 빨간색)
      const subjectCells = subjectIndices
        .map((idx) => {
          const levelSubjectKey = getSubjectKey(currentLevel, idx);
          const raw = allGradeData.find(r => r.student_id === row.student_id);
          const rawValue = raw ? raw[levelSubjectKey] : null;
          const displayValue = raw ? roundScoreDisplay(extractScore(rawValue)) : '-';
          const cellHtml = scoreCellHtml(rawValue, displayValue);
          return `<td>${cellHtml}</td>`;
        })
        .join('');
      const raw = allGradeData.find(r => r.student_id === row.student_id);
      const nameDisplay = raw && raw.student_name ? raw.student_name : '-';
      const note = row.note || '-';
      const updated = row.updated_at
        ? formatDate(row.updated_at, true)
        : '-';
      return `
        <tr>
          <td>${row.student_id}</td>
          <td>${nameDisplay}</td>
          ${subjectCells}
          <td>${note}</td>
          <td>${updated}</td>
        </tr>
      `;
    })
    .join('');
}

async function fetchGrades() {
  const statusEl = document.getElementById('view-status');
  if (!statusEl) return;
  
  statusEl.textContent = '데이터를 불러오는 중...';
  statusEl.style.color = '';

  try {
    if (!window.db) {
      throw new Error('Firestore가 초기화되지 않았습니다. config.js 파일이 로드되었는지 확인하세요.');
    }
    
    if (typeof DB_UTILS === 'undefined') {
      throw new Error('DB_UTILS가 정의되지 않았습니다. db-utils.js 파일이 로드되었는지 확인하세요.');
    }
    
    const { data, error } = await DB_UTILS.fetchAllGrades({ orderBy: 'student_id', ascending: true });

    if (error) throw error;

    // 원본 데이터 보관 (달성도 포함)
    // Firestore 문서를 일반 객체로 변환
    allGradeData = data.map(row => {
      const obj = { ...row };
      // Timestamp를 Date로 변환
      if (obj.updated_at && obj.updated_at.toDate) {
        obj.updated_at = obj.updated_at.toDate();
      }
      if (obj.created_at && obj.created_at.toDate) {
        obj.created_at = obj.created_at.toDate();
      }
      return obj;
    });
    gradeRows = allGradeData.map(row => normalizeGradeRow(row, currentLevel));
    
    // 검색 키워드가 있으면 검색 결과 테이블 표시, 없으면 전체 테이블 표시
    if (currentSearchKeyword) {
      const filtered = filterGrades(currentSearchKeyword);
      renderSearchResultTable(filtered);
      const gradesTableContainer = document.querySelector('#grades-table')?.closest('.table-container');
      if (gradesTableContainer) gradesTableContainer.style.display = 'none';
      
      if (filtered.length === 0) {
        const searchInput = document.getElementById('search-student');
        const keyword = searchInput ? searchInput.value.trim() : '';
        statusEl.textContent = `"${keyword}"에 해당하는 학생 정보가 없습니다.`;
        statusEl.style.color = 'var(--text-muted)';
      } else {
        statusEl.textContent = `검색 결과: ${filtered.length}건 (전체 ${gradeRows.length}건)`;
        statusEl.style.color = '';
      }
    } else {
      const searchResultContainer = document.getElementById('search-result-container');
      const gradesTableContainer = document.querySelector('#grades-table')?.closest('.table-container');
      
      if (searchResultContainer) searchResultContainer.style.display = 'none';
      if (gradesTableContainer) gradesTableContainer.style.display = 'block';
      
      renderTableBody(gradeRows);
      statusEl.textContent = `총 ${gradeRows.length}건`;
      statusEl.style.color = '';
    }
  } catch (err) {
    statusEl.textContent = `불러오기 실패: ${err.message || '알 수 없는 오류'}`;
    statusEl.style.color = 'var(--text-muted)';
    
    // 에러 발생 시에도 빈 테이블 표시
    const tbody = document.querySelector('#grades-table tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="20">데이터를 불러오는 중 오류가 발생했습니다.</td></tr>';
    }
  }
}

function initEditForm() {
  const tbody = document.getElementById('edit-subjects-tbody');
  tbody.innerHTML = '';
  
  // 모든 레벨에 대한 입력 필드 생성
  LEVELS.forEach(level => {
    SUBJECTS.forEach((key, index) => {
      const row = document.createElement('tr');
      const levelSubjectKey = getSubjectKey(level, index);
      const levelAchievementKey = getAchievementKey(level, index);
      row.innerHTML = `
        <td style="font-weight: 600; text-align: center;">${level} - ${getSubjectName(index + 1)}</td>
        <td>
          <input type="number" min="0" max="100" step="0.1" name="${levelSubjectKey}" 
                 class="subject-input" placeholder="점수" />
        </td>
        <td>
          <select name="${levelAchievementKey}" class="subject-input" style="text-align: center;">
            <option value="">선택 안 함</option>
            <option value="상">상</option>
            <option value="중">중</option>
            <option value="하">하</option>
          </select>
        </td>
      `;
      tbody.appendChild(row);
    });
  });
}

function editStudentGrade(studentId) {
  // 원본 데이터에서 해당 학생 찾기
  const rawData = allGradeData.find(row => row.student_id === studentId);
  if (!rawData) {
    alert('학생 데이터를 찾을 수 없습니다.');
    return;
  }
  
  selectedRowForEdit = rawData;
  
  // 폼에 데이터 채우기
  document.getElementById('edit-student-id').value = studentId;
  const editNameEl = document.getElementById('edit-student-name');
  if (editNameEl) editNameEl.value = rawData.student_name || '';
  
  // 모든 레벨의 데이터 채우기
  LEVELS.forEach(level => {
    SUBJECTS.forEach((key, index) => {
      const levelSubjectKey = getSubjectKey(level, index);
      const levelAchievementKey = getAchievementKey(level, index);
      
      // 점수 입력 (점수만 추출하여 표시)
      const scoreInput = document.querySelector(`#edit-grade-form input[name="${levelSubjectKey}"]`);
      if (scoreInput) {
        const scoreValue = rawData[levelSubjectKey];
        if (scoreValue !== null && scoreValue !== undefined) {
          const extractedScore = extractScore(scoreValue);
          scoreInput.value = extractedScore !== '-' ? extractedScore : '';
        } else {
          scoreInput.value = '';
        }
      }
      
      // 달성도 입력
      const achievementInput = document.querySelector(`#edit-grade-form select[name="${levelAchievementKey}"]`);
      if (achievementInput) {
        achievementInput.value = rawData[levelAchievementKey] || '';
      }
    });
  });
  
  // 비고 입력
  document.getElementById('edit-note').value = rawData[NOTE_FIELD] || '';
  
  // 수정 폼 표시
  document.getElementById('edit-form-section').style.display = 'block';
  document.getElementById('edit-form-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // 상태 초기화
  document.getElementById('edit-status').textContent = '';
}

function cancelEdit() {
  selectedRowForEdit = null;
  document.getElementById('edit-form-section').style.display = 'none';
  document.getElementById('edit-grade-form').reset();
  document.getElementById('edit-status').textContent = '';
}

async function handleEditSubmit(event) {
  event.preventDefault();
  
  if (!selectedRowForEdit) {
    document.getElementById('edit-status').textContent = '수정할 학생을 선택하세요.';
    return;
  }
  
  const formData = new FormData(event.target);
  const studentId = document.getElementById('edit-student-id').value;
  const note = formData.get(NOTE_FIELD)?.trim();
  
  // 모든 레벨의 데이터를 포함한 payload 생성
  const payload = {
    student_id: studentId,
  };
  
  // 기존 데이터 복사 (업데이트되지 않은 필드 유지)
  LEVELS.forEach(level => {
    const subjectKeys = getSubjectKeysForLevel(level);
    const achievementKeys = getAchievementKeysForLevel(level);
    
    subjectKeys.forEach(key => {
      payload[key] = selectedRowForEdit[key] ?? null;
    });
    
    achievementKeys.forEach(key => {
      payload[key] = selectedRowForEdit[key] ?? null;
    });
  });
  
  // 폼에서 입력된 값으로 업데이트 (기존 형식 유지)
  LEVELS.forEach(level => {
    SUBJECTS.forEach((key, index) => {
      const levelSubjectKey = getSubjectKey(level, index);
      const levelAchievementKey = getAchievementKey(level, index);
      
      const scoreValue = formData.get(levelSubjectKey);
      if (scoreValue !== null && scoreValue !== undefined && scoreValue !== '') {
        // 기존 데이터에서 연도와 과목명 추출
        const existingValue = selectedRowForEdit[levelSubjectKey];
        if (existingValue !== null && existingValue !== undefined) {
          const strValue = String(existingValue);
          // "점수(연도, 과목명)" 형식에서 연도와 과목명 추출 (소수점 포함)
          // \d+(?:\.\d+)? 는 정수 또는 소수점을 포함한 숫자를 매칭
          const match = strValue.match(/^\d+(?:\.\d+)?(?:\(([^,]*),\s*([^)]*)\))?$/);
          if (match) {
            // 기존 연도와 과목명이 있으면 유지
            const year = match[1] || '';
            const subjectName = match[2] || '';
            if (year || subjectName) {
              payload[levelSubjectKey] = `${scoreValue}(${year}, ${subjectName})`;
            } else {
              payload[levelSubjectKey] = scoreValue;
            }
          } else {
            payload[levelSubjectKey] = scoreValue;
          }
        } else {
          payload[levelSubjectKey] = scoreValue;
        }
      }
      
      const achievementValue = formData.get(levelAchievementKey);
      if (achievementValue !== null && achievementValue !== undefined && achievementValue !== '') {
        payload[levelAchievementKey] = achievementValue;
      }
    });
  });
  
  // 비고 업데이트
  if (note !== undefined && note !== '') {
    payload[NOTE_FIELD] = note;
  } else {
    payload[NOTE_FIELD] = selectedRowForEdit[NOTE_FIELD] ?? null;
  }
  
  // 이름 업데이트
  const studentNameEl = document.getElementById('edit-student-name');
  payload.student_name = (studentNameEl && studentNameEl.value.trim()) || null;
  
  const statusEl = document.getElementById('edit-status');
  statusEl.textContent = '수정 중...';
  
  try {
    const { error } = await DB_UTILS.updateGrade(studentId, payload);
    
    if (error) throw error;
    
    statusEl.textContent = '수정이 완료되었습니다.';
    statusEl.style.color = '';
    
    // 데이터 다시 불러오기
    await fetchGrades();
    
    // 수정 폼 숨기기
    setTimeout(() => {
      cancelEdit();
    }, 1500);
  } catch (err) {
    // 에러는 조용히 처리
    statusEl.textContent = `수정 실패: ${err.message}`;
    statusEl.style.color = 'var(--text-muted)';
  }
}




