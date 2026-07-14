document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('advisor') !== '1') return;
  const form = document.querySelector('#lead-form');
  const message = form?.querySelector('[name="message"]');
  const summary = localStorage.getItem('adelieAdvisorConsultationSummary');
  if (!form || !message || !summary) return;
  message.value = `Project Advisor summary:\n\n${summary}\n\nAdditional details:\n`;
  const projectLine = summary.match(/^Project: (.+?) in (.+)$/m);
  const city = form.querySelector('[name="city"]');
  const project = form.querySelector('[name="project"]');
  if (projectLine && city) city.value = projectLine[2];
  if (projectLine && project) {
    const wanted = projectLine[1].replace('Home addition', 'Addition').replace('Outdoor living', 'Outdoor living / pool');
    const option = [...project.options].find(item => item.text.toLowerCase() === wanted.toLowerCase());
    if (option) project.value = option.value || option.text;
  }
  form.scrollIntoView({behavior: 'smooth', block: 'start'});
});
