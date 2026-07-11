
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.main-nav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
document.querySelectorAll('.reveal').forEach(el=>new IntersectionObserver(([entry],obs)=>{if(entry.isIntersecting){entry.target.classList.add('visible');obs.unobserve(entry.target)}},{threshold:.12}).observe(el));
document.querySelectorAll('#year').forEach(el=>el.textContent=new Date().getFullYear());

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
    materials:{label:'Material Selection Guide',href:'material-selection-guide.html'}
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
    {keys:['financing','loan','payment'],text:'Financing options and approval terms vary by lender. Review total cost, interest, fees and repayment terms carefully, and avoid finalizing financing until the project scope is sufficiently defined.',links:['budget']}
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
      addMessage('bot','I can help with project planning, budgets, permits, timelines, contractor comparisons and material decisions. For property-specific advice, add your question to the project form and ADELIE will follow up.',['downloads','budget']);
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

  leadForm?.addEventListener('submit',()=>{
    if(details && transcript.length && !details.value.includes('Assistant conversation')) details.value += '\n\nAssistant conversation:\n'+transcript.slice(-8).join('\n');
  });
}

