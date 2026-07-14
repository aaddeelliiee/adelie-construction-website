document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#project-advisor-form');
  if (!form) return;

  const storageKey = 'adelieProjectAdvisorV1';
  const steps = [...form.querySelectorAll('.advisor-step')];
  const next = document.querySelector('#advisor-next');
  const back = document.querySelector('#advisor-back');
  const print = document.querySelector('#advisor-print');
  const consult = document.querySelector('#advisor-consult');
  const clear = document.querySelector('#advisor-clear');
  const error = document.querySelector('#advisor-error');
  const meter = document.querySelector('#advisor-meter-bar');
  const progress = document.querySelector('#advisor-progress-text');
  const stepTitle = document.querySelector('#advisor-step-title');
  let current = 0;

  const titles = ['Project basics', 'Scope and goals', 'Budget and timing', 'Readiness', 'Your summary'];
  const getData = () => Object.fromEntries(new FormData(form).entries());
  const save = () => localStorage.setItem(storageKey, JSON.stringify(getData()));

  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
      Object.entries(data).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (!field) return;
        if (field.type === 'checkbox') field.checked = value === 'on';
        else field.value = value;
      });
    } catch (_) { localStorage.removeItem(storageKey); }
  };

  const clean = value => value && value.trim ? value.trim() : value || 'Not provided';
  const buildSummary = () => {
    const d = getData();
    const rows = [
      ['Project', `${clean(d.project_type)} in ${clean(d.city)}`],
      ['Property', clean(d.property_type)],
      ['Areas involved', clean(d.scope)],
      ['Primary goal', clean(d.primary_goal)],
      ['Possible structural work', d.structural_changes ? 'Yes' : 'Not identified'],
      ['Working budget', clean(d.budget)],
      ['Desired start', clean(d.timeline)],
      ['Timing concern', clean(d.deadline)],
      ['Plans or drawings', d.plans ? 'Available' : 'Not yet'],
      ['Major selections', d.selections ? 'Started' : 'Not yet'],
      ['Permit review', d.permits ? 'Started' : 'Not yet'],
      ['Living in the home', d.occupied ? 'Expected' : 'No or undecided'],
      ['Biggest concern', clean(d.concern)]
    ];
    document.querySelector('#advisor-summary').innerHTML = `<dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
    const related = d.project_type?.includes('Kitchen') ? ['kitchen-planning-guide.html', 'Kitchen planning guide'] : d.project_type?.includes('Bathroom') ? ['bathroom-planning-guide.html', 'Bathroom planning guide'] : ['academy.html', 'Remodel Academy'];
    document.querySelector('#advisor-links').innerHTML = `<a href="${related[0]}">${related[1]}</a><a href="remodel-budget-planner.html">Budget planner</a><a href="downloads.html">Planning downloads</a>`;
    return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  };

  const show = index => {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, i) => step.hidden = i !== current);
    meter.style.width = `${((current + 1) / steps.length) * 100}%`;
    progress.textContent = `Step ${current + 1} of ${steps.length}`;
    stepTitle.textContent = titles[current];
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    print.hidden = consult.hidden = current !== steps.length - 1;
    error.textContent = '';
    if (current === steps.length - 1) buildSummary();
    document.querySelector('#advisor').scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  next.addEventListener('click', () => {
    const required = [...steps[current].querySelectorAll('[required]')];
    const invalid = required.find(field => !field.value.trim());
    if (invalid) {
      error.textContent = 'Please answer the required questions before continuing.';
      invalid.focus();
      return;
    }
    save();
    show(current + 1);
  });
  back.addEventListener('click', () => show(current - 1));
  form.addEventListener('input', save);
  print.addEventListener('click', () => window.print());
  consult.addEventListener('click', () => {
    localStorage.setItem('adelieAdvisorConsultationSummary', buildSummary());
    window.location.href = 'contact.html?advisor=1#lead-form';
  });
  clear.addEventListener('click', () => {
    if (!window.confirm('Clear all saved Project Advisor answers?')) return;
    localStorage.removeItem(storageKey);
    form.reset();
    show(0);
  });

  load();
  show(0);
});
