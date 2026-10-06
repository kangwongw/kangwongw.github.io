(function () {
  const {
    CLASS_OPTIONS,
    readConfig,
    writeConfig,
    getSelectedSemester,
    getContext,
    normalizeAssignmentSemester,
    assignmentSemesterToTermValue,
    GRADE31_ASSIGNMENT_SEMESTER,
    clearInputErrors,
    markInvalid
  } = BatchCommon;

  const ctx = getContext();
  const periodTermOptions = ctx.periodTermOptions || [];
  const selectedSemester = getSelectedSemester();

  const semesterInfoEl = document.getElementById('selected-semester-info');
  if (semesterInfoEl && selectedSemester) {
    semesterInfoEl.textContent = `선택된 학기: ${selectedSemester.label}`;
  }

  const numAEl = document.getElementById('num-a');
  const numBEl = document.getElementById('num-b');
  const numPeriodsEl = document.getElementById('num-periods');
  const buildBtn = document.getElementById('build-periods');
  const periodContainer = document.getElementById('period-assignments');
  const go1a = document.getElementById('go-1a');
  const periodHintEl = document.getElementById('period-assignments-hint');

  if (periodHintEl) {
    if (ctx.isGrade4S1) {
      periodHintEl.textContent =
        '"기간별 입력 생성" 후 각 기간의 반·동계방학/1학기를 선택해주세요.';
    } else if (ctx.isGrade3S2 || ctx.isGrade4S2) {
      periodHintEl.textContent =
        '"기간별 입력 생성" 후 각 기간의 반·하계방학/2학기를 선택해주세요.';
    } else {
      periodHintEl.textContent =
        '"기간별 입력 생성" 버튼을 눌러 기간별 반/학기 선택을 만들어주세요.';
    }
  }

  function createClassSelect(id) {
    const select = document.createElement('select');
    select.className = 'select';
    if (id) select.id = id;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '반 선택';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    CLASS_OPTIONS.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });

    return select;
  }

  function setSelectValue(select, value) {
    if (!select || !value) return;
    select.value = value;
    if (select.value !== value) return;
    const first = select.querySelector('option[disabled]');
    if (first) first.selected = false;
  }

  function createSemesterSelect(id) {
    const select = document.createElement('select');
    select.className = 'select';
    if (id) select.id = id;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '학기 선택';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    ['1', '2'].forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = `${value}학기`;
      select.appendChild(opt);
    });

    return select;
  }

  function createPeriodTermSelect(id, savedValue) {
    const select = document.createElement('select');
    select.className = 'select period-term-select';
    if (id) select.id = id;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '기간 구분';
    placeholder.disabled = true;
    placeholder.selected = !savedValue;
    select.appendChild(placeholder);

    periodTermOptions.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (savedValue === value) {
        opt.selected = true;
        placeholder.selected = false;
      }
      select.appendChild(opt);
    });

    return select;
  }

  function getSavedAssignments() {
    const saved = readConfig();
    const list = Array.isArray(saved.assignments) ? saved.assignments : [];
    const byPeriod = new Map();
    list.forEach((a) => {
      if (a && a.period != null) byPeriod.set(Number(a.period), a);
    });
    return byPeriod;
  }

  function rebuildPeriodRows() {
    const numPeriods = Math.max(0, Number(numPeriodsEl.value) || 0);
    periodContainer.innerHTML = '';

    if (numPeriods === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = '기간 수를 1 이상으로 입력하고 생성 버튼을 눌러주세요.';
      periodContainer.appendChild(p);
      return;
    }

    const savedByPeriod = getSavedAssignments();

    for (let i = 1; i <= numPeriods; i++) {
      const saved = savedByPeriod.get(i) || {};
      const row = document.createElement('div');
      row.className = 'period-row';

      const label = document.createElement('span');
      label.className = 'period-label';
      label.textContent = `기간 ${i}`;

      const classSelect = createClassSelect(`period-${i}-class`);
      setSelectValue(classSelect, saved.class);

      row.appendChild(label);
      row.appendChild(classSelect);

      if (ctx.usePeriodTermSelect) {
        const termUi = assignmentSemesterToTermValue(saved.semester || '', ctx);
        row.appendChild(createPeriodTermSelect(`period-${i}-semester`, termUi));
      } else if (!ctx.autoPeriodSemester) {
        const semSelect = createSemesterSelect(`period-${i}-semester`);
        setSelectValue(semSelect, saved.semester);
        row.appendChild(semSelect);
      } else {
        const hiddenSem = document.createElement('input');
        hiddenSem.type = 'hidden';
        hiddenSem.id = `period-${i}-semester`;
        hiddenSem.value = GRADE31_ASSIGNMENT_SEMESTER;
        row.appendChild(hiddenSem);
      }

      periodContainer.appendChild(row);
    }
  }

  function buildConfig() {
    const numPeriods = Number(numPeriodsEl.value);
    const assignments = [];

    for (let i = 1; i <= numPeriods; i++) {
      const clsSel = document.getElementById(`period-${i}-class`);
      const semSel = document.getElementById(`period-${i}-semester`);
      const selectedClass = clsSel ? clsSel.value : '';
      let rawSemester = semSel ? semSel.value : '';
      const selectedSemesterValue = normalizeAssignmentSemester(rawSemester, ctx);

      assignments.push({
        period: i,
        class: selectedClass || null,
        semester: selectedSemesterValue || null
      });
    }

    return {
      numA: Number(numAEl.value),
      numB: Number(numBEl.value),
      numPeriods,
      assignments,
      selectedSemester: selectedSemester || null
    };
  }

  function validateAndMark() {
    clearInputErrors(document);
    let ok = true;

    if (!numAEl.value.trim()) { markInvalid(numAEl); ok = false; }
    if (!numBEl.value.trim()) { markInvalid(numBEl); ok = false; }
    if (!numPeriodsEl.value.trim() || Number(numPeriodsEl.value) < 1) {
      markInvalid(numPeriodsEl);
      ok = false;
    }

    const numPeriods = Number(numPeriodsEl.value || '0');
    for (let i = 1; i <= numPeriods; i++) {
      const clsSel = document.getElementById(`period-${i}-class`);
      const semSel = document.getElementById(`period-${i}-semester`);
      if (!clsSel?.value) { markInvalid(clsSel); ok = false; }
      const needsSemester = ctx.usePeriodTermSelect || !ctx.autoPeriodSemester;
      if (needsSemester && !semSel?.value) { markInvalid(semSel); ok = false; }
    }

    return ok;
  }

  buildBtn.addEventListener('click', rebuildPeriodRows);

  const existing = readConfig();
  if (existing.numPeriods) {
    numAEl.value = existing.numA ?? '';
    numBEl.value = existing.numB ?? '';
    numPeriodsEl.value = existing.numPeriods ?? '';
    if (Number(existing.numPeriods) > 0) rebuildPeriodRows();
  }

  if (go1a) {
    go1a.addEventListener('click', (e) => {
      if (!validateAndMark()) {
        e.preventDefault();
        return;
      }
      writeConfig(buildConfig());
    });
  }
})();
