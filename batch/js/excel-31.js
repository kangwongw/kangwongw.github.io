/** 3학년 1학기 최대 인원 엑셀: 템플릿 만들기와 업로드 읽기 */
const Excel31 = (function () {
  const { CLASS_OPTIONS, DEPT_TYPE_OPTIONS, groupByHospital } = BatchCommon;
  const { STYLE, colName } = XlsxLite;

  const SHEET_NAME = '최대인원';
  const GUIDE_SHEET_NAME = '작성방법';
  const FILE_NAME = '3학년 1학기_배치 최대인원_템플릿.xlsx';
  const HEADERS = {
    subject: '과목',
    hospital: '병원',
    duplicate: '중복허용',
    department: '부서',
    deptType: '내과/외과',
    capacityNote: '가능인원(참고)'
  };
  const INFO_KEYS = ['subject', 'hospital', 'duplicate', 'department', 'deptType', 'capacityNote'];
  const REQUIRED_KEYS = ['subject', 'hospital', 'department', 'deptType'];
  /** 드롭다운으로 고르는 열 */
  const CHOICE_KEYS = ['duplicate', 'deptType'];
  const ROW = { TITLE: 1, NOTE: 2, HEADER: 3, SUB_HEADER: 4, FIRST_DATA: 5 };
  const TEMPLATE_DATA_ROWS = 40;
  const INFO_COL_WIDTHS = [14, 16, 10, 16, 12, 14];
  const PERIOD_COL_WIDTH = 11;
  const ROW_HEIGHTS = { [ROW.NOTE]: 36, [ROW.SUB_HEADER]: 33 };
  const HEADER_SEARCH_ROWS = 20;
  const DUPLICATE_MARK = '허용';
  const TRUTHY_MARKS = ['허용', 'O', 'Y', '예', 'TRUE', '1'];
  const DEPT_TYPE_ALIASES = { '내과/외과': 'both', '내외과': 'both' };
  const PERIOD_HEADER = /^기간(\d+)$/;
  const GUIDE_LINES = [
    '3학년 1학기 최대 인원 템플릿 작성 방법',
    '1. 한 행에 부서 하나를 적습니다. 병원에 부서가 여러 개면 병원 칸을 부서 수만큼 병합하거나, 첫 부서 행에만 병원 이름을 적고 아래는 비워 두세요. 빈 병원 칸은 바로 위 병원으로 처리됩니다.',
    '2. 과목: 병원 왼쪽에 과목명(예: 성인실습1)을 적습니다. 과목 칸을 행 수만큼 병합하거나 첫 행에만 적으면, 빈 과목 칸은 바로 위 과목으로 처리됩니다. 과목명은 배치 결과표에 함께 표시됩니다.',
    `3. 중복허용: 같은 학생이 이 병원의 다른 부서에 두 번 배치돼도 되면 병원 첫 행에 '${DUPLICATE_MARK}'을 고르세요. 병원 단위로 적용됩니다.`,
    '4. 내과/외과: 내과, 외과, 내과&외과 중에서 고르세요.',
    '5. 기간 칸에는 그 기간에 받을 수 있는 최대 인원을 숫자로 적습니다. 빈 칸은 0으로 처리됩니다.',
    '6. 가능인원(참고)은 메모용이며 배치 계산에는 쓰지 않습니다.',
    '7. 머리글(1~4행)과 기간 열은 바꾸지 마세요. 행이 모자라면 아래에 이어서 적어도 됩니다.',
    '8. 배치 입력에서 기간 수나 기간별 반을 바꾸면 템플릿을 다시 내려받으세요.'
  ];

  // ---------- 템플릿 만들기 ----------

  function classLabel(assignments, period) {
    const cls = assignments.find((a) => Number(a.period) === period)?.class;
    return CLASS_OPTIONS.find((opt) => opt.value === cls)?.label || '';
  }

  function headerRows(cfg, periods) {
    const header = [...INFO_KEYS.map((key) => HEADERS[key]), ...periods.map((p) => `기간 ${p}`)];
    const subHeader = [...INFO_KEYS.map(() => ''), ...periods.map((p) => classLabel(cfg.assignments || [], p))];
    return [header, subHeader].map((row) => row.map((v) => ({ v, s: STYLE.HEADER })));
  }

  function columnRange(key, lastDataRow) {
    const col = colName(INFO_KEYS.indexOf(key) + 1);
    return `${col}${ROW.FIRST_DATA}:${col}${lastDataRow}`;
  }

  function dataValidations(numPeriods, lastDataRow) {
    const firstPeriodCol = colName(INFO_KEYS.length + 1);
    const lastPeriodCol = colName(INFO_KEYS.length + numPeriods);
    return [
      { type: 'list', sqref: columnRange('duplicate', lastDataRow), formula: `"${DUPLICATE_MARK}"` },
      { type: 'list', sqref: columnRange('deptType', lastDataRow), formula: `"${DEPT_TYPE_OPTIONS.map((o) => o.label).join(',')}"` },
      {
        type: 'whole',
        operator: 'greaterThanOrEqual',
        sqref: `${firstPeriodCol}${ROW.FIRST_DATA}:${lastPeriodCol}${lastDataRow}`,
        formula: '0'
      }
    ];
  }

  function buildMainSheet(cfg) {
    const numPeriods = Number(cfg.numPeriods);
    const periods = Array.from({ length: numPeriods }, (_, i) => i + 1);
    const totalCols = INFO_KEYS.length + numPeriods;
    const lastCol = colName(totalCols);
    const note = `A반 ${cfg.numA}명 · B반 ${cfg.numB}명 · 기간 ${numPeriods}개 — `
      + '병원에 부서가 여러 개일 경우, 병원 칸을 부서 칸만큼 병합하거나 첫 부서 행에만 작성해주세요.';
    // 목록에서 고르는 칸(중복허용, 내과/외과)은 옅은 노란 배경으로 구분한다
    const choiceCols = CHOICE_KEYS.map((key) => INFO_KEYS.indexOf(key));
    const blankRow = Array.from({ length: totalCols }, (_, i) => ({ v: '', s: choiceCols.includes(i) ? STYLE.CHOICE : STYLE.CELL }));
    return {
      name: SHEET_NAME,
      rows: [
        [{ v: '3학년 1학기 기간별 최대 인원', s: STYLE.TITLE }],
        [{ v: note, s: STYLE.NOTE }],
        ...headerRows(cfg, periods),
        ...Array.from({ length: TEMPLATE_DATA_ROWS }, () => blankRow)
      ],
      merges: [
        `A${ROW.TITLE}:${lastCol}${ROW.TITLE}`,
        `A${ROW.NOTE}:${lastCol}${ROW.NOTE}`,
        ...INFO_KEYS.map((_, i) => `${colName(i + 1)}${ROW.HEADER}:${colName(i + 1)}${ROW.SUB_HEADER}`)
      ],
      validations: dataValidations(numPeriods, ROW.FIRST_DATA + TEMPLATE_DATA_ROWS - 1),
      colWidths: [...INFO_COL_WIDTHS, ...periods.map(() => PERIOD_COL_WIDTH)],
      rowHeights: ROW_HEIGHTS,
      freezeRows: ROW.SUB_HEADER
    };
  }

  function buildGuideSheet() {
    return { name: GUIDE_SHEET_NAME, rows: GUIDE_LINES.map((line) => [{ v: line, s: STYLE.NOTE }]), colWidths: [100] };
  }

  /** 배치 입력(기간 수·기간별 반)에 맞춘 템플릿 시트 목록 */
  function buildTemplate(cfg) {
    return [buildMainSheet(cfg), buildGuideSheet()];
  }

  // ---------- 업로드 읽기 ----------

  function compact(value) {
    return String(value ?? '').replace(/\s+/g, '');
  }

  /** 칸 안 줄바꿈(예: '성인\n실습1')은 지우고 앞뒤 공백을 뺀다 */
  function cleanName(value) {
    return String(value ?? '').replace(/\s*[\r\n]+\s*/g, '').trim();
  }

  function findHeaderRow(sheet) {
    for (let row = 1; row <= Math.min(sheet.maxRow, HEADER_SEARCH_ROWS); row++) {
      const texts = Array.from({ length: sheet.maxCol }, (_, i) => compact(sheet.get(row, i + 1)));
      if (texts.includes(HEADERS.hospital) && texts.includes(HEADERS.department)) return row;
    }
    return 0;
  }

  function mapColumns(sheet, headerRow) {
    const columns = { periods: new Map() };
    for (let col = 1; col <= sheet.maxCol; col++) {
      const text = compact(sheet.get(headerRow, col));
      const periodMatch = text.match(PERIOD_HEADER);
      if (periodMatch) columns.periods.set(Number(periodMatch[1]), col);
      INFO_KEYS.forEach((key) => {
        if (text === compact(HEADERS[key])) columns[key] = col;
      });
    }
    return columns;
  }

  function columnErrors(columns, numPeriods) {
    // 과목 열은 새로 생긴 열이라 예전 템플릿이면 다시 내려받도록 알린다
    const missingText = (key) => (key === 'subject'
      ? `'${HEADERS[key]}' 열을 찾지 못했습니다. 이 화면에서 템플릿을 다시 내려받아 주세요.`
      : `'${HEADERS[key]}' 열을 찾지 못했습니다.`);
    const errors = REQUIRED_KEYS.filter((key) => !columns[key]).map(missingText);
    const hasAllPeriods = Array.from({ length: numPeriods }, (_, i) => i + 1).every((p) => columns.periods.has(p));
    if (!hasAllPeriods || columns.periods.size !== numPeriods) {
      errors.push(`엑셀의 기간 열(${columns.periods.size}개)이 배치 입력의 기간 수(${numPeriods}개)와 다릅니다. 템플릿을 다시 내려받아 주세요.`);
    }
    return errors;
  }

  /** 템플릿의 반 표시 줄(머리글 바로 아래)인지 */
  function isSubHeaderRow(sheet, columns, row) {
    if (sheet.get(row, columns.hospital) !== null || sheet.get(row, columns.department) !== null) return false;
    return Array.from(columns.periods.values()).some((col) => typeof sheet.get(row, col) === 'string');
  }

  function isBlankRow(sheet, columns, row) {
    const cols = [columns.department, columns.deptType, ...columns.periods.values()];
    return cols.every((col) => sheet.get(row, col) === null);
  }

  function parseDeptType(value) {
    const text = compact(value);
    const option = DEPT_TYPE_OPTIONS.find((opt) => compact(opt.label) === text);
    return option ? option.value : DEPT_TYPE_ALIASES[text] || '';
  }

  function parseCount(value) {
    if (value === null) return 0;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 ? num : null;
  }

  function isTruthyMark(value) {
    return value === true || TRUTHY_MARKS.includes(compact(value).toUpperCase());
  }

  function readPeriodValues(sheet, columns, row, numPeriods) {
    const errors = [];
    const values = Array.from({ length: numPeriods }, (_, i) => {
      const raw = sheet.get(row, columns.periods.get(i + 1));
      const count = parseCount(raw);
      if (count === null) errors.push(`${row}행 기간 ${i + 1}: '${raw}'은(는) 0 이상의 정수가 아닙니다.`);
      return count ?? 0;
    });
    return { values, errors };
  }

  function readDeptRow(sheet, columns, row, numPeriods) {
    const { values, errors } = readPeriodValues(sheet, columns, row, numPeriods);
    const department = String(sheet.get(row, columns.department) ?? '').trim();
    if (!department) errors.push(`${row}행: 부서명이 없습니다.`);
    const deptRaw = sheet.get(row, columns.deptType);
    const deptType = parseDeptType(deptRaw);
    if (!deptType) errors.push(`${row}행 내과/외과: '${deptRaw ?? ''}'을(를) 알 수 없습니다. 내과, 외과, 내과&외과 중에서 고르세요.`);
    return { department, deptType, values, errors };
  }

  function duplicateDeptErrors(rows) {
    const firstRowByKey = new Map();
    return rows.flatMap(({ hospital, department, row }) => {
      const key = `${hospital}|${department}`;
      if (!department || !firstRowByKey.has(key)) {
        firstRowByKey.set(key, row);
        return [];
      }
      return [`${row}행: ${hospital}의 부서 '${department}'가 ${firstRowByKey.get(key)}행과 겹칩니다.`];
    });
  }

  /** 부서 단위 행으로 바꾸고 병원별로 모은다 (중복허용은 병원 전체에 적용) */
  function toConfigRows(rows, duplicateHospitals) {
    return groupByHospital(rows).flatMap(({ hospital, indexes }) => indexes.map((i) => ({
      subject: rows[i].subject,
      hospital,
      department: rows[i].department,
      deptType: rows[i].deptType,
      values: rows[i].values,
      allowDuplicate: duplicateHospitals.has(hospital)
    })));
  }

  function collectRows(sheet, columns, firstRow, numPeriods) {
    const rows = [];
    const errors = [];
    const duplicateHospitals = new Set();
    let subject = '';
    let hospital = '';
    for (let row = firstRow; row <= sheet.maxRow; row++) {
      // 과목·병원 칸이 비어 있으면(병합된 칸 포함) 바로 위 과목·병원을 이어 쓴다
      subject = cleanName(sheet.get(row, columns.subject)) || subject;
      hospital = String(sheet.get(row, columns.hospital) ?? '').trim() || hospital;
      if (columns.duplicate && isTruthyMark(sheet.get(row, columns.duplicate))) duplicateHospitals.add(hospital);
      if (isBlankRow(sheet, columns, row)) continue;
      const parsed = readDeptRow(sheet, columns, row, numPeriods);
      if (!subject) parsed.errors.push(`${row}행: 과목명이 없습니다.`);
      if (!hospital) parsed.errors.push(`${row}행: 병원명이 없습니다.`);
      errors.push(...parsed.errors);
      rows.push({ subject, hospital, department: parsed.department, deptType: parsed.deptType, values: parsed.values, row });
    }
    errors.push(...duplicateDeptErrors(rows));
    if (!rows.length && !errors.length) errors.push('입력된 부서가 없습니다.');
    return { rows: errors.length ? [] : toConfigRows(rows, duplicateHospitals), errors };
  }

  /** 업로드한 시트를 최대 인원 행으로 바꾼다: { rows, errors } */
  function parse(sheet, numPeriods) {
    const headerRow = findHeaderRow(sheet);
    if (!headerRow) {
      return { rows: [], errors: ["머리글('병원', '부서')을 찾지 못했습니다. 이 화면에서 내려받은 템플릿을 사용해 주세요."] };
    }
    const columns = mapColumns(sheet, headerRow);
    const errors = columnErrors(columns, numPeriods);
    if (errors.length) return { rows: [], errors };
    const firstRow = isSubHeaderRow(sheet, columns, headerRow + 1) ? headerRow + 2 : headerRow + 1;
    return collectRows(sheet, columns, firstRow, numPeriods);
  }

  return { SHEET_NAME, FILE_NAME, buildTemplate, parse };
})();
