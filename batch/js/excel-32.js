/** 3학년 2학기 최대 인원 엑셀 (기간 구분: 하계방학/2학기, 분야: 산부인과/분만실·소아과/신생아실) */
const Excel32 = ExcelSubject.create({
  label: '3학년 2학기',
  termContext: { isGrade3S2: true },
  termNames: '하계방학/2학기',
  branchOptions: BatchCommon.branchOptionsFor({ grade: 3, semester: 2 })
});
