(() => {
  const forms = document.querySelectorAll('.sanaka-obolos__filter');
  const reset = () => {
    forms.forEach((form) => {
      form.removeAttribute('aria-busy');
      form.querySelector('[role="status"]').textContent = '';
    });
  };
  forms.forEach((form) => {
    form.addEventListener('submit', () => {
      form.setAttribute('aria-busy', 'true');
      form.querySelector('[role="status"]').textContent = 'Consultando os óbolos…';
    });
  });
  window.addEventListener('pageshow', reset);
})();
