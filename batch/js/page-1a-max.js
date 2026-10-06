(function () {
  const {
    readConfig,
    writeConfig,
    getContext,
    getOneASemester,
    setOneASemester,
    visiblePeriodIndexes,
    persistOneASemesterData,
    clearInputErrors
  } = BatchCommon;

  const {
    buildMaxRow,
    parseRowInputs,
    validateMaxRow,
    validateDuplicateHospitalDepartments,
    loadSemesterRows
  } = Page1AShared;

  const ctx = getContext();
  const cfg = readConfig();
  const numPeriods = Number(cfg.numPeriods || 0);
  const assignments = Array.isArray(cfg.assignments) ? cfg.assignments : [];
  const selectedSemester = getOneASemester();
  const visibleIndexes = visiblePeriodIndexes(
    numPeriods,
    assignments,
    selectedSemester,
    ctx.hideSemesterUI
  );

  const addRowBtn = document.getElementById('add-row');
  const rowsContainer = document.getElementById('max-rows');
  const rowsEmpty = document.getElementById('max-empty');
  const goSummary = document.getElementById('go-summary');
  const semToggle = document.getElementById('semester-toggle');
  const semToggleContainer = document.getElementById('semester-toggle-container');
  const instructionDefault = document.getElementById('instruction-text');
  const instructionGrade3 = document.getElementById('instruction-text-grade3');
  const instructionSubject = document.getElementById('instruction-text-subject');

  if (ctx.hideSemesterUI && semToggleContainer) {
    semToggleContainer.classList.add('hidden');
    if (instructionDefault) instructionDefault.classList.add('hidden');
    if (instructionGrade3 && ctx.isGrade3S1) instructionGrade3.classList.remove('hidden');
    if (instructionSubject && ctx.usesSubjectMode) instructionSubject.classList.remove('hidden');
  }

  function toggleEmptyState() {
    const hasRows = rowsContainer.querySelector('.row-grid-dynamic');
    rowsEmpty.classList.toggle('hidden', !!hasRows);
  }

  function createRowWithRemove(initial) {
    const row = buildMaxRow(initial, visibleIndexes, ctx);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn';
    removeBtn.textContent = '삭제';
    removeBtn.addEventListener('click', () => {
      row.remove();
      toggleEmptyState();
    });
    row.appendChild(removeBtn);
    return row;
  }

  function restoreRows() {
    const savedData = loadSemesterRows(cfg, 'max', ctx, selectedSemester);
    rowsContainer.innerHTML = '';
    if (savedData.length === 0) {
      rowsEmpty.classList.remove('hidden');
      return;
    }
    savedData.forEach((data) => rowsContainer.appendChild(createRowWithRemove(data)));
    toggleEmptyState();
  }

  function collectData() {
    return Array.from(rowsContainer.querySelectorAll('.row-grid-dynamic')).map((row) =>
      parseRowInputs(row, ctx, numPeriods)
    );
  }

  function validateRows() {
    clearInputErrors(rowsContainer);
    const rows = Array.from(rowsContainer.querySelectorAll('.row-grid-dynamic'));
    if (rows.length === 0) {
      rowsEmpty.classList.remove('hidden');
      return false;
    }
    return rows.every((row) => validateMaxRow(row, ctx))
      && validateDuplicateHospitalDepartments(rows, ctx);
  }

  if (semToggle && !ctx.hideSemesterUI) {
    semToggle.value = selectedSemester;
    semToggle.addEventListener('change', () => {
      const store = readConfig();
      persistOneASemesterData(store, 'max', collectData(), ctx, selectedSemester);
      store.oneA.numPeriods = numPeriods;
      writeConfig(store);
      setOneASemester(semToggle.value);
      location.reload();
    });
  }

  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      if (!numPeriods) {
        alert('이전 페이지에서 기간 수를 설정한 뒤 다시 이동해주세요.');
        return;
      }
      rowsContainer.appendChild(createRowWithRemove());
      toggleEmptyState();
    });
  }

  if (goSummary) {
    goSummary.addEventListener('click', (e) => {
      if (!validateRows()) {
        e.preventDefault();
        return;
      }

      const store = readConfig();
      persistOneASemesterData(store, 'max', collectData(), ctx, selectedSemester);
      store.oneA.numPeriods = numPeriods;
      writeConfig(store);
      goSummary.setAttribute('href', 'page-1a-summary.html');
    });
  }

  if (numPeriods) {
    restoreRows();
  } else {
    rowsEmpty.textContent = '이전 페이지에서 기간 수를 설정하고 다시 이동해주세요.';
  }
})();
