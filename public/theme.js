(function () {
  var choice = 'auto';
  try {
    choice = localStorage.getItem('serein:theme') || 'auto';
  } catch (error) {
    choice = 'auto';
  }
  var dark =
    choice === 'dark' ||
    (choice === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeChoice = choice;
})();
