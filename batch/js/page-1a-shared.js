const Page1AShared = (function () {
  const { markInvalid } = BatchCommon;

  /** 과목 행의 글자 칸: 칸 순서가 아니라 이름표(클래스)로 찾는다 */
  const FIELD_CLASS = {
    subject: 'row-subject',
    branch: 'row-branch',
    hospital: 'row-hospital',
    department: 'row-department'
  };
  const REQUIRED_FIELDS = ['subject', 'hospital'];

  function createTextInput(placeholder, fieldClass) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.className = fieldClass ? `row-input ${fieldClass}` : 'row-input';
    return input;
  }

  function fieldInput(row, key) {
    return row.querySelector(`.${FIELD_CLASS[key]}`);
  }

  function fieldValue(row, key) {
    return fieldInput(row, key)?.value.trim() || '';
  }

  function periodInputs(row) {
    return Array.from(row.querySelectorAll('.period-input'));
  }

  function createNumberInput(placeholder, periodIdx) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.placeholder = placeholder;
    input.className = 'row-input period-input';
    input.setAttribute('data-period-index', String(periodIdx));
    return input;
  }

  function appendPeriodInputs(row, visibleIndexes, values) {
    visibleIndexes.forEach((i) => {
      const input = createNumberInput(`기간 ${i + 1}`, i);
      input.value = values[i] != null ? String(values[i]) : '';
      row.appendChild(input);
    });
  }

  function readPeriodValues(inputs, numPeriods) {
    const values = Array.from({ length: numPeriods }, () => 0);
    inputs.forEach((inp) => {
      const idx = Number(inp.getAttribute('data-period-index'));
      if (!Number.isNaN(idx)) values[idx] = Number(inp.value || '0');
    });
    return values;
  }

  function getHospitalAndDepartmentFromRow(row) {
    return {
      hospital: fieldValue(row, 'hospital'),
      department: fieldValue(row, 'department'),
      deptInput: fieldInput(row, 'department')
    };
  }

  function validateDuplicateHospitalDepartments(rows) {
    const counts = new Map();
    rows.forEach((row) => {
      const { hospital } = getHospitalAndDepartmentFromRow(row);
      if (!hospital) return;
      counts.set(hospital, (counts.get(hospital) || 0) + 1);
    });

    let ok = true;
    rows.forEach((row) => {
      const { hospital, department, deptInput } = getHospitalAndDepartmentFromRow(row);
      if (hospital && counts.get(hospital) > 1 && !department) {
        markInvalid(deptInput);
        ok = false;
      }
    });
    return ok;
  }

  /** 분야 칸(4학년 1학기)은 값이 있을 때만 branch로 저장한다 */
  function parseRowInputs(row, numPeriods) {
    const parsed = { subject: fieldValue(row, 'subject') };
    const branch = fieldValue(row, 'branch');
    if (branch) parsed.branch = branch;
    return {
      ...parsed,
      department: fieldValue(row, 'department') || undefined,
      hospital: fieldValue(row, 'hospital'),
      values: readPeriodValues(periodInputs(row), numPeriods),
      allowDuplicate: false
    };
  }

  function validateNumberInputs(inputs) {
    let ok = true;
    inputs.forEach((input) => {
      const raw = input.value.trim();
      const num = Number(raw);
      if (raw === '' || Number.isNaN(num) || num < 0) {
        markInvalid(input);
        ok = false;
      }
    });
    return ok;
  }

  function validateMaxRow(row) {
    let ok = true;
    REQUIRED_FIELDS.forEach((key) => {
      if (fieldValue(row, key)) return;
      markInvalid(fieldInput(row, key));
      ok = false;
    });
    return validateNumberInputs(periodInputs(row)) && ok;
  }

  /** 과목 행: 과목, (분야), 병원, 부서, 기간별 인원 — 분야 칸은 withBranch일 때만 넣는다 */
  function buildMaxRow(initial, visibleIndexes, withBranch) {
    const row = document.createElement('div');
    row.className = 'row-grid-dynamic';
    const fields = [
      ['subject', '과목'],
      ...(withBranch ? [['branch', '분야 (선택사항)']] : []),
      ['hospital', '병원'],
      ['department', '부서 (선택사항)']
    ];
    fields.forEach(([key, placeholder]) => {
      const input = createTextInput(placeholder, FIELD_CLASS[key]);
      input.value = initial?.[key] || '';
      row.appendChild(input);
    });
    appendPeriodInputs(row, visibleIndexes, initial?.values || []);
    return row;
  }

  return {
    createTextInput,
    appendPeriodInputs,
    readPeriodValues,
    validateNumberInputs,
    buildMaxRow,
    parseRowInputs,
    validateMaxRow,
    validateDuplicateHospitalDepartments
  };
})();
