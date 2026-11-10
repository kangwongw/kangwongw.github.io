(function () {
  if (BatchCommon.redirectIfNoSemester()) return;

  const {
    INPUT_METHOD,
    readConfig,
    writeConfig,
    getContext,
    setInputMethod,
    clearInputErrors
  } = BatchCommon;

  const {
    buildMaxRow,
    parseRowInputs,
    validateMaxRow,
    validateDuplicateHospitalDepartments
  } = Page1AShared;

  const ctx = getContext();
  const cfg = readConfig();
  const numPeriods = Number(cfg.numPeriods || 0);
  const visibleIndexes = Array.from({ length: numPeriods }, (_, i) => i);
  // 3학년 1학기는 병원 묶음 안에 부서를 넣고, 다른 학기는 과목 행을 하나씩 넣는다
  const isHospitalMode = ctx.isGrade3S1;
  const itemSelector = isHospitalMode ? '.hospital-block' : '.row-grid-dynamic';

  const addRowBtn = document.getElementById('add-row');
  const rowsContainer = document.getElementById('max-rows');
  const rowsEmpty = document.getElementById('max-empty');
  const goSummary = document.getElementById('go-summary');
  const instructionGrade3 = document.getElementById('instruction-text-grade3');
  const instructionSubject = document.getElementById('instruction-text-subject');
  const instructionBranch = document.getElementById('instruction-text-branch');
  const branchExample = document.getElementById('branch-example');
  // 과목 학기(3-2·4-1·4-2)는 과목 안의 분야(예: 아동·모성) 칸을 함께 둔다
  const withBranch = ctx.usesSubjectMode;

  if (instructionGrade3 && ctx.isGrade3S1) instructionGrade3.classList.remove('hidden');
  if (instructionSubject && ctx.usesSubjectMode) instructionSubject.classList.remove('hidden');
  if (instructionBranch && withBranch) instructionBranch.classList.remove('hidden');
  if (branchExample) branchExample.textContent = BatchCommon.branchOptionsFor(ctx.info).join(', ');
  if (isHospitalMode) {
    document.querySelector('.panel-toolbar h2').textContent = '병원/부서별 기간별 최대 인원';
    addRowBtn.textContent = '병원 추가';
    rowsEmpty.textContent = '병원이 없습니다. "병원 추가"를 눌러 시작하세요.';
  }

  function toggleEmptyState() {
    const hasRows = rowsContainer.querySelector(itemSelector);
    rowsEmpty.classList.toggle('hidden', !!hasRows);
  }

  function createRowWithRemove(initial) {
    const row = buildMaxRow(initial, visibleIndexes, withBranch);
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

  function createItem(initial) {
    if (isHospitalMode) return Page1AHospital.buildHospitalBlock(initial, visibleIndexes, toggleEmptyState);
    return createRowWithRemove(initial);
  }

  function restoreRows() {
    const savedData = cfg.oneA?.max || [];
    const items = isHospitalMode ? Page1AHospital.rowsToGroups(savedData) : savedData;
    items.forEach((item) => rowsContainer.appendChild(createItem(item)));
    toggleEmptyState();
  }

  function collectData() {
    const items = Array.from(rowsContainer.querySelectorAll(itemSelector));
    if (isHospitalMode) return items.flatMap((block) => Page1AHospital.collectBlock(block, numPeriods));
    return items.map((row) => parseRowInputs(row, numPeriods));
  }

  function validateRows() {
    clearInputErrors(rowsContainer);
    const items = Array.from(rowsContainer.querySelectorAll(itemSelector));
    if (items.length === 0) {
      rowsEmpty.classList.remove('hidden');
      return false;
    }
    if (isHospitalMode) return Page1AHospital.validateBlocks(items);
    return items.every((row) => validateMaxRow(row))
      && validateDuplicateHospitalDepartments(items);
  }

  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      if (!numPeriods) {
        alert('이전 페이지에서 기간 수를 설정한 뒤 다시 이동해주세요.');
        return;
      }
      rowsContainer.appendChild(createItem(isHospitalMode ? Page1AHospital.newBlockDefaults(rowsContainer) : undefined));
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
      store.oneA = store.oneA || {};
      store.oneA.max = collectData();
      writeConfig(store);
      setInputMethod(INPUT_METHOD.MANUAL);
      goSummary.setAttribute('href', 'page-1a-summary.html');
    });
  }

  if (numPeriods) {
    restoreRows();
  } else {
    rowsEmpty.textContent = '이전 페이지에서 기간 수를 설정하고 다시 이동해주세요.';
  }
})();
