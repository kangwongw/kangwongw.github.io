/** 4학년 1학기 최대 인원 엑셀 (기간 구분: 동계방학/1학기, 분야: 아동·모성) */
const Excel41 = ExcelSubject.create({
  label: '4학년 1학기',
  termContext: { isGrade4S1: true },
  termNames: '동계방학/1학기',
  branchOptions: BatchCommon.branchOptionsFor({ grade: 4, semester: 1 })
});
