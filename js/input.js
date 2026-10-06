let currentStudentData = null;
let currentLevel = 'l1'; // 현재 선택된 레벨

// 공통 유틸리티 함수는 config.js에서 가져옴

// 재시험 해당 과목만 읽기 전용으로 설정 (현재 레벨 기준)
function applyRetakeSubjectLocks(data) {
  SUBJECTS.forEach((subjectKey, index) => {
    const levelSubjectKey = getSubjectKey(currentLevel, index);
    const levelAchievementKey = getAchievementKey(currentLevel, index);
    const yearInputName = `${levelSubjectKey}_year`;
    const subjectNameInputName = `${levelSubjectKey}_subject_name`;
    const scoreInput = document.querySelector(`input[name="${levelSubjectKey}"]`);
    const yearInput = document.querySelector(`input[name="${yearInputName}"]`);
    const subjectNameInput = document.querySelector(`input[name="${subjectNameInputName}"]`);
    const achievementSelect = document.querySelector(`select[name="${levelAchievementKey}"]`);
    const locked = data && isSubjectRetake(data, currentLevel, index);
    [scoreInput, yearInput, subjectNameInput, achievementSelect].forEach((el) => {
      if (el) {
        el.disabled = locked;
        if (el.readOnly !== undefined) el.readOnly = locked;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderSubjectsTable();
  
  const studentIdInput = document.getElementById('student-id-input');
  const levelSelect = document.getElementById('level-select');
  const manualForm = document.getElementById('manual-form');
  
  // 레벨 변경 시 처리
  levelSelect.addEventListener('change', (e) => {
    currentLevel = e.target.value;
    renderSubjectsTable(); // 테이블 다시 렌더링
    // 레벨 변경 시 기존 데이터 다시 로드
    const studentId = studentIdInput.value.trim();
    if (studentId.length >= 3) {
      searchStudent(studentId);
    } else {
      clearStudentData();
    }
  });
  
  // 학번 입력 시 자동 검색 (debounce 최적화)
  const debouncedSearch = debounce((value) => {
    if (value.length >= 3) {
      searchStudent(value);
    } else {
      clearStudentData();
    }
  }, 300);
  
  studentIdInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value.trim());
  });
  
  manualForm.addEventListener('submit', handleManualSubmit);
  document.getElementById('reset-btn').addEventListener('click', () => {
    clearStudentData();
    manualForm.reset();
    document.getElementById('manual-status').textContent = '';
  });
  
  // 삭제 버튼 클릭 이벤트
  document.getElementById('delete-student-btn').addEventListener('click', handleDeleteStudent);
  
  document.getElementById('upload-btn').addEventListener('click', handleXlsxUpload);
  
  // 레벨 선택에 따라 연도/과목명 입력 필드 테두리 색상 변경
  const excelLevelSelect = document.getElementById('excel-level-select');
  const excelYearInput = document.getElementById('excel-year-input');
  const excelSubjectNameInput = document.getElementById('excel-subject-name-input');
  
  function updateExcelInputsBorder() {
    const selectedLevel = excelLevelSelect ? excelLevelSelect.value : '';
    const isGraduateYear = selectedLevel === 'graduate_year';
    
    if (excelYearInput) {
      if (isGraduateYear) {
        excelYearInput.style.border = '';
        excelYearInput.required = false;
      } else {
        excelYearInput.style.border = '2px solid #dc3545';
        excelYearInput.required = true;
      }
    }
    
    if (excelSubjectNameInput) {
      if (isGraduateYear) {
        excelSubjectNameInput.style.border = '';
        excelSubjectNameInput.required = false;
      } else {
        excelSubjectNameInput.style.border = '2px solid #dc3545';
        excelSubjectNameInput.required = true;
      }
    }
  }
  
  if (excelLevelSelect) {
    excelLevelSelect.addEventListener('change', updateExcelInputsBorder);
    // 초기 상태 설정
    updateExcelInputsBorder();
  }
  
  // 탭 기능
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // 모든 탭 버튼과 콘텐츠 비활성화
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // 선택된 탭 활성화
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // 엑셀 탭으로 전환 시 테두리 색상 업데이트
      if (targetTab === 'excel') {
        updateExcelInputsBorder();
      }
    });
  });
});

function renderSubjectsTable() {
  const tbody = document.getElementById('subjects-tbody');
  tbody.innerHTML = SUBJECTS.map((subjectKey, index) => {
    const levelSubjectKey = getSubjectKey(currentLevel, index);
    const levelAchievementKey = getAchievementKey(currentLevel, index);
    const yearInputName = `${levelSubjectKey}_year`;
    const subjectNameInputName = `${levelSubjectKey}_subject_name`;
    return `
      <tr>
        <td>${getSubjectName(index + 1)}</td>
        <td>
          <input 
            type="number" 
            min="0" 
            max="100" 
            step="0.1" 
            name="${levelSubjectKey}" 
            class="subject-input"
            data-subject="${subjectKey}"
            data-level="${currentLevel}"
            placeholder="점수 입력"
          />
        </td>
        <td>
          <input 
            type="number" 
            min="2000" 
            max="2100" 
            step="1" 
            name="${yearInputName}" 
            class="year-input"
            data-subject="${subjectKey}"
            data-level="${currentLevel}"
            placeholder="연도"
          />
        </td>
        <td>
          <input 
            type="text" 
            name="${subjectNameInputName}" 
            class="subject-name-input"
            data-subject="${subjectKey}"
            data-level="${currentLevel}"
            placeholder="과목명"
          />
        </td>
        <td>
          <select 
            name="${levelAchievementKey}" 
            class="achievement-input"
            data-subject="${subjectKey}"
            data-level="${currentLevel}"
          >
            <option value="">선택 안 함</option>
            <option value="상">상</option>
            <option value="중">중</option>
            <option value="하">하</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function searchStudent(studentId) {
  const statusEl = document.getElementById('search-status');
  statusEl.textContent = '검색 중...';
  
  try {
    const { data, error } = await DB_UTILS.fetchGradeByStudentId(studentId);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (data) {
      // 기존 학생 데이터 발견
      currentStudentData = data;
      
      // 현재 레벨의 기존 성적 표시 (일반/재시험 형식 모두 파싱)
      SUBJECTS.forEach((subjectKey, index) => {
        const levelSubjectKey = getSubjectKey(currentLevel, index);
        const levelAchievementKey = getAchievementKey(currentLevel, index);
        const yearInputName = `${levelSubjectKey}_year`;
        const subjectNameInputName = `${levelSubjectKey}_subject_name`;
        
        const input = document.querySelector(`input[name="${levelSubjectKey}"]`);
        const yearInput = document.querySelector(`input[name="${yearInputName}"]`);
        const subjectNameInput = document.querySelector(`input[name="${subjectNameInputName}"]`);
        
        if (input && data[levelSubjectKey] !== null && data[levelSubjectKey] !== undefined) {
          const parsed = parseScoreForDisplay(data[levelSubjectKey]);
          input.value = parsed.score || '';
          if (yearInput) yearInput.value = parsed.year || '';
          if (subjectNameInput) subjectNameInput.value = parsed.subjectName || '';
        }
        
        // 달성도 표시 (재시험 형식 "중(하)" → 괄호 앞 "중"으로 선택)
        const achievementSelect = document.querySelector(`select[name="${levelAchievementKey}"]`);
        if (achievementSelect) {
          const displayAch = getDisplayAchievement(data[levelAchievementKey]);
          achievementSelect.value = displayAch || '';
        }
      });
      
      // 비고 표시
      const noteInput = document.getElementById('note-input');
      if (noteInput) {
        noteInput.value = data[NOTE_FIELD] || '';
      }
      
      // 졸업 연도 표시
      const graduateYearInput = document.getElementById('graduate-year-input');
      if (graduateYearInput && data.graduate_year !== null && data.graduate_year !== undefined) {
        graduateYearInput.value = data.graduate_year;
      }
      
      // 이름 표시
      const studentNameInput = document.getElementById('student-name-input');
      if (studentNameInput && data.student_name != null && data.student_name !== undefined) {
        studentNameInput.value = data.student_name;
      }
      
      // 재시험 해당 과목만 수정 불가 처리
      applyRetakeSubjectLocks(data);
      statusEl.textContent = `기존 학생 데이터를 불러왔습니다. (학번: ${data.student_id}, 레벨: ${currentLevel}) 재시험 과목은 수정할 수 없습니다.`;
      statusEl.style.color = 'var(--knu-blue)';
      document.getElementById('delete-student-btn').style.display = 'block';
    } else {
      // 신규 학생
      currentStudentData = null;
      applyRetakeSubjectLocks(null);
      statusEl.textContent = '신규 학생입니다.';
      statusEl.style.color = 'var(--text-secondary)';
      document.getElementById('delete-student-btn').style.display = 'none';
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = `검색 실패: ${err.message}`;
    statusEl.style.color = 'var(--text-muted)';
    currentStudentData = null;
  }
}

function clearStudentData() {
  currentStudentData = null;
  isRetakeLocked = false;
  setFormReadOnly(false);
  document.getElementById('search-status').textContent = '';
  document.getElementById('delete-student-btn').style.display = 'none';
  document.querySelectorAll('.subject-input').forEach(input => {
    input.value = '';
  });
  document.querySelectorAll('.year-input').forEach(input => {
    input.value = '';
  });
  document.querySelectorAll('.subject-name-input').forEach(input => {
    input.value = '';
  });
  document.querySelectorAll('.achievement-input').forEach(select => {
    select.value = '';
  });
  const noteInput = document.getElementById('note-input');
  if (noteInput) {
    noteInput.value = '';
  }
  const graduateYearInput = document.getElementById('graduate-year-input');
  if (graduateYearInput) {
    graduateYearInput.value = '';
  }
  const studentNameInput = document.getElementById('student-name-input');
  if (studentNameInput) {
    studentNameInput.value = '';
  }
}

// 레벨 변경 시 테이블 다시 렌더링
function updateLevel(newLevel) {
  currentLevel = newLevel;
  renderSubjectsTable();
  // 레벨 변경 시 기존 데이터 다시 로드
  const studentId = document.getElementById('student-id-input').value.trim();
  if (studentId.length >= 3) {
    searchStudent(studentId);
  }
}

async function handleDeleteStudent() {
  if (!currentStudentData) {
    alert('삭제할 학생 정보가 없습니다.');
    return;
  }
  
  const studentId = currentStudentData.student_id;
  
  // 확인 알림창
  const confirmMessage = `정말로 학번 ${studentId} 학생의 정보를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;
  if (!confirm(confirmMessage)) {
    return;
  }
  
  const statusEl = document.getElementById('search-status');
  statusEl.textContent = '삭제 중...';
  statusEl.style.color = 'var(--text-secondary)';
  
  try {
    const { error } = await DB_UTILS.deleteGrade(studentId);
    
    if (error) throw error;
    
    // 삭제 성공
    statusEl.textContent = `학번 ${studentId} 학생의 정보가 삭제되었습니다.`;
    statusEl.style.color = 'var(--text-secondary)';
    
    // 폼 초기화
    currentStudentData = null;
    document.getElementById('delete-student-btn').style.display = 'none';
    document.getElementById('student-id-input').value = '';
    document.querySelectorAll('.subject-input').forEach(input => {
      input.value = '';
    });
    document.querySelectorAll('.year-input').forEach(input => {
      input.value = '';
    });
    document.querySelectorAll('.subject-name-input').forEach(input => {
      input.value = '';
    });
    document.querySelectorAll('.achievement-input').forEach(select => {
      select.value = '';
    });
    const noteInput = document.getElementById('note-input');
    if (noteInput) {
      noteInput.value = '';
    }
    document.getElementById('manual-status').textContent = '';
    
  } catch (err) {
    console.error(err);
    statusEl.textContent = `삭제 실패: ${err.message}`;
    statusEl.style.color = 'var(--text-muted)';
  }
}

async function handleManualSubmit(event) {
  event.preventDefault();
  const statusEl = document.getElementById('manual-status');
  statusEl.textContent = '저장 중...';

  const formData = new FormData(event.target);
  const studentId = formData.get('studentId')?.trim();
  const studentName = formData.get('studentName')?.trim();
  const graduateYear = formData.get('graduateYear')?.trim();
  const level = formData.get('level') || currentLevel;
  const note = formData.get('note')?.trim();

  if (!studentId) {
    statusEl.textContent = '학번을 입력해 주세요.';
    return;
  }

  try {
    let payload;
    
    if (currentStudentData) {
      // 기존 학생: 입력된 필드만 업데이트
      const updateData = {
        student_id: studentId,
      };
      if (studentName !== undefined) {
        updateData.student_name = studentName || null;
      }
      
      // 현재 레벨의 입력된 과목만 업데이트 (재시험 과목은 기존 값 유지)
      SUBJECTS.forEach((subjectKey, index) => {
        const levelSubjectKey = getSubjectKey(level, index);
        const levelAchievementKey = getAchievementKey(level, index);
        const yearInputName = `${levelSubjectKey}_year`;
        const subjectNameInputName = `${levelSubjectKey}_subject_name`;
        
        // 재시험 과목은 이 페이지에서 수정 불가 → updateData에 넣지 않아 기존 값 유지
        if (currentStudentData && isSubjectRetake(currentStudentData, level, index)) {
          return;
        }
        
        const input = document.querySelector(`input[name="${levelSubjectKey}"]`);
        const yearInput = document.querySelector(`input[name="${yearInputName}"]`);
        const subjectNameInput = document.querySelector(`input[name="${subjectNameInputName}"]`);
        
        const scoreValue = input ? input.value.trim() : '';
        const yearValue = yearInput ? yearInput.value.trim() : '';
        const subjectNameValue = subjectNameInput ? subjectNameInput.value.trim() : '';
        
        // 점수가 입력된 경우에만 업데이트
        if (scoreValue !== '') {
          // 점수, 연도, 과목명을 "점수(연도, 과목명)" 형식으로 변환
          let formattedValue;
          if (yearValue && subjectNameValue) {
            formattedValue = `${scoreValue}(${yearValue}, ${subjectNameValue})`;
          } else if (yearValue) {
            formattedValue = `${scoreValue}(${yearValue}, )`;
          } else if (subjectNameValue) {
            formattedValue = `${scoreValue}(, ${subjectNameValue})`;
          } else {
            formattedValue = scoreValue;
          }
          updateData[levelSubjectKey] = formattedValue;
          console.log(`[저장] ${levelSubjectKey}: "${formattedValue}"`);
        }
        
        // 달성도 처리
        const achievementSelect = document.querySelector(`select[name="${levelAchievementKey}"]`);
        if (achievementSelect && achievementSelect.value !== '') {
          updateData[levelAchievementKey] = achievementSelect.value;
        }
      });
      
      // 비고 처리
      if (note !== undefined && note !== '') {
        updateData[NOTE_FIELD] = note;
      }
      
      // 졸업 연도 처리
      if (graduateYear !== undefined && graduateYear !== '') {
        updateData.graduate_year = parseInt(graduateYear);
      }
      
      console.log('업데이트할 데이터:', updateData);
      console.log('업데이트할 필드 개수:', Object.keys(updateData).length - 1); // student_id 제외
      
      // update로 특정 필드만 업데이트 (기존 값 유지)
      const { data, error } = await DB_UTILS.updateGrade(studentId, updateData);
      
      if (error) {
        console.error('저장 오류:', error);
        throw error;
      }
      statusEl.textContent = `성적이 수정되었습니다. (레벨: ${level})`;
    } else {
      // 신규 학생: 현재 레벨만 입력, 나머지는 null
      const subjects = SUBJECTS.map((key, index) => {
        const levelSubjectKey = getSubjectKey(level, index);
        const yearInputName = `${levelSubjectKey}_year`;
        const subjectNameInputName = `${levelSubjectKey}_subject_name`;
        
        const input = document.querySelector(`input[name="${levelSubjectKey}"]`);
        const yearInput = document.querySelector(`input[name="${yearInputName}"]`);
        const subjectNameInput = document.querySelector(`input[name="${subjectNameInputName}"]`);
        
        const scoreValue = input ? input.value.trim() : '';
        const yearValue = yearInput ? yearInput.value.trim() : '';
        const subjectNameValue = subjectNameInput ? subjectNameInput.value.trim() : '';
        
        if (scoreValue === '') {
          return null;
        }
        
        // 점수, 연도, 과목명을 "점수(연도, 과목명)" 형식으로 변환
        let formattedValue;
        if (yearValue && subjectNameValue) {
          formattedValue = `${scoreValue}(${yearValue}, ${subjectNameValue})`;
        } else if (yearValue) {
          formattedValue = `${scoreValue}(${yearValue}, )`;
        } else if (subjectNameValue) {
          formattedValue = `${scoreValue}(, ${subjectNameValue})`;
        } else {
          formattedValue = scoreValue;
        }
        console.log(`[저장] 과목 ${index + 1}: "${formattedValue}"`);
        return formattedValue;
      });
      
      const achievements = SUBJECTS.map((key, index) => {
        const levelAchievementKey = getAchievementKey(level, index);
        const select = document.querySelector(`select[name="${levelAchievementKey}"]`);
        return select && select.value !== '' ? select.value : null;
      });
      
      payload = buildGradePayload({ studentId, level, subjects, achievements, note });
      
      // 졸업 연도 추가
      if (graduateYear !== undefined && graduateYear !== '') {
        payload.graduate_year = parseInt(graduateYear);
      }
      
      // null 값 제거 (데이터베이스에 null로 저장되는 것을 방지)
      const cleanPayload = { student_id: studentId };
      if (studentName !== undefined && studentName !== '') {
        cleanPayload.student_name = studentName;
      }
      Object.keys(payload).forEach(key => {
        const value = payload[key];
        // null, undefined, 빈 문자열이 아닌 경우만 포함
        if (value !== null && value !== undefined && value !== '') {
          cleanPayload[key] = value;
        }
      });
      
      console.log('저장할 데이터 (신규 학생):', cleanPayload);
      console.log('저장할 필드 개수:', Object.keys(cleanPayload).length - 1); // student_id 제외
      
      const { data, error } = await DB_UTILS.insertGrade(cleanPayload);
      
      if (error) {
        console.error('저장 오류:', error);
        throw error;
      }
      statusEl.textContent = `성적이 저장되었습니다. (레벨: ${level})`;
    }
    
    // 저장 후 현재 데이터 갱신
    await searchStudent(studentId);
    
  } catch (err) {
    console.error(err);
    statusEl.textContent = `오류가 발생했습니다: ${err.message}`;
  }
}

async function handleXlsxUpload() {
  const input = document.getElementById('xlsx-input');
  const levelSelect = document.getElementById('excel-level-select');
  const statusEl = document.getElementById('upload-status');

  if (!input.files.length) {
    statusEl.textContent = '업로드할 파일을 선택해 주세요.';
    statusEl.style.color = 'var(--text-muted)';
    return;
  }

  const selectedLevel = levelSelect.value;
  if (!selectedLevel) {
    statusEl.textContent = '레벨을 선택해 주세요.';
    statusEl.style.color = 'var(--text-muted)';
    return;
  }

  // 졸업연도가 아닌 경우 연도와 과목명 필수 입력 검증
  if (selectedLevel !== 'graduate_year') {
    const yearInput = document.getElementById('excel-year-input');
    const subjectNameInput = document.getElementById('excel-subject-name-input');
    const commonYear = yearInput ? yearInput.value.trim() : '';
    const commonSubjectName = subjectNameInput ? subjectNameInput.value.trim() : '';
    
    if (!commonYear || !commonSubjectName) {
      statusEl.textContent = '연도와 과목명을 모두 입력해 주세요.';
      statusEl.style.color = 'var(--text-muted)';
      
      // 입력 필드에 포커스 및 스타일 강조
      if (!commonYear && yearInput) {
        yearInput.focus();
        yearInput.style.borderColor = '#dc3545';
        setTimeout(() => {
          yearInput.style.borderColor = '';
        }, 3000);
      } else if (!commonSubjectName && subjectNameInput) {
        subjectNameInput.focus();
        subjectNameInput.style.borderColor = '#dc3545';
        setTimeout(() => {
          subjectNameInput.style.borderColor = '';
        }, 3000);
      }
      return;
    }
  }

  statusEl.textContent = '파일을 읽는 중...';
  statusEl.style.color = '';
  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: null });

      if (!rows.length) {
        statusEl.textContent = '파일에 데이터가 없습니다.';
        return;
      }

      // 졸업연도만 업데이트하는 경우
      if (selectedLevel === 'graduate_year') {
        const parsedData = rows.map((row) => {
          const studentId = row.student_id || row.학번 || row.studentId || '';
          
          const data = {
            student_id: studentId,
          };
          
          const studentName = row.student_name || row.이름 || row.name || '';
          if (studentName !== '' && studentName != null && studentName !== undefined) {
            data.student_name = String(studentName).trim();
          }
          
          // 졸업 연도 파싱
          const graduateYear = row.graduate_year || row.졸업연도 || row.graduateYear || '';
          if (graduateYear !== '' && graduateYear !== null && graduateYear !== undefined) {
            const yearNum = parseInt(graduateYear);
            if (!isNaN(yearNum)) {
              data.graduate_year = yearNum;
            }
          }
          
          return data;
        }).filter((item) => item.student_id);
        
        // localStorage에 저장하고 미리보기 페이지로 이동
        localStorage.setItem('excelPreviewData', JSON.stringify(parsedData));
        localStorage.setItem('excelPreviewLevel', selectedLevel);
        statusEl.textContent = `${parsedData.length}건의 데이터를 읽었습니다. (졸업연도 업데이트) 미리보기 페이지로 이동합니다...`;
        
        setTimeout(() => {
          window.location.href = 'preview.html';
        }, 500);
        return;
      }

      // 엑셀 데이터 파싱 (학번, 졸업연도, 과목 점수만 입력받음 - 달성도는 자동 계산)
      // 전체 점수에 동일하게 적용할 연도와 과목명 가져오기
      const yearInput = document.getElementById('excel-year-input');
      const subjectNameInput = document.getElementById('excel-subject-name-input');
      const commonYear = yearInput ? yearInput.value.trim() : '';
      const commonSubjectName = subjectNameInput ? subjectNameInput.value.trim() : '';
      
      const parsedData = rows.map((row) => {
        const studentId = row.student_id || row.학번 || row.studentId || '';
        
        const data = {
          student_id: studentId,
        };
        
        const studentName = row.student_name || row.이름 || row.name || '';
        if (studentName !== '' && studentName != null && studentName !== undefined) {
          data.student_name = String(studentName).trim();
        }
        
        // 졸업 연도 파싱 (학번, 졸업연도 형식 지원)
        const graduateYear = row.graduate_year || row.졸업연도 || row.graduateYear || '';
        if (graduateYear !== '' && graduateYear !== null && graduateYear !== undefined) {
          const yearNum = parseInt(graduateYear);
          if (!isNaN(yearNum)) {
            data.graduate_year = yearNum;
          }
        }
        
        // 모든 헤더를 확인하여 과목 점수 데이터만 추출 (선택된 레벨로 변환)
        // 달성도는 무시하고 점수만 저장
        Object.keys(row).forEach(key => {
          // 달성도 관련 필드는 무시
          if (key.includes('달성도') || key.includes('achievement')) {
            return; // 달성도는 무시
          }
          
          // 졸업연도, 이름은 이미 처리했으므로 건너뛰기
          if (key === 'graduate_year' || key === '졸업연도' || key === 'graduateYear') {
            return;
          }
          if (key === 'student_name' || key === '이름' || key === 'name') {
            return;
          }
          
          let subjectIndex = -1;
          let scoreValue = null;
          
          // subject_1, subject_2 형식 (점수만)
          if (key.startsWith('subject_') && !key.startsWith('L') && !key.endsWith('_achievement')) {
            const num = key.replace('subject_', '');
            subjectIndex = parseInt(num) - 1;
            scoreValue = row[key];
          }
          // 1_활력징후, 2_경구투약 형식 (점수)
          else if (/^\d+_/.test(key)) {
            const subjectNum = getSubjectNumberByName(key);
            if (subjectNum) {
              subjectIndex = subjectNum - 1;
              scoreValue = row[key];
            }
          }
          // 과목1, 과목2, 과목 1, 과목 2 형식 (점수)
          else if (key.startsWith('과목')) {
            const match = key.match(/과목\s*(\d+)/);
            if (match) {
              const num = match[1];
              subjectIndex = parseInt(num) - 1;
              scoreValue = row[key];
            }
          }
          
          // 과목 점수를 찾았으면 공통 연도와 과목명과 함께 저장
          if (subjectIndex >= 0 && subjectIndex < SUBJECTS.length && scoreValue !== null && scoreValue !== undefined && scoreValue !== '') {
            const levelSubjectKey = getSubjectKey(selectedLevel, subjectIndex);
            
            // 점수 값을 문자열로 변환 (숫자로 파싱된 경우 대비)
            const scoreStr = String(scoreValue);
            
            // "점수(연도, 과목명)" 형식으로 변환 (모든 점수에 동일한 연도와 과목명 적용)
            if (commonYear && commonSubjectName) {
              data[levelSubjectKey] = `${scoreStr}(${commonYear}, ${commonSubjectName})`;
            } else if (commonYear) {
              data[levelSubjectKey] = `${scoreStr}(${commonYear}, )`;
            } else if (commonSubjectName) {
              data[levelSubjectKey] = `${scoreStr}(, ${commonSubjectName})`;
            } else {
              data[levelSubjectKey] = scoreStr;
            }
            console.log(`[엑셀] ${levelSubjectKey}: "${data[levelSubjectKey]}"`);
          }
          
          // 비고 필드
          if (key === 'note' || key === '비고' || key === 'note_field') {
            data[NOTE_FIELD] = row[key];
          }
        });
        
        return data;
      }).filter((item) => item.student_id);

      if (!parsedData.length) {
        statusEl.textContent = '유효한 데이터가 없습니다.';
        return;
      }

      // localStorage에 저장하고 미리보기 페이지로 이동 (레벨, 연도, 과목명 포함)
      localStorage.setItem('excelPreviewData', JSON.stringify(parsedData));
      localStorage.setItem('excelPreviewLevel', selectedLevel);
      localStorage.setItem('excelPreviewYear', commonYear || '');
      localStorage.setItem('excelPreviewSubjectName', commonSubjectName || '');
      statusEl.textContent = `${parsedData.length}건의 데이터를 읽었습니다. (레벨: ${selectedLevel}) 미리보기 페이지로 이동합니다...`;
      
      setTimeout(() => {
        window.location.href = 'preview.html';
      }, 500);
    } catch (err) {
      console.error(err);
      statusEl.textContent = `파일 읽기 실패: ${err.message}`;
    }
  };

  reader.onerror = () => {
    statusEl.textContent = '파일을 읽는 중 오류가 발생했습니다.';
  };

  reader.readAsBinaryString(file);
}




