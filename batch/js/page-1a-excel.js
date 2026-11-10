(function () {
  if (BatchCommon.redirectIfNoSemester()) return;

  const {
    INPUT_METHOD,
    readConfig,
    writeConfig,
    getContext,
    getSelectedSemester,
    setInputMethod,
    downloadBlob,
    createEl
  } = BatchCommon;

  const MAX_SHOWN_ERRORS = 20;
  const SUMMARY_PAGE = 'page-1a-summary.html';

  const ctx = getContext();
  const cfg = readConfig();
  const numPeriods = Number(cfg.numPeriods || 0);
  // 학기별 엑셀 모듈: 3학년 1학기는 병원·부서, 다른 학기는 과목·분야·병원·부서
  const EXCEL_BY_SEMESTER = [
    [ctx.isGrade3S1, Excel31],
    [ctx.isGrade3S2, Excel32],
    [ctx.isGrade4S1, Excel41],
    [ctx.isGrade4S2, Excel42]
  ];
  const excel = EXCEL_BY_SEMESTER.find(([matches]) => matches)?.[1] || null;

  const downloadBtn = document.getElementById('download-template');
  const fileInput = document.getElementById('excel-file');
  const uploadZone = document.getElementById('excel-upload-zone');
  const uploadName = document.getElementById('excel-upload-name');
  const messageEl = document.getElementById('excel-message');
  const errorList = document.getElementById('excel-errors');

  document.getElementById('selected-semester-info').textContent = `선택된 학기: ${getSelectedSemester().label}`;

  function setMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.classList.toggle('input-error-text', !!isError);
  }

  function showErrors(errors) {
    setMessage(`업로드한 파일에서 고칠 곳이 ${errors.length}개 있습니다. 고친 뒤 다시 올려 주세요.`, true);
    errorList.innerHTML = '';
    errors.slice(0, MAX_SHOWN_ERRORS).forEach((text) => errorList.appendChild(createEl('li', null, text)));
    if (errors.length > MAX_SHOWN_ERRORS) {
      errorList.appendChild(createEl('li', null, `외 ${errors.length - MAX_SHOWN_ERRORS}개`));
    }
    errorList.classList.remove('hidden');
  }

  function saveAndGoToSummary(rows) {
    const store = readConfig();
    store.oneA = store.oneA || {};
    store.oneA.max = rows;
    writeConfig(store);
    setInputMethod(INPUT_METHOD.EXCEL);
    window.location.href = SUMMARY_PAGE;
  }

  async function handleUpload(file) {
    uploadName.textContent = file.name;
    errorList.classList.add('hidden');
    try {
      const sheet = await XlsxLiteRead.readSheet(await file.arrayBuffer(), excel.SHEET_NAME);
      const { rows, errors } = excel.parse(sheet, numPeriods);
      if (errors.length) {
        showErrors(errors);
        return;
      }
      saveAndGoToSummary(rows);
    } catch (error) {
      showErrors([`파일을 읽지 못했습니다: ${error.message}`]);
    } finally {
      fileInput.value = '';
    }
  }

  function enableExcelInput() {
    downloadBtn.disabled = false;
    fileInput.disabled = false;
    uploadZone.classList.remove('is-disabled');
    setMessage('템플릿을 내려받아 작성한 뒤 업로드하세요. 내용에 문제가 없으면 요약 화면으로 넘어갑니다.', false);
    downloadBtn.addEventListener('click', () => {
      downloadBlob(excel.FILE_NAME, XlsxLite.write(excel.buildTemplate(cfg)));
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.[0]) handleUpload(fileInput.files[0]);
    });
  }

  if (!excel) {
    setMessage("학기를 알 수 없어 엑셀 입력을 쓸 수 없습니다. 학기 선택부터 다시 해 주세요.", false);
  } else if (!numPeriods) {
    setMessage('배치 입력에서 기간 수를 먼저 설정해 주세요.', true);
  } else {
    enableExcelInput();
  }
})();
