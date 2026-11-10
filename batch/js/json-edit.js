(function () {
  const {
    CLASS_OPTIONS,
    DEPT_TYPE_OPTIONS,
    groupByHospital,
    buildWebConfig,
    downloadJSON,
    createEl,
    formatAssignmentSemester,
    getSelectedSemester
  } = BatchCommon;

  /** 요약 화면의 '최대 인원 표 수정' 버튼으로 들어온 경우 (json-edit.html?from=summary) */
  const SUMMARY_SOURCE = 'summary';

  const fileInput = document.getElementById('json-file');
  const uploadName = document.getElementById('json-upload-name');
  const messageEl = document.getElementById('json-edit-message');
  const contentEl = document.getElementById('json-edit-content');
  const basicTbody = document.getElementById('json-basic-tbody');
  const maxHead = document.getElementById('json-max-head');
  const maxBody = document.getElementById('json-max-body');
  const downloadBtn = document.getElementById('download-json');

  let currentConfig = null;

  function td(text, className) {
    return createEl('td', className || null, text);
  }

  function th(text, className) {
    return createEl('th', className || null, text);
  }

  function readonlyTd(text) {
    return td(text, 'readonly-cell');
  }

  function editableTd(text) {
    return td(text, 'editable-cell');
  }

  function getOrCreateAssignment(config, period) {
    config.assignments = Array.isArray(config.assignments) ? config.assignments : [];
    let assignment = config.assignments.find((row) => Number(row.period) === period);
    if (!assignment) {
      assignment = { period, class: null, semester: null };
      config.assignments.push(assignment);
    }
    return assignment;
  }

  function createClassSelect(assignment, period) {
    const select = document.createElement('select');
    select.className = 'select json-class-select';
    select.setAttribute('aria-label', `기간 ${period} 반 선택`);

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '반 선택';
    select.appendChild(placeholder);

    CLASS_OPTIONS.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });

    select.value = assignment.class || '';
    select.addEventListener('change', () => {
      assignment.class = select.value || null;
      renderCurrent();
    });
    return select;
  }

  function createDeptTypeSelect(row) {
    const select = document.createElement('select');
    select.className = 'select json-dept-type-select';
    [{ value: '', label: '선택' }, ...DEPT_TYPE_OPTIONS].forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });

    select.value = row.deptType || '';
    select.addEventListener('change', () => {
      row.deptType = select.value;
    });
    return select;
  }

  /** 중복허용은 병원 단위: 체크하면 그 병원의 모든 부서 행에 적용한다 */
  function createDuplicateCell(maxData, group) {
    const cell = td('', 'editable-control-cell');
    cell.rowSpan = group.indexes.length;
    const label = document.createElement('label');
    label.className = 'checkbox-inline json-duplicate-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = group.indexes.some((i) => maxData[i].allowDuplicate);
    checkbox.addEventListener('change', () => {
      group.indexes.forEach((i) => { maxData[i].allowDuplicate = checkbox.checked; });
    });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('허용'));
    cell.appendChild(label);
    return cell;
  }

  /** 3학년 1학기: 병원·중복허용 칸은 병원의 첫 부서 행에만 두고 부서 수만큼 합친다 */
  function appendGrade31Cells(tr, maxData, rowIndex, group) {
    const row = maxData[rowIndex];
    if (group && maxData.some((r) => r.subject)) {
      const subjectCell = readonlyTd(row.subject || '');
      subjectCell.rowSpan = group.indexes.length;
      tr.appendChild(subjectCell);
    }
    if (group) {
      const hospitalCell = readonlyTd(row.hospital || '');
      hospitalCell.rowSpan = group.indexes.length;
      tr.appendChild(hospitalCell);
    }
    tr.appendChild(readonlyTd(row.department || ''));
    const deptTypeCell = td('', 'editable-control-cell');
    deptTypeCell.appendChild(createDeptTypeSelect(row));
    tr.appendChild(deptTypeCell);
    if (group) tr.appendChild(createDuplicateCell(maxData, group));
  }

  function setMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.classList.toggle('input-error-text', !!isError);
  }

  function buildContext(config) {
    const fallback = getSelectedSemester();
    const info = config?.selectedSemester || fallback || {};
    const grade = Number(info.grade || 0);
    const semester = Number(info.semester || 0);

    return {
      info,
      isGrade3S1: grade === 3 && semester === 1,
      isGrade3S2: grade === 3 && semester === 2,
      isGrade4S1: grade === 4 && semester === 1,
      isGrade4S2: grade === 4 && semester === 2
    };
  }

  function renderBasic(config, ctx) {
    basicTbody.innerHTML = '';

    [
      ['선택 학기', ctx.info?.label || `${ctx.info?.grade || ''}학년 ${ctx.info?.semester || ''}학기`.trim()],
      ['기간 수', String(config.numPeriods || config?.oneA?.numPeriods || 0)]
    ].forEach(([label, value]) => {
      const tr = document.createElement('tr');
      tr.appendChild(readonlyTd(label));
      tr.appendChild(readonlyTd(value || ''));
      basicTbody.appendChild(tr);
    });

    [
      ['A반 학생 수', 'numA'],
      ['B반 학생 수', 'numB']
    ].forEach(([label, field]) => {
      const tr = document.createElement('tr');
      const valueCell = editableTd(String(config[field] || 0));
      valueCell.title = '클릭해서 학생 수 수정';
      valueCell.addEventListener('click', () => editStudentCount(field, label));
      tr.appendChild(readonlyTd(label));
      tr.appendChild(valueCell);
      basicTbody.appendChild(tr);
    });
  }

  function renderMaxTable(config, ctx) {
    const numPeriods = Number(config.numPeriods || config?.oneA?.numPeriods || 0);
    const assignments = Array.isArray(config.assignments) ? config.assignments : [];
    const maxData = config?.oneA?.max || [];
    const periodToAssign = new Map();

    assignments.forEach((assignment) => {
      if (assignment && assignment.period != null) {
        periodToAssign.set(Number(assignment.period), assignment);
      }
    });

    maxHead.innerHTML = '';
    maxBody.innerHTML = '';

    // 과목 안의 분야(예: 아동·모성)가 있으면 분야 열을 함께 보여 준다
    const showBranch = !ctx.isGrade3S1 && maxData.some((row) => row.branch);
    const infoHeaders = ctx.isGrade3S1
      ? [...(maxData.some((row) => row.subject) ? ['과목'] : []), '병원', '부서', '내과/외과', '중복허용']
      : ['과목', ...(showBranch ? ['분야'] : []), '병원', '부서'];

    const topAssignRow = document.createElement('tr');
    for (let i = 0; i < infoHeaders.length + 1; i++) topAssignRow.appendChild(th('', 'readonly-cell'));
    for (let i = 1; i <= numPeriods; i++) {
      const assignment = periodToAssign.get(i) || getOrCreateAssignment(config, i);
      const sem = formatAssignmentSemester(assignment.semester, ctx);
      const cell = th('', 'editable-control-cell');
      const wrap = document.createElement('div');
      wrap.className = 'json-period-editor';
      wrap.appendChild(createClassSelect(assignment, i));
      if (sem) {
        const semLabel = document.createElement('span');
        semLabel.className = 'muted';
        semLabel.textContent = sem;
        wrap.appendChild(semLabel);
      }
      cell.appendChild(wrap);
      topAssignRow.appendChild(cell);
    }
    maxHead.appendChild(topAssignRow);

    const headRow = document.createElement('tr');
    infoHeaders.forEach((label) => headRow.appendChild(th(label, 'readonly-cell')));
    headRow.appendChild(th('총계', 'readonly-cell'));
    for (let i = 1; i <= numPeriods; i++) headRow.appendChild(th(`기간 ${i}`, 'editable-cell'));
    maxHead.appendChild(headRow);

    const totals = Array(numPeriods).fill(0);

    const orderedRows = ctx.isGrade3S1
      ? groupByHospital(maxData).flatMap((group) =>
        group.indexes.map((rowIndex, pos) => ({ rowIndex, group: pos === 0 ? group : null })))
      : maxData.map((_, rowIndex) => ({ rowIndex, group: null }));

    orderedRows.forEach(({ rowIndex, group }) => {
      const row = maxData[rowIndex];
      const tr = document.createElement('tr');
      if (ctx.isGrade3S1) {
        appendGrade31Cells(tr, maxData, rowIndex, group);
      } else {
        tr.appendChild(readonlyTd(row.subject || ''));
        if (showBranch) tr.appendChild(readonlyTd(row.branch || ''));
        tr.appendChild(readonlyTd(row.hospital || ''));
        tr.appendChild(readonlyTd(row.department || ''));
      }

      const rowTotal = Array.from({ length: numPeriods }, (_, p) => Number(row.values?.[p] || 0))
        .reduce((sum, value) => sum + value, 0);
      tr.appendChild(td(String(rowTotal), 'json-row-total readonly-cell'));

      for (let p = 0; p < numPeriods; p++) {
        const value = Number(row.values?.[p] || 0);
        totals[p] += value;

        const cell = editableTd(String(value));
        cell.title = '클릭해서 최대 인원 수정';
        cell.addEventListener('click', () => editCapacity(rowIndex, p));
        tr.appendChild(cell);
      }
      maxBody.appendChild(tr);
    });

    const totalRow = document.createElement('tr');
    totalRow.className = 'table-total';
    totalRow.appendChild(readonlyTd('합계'));
    for (let i = 1; i < infoHeaders.length; i++) totalRow.appendChild(readonlyTd(''));
    totalRow.appendChild(readonlyTd(String(totals.reduce((sum, value) => sum + value, 0))));
    totals.forEach((value) => totalRow.appendChild(readonlyTd(String(value))));
    maxBody.appendChild(totalRow);
  }

  function editStudentCount(field, label) {
    if (!currentConfig) return;
    const current = Number(currentConfig[field] || 0);
    const raw = prompt(`${label}를 입력하세요.`, String(current));
    if (raw == null) return;

    const next = Number(raw.trim());
    if (!Number.isInteger(next) || next < 0) {
      alert('0 이상의 정수를 입력해주세요.');
      return;
    }

    currentConfig[field] = next;
    renderCurrent();
  }

  function editCapacity(rowIndex, periodIndex) {
    if (!currentConfig) return;
    const row = currentConfig?.oneA?.max?.[rowIndex];
    if (!row) return;

    row.values = Array.isArray(row.values) ? row.values : [];
    const current = Number(row.values[periodIndex] || 0);
    const raw = prompt(`기간 ${periodIndex + 1} 최대 인원을 입력하세요.`, String(current));
    if (raw == null) return;

    const next = Number(raw.trim());
    if (!Number.isInteger(next) || next < 0) {
      alert('0 이상의 정수를 입력해주세요.');
      return;
    }

    row.values[periodIndex] = next;
    renderCurrent();
  }

  function renderCurrent() {
    if (!currentConfig) return;
    const ctx = buildContext(currentConfig);
    renderBasic(currentConfig, ctx);
    renderMaxTable(currentConfig, ctx);
    contentEl.classList.remove('hidden');
  }

  async function loadJsonFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.oneA?.max || !Array.isArray(parsed.oneA.max)) {
        throw new Error('oneA.max 데이터가 없습니다.');
      }

      currentConfig = parsed;
      uploadName.textContent = file.name;
      setMessage('숫자 칸을 클릭해서 값을 수정한 뒤 저장하세요.', false);
      renderCurrent();
    } catch (error) {
      currentConfig = null;
      contentEl.classList.add('hidden');
      setMessage(`JSON을 읽을 수 없습니다: ${error.message}`, true);
    }
  }

  /** 요약 화면에서 넘어오면 파일을 올리지 않아도 요약 화면과 같은 값으로 표를 연다 */
  function loadFromSummary() {
    if (new URLSearchParams(window.location.search).get('from') !== SUMMARY_SOURCE) return;
    const config = buildWebConfig();
    if (!config.oneA.max.length) return;
    currentConfig = config;
    uploadName.textContent = '요약 화면의 입력 내용을 불러왔습니다.';
    setMessage('값을 수정한 뒤 저장하세요. 다른 JSON 파일을 올리면 그 파일로 바뀝니다.', false);
    renderCurrent();
  }

  fileInput.addEventListener('change', () => {
    loadJsonFile(fileInput.files?.[0]);
  });

  loadFromSummary();

  downloadBtn.addEventListener('click', () => {
    if (!currentConfig) {
      alert('먼저 web_config.json 파일을 업로드해주세요.');
      return;
    }
    downloadJSON('web_config.json', currentConfig);
  });
})();
