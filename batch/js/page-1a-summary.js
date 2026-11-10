(function () {
  if (BatchCommon.redirectIfNoSemester()) return;

  const {
    readConfig,
    getContext,
    getInputMethod,
    deptTypeLabel,
    groupByHospital,
    buildWebConfig,
    downloadJSON,
    createEl,
    formatAssignmentSemester
  } = BatchCommon;

  const store = readConfig();
  const ctx = getContext();
  const numA = store.numA || 0;
  const numB = store.numB || 0;
  const numPeriods = Number(store.numPeriods || 0);
  const assignments = Array.isArray(store.assignments) ? store.assignments : [];
  const maxData = store?.oneA?.max || [];

  const basicTbody = document.getElementById('basic-tbody');
  const maxminHead = document.getElementById('maxmin-head');
  const maxminBody = document.getElementById('maxmin-body');
  const exportBtn = document.getElementById('export-config');
  const exportImageBtn = document.getElementById('export-image');
  const maxminTable = maxminBody.closest('table');

  function td(text) {
    return createEl('td', null, text);
  }

  function th(text) {
    return createEl('th', null, text);
  }

  function rowTotal(row) {
    let total = 0;
    for (let p = 0; p < numPeriods; p++) total += row.values?.[p] || 0;
    return total;
  }

  /** 3학년 1학기: 병원 칸을 부서 수만큼 합치고 총인원·중복허용을 함께 적는다 */
  function hospitalCell(group) {
    const rows = group.indexes.map((i) => maxData[i]);
    const total = rows.reduce((sum, row) => sum + rowTotal(row), 0);
    const meta = [`총인원 ${total}`, rows.some((row) => row.allowDuplicate) ? '중복허용' : '']
      .filter(Boolean)
      .join(' · ');
    const cell = td(group.hospital);
    cell.rowSpan = rows.length;
    cell.appendChild(createEl('span', 'hospital-cell-meta', meta));
    return cell;
  }

  /** 3학년 1학기: 과목 칸도 병원의 부서 수만큼 합친다 */
  function subjectCell(group) {
    const cell = td(maxData[group.indexes[0]].subject || '');
    cell.rowSpan = group.indexes.length;
    return cell;
  }

  // 3학년 1학기는 병원별로 묶어 첫 부서 행에만 병원 칸을 둔다
  const orderedRows = ctx.isGrade3S1
    ? groupByHospital(maxData).flatMap((group) =>
      group.indexes.map((index, pos) => ({ maxRow: maxData[index], group: pos === 0 ? group : null })))
    : maxData.map((maxRow) => ({ maxRow, group: null }));

  const inputMethod = getInputMethod();
  const methodCrumb = document.getElementById('input-method-crumb');
  const prevLink = document.getElementById('summary-prev');
  methodCrumb.href = inputMethod.page;
  methodCrumb.textContent = inputMethod.label;
  prevLink.href = inputMethod.page;

  [
    ['A반 학생 수', String(numA)],
    ['B반 학생 수', String(numB)],
    ['기간 수', String(numPeriods)]
  ].forEach(([label, value]) => {
    const tr = document.createElement('tr');
    tr.appendChild(td(label));
    tr.appendChild(td(value));
    basicTbody.appendChild(tr);
  });

  const periodToAssign = new Map();
  assignments.forEach((a) => {
    if (a && a.period != null) periodToAssign.set(Number(a.period), a);
  });

  // 과목 안의 분야(예: 아동·모성)가 있으면 분야 열을 함께 보여 준다
  const showBranch = !ctx.isGrade3S1 && maxData.some((row) => row.branch);
  const subjectHeaders = showBranch ? ['과목', '분야', '병원', '부서'] : ['과목', '병원', '부서'];
  // 3학년 1학기: 과목명이 있는 자료면 병원 왼쪽에 과목 열을 둔다
  const showSubject31 = ctx.isGrade3S1 && maxData.some((row) => row.subject);
  const grade31Headers = [...(showSubject31 ? ['과목'] : []), '병원', '부서', '내과/외과'];
  const infoHeaders = ctx.isGrade3S1 ? grade31Headers : subjectHeaders;
  const infoCols = infoHeaders.length;

  const topAssignRow = document.createElement('tr');
  for (let i = 0; i < infoCols + 1; i++) topAssignRow.appendChild(th(''));
  for (let i = 1; i <= numPeriods; i++) {
    const assign = periodToAssign.get(i) || {};
    const cls = assign.class || '';
    const sem = formatAssignmentSemester(assign.semester, ctx);
    const text = cls && sem ? `${cls} (${sem})` : (cls || sem || '');
    topAssignRow.appendChild(th(text));
  }
  maxminHead.appendChild(topAssignRow);

  const headRow = document.createElement('tr');
  infoHeaders.forEach((label) => headRow.appendChild(th(label)));
  headRow.appendChild(th('총계'));
  for (let i = 1; i <= numPeriods; i++) headRow.appendChild(th(`기간 ${i}`));
  maxminHead.appendChild(headRow);

  const periodTotalsMax = Array(numPeriods).fill(0);

  orderedRows.forEach(({ maxRow, group }) => {
    const tr = document.createElement('tr');

    if (ctx.isGrade3S1) {
      if (group && showSubject31) tr.appendChild(subjectCell(group));
      if (group) tr.appendChild(hospitalCell(group));
      tr.appendChild(td(maxRow.department || ''));
      tr.appendChild(td(deptTypeLabel(maxRow.deptType)));
    } else {
      tr.appendChild(td(maxRow.subject || ''));
      if (showBranch) tr.appendChild(td(maxRow.branch || ''));
      tr.appendChild(td(maxRow.hospital || ''));
      tr.appendChild(td(maxRow.department || ''));
    }

    tr.appendChild(td(String(rowTotal(maxRow))));

    for (let p = 0; p < numPeriods; p++) {
      const maxVal = maxRow.values?.[p];
      tr.appendChild(td(maxVal != null ? String(maxVal) : ''));
      if (maxVal != null) periodTotalsMax[p] += maxVal;
    }

    maxminBody.appendChild(tr);
  });

  const totalRow = document.createElement('tr');
  totalRow.className = 'table-total';
  totalRow.appendChild(td('합계'));
  for (let i = 1; i < infoCols; i++) totalRow.appendChild(td(''));

  const grandTotalMax = periodTotalsMax.reduce((a, b) => a + b, 0);
  totalRow.appendChild(td(String(grandTotalMax)));

  for (let p = 0; p < numPeriods; p++) {
    totalRow.appendChild(td(String(periodTotalsMax[p])));
  }
  maxminBody.appendChild(totalRow);

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      downloadJSON('web_config.json', buildWebConfig());
    });
  }

  async function downloadTableAsImage() {
    const html2canvasFn = window.html2canvas;
    if (!html2canvasFn) {
      alert('이미지 저장 기능을 사용할 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }
    if (!maxminTable) {
      alert('테이블을 찾을 수 없습니다.');
      return;
    }

    const panel = maxminTable.closest('.panel');
    const tableWrap = maxminTable.closest('.table-wrap');

    try {
      exportImageBtn.disabled = true;
      exportImageBtn.textContent = '생성 중...';

      panel.style.setProperty('overflow', 'visible', 'important');
      panel.style.setProperty('height', 'auto', 'important');
      panel.style.setProperty('max-height', 'none', 'important');

      if (tableWrap) {
        tableWrap.style.setProperty('overflow', 'visible', 'important');
        tableWrap.style.setProperty('max-height', 'none', 'important');
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvasFn(panel, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: panel.scrollWidth,
        height: panel.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      panel.style.removeProperty('overflow');
      panel.style.removeProperty('height');
      panel.style.removeProperty('max-height');
      if (tableWrap) {
        tableWrap.style.removeProperty('overflow');
        tableWrap.style.removeProperty('max-height');
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `최대인원표_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('이미지 저장 오류:', error);
      alert(`이미지 저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      exportImageBtn.disabled = false;
      exportImageBtn.textContent = '최대 인원 표 이미지 저장';
    }
  }

  if (exportImageBtn) {
    exportImageBtn.addEventListener('click', downloadTableAsImage);
  }
})();
