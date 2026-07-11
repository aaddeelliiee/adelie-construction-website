
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.main-nav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
document.querySelectorAll('.reveal').forEach(el=>new IntersectionObserver(([entry],obs)=>{if(entry.isIntersecting){entry.target.classList.add('visible');obs.unobserve(entry.target)}},{threshold:.12}).observe(el));
document.querySelectorAll('#year').forEach(el=>el.textContent=new Date().getFullYear());

document.querySelectorAll('.resources-v5 .dropdown-menu').forEach(menu=>{
  if(!menu.querySelector('a[href="interactive-project-planner.html"]')){
    const a=document.createElement('a');a.href='interactive-project-planner.html';a.textContent='Interactive Project Planner';menu.appendChild(a);
  }
});


const adelieEnhancementStyles=document.createElement('link');
adelieEnhancementStyles.rel='stylesheet';
adelieEnhancementStyles.href='adelie-enhancements.css';
document.head.appendChild(adelieEnhancementStyles);

document.querySelectorAll('.resources-v5 .dropdown-menu').forEach(menu=>{
  if(!menu.querySelector('a[href="downloads.html"]')){
    const link=document.createElement('a'); link.href='downloads.html'; link.textContent='Free PDF Downloads'; menu.appendChild(link);
  }
});
if((location.pathname.endsWith('/resources.html')||location.pathname.endsWith('resources.html'))&&!document.querySelector('.downloads-promo-strip')){
  const main=document.querySelector('#main-content');
  const promo=document.createElement('section'); promo.className='downloads-promo-strip';
  promo.innerHTML='<div class="container"><div><strong>New: ADELIE Homeowner Toolkit</strong><span>Download planning workbooks, budget worksheets, comparison scorecards and construction checklists.</span></div><a class="button primary" href="downloads.html">Open Free Downloads</a></div>';
  main?.insertBefore(promo,main.children[1]||null);
}


const assistant=document.querySelector('#adelie-assistant');
if(assistant){
  const toggleButton=assistant.querySelector('.assistant-toggle');
  const panel=assistant.querySelector('.assistant-panel');
  const closeButton=assistant.querySelector('.assistant-close');
  const messages=assistant.querySelector('.assistant-messages');
  const leadForm=assistant.querySelector('.assistant-lead');
  const projectType=leadForm?.querySelector('[name="project_type"]');
  const details=leadForm?.querySelector('[name="project_details"]');
  const transcriptInput=document.createElement('input');
  transcriptInput.type='hidden';
  transcriptInput.name='assistant_transcript';
  leadForm?.appendChild(transcriptInput);

  const guides={
    budget:{label:'Remodel Budget Planner',href:'remodel-budget-planner.html'},
    kitchen:{label:'Kitchen Planning Guide',href:'kitchen-planning-guide.html'},
    bathroom:{label:'Bathroom Planning Guide',href:'bathroom-planning-guide.html'},
    contractor:{label:'Choosing a Contractor',href:'choosing-a-contractor-guide.html'},
    permits:{label:'San Diego Permit Planning Guide',href:'san-diego-remodel-permit-guide.html'},
    timeline:{label:'Remodel Timeline Guide',href:'remodel-timeline-guide.html'},
    downloads:{label:'Free Planning Downloads',href:'downloads.html'},
    estimates:{label:'Compare Contractor Estimates',href:'contractor-estimate-comparison-guide.html'},
    changes:{label:'Change Orders Explained',href:'change-orders-guide.html'},
    materials:{label:'Material Selection Guide',href:'material-selection-guide.html'},
    financing:{label:'Financing Information',href:'financing.html'},
    contact:{label:'Request a Consultation',href:'contact.html'},
    services:{label:'All Remodeling Services',href:'services.html'},
    planner:{label:'Interactive Project Planner',href:'interactive-project-planner.html'}
  };

  const knowledge=[
    {keys:['kitchen','cabinet','countertop','island','appliance'],type:'Kitchen remodel',text:'Kitchen planning should begin with layout, appliance specifications, storage and lighting before finish selections. ADELIE can coordinate demolition, cabinetry, countertops, plumbing, electrical, flooring and final finishes.',links:['kitchen','budget','downloads']},
    {keys:['bathroom','shower','tub','vanity','waterproof'],type:'Bathroom remodel',text:'Bathroom remodels depend heavily on waterproofing, ventilation, plumbing locations, tile details and fixture lead times. Confirm those items early so finish choices do not create avoidable delays.',links:['bathroom','budget','downloads']},
    {keys:['adu','accessory dwelling','granny flat'],type:'ADU',text:'ADU planning usually requires early review of site constraints, utilities, access, zoning, design, engineering and permits. A site-specific feasibility review is the best first step.',links:['permits','budget','timeline']},
    {keys:['addition','add room','square footage','expand'],type:'Home addition',text:'Home additions typically involve design, structural engineering, foundation work, utility coordination and permits. Existing conditions and how the addition connects to the home strongly affect scope and schedule.',links:['permits','timeline','budget']},
    {keys:['whole home','whole-home','entire house','full remodel'],type:'Whole-home remodel',text:'Whole-home remodels benefit from a master scope, room-by-room decision schedule and clear phasing plan. Early coordination reduces rework between structural, plumbing, electrical, HVAC and finish trades.',links:['budget','timeline','downloads']},
    {keys:['permit','inspection','code','city approval'],text:'Permit requirements depend on the exact scope and local jurisdiction. Structural work, additions and many plumbing, electrical or mechanical changes commonly require permits. Verify requirements with the applicable building department before work begins.',links:['permits','timeline']},
    {keys:['cost','price','budget','how much','estimate'],text:'A reliable budget begins with a defined scope, realistic finish allowances, permit and design costs, and a contingency for concealed conditions. Online ranges are only planning references; a site review is needed for a project-specific proposal.',links:['budget','estimates','downloads']},
    {keys:['timeline','how long','duration','schedule','start'],text:'Project duration depends on design decisions, permits, material lead times, inspections, site conditions and change orders. Finalizing selections before construction and documenting decisions promptly are two of the best ways to protect the schedule.',links:['timeline','materials']},
    {keys:['contractor','license','insured','bid','proposal','quote'],text:'Compare contractors by scope completeness, exclusions, allowances, supervision, schedule, communication and change-order procedures - not price alone. Verify licensing and insurance independently.',links:['contractor','estimates','changes']},
    {keys:['change order','extra work','unexpected','concealed'],text:'A change order should describe the reason for the change, added or removed scope, price impact and schedule impact before the work proceeds whenever practical.',links:['changes','budget']},
    {keys:['material','selection','tile','flooring','quartz','granite'],text:'Material decisions should be tracked by approval deadline, lead time and construction dependency. Products that affect rough plumbing, electrical, cabinetry or framing need to be selected first.',links:['materials','downloads']},
    {keys:['service area','serve','location','city','where'],text:'ADELIE serves homeowners throughout San Diego County, with project availability based on scope, access and scheduling. Share the project city in the form so the team can confirm availability.',links:[]},
    {keys:['financing','loan','payment','finance'],text:'Financing options and approval terms vary by lender. Review total cost, interest, fees and repayment terms carefully, and avoid finalizing financing until the project scope is sufficiently defined.',links:['financing','budget']},
    {keys:['license','licensed','bonded','insured','insurance'],text:'Before hiring any contractor, verify the active license status and confirm the insurance documents that apply to your project. ADELIE can provide current business and project documentation during the consultation process.',links:['contractor','contact']},
    {keys:['download','worksheet','checklist','workbook','pdf','form'],text:'The ADELIE Homeowner Toolkit includes free branded workbooks for planning, budgeting, comparing bids, tracking selections, preparing your home and completing a final walkthrough.',links:['downloads','planner']},
    {keys:['call','phone','contact','talk','consultation','appointment'],text:'You can request a consultation through the project form or call ADELIE at 1-877-ADELIEC. Include the project city, project type, goals, approximate timing and any plans or photos already available.',links:['contact']},
    {keys:['service','services','what do you do','scope'],text:'ADELIE coordinates kitchen, bathroom and whole-home remodeling, ADUs, additions, cabinets, flooring, tile, painting, plumbing, electrical and outdoor living work. The exact scope is defined after a site review and planning conversation.',links:['services','contact']},
    {keys:['hello','hi','hey','good morning','good afternoon'],text:'Hello. I can help you find the right planning guide, explain common remodeling terms, suggest which worksheet to use, or help prepare a consultation request.',links:['downloads','services']},
    {keys:['emergency','leak','flood','sparking','gas smell'],text:'For an active leak, electrical hazard, gas odor or other immediate safety concern, contact the appropriate emergency service or utility first. The ADELIE assistant is for remodeling planning and is not an emergency dispatch service.',links:[]}
  ];

  const transcript=[];
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const contextHint=path.includes('kitchen')?'kitchen':path.includes('bathroom')?'bathroom':path.includes('adu')?'adu':path.includes('addition')?'addition':path.includes('whole-home')?'whole home':'';

  function openPanel(){panel.hidden=false;toggleButton.setAttribute('aria-expanded','true'); setTimeout(()=>assistant.querySelector('.assistant-question-input')?.focus(),80);}
  function closePanel(){panel.hidden=true;toggleButton.setAttribute('aria-expanded','false');}
  toggleButton?.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
  closeButton?.addEventListener('click',closePanel);

  function addMessage(role,text,links=[]){
    const el=document.createElement('div');
    el.className='assistant-message '+role;
    if(role==='user') el.textContent=text;
    else {
      const p=document.createElement('p'); p.textContent=text; el.appendChild(p);
      if(links.length){
        const wrap=document.createElement('div'); wrap.className='assistant-links';
        links.forEach(key=>{const g=guides[key]; if(!g)return; const a=document.createElement('a'); a.href=g.href; a.textContent=g.label+' ->'; wrap.appendChild(a);});
        el.appendChild(wrap);
      }
    }
    messages.appendChild(el); messages.scrollTop=messages.scrollHeight;
    transcript.push((role==='user'?'Visitor: ':'ADELIE: ')+text);
    transcriptInput.value=transcript.slice(-12).join('\n');
  }

  function answerQuestion(raw){
    const question=raw.trim(); if(!question)return;
    addMessage('user',question);
    const q=question.toLowerCase();
    let match=knowledge.find(item=>item.keys.some(k=>q.includes(k)));
    if(!match && contextHint) match=knowledge.find(item=>item.keys.includes(contextHint));
    if(match){
      addMessage('bot',match.text,match.links);
      if(match.type && projectType){
        const option=[...projectType.options].find(o=>o.text.toLowerCase()===match.type.toLowerCase());
        if(option) projectType.value=option.value||option.text;
      }
    }else{
      addMessage('bot','I did not find a precise match, but I can help with budgets, permits, timelines, contractor proposals, materials, downloadable worksheets and consultation preparation. Try including the room, city, project stage or specific concern in your question.',['downloads','budget','contact']);
    }
    if(details && !details.value) details.value='Question asked through ADELIE Assistant: '+question;
  }

  assistant.querySelectorAll('[data-question]').forEach(btn=>btn.addEventListener('click',()=>{
    const map={services:'What services do you provide?',areas:'What areas do you serve?',process:'What is the remodeling process?',estimate:'How should I plan my budget and request an estimate?'};
    answerQuestion(map[btn.dataset.question]||btn.textContent);
  }));

  const composer=document.createElement('form');
  composer.className='assistant-question-form';
  composer.innerHTML='<label class="sr-only" for="adelie-question">Ask a remodeling question</label><input id="adelie-question" class="assistant-question-input" type="text" maxlength="240" placeholder="Ask about cost, permits, timelines..." autocomplete="off"><button type="submit">Ask</button>';
  const quick=assistant.querySelector('.assistant-quick');
  quick?.after(composer);
  composer.addEventListener('submit',e=>{e.preventDefault(); const input=composer.querySelector('input'); answerQuestion(input.value); input.value='';});

  const starter=contextHint?`You are viewing a ${contextHint} page. Ask me about planning, budget, permits, timeline or next steps.`:'Ask a remodeling question, open a planning guide, or send your project details to ADELIE.';
  const first=messages?.querySelector('.assistant-message.bot'); if(first) first.textContent=starter;


  const suggestionSets={
    kitchen:['How should I plan a kitchen budget?','What should be selected first?','Download the kitchen workbook'],
    bathroom:['What affects bathroom cost?','What should I know about waterproofing?','Download the bathroom workbook'],
    adu:['What should I verify before planning an ADU?','What permits may be involved?','How should I plan the budget?'],
    addition:['What affects an addition timeline?','What professionals may be needed?','How should I plan contingency?'],
    'whole home':['How should a whole-home remodel be phased?','Can I live in the home during construction?','Download the complete workbook']
  };
  const suggestions=suggestionSets[contextHint]||['How do I compare contractor bids?','What should a remodel budget include?','Show me the free PDF checklists'];
  const smartSuggestions=document.createElement('div');
  smartSuggestions.className='assistant-smart-suggestions';
  suggestions.forEach(text=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>answerQuestion(text));smartSuggestions.appendChild(b);});
  composer.after(smartSuggestions);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!panel.hidden){closePanel();toggleButton?.focus();}
  });
  panel?.addEventListener('click',event=>event.stopPropagation());
  assistant.addEventListener('click',event=>event.stopPropagation());

  leadForm?.addEventListener('submit',()=>{
    if(details && transcript.length && !details.value.includes('Assistant conversation')) details.value += '\n\nAssistant conversation:\n'+transcript.slice(-8).join('\n');
  });
}


/* ADELIE v6 Project Advisor enhancements */
(()=>{
  const a=document.querySelector('#adelie-assistant'); if(!a||a.dataset.v6==='true')return; a.dataset.v6='true';
  const panel=a.querySelector('.assistant-panel'), messages=a.querySelector('.assistant-messages');
  const form=a.querySelector('.assistant-lead');
  const project=form?.querySelector('[name="project_type"]');
  const progress=document.createElement('div'); progress.className='assistant-progress'; progress.textContent='Project Advisor: ask a question or choose a next step.';
  messages?.before(progress);
  const actions=document.createElement('div'); actions.className='assistant-action-row';
  const options=[['Plan my project','academy.html'],['Choose a workbook','downloads.html'],['Build a budget','remodel-budget-planner.html'],['Request consultation','contact.html']];
  options.forEach(([label,href])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>location.href=href);actions.appendChild(b)});
  messages?.after(actions);
  const classify=q=>q.includes('kitchen')?'Kitchen remodel':q.includes('bath')||q.includes('shower')?'Bathroom remodel':q.includes('adu')?'ADU':q.includes('addition')?'Home addition':q.includes('whole')||q.includes('entire')?'Whole-home remodel':'';
  a.addEventListener('submit',e=>{const input=a.querySelector('.assistant-question-input'); if(!input)return; const type=classify(input.value.toLowerCase()); if(type&&project){const o=[...project.options].find(x=>x.text.toLowerCase()===type.toLowerCase());if(o)project.value=o.value||o.text;} progress.textContent=type?`Project identified: ${type}. Relevant guidance and forms are ready.`:'Project Advisor: add the room, city or project stage for a more specific answer.';},true);
})();


/* ADELIE v6.4 Guided Project Profile with consented early lead capture */
(()=>{
  const assistant=document.querySelector('#adelie-assistant');
  if(!assistant || assistant.dataset.profilePlanner==='true') return;
  assistant.dataset.profilePlanner='true';
  const STORAGE_KEY='adelieProjectProfileV2';
  const CAPTURE_KEY='adelieEarlyLeadCapturedV1';
  const leadForm=assistant.querySelector('.assistant-lead');
  const fields={
    name:leadForm?.querySelector('[name="name"]'),
    email:leadForm?.querySelector('[name="email"]'),
    phone:leadForm?.querySelector('[name="phone"]'),
    address:leadForm?.querySelector('[name="property_address"]'),
    projectType:leadForm?.querySelector('[name="project_type"]'),
    city:leadForm?.querySelector('[name="city"]'),
    budget:leadForm?.querySelector('[name="budget_range"]'),
    timeline:leadForm?.querySelector('[name="timeline"]'),
    details:leadForm?.querySelector('[name="project_details"]')
  };
  if(leadForm && !fields.address){
    const input=document.createElement('input'); input.type='hidden'; input.name='property_address'; leadForm.appendChild(input); fields.address=input;
  }

  const questions=[
    {id:'contact',title:'First, how can ADELIE reach you?',help:'Enter your contact details and project address. With your permission, these details are securely saved as soon as this step is completed so ADELIE can follow up even if you do not finish the planner.',type:'contact',required:true},
    {id:'project_type',title:'What are you planning?',help:'Choose the project that best matches your primary goal.',type:'choice',required:true,options:['Kitchen remodel','Bathroom remodel','Whole-home remodel','ADU','Home addition','Pool or outdoor living','Other']},
    {id:'city',title:'Which city or community is the property in?',help:'This helps ADELIE consider service availability and the applicable permitting jurisdiction.',type:'text',placeholder:'Example: Vista, Carlsbad, San Marcos',required:true},
    {id:'year_built',title:'Approximately when was the home built?',help:'The age of the home can affect utilities, concealed conditions, hazardous-material testing and code upgrades.',type:'choice',options:['Before 1940','1940–1959','1960–1979','1980–1999','2000–2014','2015 or newer','Not sure']},
    {id:'stories',title:'How many stories does the home have?',help:'Stories and access can affect demolition, material handling, plumbing routes and staging.',type:'choice',options:['Single story','Two stories','Three or more','Condo or townhome','Not sure']},
    {id:'foundation',title:'What foundation type does the home have?',help:'Foundation type matters when relocating plumbing, changing structure or building an addition.',type:'choice',options:['Concrete slab','Raised foundation / crawlspace','Basement','Mixed or hillside foundation','Not sure']},
    {id:'occupied',title:'Will the home be occupied during construction?',help:'This helps plan temporary facilities, dust control, utility interruptions, pets and work hours.',type:'choice',options:['Yes, full time','Part of the time','No, the home will be vacant','Not sure yet']},
    {id:'goals',title:'What are your main goals?',help:'Describe what is not working now and what a successful result should accomplish.',type:'textarea',placeholder:'Example: improve layout, add storage, replace aging finishes, create an accessible shower...',required:true},
    {id:'layout_changes',title:'Do you expect layout or structural changes?',help:'Moving walls, doors, windows, plumbing or major appliances usually changes design, engineering and permit needs.',type:'multi',options:['No major layout changes','Move plumbing fixtures','Move walls or door openings','Add or enlarge windows/doors','Structural beam or load-bearing work','Add square footage','Not sure']},
    {id:'budget',title:'What budget range are you considering?',help:'A planning range helps align scope and finish expectations. A site review is still required for pricing.',type:'choice',options:['Under $25,000','$25,000–$75,000','$75,000–$150,000','$150,000–$300,000','$300,000+','Not sure yet']},
    {id:'timeline',title:'When would you like construction to begin?',help:'Design, engineering, permits and material lead times may need to happen before construction can start.',type:'choice',options:['As soon as possible','1–3 months','3–6 months','6–12 months','Planning for later','Not sure']},
    {id:'planning_stage',title:'How far along are you?',help:'Choose everything you already have.',type:'multi',options:['Early ideas only','Measured drawings','Architectural plans','Engineering','Permit application submitted','Material selections started','Contractor proposals','HOA approval required','None of these yet']},
    {id:'priorities',title:'Which priorities matter most?',help:'Pick up to four. These help ADELIE understand how you evaluate tradeoffs.',type:'multi',max:4,options:['Durability','Budget control','Faster completion','Premium finishes','Low maintenance','Energy efficiency','Accessibility / aging in place','More storage','Better layout','Resale value']},
    {id:'constraints',title:'Are there important site or household constraints?',help:'Access, parking, pets and work-from-home needs affect project logistics.',type:'multi',options:['Limited parking or narrow access','HOA or condo rules','Pets in the home','Children in the home','Work from home','Sensitive neighbors / shared walls','Hillside or difficult access','No known constraints']},
    {id:'notes',title:'Anything else ADELIE should know?',help:'Add known damage, leaks, prior work, plans, inspiration links or specific questions.',type:'textarea',placeholder:'Optional project notes'}
  ];

  const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}};
  const save=p=>localStorage.setItem(STORAGE_KEY,JSON.stringify(p));
  let profile=load(); let step=0; let captureTimer;

  const overlay=document.createElement('div');
  overlay.className='project-profile-overlay'; overlay.hidden=true;
  overlay.innerHTML=`<section class="project-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
    <header class="profile-header"><div><span class="v6-badge">ADELIE Project Advisor</span><h2 id="profile-title">Build your project profile</h2><p>Start with your contact information, then answer practical project questions. Progress is saved on this device.</p></div><button class="profile-close" type="button" aria-label="Close project planner">×</button></header>
    <div class="profile-meter"><span></span></div><div class="profile-step-label"></div>
    <div class="profile-body"></div>
    <footer class="profile-footer"><button class="profile-back" type="button">Back</button><button class="profile-save-exit" type="button">Save & close</button><button class="profile-next" type="button">Next</button></footer>
  </section>`;
  document.body.appendChild(overlay);
  const body=overlay.querySelector('.profile-body'), label=overlay.querySelector('.profile-step-label'), meter=overlay.querySelector('.profile-meter span');
  const back=overlay.querySelector('.profile-back'), next=overlay.querySelector('.profile-next');

  function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
  function control(q){
    if(q.type==='contact') return `<div class="profile-contact-grid">
      <label>Full name<input class="profile-input" data-contact="name" autocomplete="name" value="${esc(profile.name)}" placeholder="Full name"></label>
      <label>Phone number<input class="profile-input" data-contact="phone" type="tel" autocomplete="tel" value="${esc(profile.phone)}" placeholder="(760) 555-1234"></label>
      <label class="full">Property address<input class="profile-input" data-contact="property_address" autocomplete="street-address" value="${esc(profile.property_address)}" placeholder="Street address, city and ZIP"></label>
      <label class="full">Email address <span>(recommended)</span><input class="profile-input" data-contact="email" type="email" autocomplete="email" value="${esc(profile.email)}" placeholder="Email address"></label>
      <label class="profile-capture-consent full"><input data-contact="early_contact_consent" type="checkbox" ${profile.early_contact_consent?'checked':''}> I agree that ADELIE Construction may securely save these details and contact me about this remodeling request.</label>
      <p class="profile-privacy-note full">Your information is used only to respond to this request. Completing this step creates a preliminary lead in ADELIE’s Netlify form system; it does not commit you to a project.</p>
      <div class="profile-capture-status full" role="status" aria-live="polite"></div>
    </div>`;
    const value=profile[q.id];
    if(q.type==='text') return `<input class="profile-input" data-profile-input="${q.id}" type="text" value="${esc(value)}" placeholder="${q.placeholder||''}">`;
    if(q.type==='textarea') return `<textarea class="profile-input" data-profile-input="${q.id}" rows="5" placeholder="${q.placeholder||''}">${esc(value)}</textarea>`;
    const values=Array.isArray(value)?value:[value].filter(Boolean);
    const type=q.type==='multi'?'checkbox':'radio';
    return `<div class="profile-options">${q.options.map(o=>`<label class="profile-option"><input data-profile-input="${q.id}" type="${type}" name="profile_${q.id}" value="${esc(o)}" ${values.includes(o)?'checked':''}><span>${o}</span></label>`).join('')}</div>${q.max?`<p class="profile-limit">Choose up to ${q.max}.</p>`:''}`;
  }
  function render(){
    if(step>=questions.length){renderSummary();return}
    const q=questions[step];
    label.textContent=`Step ${step+1} of ${questions.length}`; meter.style.width=`${((step+1)/questions.length)*100}%`;
    body.innerHTML=`<div class="profile-question"><p class="eyebrow dark">Project Profile</p><h3>${q.title}</h3><p>${q.help}</p>${control(q)}<p class="profile-error" hidden>Please complete this step before continuing.</p></div>`;
    back.disabled=step===0; next.textContent=step===questions.length-1?'Review profile':'Next';
    if(q.type==='contact'){
      body.querySelectorAll('[data-contact]').forEach(el=>{
        const event=el.type==='checkbox'?'change':'input';
        el.addEventListener(event,()=>{capture(q);scheduleEarlyCapture()});
      });
      updateCaptureStatus();
    }else{
      body.querySelectorAll('[data-profile-input]').forEach(el=>el.addEventListener('change',()=>capture(q)));
      body.querySelectorAll('input[type=text],textarea').forEach(el=>el.addEventListener('input',()=>capture(q)));
    }
    setTimeout(()=>body.querySelector('input,textarea')?.focus(),50);
  }
  function capture(q){
    if(q.type==='contact'){
      body.querySelectorAll('[data-contact]').forEach(el=>profile[el.dataset.contact]=el.type==='checkbox'?el.checked:el.value.trim());
      save(profile); syncLead(); return;
    }
    const els=[...body.querySelectorAll(`[data-profile-input="${q.id}"]`)];
    if(q.type==='multi'){
      let vals=els.filter(x=>x.checked).map(x=>x.value);
      if(q.max && vals.length>q.max){const changed=document.activeElement;if(changed&&changed.checked){changed.checked=false}vals=els.filter(x=>x.checked).map(x=>x.value)}
      profile[q.id]=vals;
    } else if(q.type==='choice') profile[q.id]=els.find(x=>x.checked)?.value||'';
    else profile[q.id]=els[0]?.value.trim()||'';
    save(profile);
  }
  function contactReady(){return Boolean(profile.name&&profile.phone&&profile.property_address&&profile.early_contact_consent)}
  function valid(q){capture(q); if(q.type==='contact')return contactReady(); const v=profile[q.id]; return !q.required || (Array.isArray(v)?v.length>0:Boolean(v));}
  function updateCaptureStatus(text='',kind=''){
    const el=body.querySelector('.profile-capture-status'); if(!el)return;
    if(text){el.textContent=text;el.dataset.state=kind;return}
    if(localStorage.getItem(CAPTURE_KEY)==='true') {el.textContent='Contact details saved with ADELIE.';el.dataset.state='success'}
    else if(contactReady()){el.textContent='Saving contact details…';el.dataset.state='working'}
    else {el.textContent='Complete the required fields and consent checkbox to save your contact details.';el.dataset.state='idle'}
  }
  function scheduleEarlyCapture(){
    clearTimeout(captureTimer); updateCaptureStatus();
    if(!contactReady() || localStorage.getItem(CAPTURE_KEY)==='true')return;
    captureTimer=setTimeout(sendEarlyLead,900);
  }
  async function sendEarlyLead(){
    if(!contactReady() || localStorage.getItem(CAPTURE_KEY)==='true')return;
    updateCaptureStatus('Saving contact details…','working');
    const data=new URLSearchParams({
      'form-name':'project-profile-start',
      name:profile.name||'', phone:profile.phone||'', email:profile.email||'',
      property_address:profile.property_address||'',
      city:profile.city||'', project_type:profile.project_type||'Not selected yet',
      contact_consent:'yes', lead_stage:'Project Advisor started',
      page_url:location.href, started_at:new Date().toISOString()
    });
    try{
      const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data.toString()});
      if(!response.ok)throw new Error('Submission failed');
      localStorage.setItem(CAPTURE_KEY,'true');
      updateCaptureStatus('Contact details saved with ADELIE. You can continue building the profile.','success');
    }catch(err){
      updateCaptureStatus('We could not save automatically. Your answers remain on this device; please use the final Send to ADELIE button.','error');
    }
  }
  function recommendationData(){
    const type=(profile.project_type||'').toLowerCase(), rec=[];
    if(type.includes('kitchen')) rec.push(['Kitchen Planning Guide','kitchen-planning-guide.html'],['Kitchen Workbook','downloads/kitchen-remodel-planning-workbook-v2.pdf']);
    else if(type.includes('bath')) rec.push(['Bathroom Planning Guide','bathroom-planning-guide.html'],['Bathroom Workbook','downloads/bathroom-remodel-planning-workbook-v2.pdf']);
    else if(type.includes('adu')) rec.push(['ADU Construction Guide','adu-construction.html'],['Permit Planning Guide','san-diego-remodel-permit-guide.html']);
    else if(type.includes('addition')) rec.push(['Home Additions Guide','home-additions.html'],['Permit Planning Guide','san-diego-remodel-permit-guide.html']);
    else if(type.includes('whole')) rec.push(['Whole-Home Remodel Guide','whole-home-remodel-guide.html'],['Homeowner Project Binder','downloads/adelie-homeowner-project-binder.pdf']);
    else rec.push(['Remodeling Academy','academy.html']);
    rec.push(['Budget Planner','remodel-budget-planner.html'],['Compare Contractor Estimates','contractor-estimate-comparison-guide.html']);
    return rec.slice(0,4);
  }
  function summaryText(){
    const lines=['ADELIE PROJECT PROFILE'];
    const labels={name:'Name',phone:'Phone',email:'Email',property_address:'Property address',project_type:'Project',city:'City',year_built:'Home age',stories:'Stories / property type',foundation:'Foundation',occupied:'Occupancy during work',goals:'Goals',layout_changes:'Layout / structural changes',budget:'Budget range',timeline:'Desired start',planning_stage:'Planning completed',priorities:'Top priorities',constraints:'Site / household constraints',notes:'Additional notes'};
    Object.entries(labels).forEach(([k,l])=>{const v=profile[k];if(v&&(Array.isArray(v)?v.length:String(v).trim()))lines.push(`${l}: ${Array.isArray(v)?v.join(', '):v}`)});
    return lines.join('\n');
  }
  function syncLead(){
    if(fields.name&&profile.name)fields.name.value=profile.name;
    if(fields.phone&&profile.phone)fields.phone.value=profile.phone;
    if(fields.email&&profile.email)fields.email.value=profile.email;
    if(fields.address&&profile.property_address)fields.address.value=profile.property_address;
    if(fields.projectType&&profile.project_type){const o=[...fields.projectType.options].find(x=>x.text.trim().toLowerCase()===profile.project_type.toLowerCase());if(o)fields.projectType.value=o.value||o.text}
    if(fields.city&&profile.city)fields.city.value=profile.city;
    if(fields.budget&&profile.budget){const o=[...fields.budget.options].find(x=>x.text.trim().toLowerCase()===profile.budget.toLowerCase());if(o)fields.budget.value=o.value||o.text}
    if(fields.timeline&&profile.timeline){const o=[...fields.timeline.options].find(x=>x.text.trim().toLowerCase()===profile.timeline.toLowerCase());if(o)fields.timeline.value=o.value||o.text}
    if(fields.details) fields.details.value=summaryText();
    let hidden=leadForm?.querySelector('[name="project_profile_json"]');if(!hidden&&leadForm){hidden=document.createElement('input');hidden.type='hidden';hidden.name='project_profile_json';leadForm.appendChild(hidden)}if(hidden)hidden.value=JSON.stringify(profile);
  }
  function renderSummary(){
    syncLead(); label.textContent='Project profile complete';meter.style.width='100%';
    const rec=recommendationData();
    const rows=Object.entries({Name:profile.name,Phone:profile.phone,'Property address':profile.property_address,Project:profile.project_type,Location:profile.city,'Home age':profile.year_built,'Stories / type':profile.stories,Foundation:profile.foundation,'Occupied during work':profile.occupied,Budget:profile.budget,'Desired start':profile.timeline}).filter(([,v])=>v);
    body.innerHTML=`<div class="profile-summary"><p class="eyebrow dark">Planning Summary</p><h3>Your preliminary project profile</h3><p>Your contact details were saved after the first step with your consent. This summary is not a quote or site assessment; it helps ADELIE prepare for a useful first conversation.</p><dl>${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${profile.goals?`<h4>Main goals</h4><p>${esc(profile.goals)}</p>`:''}<h4>Recommended next steps</h4><div class="profile-recommendations">${rec.map(([l,h])=>`<a href="${h}">${l} →</a>`).join('')}</div><div class="profile-summary-actions"><button type="button" class="profile-print">Print / Save PDF</button><button type="button" class="profile-edit">Edit answers</button><button type="button" class="profile-use-lead">Review and send full consultation request</button></div></div>`;
    back.hidden=true;next.hidden=true;overlay.querySelector('.profile-save-exit').textContent='Close';
    body.querySelector('.profile-print')?.addEventListener('click',()=>window.print());
    body.querySelector('.profile-edit')?.addEventListener('click',()=>{step=0;back.hidden=false;next.hidden=false;overlay.querySelector('.profile-save-exit').textContent='Save & close';render()});
    body.querySelector('.profile-use-lead')?.addEventListener('click',()=>{syncLead();close();assistant.querySelector('.assistant-panel').hidden=false;assistant.querySelector('.assistant-toggle').setAttribute('aria-expanded','true');leadForm?.scrollIntoView({behavior:'smooth',block:'center'});leadForm?.querySelector('[name="email"]')?.focus()});
  }
  function open(){overlay.hidden=false;document.body.classList.add('profile-open');step=0;render()}
  function close(){overlay.hidden=true;document.body.classList.remove('profile-open');syncLead()}
  next.addEventListener('click',async()=>{const q=questions[step];if(!valid(q)){body.querySelector('.profile-error').hidden=false;return}if(q.type==='contact'&&localStorage.getItem(CAPTURE_KEY)!=='true')await sendEarlyLead();step++;render()});
  back.addEventListener('click',()=>{if(step>0){step--;render()}});
  overlay.querySelector('.profile-close').addEventListener('click',close);
  overlay.querySelector('.profile-save-exit').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});

  const launch=document.createElement('button');launch.type='button';launch.className='assistant-profile-launch';launch.innerHTML='<strong>Build my project profile</strong><span>Start with contact details, then home, scope, budget, goals and timeline</span>';launch.addEventListener('click',open);
  const quick=assistant.querySelector('.assistant-quick');quick?.before(launch);
  const actions=assistant.querySelector('.assistant-action-row');
  if(actions){const b=document.createElement('button');b.type='button';b.textContent='Build project profile';b.addEventListener('click',open);actions.prepend(b)}
  syncLead();
})();
