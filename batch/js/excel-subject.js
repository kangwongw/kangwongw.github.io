/** 과목 학기(3-2·4-1·4-2) 최대 인원 엑셀: 학기별 설정(spec)으로 템플릿 만들기와 업로드 읽기를 만든다 */
const ExcelSubject = (function () {
  const { CLASS_OPTIONS, formatAssignmentSemester } = BatchCommon;
  const { STYLE, colName } = XlsxLite;

  const SHEET_NAME = '최대인원';
  const GUIDE_SHEET_NAME = '작성방법';
  const HEADERS = {
    subject: '과목',
    branch: '분야\n(선택)',
    hospital: '병원',
    department: '부서',
    capacityNote: '가능인원(참고)'
  };
  /** 예전 머리글도 읽는다 (분야 머리글이 '분야'였던 템플릿) */
  const HEADER_ALIASES = { branch: ['분야'] };
  const INFO_KEYS = ['subject', 'branch', 'hospital', 'department', 'capacityNote'];
  const TEXT_KEYS = ['subject', 'branch', 'hospital', 'department'];
  const REQUIRED_KEYS = ['subject', 'hospital'];
  const ROW = { TITLE: 1, NOTE: 2, HEADER: 3, TERM: 4, CLASS: 5, FIRST_DATA: 6 };
  const TEMPLATE_DATA_ROWS = 40;
  const INFO_COL_WIDTHS = [16, 10, 22, 16, 14];
  const PERIOD_COL_WIDTH = 11;
  const ROW_HEIGHTS = { [ROW.NOTE]: 36, [ROW.CLASS]: 33 };
  const HEADER_SEARCH_ROWS = 20;
  const PERIOD_HEADER = /^기간(\d+)$/;

  /** 작성방법 시트 (spec: 학기 이름, 기간 구분 이름, 분야 예시) */
  function guideLines(spec) {
    return [
      `${spec.label} 최대 인원 템플릿 작성 방법`,
      '1. 한 행에 병원(부서) 하나를 적습니다. 과목·분야·병원이 여러 행에 걸치면 칸을 행 수만큼 병합하거나, 첫 행에만 적고 아래는 비워 두세요. 빈 칸은 바로 위 값으로 처리됩니다.',
      `2. 분야(예: ${spec.branchOptions.join(', ')})는 과목 안에서 나뉘는 영역입니다. 분야가 달라도 같은 과목으로 보아 학생마다 과목별로 한 번만 배치하며, 배치 결과표에 분야가 함께 표시됩니다. 분야가 없는 과목은 분야 칸을 비워 두거나, 분야 칸과 병원 칸을 병합해 병원 이름을 적으세요.`,
      '3. 부서가 없는 기관(예: 보건소)은 부서 칸을 비워 두어도 됩니다.',
      '4. 기간 칸에는 그 기간에 받을 수 있는 최대 인원을 숫자로 적습니다. 빈 칸은 0으로 처리됩니다.',
      '5. 가능인원(참고)은 메모용이며 배치 계산에는 쓰지 않습니다.',
      "6. 병원과 부서가 모두 빈 행은 읽지 않습니다. '실습 나가야하는 인원' 같은 합계 행은 과목 칸에 제목이 있으면 그대로 두어도 됩니다.",
      '7. 머리글(1~5행)과 기간 열은 바꾸지 마세요. 행이 모자라면 아래에 이어서 적어도 됩니다.',
      `8. 배치 입력에서 기간 수나 기간별 반·${spec.termNames}를 바꾸면 템플릿을 다시 내려받으세요.`
    ];
  }

  // ---------- 템플릿 만들기 ----------

  function assignmentOf(cfg, period) {
    return (cfg.assignments || []).find((a) => Number(a.period) === period) || {};
  }

  function classLabel(assignment) {
    return CLASS_OPTIONS.find((opt) => opt.value === assignment.class)?.label || '';
  }

  /** 머리글 3줄: 열 이름 / 방학·학기 / 반 */
  function headerRows(cfg, periods, spec) {
    const blanks = INFO_KEYS.map(() => '');
    const rows = [
      [...INFO_KEYS.map((key) => HEADERS[key]), ...periods.map((p) => `기간 ${p}`)],
      [...blanks, ...periods.map((p) => formatAssignmentSemester(assignmentOf(cfg, p).semester, spec.termContext))],
      [...blanks, ...periods.map((p) => classLabel(assignmentOf(cfg, p)))]
    ];
    return rows.map((row) => row.map((v) => ({ v, s: STYLE.HEADER })));
  }

  /** 분야 칸은 학기별 분야 드롭다운, 기간 칸은 0 이상의 정수만 */
  function dataValidations(numPeriods, lastDataRow, spec) {
    const branchCol = colName(INFO_KEYS.indexOf('branch') + 1);
    const firstPeriodCol = colName(INFO_KEYS.length + 1);
    const lastPeriodCol = colName(INFO_KEYS.length + numPeriods);
    return [
      { type: 'list', sqref: `${branchCol}${ROW.FIRST_DATA}:${branchCol}${lastDataRow}`, formula: `"${spec.branchOptions.join(',')}"` },
      {
        type: 'whole',
        operator: 'greaterThanOrEqual',
        sqref: `${firstPeriodCol}${ROW.FIRST_DATA}:${lastPeriodCol}${lastDataRow}`,
        formula: '0'
      }
    ];
  }

  function buildMainSheet(cfg, spec) {
    const numPeriods = Number(cfg.numPeriods);
    const periods = Array.from({ length: numPeriods }, (_, i) => i + 1);
    const totalCols = INFO_KEYS.length + numPeriods;
    const lastCol = colName(totalCols);
    const note = `A반 ${cfg.numA}명 · B반 ${cfg.numB}명 · 기간 ${numPeriods}개 — `
      + '과목·분야·병원이 여러 행에 걸칠 경우, 해당 칸을 행 수만큼 병합하거나 첫 행에만 작성해주세요.';
    const blankRow = Array.from({ length: totalCols }, () => ({ v: '', s: STYLE.CELL }));
    return {
      name: SHEET_NAME,
      rows: [
        [{ v: `${spec.label} 기간별 최대 인원`, s: STYLE.TITLE }],
        [{ v: note, s: STYLE.NOTE }],
        ...headerRows(cfg, periods, spec),
        ...Array.from({ length: TEMPLATE_DATA_ROWS }, () => blankRow)
      ],
      merges: [
        `A${ROW.TITLE}:${lastCol}${ROW.TITLE}`,
        `A${ROW.NOTE}:${lastCol}${ROW.NOTE}`,
        ...INFO_KEYS.map((_, i) => `${colName(i + 1)}${ROW.HEADER}:${colName(i + 1)}${ROW.CLASS}`)
      ],
      validations: dataValidations(numPeriods, ROW.FIRST_DATA + TEMPLATE_DATA_ROWS - 1, spec),
      colWidths: [...INFO_COL_WIDTHS, ...periods.map(() => PERIOD_COL_WIDTH)],
      rowHeights: ROW_HEIGHTS,
      freezeRows: ROW.CLASS
    };
  }

  function buildGuideSheet(spec) {
    return { name: GUIDE_SHEET_NAME, rows: guideLines(spec).map((line) => [{ v: line, s: STYLE.NOTE }]), colWidths: [100] };
  }

  // ---------- 업로드 읽기 ----------

  function compact(value) {
    return String(value ?? '').replace(/\s+/g, '');
  }

  /** 칸 안 줄바꿈(예: '임상\n심화\n실습1')은 지우고 겹친 공백은 하나로 줄인다 */
  function cleanText(value) {
    return String(value ?? '').replace(/\s*[\r\n]+\s*/g, '').replace(/\s+/g, ' ').trim();
  }

  function findHeaderRow(sheet) {
    for (let row = 1; row <= Math.min(sheet.maxRow, HEADER_SEARCH_ROWS); row++) {
      const texts = Array.from({ length: sheet.maxCol }, (_, i) => compact(sheet.get(row, i + 1)));
      if (texts.includes(HEADERS.subject) && texts.includes(HEADERS.hospital)) return row;
    }
    return 0;
  }

  /** 머리글 글자(공백·줄바꿈 제외)가 열 이름이나 예전 이름과 같은지 */
  function headerMatches(text, key) {
    return [HEADERS[key], ...(HEADER_ALIASES[key] || [])].some((label) => compact(label) === text);
  }

  function mapColumns(sheet, headerRow) {
    const columns = { periods: new Map() };
    for (let col = 1; col <= sheet.maxCol; col++) {
      const text = compact(sheet.get(headerRow, col));
      const periodMatch = text.match(PERIOD_HEADER);
      if (periodMatch) columns.periods.set(Number(periodMatch[1]), col);
      TEXT_KEYS.forEach((key) => {
        if (headerMatches(text, key)) columns[key] = col;
      });
    }
    return columns;
  }

  function columnErrors(columns, numPeriods) {
    const errors = REQUIRED_KEYS.filter((key) => !columns[key]).map((key) => `'${HEADERS[key]}' 열을 찾지 못했습니다.`);
    const hasAllPeriods = Array.from({ length: numPeriods }, (_, i) => i + 1).every((p) => columns.periods.has(p));
    if (!hasAllPeriods || columns.periods.size !== numPeriods) {
      errors.push(`엑셀의 기간 열(${columns.periods.size}개)이 배치 입력의 기간 수(${numPeriods}개)와 다릅니다. 템플릿을 다시 내려받아 주세요.`);
    }
    return errors;
  }

  /** 분야 칸을 병원 칸까지 병합해 병원 이름을 적은 행(분야 없음): 행 번호 → 병원 이름 */
  function mergedPlaceRows(sheet, columns) {
    const places = new Map();
    if (!columns.branch) return places;
    (sheet.merges || []).forEach((m) => {
      if (m.left !== columns.branch || m.right < columns.hospital) return;
      const name = cleanText(sheet.get(m.top, m.left));
      for (let row = m.top; row <= m.bottom; row++) places.set(row, name);
    });
    return places;
  }

  /** src: { sheet, columns, numPeriods, mergedPlaces } */
  function readInfo(src, row) {
    const info = {};
    TEXT_KEYS.forEach((key) => {
      info[key] = src.columns[key] ? cleanText(src.sheet.get(row, src.columns[key])) : '';
    });
    if (src.mergedPlaces.has(row)) Object.assign(info, { branch: '', hospital: src.mergedPlaces.get(row), noBranch: true });
    return info;
  }

  function parseCount(value) {
    if (value === null) return 0;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 ? num : null;
  }

  function hasNumber(src, row) {
    return Array.from(src.columns.periods.values()).some((col) => {
      const value = src.sheet.get(row, col);
      return value !== null && !Number.isNaN(Number(value));
    });
  }

  function readPeriodValues(src, row) {
    const errors = [];
    const values = Array.from({ length: src.numPeriods }, (_, i) => {
      const raw = src.sheet.get(row, src.columns.periods.get(i + 1));
      const count = parseCount(raw);
      if (count === null) errors.push(`${row}행 기간 ${i + 1}: '${raw}'은(는) 0 이상의 정수가 아닙니다.`);
      return count ?? 0;
    });
    return { values, errors };
  }

  /** 병원·부서가 모두 빈 행: 합계·제목 줄과 빈 줄(학기·반 줄 포함)은 건너뛰고, 숫자만 있으면 알려 준다 */
  function emptyPlaceError(src, row, info) {
    if (info.subject || info.branch) return null;
    if (!hasNumber(src, row)) return null;
    return `${row}행: 병원명과 부서명이 비어 있습니다.`;
  }

  /** 빈 칸(병합 포함)은 위 행 값을 잇는다. 과목이 바뀌면 분야·병원을, 분야가 바뀌면 병원을 새로 읽는다 */
  function carryDown(state, info) {
    if (info.subject && info.subject !== state.subject) Object.assign(state, { subject: info.subject, branch: '', hospital: '' });
    if (info.noBranch) state.branch = '';
    if (info.branch && info.branch !== state.branch) Object.assign(state, { branch: info.branch, hospital: '' });
    if (info.hospital) state.hospital = info.hospital;
  }

  function missingNameErrors(state, row) {
    const errors = [];
    if (!state.subject) errors.push(`${row}행: 과목명이 없습니다.`);
    if (!state.hospital) errors.push(`${row}행: 병원명이 없습니다.`);
    return errors;
  }

  function duplicateRowErrors(rows) {
    const firstRowByKey = new Map();
    return rows.flatMap(({ subject, branch, hospital, department, row }) => {
      const label = [subject, branch, hospital, department].filter(Boolean).join(' / ');
      if (!firstRowByKey.has(label)) {
        firstRowByKey.set(label, row);
        return [];
      }
      return [`${row}행: '${label}'이(가) ${firstRowByKey.get(label)}행과 겹칩니다.`];
    });
  }

  /** web_config.json 최대 인원 행 (분야·부서는 있을 때만 넣는다) */
  function toConfigRow({ subject, branch, hospital, department, values }) {
    const row = { subject };
    if (branch) row.branch = branch;
    if (department) row.department = department;
    return { ...row, hospital, values, allowDuplicate: false };
  }

  function collectRows(src, firstRow) {
    const rows = [];
    const errors = [];
    const state = { subject: '', branch: '', hospital: '' };
    for (let row = firstRow; row <= src.sheet.maxRow; row++) {
      const info = readInfo(src, row);
      if (!info.hospital && !info.department) {
        const error = emptyPlaceError(src, row, info);
        if (error) errors.push(error);
        continue;
      }
      carryDown(state, info);
      const parsed = readPeriodValues(src, row);
      errors.push(...parsed.errors, ...missingNameErrors(state, row));
      rows.push({ ...state, department: info.department, values: parsed.values, row });
    }
    errors.push(...duplicateRowErrors(rows));
    if (!rows.length && !errors.length) errors.push('입력된 병원이 없습니다.');
    return { rows: errors.length ? [] : rows.map(toConfigRow), errors };
  }

  /** 업로드한 시트를 최대 인원 행으로 바꾼다: { rows, errors } */
  function parse(sheet, numPeriods) {
    const headerRow = findHeaderRow(sheet);
    if (!headerRow) {
      return { rows: [], errors: ["머리글('과목', '병원')을 찾지 못했습니다. 이 화면에서 내려받은 템플릿을 사용해 주세요."] };
    }
    const columns = mapColumns(sheet, headerRow);
    const errors = columnErrors(columns, numPeriods);
    if (errors.length) return { rows: [], errors };
    const src = { sheet, columns, numPeriods, mergedPlaces: mergedPlaceRows(sheet, columns) };
    return collectRows(src, headerRow + 1);
  }

  /**
   * 학기별 엑셀 모듈을 만든다.
   * spec: { label: '4학년 1학기', termContext: { isGrade4S1: true }, termNames: '동계방학/1학기', branchOptions: ['아동', '모성'] }
   */
  function create(spec) {
    return {
      SHEET_NAME,
      FILE_NAME: `${spec.label}_배치 최대인원_템플릿.xlsx`,
      buildTemplate: (cfg) => [buildMainSheet(cfg, spec), buildGuideSheet(spec)],
      parse
    };
  }

  return { create };
})();
