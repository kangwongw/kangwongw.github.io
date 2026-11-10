(function () {
  if (BatchCommon.redirectIfNoSemester()) return;

  document.querySelectorAll('.semester-card[data-href]').forEach((card) => {
    card.addEventListener('click', () => {
      window.location.href = card.getAttribute('data-href');
    });
  });
})();
