const Page1AShared = (function () {
  const { markInvalid } = BatchCommon;

  function deptTypeLabel(value) {
    if (value === 'internal') return '내과';
    if (value === 'external') return '외과';
    if (value === 'both') return '내과&외과';
    return '';
  }

  function createTextInput(placeholder, width) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.className = 'row-input';
    if (width) input.style.width = width;
    return input;
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

  function createDepartmentTypeSelect() {
    const select = document.createElement('select');
    select.className = 'select';
    select.style.width = '140px';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '선택';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    [
      { value: 'internal', label: '내과' },
      { value: 'external', label: '외과' },
      { value: 'both', label: '내과&외과' }
    ].forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });

    return select;
  }

  function createDuplicateCheckbox(checked) {
    const label = document.createElement('label');
    label.className = 'checkbox-inline';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'duplicate-checkbox';
    checkbox.checked = !!checked;
    checkbox.title = '중복 배치 허용: 체크 시 해당 병원에 같은 학생이 여러 번 배치될 수 있습니다';

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('중복허용'));
    return { label, checkbox };
  }

  function appendPeriodInputs(row, visibleIndexes, values) {
    visibleIndexes.forEach((i) => {
      const input = createNumberInput(`기간 ${i + 1}`, i);
      input.value = values[i] != null ? String(values[i]) : '';
      row.appendChild(input);
    });
  }

  function getHospitalAndDepartmentFromRow(row, ctx) {
    const inputs = Array.from(row.querySelectorAll('input:not(.duplicate-checkbox)'));
    if (ctx.isGrade3S1) {
      return {
        hospital: inputs[0]?.value.trim() || '',
        department: inputs[1]?.value.trim() || '',
        deptInput: inputs[1]
      };
    }
    return {
      hospital: inputs[1]?.value.trim() || '',
      department: inputs[2]?.value.trim() || '',
      deptInput: inputs[2]
    };
  }

  function validateDuplicateHospitalDepartments(rows, ctx) {
    const counts = new Map();
    rows.forEach((row) => {
      const { hospital } = getHospitalAndDepartmentFromRow(row, ctx);
      if (!hospital) return;
      counts.set(hospital, (counts.get(hospital) || 0) + 1);
    });

    let ok = true;
    rows.forEach((row) => {
      const { hospital, department, deptInput } = getHospitalAndDepartmentFromRow(row, ctx);
      if (hospital && counts.get(hospital) > 1 && !department) {
        markInvalid(deptInput);
        ok = false;
      }
    });
    return ok;
  }

  function parseRowInputs(row, ctx, numPeriods) {
    const inputs = Array.from(row.querySelectorAll('input:not(.duplicate-checkbox)'));
    const selects = Array.from(row.querySelectorAll('select'));
    const values = Array.from({ length: numPeriods }, () => 0);

    if (ctx.isGrade3S1) {
      const duplicateCheckbox = row.querySelector('.duplicate-checkbox');
      inputs.slice(2).forEach((inp) => {
        const idx = Number(inp.getAttribute('data-period-index'));
        if (!Number.isNaN(idx)) values[idx] = Number(inp.value || '0');
      });
      return {
        hospital: inputs[0].value.trim(),
        department: inputs[1].value.trim(),
        deptType: selects[0] ? selects[0].value : '',
        values,
        allowDuplicate: duplicateCheckbox ? duplicateCheckbox.checked : false
      };
    }

    const subject = inputs[0].value.trim();
    const hospital = inputs[1].value.trim();
    const department = inputs[2].value.trim() || undefined;

    inputs.slice(3).forEach((inp) => {
      const idx = Number(inp.getAttribute('data-period-index'));
      if (!Number.isNaN(idx)) values[idx] = Number(inp.value || '0');
    });

    return { subject, department, hospital, values, allowDuplicate: false };
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

  function validateMaxRow(row, ctx) {
    const inputs = Array.from(row.querySelectorAll('input:not(.duplicate-checkbox)'));
    const selects = Array.from(row.querySelectorAll('select'));
    let ok = true;

    if (ctx.isGrade3S1) {
      if (!inputs[0].value.trim()) { markInvalid(inputs[0]); ok = false; }
      if (!inputs[1].value.trim()) { markInvalid(inputs[1]); ok = false; }
      if (!selects[0]?.value) { markInvalid(selects[0]); ok = false; }
      ok = validateNumberInputs(inputs.slice(2)) && ok;
      return ok;
    }

    if (!inputs[0].value.trim()) { markInvalid(inputs[0]); ok = false; }
    if (!inputs[1].value.trim()) { markInvalid(inputs[1]); ok = false; }
    ok = validateNumberInputs(inputs.slice(3)) && ok;
    return ok;
  }

  function buildMaxRow(initial, visibleIndexes, ctx) {
    const row = document.createElement('div');
    row.className = 'row-grid-dynamic';

    if (ctx.isGrade3S1) {
      const { label, checkbox } = createDuplicateCheckbox(initial?.allowDuplicate);
      const hospital = createTextInput('병원명');
      const department = createTextInput('부서명');
      const deptType = createDepartmentTypeSelect();

      hospital.value = initial?.hospital || '';
      department.value = initial?.department || '';
      if (initial?.deptType) deptType.value = initial.deptType;

      row.appendChild(label);
      row.appendChild(hospital);
      row.appendChild(department);
      row.appendChild(deptType);
      appendPeriodInputs(row, visibleIndexes, initial?.values || []);
      return row;
    }

    const subject = createTextInput('과목');
    const hospital = createTextInput('병원');
    const department = createTextInput('부서 (선택사항)');

    subject.value = initial?.subject || '';
    hospital.value = initial?.hospital || '';
    department.value = initial?.department || '';

    row.appendChild(subject);
    row.appendChild(hospital);
    row.appendChild(department);
    appendPeriodInputs(row, visibleIndexes, initial?.values || []);

    return row;
  }

  function loadSemesterRows(store, field, ctx, selectedSemester) {
    if (ctx.hideSemesterUI) {
      return store?.oneA?.[field] || store?.oneA?.[`${field}_sem1`] || [];
    }
    return store?.oneA?.[`${field}_sem${selectedSemester}`] || [];
  }

  function mapKeyForRow(row, ctx) {
    if (ctx.isGrade3S1) {
      return `${row.hospital}|${row.department}|${row.deptType}`;
    }
    return `${row.subject}|${row.hospital}|${row.department || ''}`;
  }

  return {
    deptTypeLabel,
    buildMaxRow,
    parseRowInputs,
    validateMaxRow,
    validateDuplicateHospitalDepartments,
    loadSemesterRows,
    mapKeyForRow
  };
})();
