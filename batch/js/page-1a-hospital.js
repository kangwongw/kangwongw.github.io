/** 3학년 1학기 최대 인원 입력: 병원 묶음 안에 부서 행을 둔다 */
const Page1AHospital = (function () {
  const { DEPT_TYPE_OPTIONS, groupByHospital, markInvalid, createEl } = BatchCommon;
  const { createTextInput, appendPeriodInputs, readPeriodValues, validateNumberInputs } = Page1AShared;

  function createButton(text, handleClick) {
    const button = createEl('button', 'btn', text);
    button.type = 'button';
    button.addEventListener('click', handleClick);
    return button;
  }

  function createDeptTypeSelect(selectedValue) {
    const select = createEl('select', 'select dept-type');
    const placeholder = createEl('option', null, '유형 선택');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    DEPT_TYPE_OPTIONS.forEach(({ value, label }) => {
      const option = createEl('option', null, label);
      option.value = value;
      select.appendChild(option);
    });
    if (selectedValue) select.value = selectedValue;
    return select;
  }

  function createDuplicateToggle(checked) {
    const label = createEl('label', 'checkbox-inline');
    const checkbox = createEl('input', 'duplicate-checkbox');
    checkbox.type = 'checkbox';
    checkbox.checked = !!checked;
    checkbox.title = '중복 배치 허용: 체크하면 같은 학생이 이 병원의 다른 부서에 두 번 배치될 수 있습니다';
    label.append(checkbox, '중복허용');
    return label;
  }

  function updateTotal(block) {
    const total = Array.from(block.querySelectorAll('.period-input'))
      .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    block.querySelector('.hospital-total').textContent = `총인원 ${total}`;
  }

  function buildDeptRow(block, dept, periodIndexes) {
    const row = createEl('div', 'row-grid-dynamic dept-row');
    const name = createTextInput('부서명');
    name.classList.add('dept-name');
    name.value = dept?.department || '';
    row.append(name, createDeptTypeSelect(dept?.deptType));
    appendPeriodInputs(row, periodIndexes, dept?.values || []);
    row.appendChild(createButton('부서 삭제', () => {
      row.remove();
      updateTotal(block);
    }));
    return row;
  }

  function buildHeader(block, group, handleAddDept, handleRemove) {
    const header = createEl('div', 'hospital-header');
    const subject = createTextInput('과목명');
    subject.classList.add('hospital-subject');
    subject.value = group?.subject || '';
    const name = createTextInput('병원명');
    name.classList.add('hospital-name');
    name.value = group?.hospital || '';
    header.append(
      subject,
      name,
      createDuplicateToggle(group?.allowDuplicate),
      createEl('span', 'hospital-total muted', '총인원 0'),
      createButton('부서 추가', handleAddDept),
      createButton('병원 삭제', () => {
        block.remove();
        handleRemove();
      })
    );
    return header;
  }

  /** group: { subject, hospital, allowDuplicate, departments: [{ department, deptType, values }] } */
  function buildHospitalBlock(group, periodIndexes, handleRemove) {
    const block = createEl('div', 'hospital-block');
    const deptList = createEl('div', 'dept-list');
    const addDept = (dept) => deptList.appendChild(buildDeptRow(block, dept, periodIndexes));
    block.append(buildHeader(block, group, () => addDept(null), handleRemove), deptList);
    const departments = group?.departments?.length ? group.departments : [null];
    departments.forEach(addDept);
    block.addEventListener('input', () => updateTotal(block));
    updateTotal(block);
    return block;
  }

  /** 저장된 부서 단위 행들을 병원 묶음으로 바꾼다 */
  function rowsToGroups(rows) {
    return groupByHospital(rows).map(({ hospital, indexes }) => ({
      subject: rows[indexes[0]].subject || '',
      hospital,
      allowDuplicate: indexes.some((i) => rows[i].allowDuplicate),
      departments: indexes.map((i) => rows[i])
    }));
  }

  /** 병원 묶음 하나를 부서 단위 행들로 바꾼다 (중복허용은 병원 전체에 적용) */
  function collectBlock(block, numPeriods) {
    const subject = block.querySelector('.hospital-subject').value.trim();
    const hospital = block.querySelector('.hospital-name').value.trim();
    const allowDuplicate = block.querySelector('.duplicate-checkbox').checked;
    return Array.from(block.querySelectorAll('.dept-row')).map((row) => ({
      subject,
      hospital,
      department: row.querySelector('.dept-name').value.trim(),
      deptType: row.querySelector('.dept-type').value,
      values: readPeriodValues(Array.from(row.querySelectorAll('.period-input')), numPeriods),
      allowDuplicate
    }));
  }

  /** 이름이 비었거나 이미 나온 이름이면 표시하고 false */
  function markIfBlankOrRepeated(input, seenNames) {
    const name = input.value.trim();
    const isValid = !!name && !seenNames.has(name);
    seenNames.add(name);
    if (!isValid) markInvalid(input);
    return isValid;
  }

  function validateDeptRows(block) {
    const rows = Array.from(block.querySelectorAll('.dept-row'));
    if (rows.length === 0) markInvalid(block.querySelector('.hospital-name'));
    const seenNames = new Set();
    return rows.reduce((ok, row) => {
      const type = row.querySelector('.dept-type');
      if (!type.value) markInvalid(type);
      const isNameValid = markIfBlankOrRepeated(row.querySelector('.dept-name'), seenNames);
      const areNumbersValid = validateNumberInputs(Array.from(row.querySelectorAll('.period-input')));
      return ok && isNameValid && !!type.value && areNumbersValid;
    }, rows.length > 0);
  }

  function validateBlocks(blocks) {
    const seenNames = new Set();
    return blocks.reduce((ok, block) => {
      const subject = block.querySelector('.hospital-subject');
      if (!subject.value.trim()) markInvalid(subject);
      const isNameValid = markIfBlankOrRepeated(block.querySelector('.hospital-name'), seenNames);
      return validateDeptRows(block) && isNameValid && !!subject.value.trim() && ok;
    }, true);
  }

  /** 새 병원 묶음의 과목명은 바로 앞 병원 묶음의 과목명으로 미리 채운다 */
  function newBlockDefaults(container) {
    const subjects = container.querySelectorAll('.hospital-subject');
    const last = subjects.length ? subjects[subjects.length - 1].value.trim() : '';
    return last ? { subject: last } : null;
  }

  return {
    buildHospitalBlock,
    rowsToGroups,
    collectBlock,
    validateBlocks,
    newBlockDefaults
  };
})();
