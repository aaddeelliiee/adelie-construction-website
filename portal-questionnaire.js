const client = supabase.createClient(window.ADELIE_PORTAL_CONFIG.supabaseUrl, window.ADELIE_PORTAL_CONFIG.supabaseAnonKey);
const form = document.getElementById('questionnaire-form');
const statusLine = document.getElementById('questionnaire-status');
const sections = [
  ['Design style',
    ['overall-style', 'Overall style', 'Modern|Contemporary|Transitional|Traditional|Farmhouse|Industrial|Scandinavian|Mid-century|Coastal|Craftsman|Mediterranean|Other'],
    ['finish-level', 'Desired finish level', 'Builder grade|Mid grade|Premium|Luxury'],
    ['budget', 'Finish budget', 'Economy|Standard|High-end|No specific budget']],
  ['Walls, ceilings and paint',
    ['drywall', 'Drywall finish', 'Level 4|Level 5 smooth'],
    ['wall-texture', 'Wall texture', 'Smooth|Orange peel|Knockdown|Santa Fe|Skip trowel|Match existing|Other'],
    ['ceiling-finish', 'Ceiling texture, height and details'],
    ['corner-beads', 'Corner beads', 'Square|Bullnose'],
    ['wall-paint', 'Wall paint brand, color and sheen'],
    ['ceiling-paint', 'Ceiling paint color and sheen'],
    ['trim-paint', 'Trim and door paint color and sheen']],
  ['Flooring and tile',
    ['flooring-type', 'Flooring type', 'Luxury vinyl plank|Engineered hardwood|Solid hardwood|Laminate|Tile|Carpet|Other'],
    ['flooring-details', 'Flooring pattern, plank width, color and transitions'],
    ['tile-material', 'Tile material', 'Porcelain|Ceramic|Marble|Travertine|Slate|Other'],
    ['tile-details', 'Tile size, finish, layout and grout preferences']],
  ['Shower, vanity and plumbing',
    ['waterproofing', 'Shower waterproofing', 'Liquid membrane|Sheet membrane|Contractor recommendation'],
    ['shower-details', 'Drain, curb, bench, niches, glass and shower head preferences'],
    ['vanity-style', 'Vanity style', 'Floating|Freestanding'],
    ['sink-details', 'Sink count, sink style and faucet configuration'],
    ['faucet-finish', 'Faucet finish', 'Chrome|Brushed nickel|Matte black|Satin brass|Oil-rubbed bronze|Other'],
    ['toilet-tub', 'Toilet, seat and tub preferences']],
  ['Interior doors and trim',
    ['door-style', 'Interior door style', 'Flush|Shaker|Two panel|Five panel|Glass panel|Other'],
    ['door-details', 'Door material and height'],
    ['trim-details', 'Baseboard height and style, casing and crown molding']],
  ['Lighting, electrical and ventilation',
    ['lighting', 'General, bathroom and closet lighting and dimmers'],
    ['electrical', 'Outlet and switch styles, colors and electrical upgrades'],
    ['ventilation', 'Bathroom fan and accessory preferences']],
  ['Kitchen, if applicable',
    ['cabinet-style', 'Cabinet style', 'Shaker|Slab|Raised panel|Inset|Other'],
    ['cabinet-material', 'Cabinet finish', 'Painted|Stained|Wood veneer|Thermofoil|Other'],
    ['countertop', 'Countertop', 'Quartz|Granite|Marble|Butcher block|Other'],
    ['kitchen-details', 'Backsplash, appliances, sink, faucet, hardware and island']],
  ['Exterior, if applicable',
    ['exterior', 'Siding, roofing, doors and exterior lighting'],
    ['exterior-paint', 'Exterior paint brand, colors and hardware finish']],
  ['Accessibility and special requests',
    ['accessibility', 'Accessibility options you need'],
    ['notes', 'Other requests, inspiration links or finish preferences']]
];

function renderFields(answers) {
  const fields = document.getElementById('questionnaire-fields');
  for (const [heading, ...questions] of sections) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = heading;
    fieldset.append(legend);
    for (const [name, title, choices] of questions) {
      const label = document.createElement('label');
      label.textContent = title;
      const field = document.createElement(choices ? 'select' : 'textarea');
      field.name = name;
      if (choices) {
        field.add(new Option('Select an option', ''));
        for (const choice of [...choices.split('|'), 'Undecided']) field.add(new Option(choice, choice));
      } else {
        field.maxLength = 1200;
        field.rows = 2;
      }
      field.value = answers[name] || '';
      label.append(field);
      fieldset.append(label);
    }
    fields.append(fieldset);
  }
}

async function init() {
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    location.replace('portal-login.html');
    return;
  }
  const project = new URLSearchParams(location.search).get('project');
  let query = client.from('finish_questionnaires')
    .select('project_id,answers,submitted_at').eq('user_id', session.user.id);
  if (project) query = query.eq('project_id', project);
  const { data, error } = await query.order('submitted_at', { ascending: false, nullsFirst: true }).limit(1).maybeSingle();
  if (error || !data) {
    statusLine.textContent = 'We couldn’t open a questionnaire for this account. Contact ADELIE for help.';
    return;
  }
  const { data: details } = await client.from('projects').select('name,address').eq('id', data.project_id).maybeSingle();
  document.getElementById('questionnaire-project').textContent = details ? [details.name, details.address].filter(Boolean).join(' · ') : '';
  renderFields(data.answers);
  form.classList.remove('hidden');
  const buttons = [...form.querySelectorAll('button')];
  function showSubmitted() {
    statusLine.textContent = 'Your selections were sent to ADELIE. You can review them below.';
    for (const field of form.querySelectorAll('fieldset')) field.disabled = true;
    document.querySelector('.questionnaire-actions').hidden = true;
    buttons.forEach(button => { button.hidden = true; });
  }
  if (data.submitted_at) {
    showSubmitted();
    return;
  }
  statusLine.textContent = 'Choose the finishes you have in mind. You can skip sections that don’t apply and save a draft to finish later.';
  async function save(submit) {
    const answers = Object.fromEntries([...new FormData(form)].filter(([, value]) => value.trim()));
    if (submit && !answers['overall-style']) {
      statusLine.textContent = 'Choose an overall style or select Undecided before submitting.';
      form.elements.namedItem('overall-style').focus();
      return;
    }
    buttons.forEach(button => { button.disabled = true; });
    try {
      const { error: saveError } = await client.rpc('save_finish_questionnaire', {
        target_project: data.project_id, new_answers: answers, submit_answers: submit
      });
      if (saveError) throw saveError;
      if (submit) showSubmitted();
      else statusLine.textContent = 'Draft saved. Sign in again any time to continue.';
    } catch {
      statusLine.textContent = 'Your selections could not be saved. Please try again.';
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    save(true);
  });
  document.getElementById('save-draft').addEventListener('click', () => save(false));
}

init().catch(() => { statusLine.textContent = 'Could not load your questionnaire. Please try again.'; });
