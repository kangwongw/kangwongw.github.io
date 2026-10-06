const BatchCommon = (function () {
  const KEYS = {
    semester: 'selectedSemester',
    config: 'batchConfig',
    oneASemester: 'selectedSemesterOneA'
  };

  const CLASS_OPTIONS = [
    { value: 'A', label: 'A반' },
    { value: 'B', label: 'B반' },
    { value: 'A&B', label: '두 반 모두 가능' }
  ];

  /** 4학년 1학기: JSON semester 1=동계방학, 2=1학기 */
  const GRADE4S1_PERIOD_TERM_OPTIONS = [
    { value: '1', label: '동계방학' },
    { value: '2', label: '1학기' }
  ];

  /** 3·4학년 2학기: JSON semester 1=하계방학, 2=2학기 */
  const GRADE32_42_PERIOD_TERM_OPTIONS = [
    { value: '1', label: '하계방학' },
    { value: '2', label: '2학기' }
  ];

  /** 3학년 1학기: 반만 선택, semester는 항상 "2" */
  const GRADE31_ASSIGNMENT_SEMESTER = '2';

  /** UI·레거시 값 → JSON assignments[].semester ("1" | "2") */
  function normalizeAssignmentSemester(value, ctx) {
    const v = String(value || '').trim();
    if (ctx.isGrade3S1) return GRADE31_ASSIGNMENT_SEMESTER;
    if (ctx.isGrade4S1) {
      if (v === 'winter') return '1';
      if (v === '2') return '2';
      if (v === '1') return '1';
      return v;
    }
    if (ctx.isGrade3S2 || ctx.isGrade4S2) {
      if (v === 'summer') return '1';
      if (v === '1' || v === '2') return v;
      return v;
    }
    return v;
  }

  /** JSON semester → 기간 구분 드롭다운 value */
  function assignmentSemesterToTermValue(stored, ctx) {
    const v = String(stored || '').trim();
    if (!ctx.usePeriodTermSelect) return v;
    if (ctx.isGrade4S1 && v === 'winter') return '1';
    if ((ctx.isGrade3S2 || ctx.isGrade4S2) && v === 'summer') return '1';
    return v;
  }

  function getPeriodTermOptions(ctx) {
    if (ctx.isGrade4S1) return GRADE4S1_PERIOD_TERM_OPTIONS;
    if (ctx.isGrade3S2 || ctx.isGrade4S2) return GRADE32_42_PERIOD_TERM_OPTIONS;
    return [];
  }

  function readConfig() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.config) || '{}');
    } catch (_) {
      return {};
    }
  }

  function writeConfig(data) {
    try {
      localStorage.setItem(KEYS.config, JSON.stringify(data));
    } catch (_) {}
  }

  function getSelectedSemester() {
    try {
      const raw = localStorage.getItem(KEYS.semester);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function getOneASemester() {
    return localStorage.getItem(KEYS.oneASemester) || '1';
  }

  function setOneASemester(value) {
    try {
      localStorage.setItem(KEYS.oneASemester, value);
    } catch (_) {}
  }

  function getContext() {
    const info = getSelectedSemester();
    const isGrade3S1 = !!(info && info.grade === 3 && info.semester === 1);
    const isGrade3S2 = !!(info && info.grade === 3 && info.semester === 2);
    const isGrade4S1 = !!(info && info.grade === 4 && info.semester === 1);
    const isGrade4S2 = !!(info && info.grade === 4 && info.semester === 2);
    const autoPeriodSemester = isGrade3S1;
    const usePeriodTermSelect = isGrade4S1 || isGrade3S2 || isGrade4S2;
    const hideSemesterUI = autoPeriodSemester || usePeriodTermSelect;
    const periodTermOptions = getPeriodTermOptions({
      isGrade4S1,
      isGrade3S2,
      isGrade4S2
    });
    const usesSubjectMode = !isGrade3S1;

    return {
      info,
      isGrade3S1,
      isGrade3S2,
      isGrade4S1,
      isGrade4S2,
      autoPeriodSemester,
      usePeriodTermSelect,
      hideSemesterUI,
      usesSubjectMode,
      periodTermOptions
    };
  }

  function formatAssignmentSemester(value, ctx) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (ctx?.isGrade4S1) {
      if (v === '1' || v === 'winter') return '동계방학';
      if (v === '2') return '1학기';
    }
    if (ctx?.isGrade3S2 || ctx?.isGrade4S2) {
      if (v === '1' || v === 'summer') return '하계방학';
      if (v === '2') return '2학기';
    }
    if (v === '1') return '1학기';
    if (v === '2') return '2학기';
    if (v === 'winter') return '동계방학';
    if (v === 'summer') return '하계방학';
    return '';
  }

  function periodSemester(assignments, index) {
    const row = assignments[index];
    return row && row.semester ? String(row.semester) : '';
  }

  function visiblePeriodIndexes(numPeriods, assignments, selectedSemester, hideSemesterUI) {
    if (hideSemesterUI) {
      return Array.from({ length: numPeriods }, (_, i) => i);
    }
    return Array.from({ length: numPeriods }, (_, i) => i).filter(
      (i) => periodSemester(assignments, i) === selectedSemester
    );
  }

  function mergeSemesterRows(sem1Data, sem2Data) {
    const allRows = new Map();
    [sem1Data, sem2Data].forEach((rows) => {
      rows.forEach((row) => {
        const key = `${row.subject}|${row.hospital}|${row.department || ''}`;
        if (!allRows.has(key)) {
          allRows.set(key, { ...row, values: [...row.values] });
          return;
        }
        const existing = allRows.get(key);
        row.values.forEach((val, idx) => {
          if (val > 0) existing.values[idx] = val;
        });
      });
    });
    return Array.from(allRows.values());
  }

  function persistOneASemesterData(store, field, data, ctx, selectedSemester) {
    store.oneA = store.oneA || {};

    // 3-1, 3-2, 4-1, 4-2: 기간을 한 화면에서 입력 → 행별(과목·병원·부서) 그대로 저장
    if (ctx.hideSemesterUI) {
      store.oneA[`${field}_sem1`] = data;
      store.oneA[field] = data;
      return;
    }

    store.oneA[`${field}_sem${selectedSemester}`] = data;
    const sem1 = store.oneA[`${field}_sem1`] || [];
    const sem2 = store.oneA[`${field}_sem2`] || [];
    store.oneA[field] = mergeSemesterRows(sem1, sem2);
  }

  function downloadJSON(filename, dataObj) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearInputErrors(root) {
    root.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
  }

  function markInvalid(el) {
    if (el && el.classList) el.classList.add('input-error');
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  return {
    KEYS,
    CLASS_OPTIONS,
    GRADE4S1_PERIOD_TERM_OPTIONS,
    GRADE32_42_PERIOD_TERM_OPTIONS,
    GRADE31_ASSIGNMENT_SEMESTER,
    getPeriodTermOptions,
    normalizeAssignmentSemester,
    assignmentSemesterToTermValue,
    formatAssignmentSemester,
    readConfig,
    writeConfig,
    getSelectedSemester,
    getOneASemester,
    setOneASemester,
    getContext,
    periodSemester,
    visiblePeriodIndexes,
    mergeSemesterRows,
    persistOneASemesterData,
    downloadJSON,
    clearInputErrors,
    markInvalid,
    createEl
  };
})();
