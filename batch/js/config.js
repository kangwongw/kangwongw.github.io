(function () {
  if (BatchCommon.redirectIfNoSemester()) return;

  const {
    CLASS_OPTIONS,
    readConfig,
    writeConfig,
    getSelectedSemester,
    getContext,
    GRADE31_ASSIGNMENT_SEMESTER,
    clearInputErrors,
    markInvalid,
    createEl
  } = BatchCommon;

  /** 기간별 반 버튼 글자 (긴 '두 반 모두 가능'은 버튼에서 줄여 쓴다) */
  const CLASS_BUTTON_LABELS = { A: 'A반', B: 'B반', 'A&B': '두 반 모두' };
  const MAX_PERIODS_PER_GROUP = 30;

  const ctx = getContext();
  const selectedSemester = getSelectedSemester();
  // 기간 묶음: 3-2·4-1·4-2는 방학 → 학기 순서로 번호를 붙이고, 3학년 1학기는 1학기 하나
  const groups = ctx.usePeriodTermSelect
    ? ctx.periodTermOptions.map(({ value, label }) => ({ semester: value, label }))
    : [{ semester: GRADE31_ASSIGNMENT_SEMESTER, label: '1학기' }];

  const numAEl = document.getElementById('num-a');
  const numBEl = document.getElementById('num-b');
  const countsEl = document.getElementById('period-counts');
  const countHintEl = document.getElementById('period-count-hint');
  const periodContainer = document.getElementById('period-assignments');
  const errorEl = document.getElementById('config-error');
  const go1a = document.getElementById('go-1a');

  /** counts[묶음] = 기간 수, classes[묶음][묶음 안 순서] = 반 */
  const state = { counts: groups.map(() => 0), classes: groups.map(() => []) };

  document.getElementById('selected-semester-info').textContent = `선택된 학기: ${selectedSemester.label}`;
  countHintEl.textContent = groups.length > 1
    ? `${groups.map((g) => g.label).join('과 ')} 기간 수를 각각 넣으세요. 기간 번호는 ${groups[0].label}부터 차례로 붙습니다.`
    : `${groups[0].label} 기간 수를 넣으세요.`;

  function clampCount(raw) {
    const num = Math.floor(Number(raw));
    return Number.isFinite(num) && num > 0 ? Math.min(num, MAX_PERIODS_PER_GROUP) : 0;
  }

  /** 저장해 둔 설정에서 학생 수, 묶음별 기간 수, 기간별 반을 되살린다 */
  function restoreState() {
    const saved = readConfig();
    numAEl.value = saved.numA ?? '';
    numBEl.value = saved.numB ?? '';
    const assignments = sortedAssignments(saved.assignments);
    groups.forEach((group, gi) => {
      const inGroup = groups.length > 1
        ? assignments.filter((a) => String(a.semester) === group.semester)
        : assignments;
      state.counts[gi] = Math.min(inGroup.length, MAX_PERIODS_PER_GROUP);
      state.classes[gi] = inGroup.map((a) => a.class || null);
    });
  }

  /** 묶음 순서대로 번호를 붙인 기간 목록: [{ period, semester, groupIndex, indexInGroup }] */
  function periodList() {
    const list = [];
    groups.forEach((group, groupIndex) => {
      for (let indexInGroup = 0; indexInGroup < state.counts[groupIndex]; indexInGroup++) {
        list.push({ period: list.length + 1, semester: group.semester, groupIndex, indexInGroup });
      }
    });
    return list;
  }

  function renderCountInputs() {
    countsEl.innerHTML = '';
    groups.forEach((group, gi) => {
      const field = createEl('div', 'field');
      const label = createEl('label', 'field-label', `${group.label} 기간 수`);
      label.htmlFor = `count-${gi}`;
      const input = document.createElement('input');
      Object.assign(input, { id: `count-${gi}`, type: 'number', min: '0', max: String(MAX_PERIODS_PER_GROUP), placeholder: '예: 4' });
      input.className = 'period-count-input';
      input.value = state.counts[gi] ? String(state.counts[gi]) : '';
      input.addEventListener('input', () => {
        state.counts[gi] = clampCount(input.value);
        renderPeriods();
      });
      field.append(label, input);
      countsEl.appendChild(field);
    });
  }

  function setPressed(toggle, value) {
    toggle.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(CLASS_OPTIONS[i].value === value));
    });
  }

  /** 반 고르기 버튼 묶음 [A반][B반][두 반 모두] */
  function createClassToggle(groupIndex, indexInGroup) {
    const toggle = createEl('div', 'class-toggle');
    toggle.setAttribute('role', 'group');
    CLASS_OPTIONS.forEach(({ value }) => {
      const button = createEl('button', null, CLASS_BUTTON_LABELS[value]);
      button.type = 'button';
      button.addEventListener('click', () => {
        state.classes[groupIndex][indexInGroup] = value;
        setPressed(toggle, value);
        toggle.classList.remove('input-error');
      });
      toggle.appendChild(button);
    });
    setPressed(toggle, state.classes[groupIndex][indexInGroup]);
    return toggle;
  }

  /** 묶음(방학·학기) 전체를 같은 반으로 정하는 버튼 */
  function createQuickFill(groupIndex) {
    const wrap = createEl('div', 'quick-fill');
    wrap.appendChild(createEl('span', null, '한 번에'));
    CLASS_OPTIONS.forEach(({ value }) => {
      const button = createEl('button', null, CLASS_BUTTON_LABELS[value]);
      button.type = 'button';
      button.addEventListener('click', () => {
        state.classes[groupIndex] = Array.from({ length: state.counts[groupIndex] }, () => value);
        renderPeriods();
      });
      wrap.appendChild(button);
    });
    return wrap;
  }

  function createGroupBlock(group, periods) {
    const block = createEl('div', 'period-group');
    const header = createEl('div', 'period-group-header');
    const first = periods[0].period;
    const last = periods[periods.length - 1].period;
    const range = first === last ? `기간 ${first}` : `기간 ${first}~${last}`;
    header.append(createEl('span', 'period-group-title', `${group.label} · ${range}`), createQuickFill(periods[0].groupIndex));
    block.appendChild(header);
    periods.forEach(({ period, groupIndex, indexInGroup }) => {
      const row = createEl('div', 'period-row');
      row.append(createEl('span', 'period-label', `기간 ${period}`), createClassToggle(groupIndex, indexInGroup));
      block.appendChild(row);
    });
    return block;
  }

  function renderPeriods() {
    periodContainer.innerHTML = '';
    const list = periodList();
    if (!list.length) {
      periodContainer.appendChild(createEl('p', 'muted', '기간 수를 넣으면 기간마다 반을 고를 수 있습니다.'));
      return;
    }
    groups.forEach((group, gi) => {
      const periods = list.filter((p) => p.groupIndex === gi);
      if (periods.length) periodContainer.appendChild(createGroupBlock(group, periods));
    });
  }

  function buildConfig() {
    const assignments = periodList().map(({ period, semester, groupIndex, indexInGroup }) => ({
      period,
      class: state.classes[groupIndex][indexInGroup] || null,
      semester
    }));
    return {
      numA: Number(numAEl.value),
      numB: Number(numBEl.value),
      numPeriods: assignments.length,
      assignments,
      selectedSemester: selectedSemester || null
    };
  }

  function sortedAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).slice().sort((a, b) => Number(a.period) - Number(b.period));
  }

  /** 기간마다 "방학·학기 구분#그 안의 순서" 이름을 붙인다 (예: 방학 첫 기간 '1#1', 학기 둘째 기간 '2#2') */
  function periodKeys(assignments) {
    const seen = {};
    return sortedAssignments(assignments).map((a) => {
      const semester = String(a.semester);
      seen[semester] = (seen[semester] || 0) + 1;
      return `${semester}#${seen[semester]}`;
    });
  }

  /**
   * 이전·다음 화면을 오가도 이미 넣은 최대 인원 표를 남긴다.
   * 기간 수가 바뀌었으면 값을 같은 방학·학기 순서의 새 기간으로 옮기고, 새 기간은 0으로 둔다.
   */
  function withCarriedTable(saved, next) {
    const rows = saved?.oneA?.max;
    if (!Array.isArray(rows) || !rows.length) return next;
    const oldIndexByKey = new Map(periodKeys(saved.assignments).map((key, i) => [key, i]));
    const newKeys = periodKeys(next.assignments);
    const max = rows.map((row) => ({
      ...row,
      values: newKeys.map((key) => (oldIndexByKey.has(key) ? Number(row.values?.[oldIndexByKey.get(key)] || 0) : 0))
    }));
    return { ...next, oneA: { ...saved.oneA, max } };
  }

  /** 빠진 값을 표시하고 고칠 내용을 문장 목록으로 돌려준다 */
  function findProblems() {
    const problems = [];
    const missingCounts = [numAEl, numBEl].filter((el) => !el.value.trim() || Number(el.value) < 0);
    missingCounts.forEach(markInvalid);
    if (missingCounts.length) problems.push('A반·B반 학생 수를 넣어 주세요.');
    const list = periodList();
    if (!list.length) {
      countsEl.querySelectorAll('input').forEach(markInvalid);
      problems.push('기간 수를 1 이상 넣어 주세요.');
    }
    const toggles = periodContainer.querySelectorAll('.class-toggle');
    const unchosen = list.filter((p, i) => {
      if (state.classes[p.groupIndex][p.indexInGroup]) return false;
      markInvalid(toggles[i]);
      return true;
    });
    if (unchosen.length) problems.push(`반을 고르지 않은 기간이 있습니다: ${unchosen.map((p) => `기간 ${p.period}`).join(', ')}`);
    return problems;
  }

  function validateAndShow() {
    clearInputErrors(document);
    const problems = findProblems();
    errorEl.textContent = problems.join(' ');
    errorEl.classList.toggle('hidden', !problems.length);
    return !problems.length;
  }

  restoreState();
  renderCountInputs();
  renderPeriods();

  go1a.addEventListener('click', (e) => {
    if (!validateAndShow()) {
      e.preventDefault();
      return;
    }
    writeConfig(withCarriedTable(readConfig(), buildConfig()));
  });
})();
