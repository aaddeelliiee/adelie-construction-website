document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('#academy-search');
  const clear = document.querySelector('#academy-clear');
  const output = document.querySelector('#academy-results');
  const noResults = document.querySelector('#academy-no-results');
  const items = [...document.querySelectorAll('.academy-article-list li')];
  const sections = [...document.querySelectorAll('.academy-category')];

  if (!input || !output) return;

  function run() {
    const query = input.value.trim().toLowerCase();
    let shown = 0;

    items.forEach((item) => {
      const matches = !query || item.textContent.toLowerCase().includes(query);
      item.hidden = !matches;
      if (matches) shown += 1;
    });

    sections.forEach((section) => {
      section.hidden = !section.querySelector('.academy-article-list li:not([hidden])');
    });

    output.textContent = query
      ? `Showing ${shown} matching article${shown === 1 ? '' : 's'}.`
      : `Showing all ${items.length} articles.`;

    if (noResults) noResults.hidden = !query || shown > 0;
    if (clear) clear.disabled = !query;
  }

  input.addEventListener('input', run);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      run();
    }
  });

  clear?.addEventListener('click', () => {
    input.value = '';
    run();
    input.focus();
  });

  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) input.value = initialQuery;
  run();
});
