const BatchCommon = (function () {
  const KEYS = {
    semester: 'selectedSemester',
    config: 'batchConfig',
    inputMethod: 'inputMethod'
  };

  const INPUT_METHOD = { EXCEL: 'excel', MANUAL: 'manual' };

  /** 최대 인원 입력 방식별 화면 (요약 화면의 '이전' 경로에 쓴다) */
  const INPUT_METHODS = {
    [INPUT_METHOD.EXCEL]: { page: 'page-1a-excel.html', label: '엑셀 업로드' },
    [INPUT_METHOD.MANUAL]: { page: 'page-1a.html', label: '1-A 최대 인원' }
  };

  /** 3학년 1학기 부서 유형 */
  const DEPT_TYPE_OPTIONS = [
    { value: 'internal', label: '내과' },
    { value: 'external', label: '외과' },
    { value: 'both', label: '내과&외과' }
  ];

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

  /** 3학년 1학기: 반만 선택, 모든 기간이 1학기라 semester는 항상 "1" */
  const GRADE31_ASSIGNMENT_SEMESTER = '1';

  /** 과목 안의 분야 목록 ("학년-학기"별): 엑셀 드롭다운과 직접 입력 안내 예시에 같이 쓴다 */
  const BRANCH_OPTIONS = {
    '3-2': ['산부인과/분만실', '소아과/신생아실'],
    '4-1': ['아동', '모성'],
    '4-2': ['정신', '지역']
  };

  function branchOptionsFor(info) {
    return BRANCH_OPTIONS[`${info?.grade}-${info?.semester}`] || [];
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

  /** 학기를 고르지 않고 들어온 경우 학기 선택 화면으로 돌려보낸다 */
  function redirectIfNoSemester() {
    if (getSelectedSemester()) return false;
    window.location.replace('index.html');
    return true;
  }

  function getContext() {
    const info = getSelectedSemester();
    const isGrade3S1 = !!(info && info.grade === 3 && info.semester === 1);
    const isGrade3S2 = !!(info && info.grade === 3 && info.semester === 2);
    const isGrade4S1 = !!(info && info.grade === 4 && info.semester === 1);
    const isGrade4S2 = !!(info && info.grade === 4 && info.semester === 2);
    const usePeriodTermSelect = isGrade4S1 || isGrade3S2 || isGrade4S2;
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
      usePeriodTermSelect,
      usesSubjectMode,
      periodTermOptions
    };
  }

  function formatAssignmentSemester(value, ctx) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (ctx?.isGrade4S1) {
      if (v === '1') return '동계방학';
      if (v === '2') return '1학기';
    }
    if (ctx?.isGrade3S2 || ctx?.isGrade4S2) {
      if (v === '1') return '하계방학';
      if (v === '2') return '2학기';
    }
    if (v === '1') return '1학기';
    if (v === '2') return '2학기';
    return '';
  }

  function setInputMethod(method) {
    try {
      localStorage.setItem(KEYS.inputMethod, method);
    } catch (_) {}
  }

  function getInputMethod() {
    try {
      return INPUT_METHODS[localStorage.getItem(KEYS.inputMethod)] || INPUT_METHODS[INPUT_METHOD.MANUAL];
    } catch (_) {
      return INPUT_METHODS[INPUT_METHOD.MANUAL];
    }
  }

  function deptTypeLabel(value) {
    return DEPT_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || '';
  }

  /** 최대 인원 행들을 병원 이름별로 묶는다 (처음 나온 순서 유지) */
  function groupByHospital(rows) {
    const groups = new Map();
    rows.forEach((row, index) => {
      const hospital = row.hospital || '';
      if (!groups.has(hospital)) groups.set(hospital, { hospital, indexes: [] });
      groups.get(hospital).indexes.push(index);
    });
    return Array.from(groups.values());
  }

  /** 지금 입력한 값으로 만든 web_config.json 내용 (요약 화면 저장·JSON 수정 화면이 같이 쓴다) */
  function buildWebConfig() {
    const store = readConfig();
    return {
      numA: Number(store.numA || 0),
      numB: Number(store.numB || 0),
      numPeriods: Number(store.numPeriods || 0),
      assignments: Array.isArray(store.assignments) ? store.assignments : [],
      oneA: { max: store?.oneA?.max || [] },
      selectedSemester: getSelectedSemester() || null
    };
  }

  function downloadJSON(filename, dataObj) {
    downloadBlob(filename, new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' }));
  }

  function downloadBlob(filename, blob) {
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
    INPUT_METHOD,
    CLASS_OPTIONS,
    DEPT_TYPE_OPTIONS,
    GRADE31_ASSIGNMENT_SEMESTER,
    branchOptionsFor,
    formatAssignmentSemester,
    readConfig,
    writeConfig,
    getSelectedSemester,
    redirectIfNoSemester,
    getContext,
    setInputMethod,
    getInputMethod,
    deptTypeLabel,
    groupByHospital,
    buildWebConfig,
    downloadJSON,
    downloadBlob,
    clearInputErrors,
    markInvalid,
    createEl
  };
})();
