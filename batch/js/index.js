(function () {
  function selectSemester(grade, semester) {
    try {
      localStorage.setItem(
        BatchCommon.KEYS.semester,
        JSON.stringify({ grade, semester, label: `${grade}학년 ${semester}학기` })
      );
      localStorage.removeItem(BatchCommon.KEYS.config);
      localStorage.removeItem(BatchCommon.KEYS.inputMethod);
    } catch (e) {
      console.error('localStorage 저장 실패:', e);
    }
  }

  document.querySelectorAll('.semester-card').forEach((card) => {
    // 카드 위 마우스 위치를 CSS에 알려 주어, 빛이 마우스를 따라오게 한다
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });

    card.addEventListener('click', () => {
      const grade = parseInt(card.getAttribute('data-grade'), 10);
      const semester = parseInt(card.getAttribute('data-semester'), 10);

      selectSemester(grade, semester);
      window.location.href = 'config.html';
    });
  });
})();
