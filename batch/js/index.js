(function () {
  function selectSemester(grade, semester) {
    try {
      localStorage.setItem(
        BatchCommon.KEYS.semester,
        JSON.stringify({ grade, semester, label: `${grade}학년 ${semester}학기` })
      );
      localStorage.removeItem(BatchCommon.KEYS.config);
      localStorage.removeItem(BatchCommon.KEYS.oneASemester);
    } catch (e) {
      console.error('localStorage 저장 실패:', e);
    }
  }

  document.querySelectorAll('.semester-card').forEach((card) => {
    card.addEventListener('click', () => {
      const grade = parseInt(card.getAttribute('data-grade'), 10);
      const semester = parseInt(card.getAttribute('data-semester'), 10);

      selectSemester(grade, semester);
      window.location.href = 'config.html';
    });
  });
})();
