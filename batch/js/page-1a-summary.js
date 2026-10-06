(function () {
  const { readConfig, getContext, downloadJSON, createEl, formatAssignmentSemester } = BatchCommon;
  const { deptTypeLabel } = Page1AShared;

  const store = readConfig();
  const ctx = getContext();
  const numA = store.numA || 0;
  const numB = store.numB || 0;
  const numPeriods = Number(store.numPeriods || store?.oneA?.numPeriods || 0);
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

  const infoCols = ctx.isGrade3S1 ? 3 : (ctx.usesSubjectMode ? 3 : 2);

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
  if (ctx.isGrade3S1) {
    ['병원', '부서', '내과/외과'].forEach((label) => headRow.appendChild(th(label)));
  } else if (ctx.usesSubjectMode) {
    ['과목', '병원', '부서'].forEach((label) => headRow.appendChild(th(label)));
  } else {
    ['과목', '병원'].forEach((label) => headRow.appendChild(th(label)));
  }
  headRow.appendChild(th('총계'));
  for (let i = 1; i <= numPeriods; i++) headRow.appendChild(th(`기간 ${i}`));
  maxminHead.appendChild(headRow);

  const periodTotalsMax = Array(numPeriods).fill(0);

  maxData.forEach((maxRow) => {
    const tr = document.createElement('tr');

    if (ctx.isGrade3S1) {
      tr.appendChild(td(maxRow.hospital || ''));
      tr.appendChild(td(maxRow.department || ''));
      tr.appendChild(td(deptTypeLabel(maxRow.deptType)));
    } else if (ctx.usesSubjectMode) {
      tr.appendChild(td(maxRow.subject || ''));
      tr.appendChild(td(maxRow.hospital || ''));
      tr.appendChild(td(maxRow.department || ''));
    } else {
      tr.appendChild(td(maxRow.subject || ''));
      tr.appendChild(td(maxRow.hospital || ''));
    }

    let rowTotalMax = 0;
    for (let p = 0; p < numPeriods; p++) {
      rowTotalMax += maxRow.values?.[p] || 0;
    }
    tr.appendChild(td(String(rowTotalMax)));

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
      downloadJSON('web_config.json', {
        numA: Number(numA || 0),
        numB: Number(numB || 0),
        numPeriods: Number(numPeriods || 0),
        assignments,
        oneA: { max: maxData },
        selectedSemester: ctx.info || null
      });
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
