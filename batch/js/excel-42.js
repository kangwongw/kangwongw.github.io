/** 4학년 2학기 최대 인원 엑셀 (기간 구분: 하계방학/2학기, 분야: 정신·지역) */
const Excel42 = ExcelSubject.create({
  label: '4학년 2학기',
  termContext: { isGrade4S2: true },
  termNames: '하계방학/2학기',
  branchOptions: BatchCommon.branchOptionsFor({ grade: 4, semester: 2 })
});
