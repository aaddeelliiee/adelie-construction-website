const db = supabase.createClient(window.ADELIE_PORTAL_CONFIG.supabaseUrl, window.ADELIE_PORTAL_CONFIG.supabaseAnonKey);
const $ = id => document.getElementById(id);
const safe = value => String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
const screens = ['loading','welcome','question-view','design-sheet','checkpoint','complete','error-view'];
let record, mode = 'discovery', index = 0, questions = [], answers = {};
document.head.insertAdjacentHTML('beforeend',`<style>
.onboarding-shell:has(.design-sheet:not(.hidden)){width:min(1080px,100%)}
.design-sheet{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 18px 60px rgba(30,27,20,.08);overflow:hidden}
.design-sheet-heading{padding:clamp(28px,6vw,58px);background:linear-gradient(135deg,#fff 0 68%,#fff7d8 68%);border-bottom:1px solid var(--line)}
.design-sheet-heading h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.5rem,6vw,4.6rem);line-height:1;margin:0 0 18px}
.design-sheet-heading>p:not(.eyebrow){max-width:700px;color:var(--muted);line-height:1.7}
.design-sheet-meta{display:flex;gap:10px 24px;flex-wrap:wrap;margin-top:24px;font-weight:800}.design-sheet-meta span+span{color:var(--muted)}
#design-sheet-form{padding:clamp(24px,5vw,52px)}#design-sheet-fields{display:grid;grid-template-columns:1fr 1fr;gap:20px 24px}
#design-sheet-fields h2{grid-column:1/-1;margin:24px 0 0;padding-bottom:10px;border-bottom:2px solid var(--gold);font-family:'Playfair Display',Georgia,serif;font-size:1.8rem}
.design-field{margin:0;padding:20px;border:1px solid var(--line);border-radius:13px;background:#faf9f5}.design-field strong,.design-field legend{font-weight:900;line-height:1.4}.design-field legend{padding:0 4px}
.design-field textarea{width:100%;min-height:120px;margin-top:13px;padding:14px;border:1px solid var(--line);border-radius:9px;background:#fff;font:inherit;resize:vertical}
.design-options{display:grid;gap:9px;margin-top:13px}.design-options label{display:flex;align-items:flex-start;gap:9px;padding:8px 10px;border-radius:8px;background:#fff;cursor:pointer}.design-options input{margin-top:3px;accent-color:var(--gold-deep)}
.design-sheet-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:30px;padding-top:24px;border-top:1px solid var(--line)}
@media(max-width:720px){#design-sheet-fields{grid-template-columns:1fr}.design-sheet-heading{background:#fff}.design-sheet-actions{display:grid}.design-sheet-actions button{width:100%}}
</style>`);

const discoveryQuestions = [
  {id:'spaces',title:'Which parts of your home are you thinking about remodeling?',help:'Choose all that apply. We’ll use this to tailor everything that follows.',multi:true,options:['Kitchen','Bathroom','Whole house','Addition','Exterior / outdoor living','Flooring / paint only','Not sure yet']},
  {id:'extent',title:'How extensive do you expect the remodel to be?',options:['A focused refresh','Replace finishes and fixtures','Change the layout','Major structural changes','I’m not sure yet']},
  {id:'priority',title:'What matters most to you?',multi:true,options:['Better function','A new look and feel','More space','Accessibility or aging in place','Energy efficiency','Resale value','Repair damage or wear']},
  {id:'timing',title:'When would you ideally like work to begin?',options:['As soon as possible','Within 3 months','3–6 months','6–12 months','More than a year away','Just exploring']},
  {id:'budget',title:'Do you have a working investment range?',help:'An early range helps us recommend realistic next steps. It can change as the scope develops.',options:['Under $25,000','$25,000–$75,000','$75,000–$150,000','$150,000–$300,000','$300,000+','I’d like guidance']},
  {id:'occupancy',title:'Will you be living in the home during construction?',options:['Yes','No','Not sure yet','This is not my primary residence']},
  {id:'vision',title:'Is there anything you want us to understand from the start?',help:'Share a challenge, must-have, inspiration, or concern.',type:'text',placeholder:'For example: We need more storage and want the space to feel brighter…'}
];

const commonDesign = [
  {id:'style',title:'Which overall style feels most like you?',options:['Modern','Contemporary','Transitional','Traditional','Coastal','Craftsman','Farmhouse','Mid-century','I’m undecided']},
  {id:'finishLevel',title:'What finish level are you aiming for?',options:['Practical / builder grade','Mid-range','Premium','Luxury','I’d like recommendations']},
  {id:'flooring',title:'What flooring are you considering?',multi:true,options:['Luxury vinyl plank','Engineered hardwood','Solid hardwood','Tile','Carpet','Keep existing','Undecided']},
  {id:'paint',title:'Do you already have paint colors or finishes in mind?',type:'text',placeholder:'Color, brand, sheen—or tell us you’d like recommendations.'},
  {id:'accessibility',title:'Should we plan for accessibility or aging in place?',multi:true,options:['Curbless shower','Grab-bar blocking','Slip-resistant flooring','Wider doorways','Comfort-height fixtures','Lever handles','No special requirements','I’d like guidance']}
];
const bathroomDesign = [
  {id:'bath_shower',title:'What kind of bathing area do you picture?',multi:true,options:['Walk-in shower','Tub and shower','Freestanding tub','Keep the current layout','Curbless entry','Undecided']},
  {id:'bath_vanity',title:'What vanity setup works best?',options:['Single sink','Double sink','Floating vanity','Freestanding vanity','Keep existing','Undecided']},
  {id:'bath_details',title:'Which bathroom features matter to you?',multi:true,options:['Frameless glass','Built-in bench','Shower niche','Rain head','Handheld shower','Bidet seat','Quiet ventilation','Heated floors']}
];
const kitchenDesign = [
  {id:'kitchen_layout',title:'What should change most in the kitchen?',multi:true,options:['Cabinet layout','Storage','Counter space','Island','Lighting','Appliances','Open it to another room','Mostly finishes']},
  {id:'kitchen_cabinets',title:'Which cabinet direction do you prefer?',options:['Shaker','Slab / flat panel','Raised panel','Inset','Keep existing boxes','Undecided']},
  {id:'kitchen_surfaces',title:'What surfaces are you considering?',multi:true,options:['Quartz','Granite','Marble','Butcher block','Tile backsplash','Slab backsplash','Undecided']},
  {id:'kitchen_appliances',title:'Which appliances are part of the plan?',multi:true,options:['Refrigerator','Range / cooktop','Wall oven','Microwave','Dishwasher','Wine cooler','Range hood','Keep existing']}
];
const exteriorDesign = [
  {id:'exterior_scope',title:'What exterior work are you considering?',multi:true,options:['Stucco or siding','Roofing','Exterior doors','Windows','Exterior lighting','Paint','Patio / outdoor living','Pool area']},
  {id:'exterior_style',title:'How would you describe the exterior direction?',type:'text',placeholder:'Colors, materials, inspiration, or anything you want to preserve.'}
];
const wholeHomeDesign = [
  {id:'wholehome_changes',title:'Which whole-home changes are most important?',multi:true,options:['Rework the floor plan','Interior doors and trim','Lighting and electrical','Windows and doors','Ceiling details','Storage','Smart-home features','Consistent finishes throughout']}
];

function show(id){ screens.forEach(name => $(name).classList.toggle('hidden', name !== id)); }
function firstName(){ return record.full_name.trim().split(/\s+/)[0] || 'there'; }
function buildDesignQuestions(){
  const spaces = record.discovery.spaces || [];
  const has = word => spaces.some(item => item.toLowerCase().includes(word));
  const list = [...commonDesign];
  if (has('bath') || has('whole') || has('not sure')) list.push(...bathroomDesign);
  if (has('kitchen') || has('whole') || has('not sure')) list.push(...kitchenDesign);
  if (has('exterior') || has('whole')) list.push(...exteriorDesign);
  if (has('whole') || has('addition')) list.push(...wholeHomeDesign);
  list.push({id:'design_notes',title:'Anything else you want your ADELIE team to know?',type:'text',placeholder:'Special requests, inspiration links, materials you love, or anything you want to avoid.'});
  return list;
}
const designSection = id => id.startsWith('bath_') ? 'Bathroom' : id.startsWith('kitchen_') ? 'Kitchen' : id.startsWith('exterior_') ? 'Exterior & outdoor living' : id.startsWith('wholehome_') ? 'Whole home' : id === 'design_notes' ? 'Final notes' : 'Overall look & feel';
function renderDesignSheet(){
  questions=buildDesignQuestions();
  answers={...record.design_answers};
  $('design-customer-name').textContent=record.full_name;
  $('design-project-address').textContent=record.address;
  let section='';
  $('design-sheet-fields').innerHTML=questions.map(q=>{
    const heading=designSection(q.id),sectionHeading=heading!==section?`<h2>${heading}</h2>`:'';section=heading;
    if(q.type==='text')return `${sectionHeading}<label class="design-field"><strong>${safe(q.title)}</strong><textarea data-question="${q.id}" placeholder="${safe(q.placeholder||'')}">${safe(answers[q.id]||'')}</textarea></label>`;
    const type=q.multi?'checkbox':'radio',values=Array.isArray(answers[q.id])?answers[q.id]:[answers[q.id]];
    return `${sectionHeading}<fieldset class="design-field"><legend>${q.title}</legend><div class="design-options">${q.options.map(option=>`<label><input type="${type}" name="${q.id}" data-question="${q.id}" value="${option}"${values.includes(option)?' checked':''}> <span>${option}</span></label>`).join('')}</div></fieldset>`;
  }).join('');
  show('design-sheet');
}
function collectDesignSheet(){
  const next={};
  questions.forEach(q=>{
    if(q.type==='text'){const value=$('design-sheet-fields').querySelector(`[data-question="${q.id}"]`).value.trim();if(value)next[q.id]=value;return;}
    const checked=[...$('design-sheet-fields').querySelectorAll(`[data-question="${q.id}"]:checked`)].map(input=>input.value);
    if(checked.length)next[q.id]=q.multi?checked:checked[0];
  });
  answers=next;
}
async function saveDesignSheet(redirect=false){
  collectDesignSheet();
  $('design-save-status').textContent='Saving your Design Sheet…';
  try{await save(redirect?'design':null);$('design-save-status').textContent='Design Sheet saved.';if(redirect)location.href='portal.html'}
  catch{$('design-save-status').textContent='We could not save your Design Sheet. Please try again.'}
}
function renderQuestion(){
  const q = questions[index], current = answers[q.id];
  $('question-kicker').textContent = mode === 'discovery' ? 'Your project' : 'Your design preferences';
  $('question-title').textContent = q.title;
  $('question-help').textContent = q.help || (q.multi ? 'Choose all that apply.' : 'Choose one option.');
  $('progress-label').textContent = mode === 'discovery' ? 'A few quick questions' : 'Tailored design questionnaire';
  $('progress-count').textContent = `${index + 1} of ${questions.length}`;
  $('progress-bar').style.width = `${((index + 1) / questions.length) * 100}%`;
  $('back').disabled = index === 0;
  $('next').disabled = !current || (Array.isArray(current) && !current.length);
  $('answer-options').replaceChildren();
  if(q.type === 'text'){
    const input = document.createElement('textarea'); input.className='answer-input'; input.placeholder=q.placeholder||''; input.maxLength=1600; input.value=current||'';
    input.addEventListener('input',()=>{ answers[q.id]=input.value.trim(); $('next').disabled=!answers[q.id]; }); $('answer-options').append(input); input.focus(); return;
  }
  q.options.forEach(option => {
    const selected = q.multi ? (current||[]).includes(option) : current === option;
    const button=document.createElement('button'); button.type='button'; button.className=`answer-choice${q.multi?' multi':''}${selected?' selected':''}`; button.innerHTML='<span class="choice-dot" aria-hidden="true"></span><span></span>'; button.lastChild.textContent=option;
    button.addEventListener('click',()=>{ if(q.multi){ const values=new Set(answers[q.id]||[]); values.has(option)?values.delete(option):values.add(option); answers[q.id]=[...values]; } else answers[q.id]=option; renderQuestion(); });
    $('answer-options').append(button);
  });
}
async function save(completed=null){
  $('save-status').textContent='Saving…';
  const params={onboarding_id:record.id,discovery_answers:mode==='discovery'?answers:null,finish_answers:mode==='design'?answers:null,completed};
  const {error}=await db.rpc('save_customer_onboarding',params); if(error) throw error;
  if(mode==='discovery') record.discovery={...answers}; else record.design_answers={...answers};
  $('save-status').textContent='Saved';
}
async function advance(skip=false){
  if(skip) delete answers[questions[index].id];
  if(index < questions.length-1){ index++; renderQuestion(); if(index%3===0) save().catch(()=>{$('save-status').textContent='Could not save yet. Your answers remain on this screen.'}); return; }
  try{ await save(mode); if(mode==='discovery') show('checkpoint'); else location.href='portal.html'; }catch{ $('save-status').textContent='We couldn’t save your answers. Please try again.'; }
}
function finish(){ $('complete-name').textContent=firstName(); $('project-link').classList.toggle('hidden',!record.project_id); show('complete'); }
async function init(){
  const {data:{session}}=await db.auth.getSession(); if(!session) return location.replace('portal-login.html');
  const {data,error}=await db.from('customer_onboarding').select('*').eq('user_id',session.user.id).maybeSingle();
  if(error||!data){ $('error-message').textContent='This sign-in is not linked to a homeowner welcome. Please contact ADELIE for help.'; return show('error-view'); }
  record=data; $('customer-first-name').textContent=firstName(); $('customer-name').textContent=data.full_name; $('customer-email').textContent=data.email; $('customer-address').textContent=data.address;
  const hasPassword=session.user.user_metadata?.portal_password_set===true;
  $('password-setup').classList.toggle('hidden',hasPassword);
  $('begin').classList.toggle('hidden',!hasPassword);
  const openDesign=new URLSearchParams(location.search).get('view')==='design';
  if(openDesign&&hasPassword&&Object.keys(data.discovery||{}).length){mode='design';return renderDesignSheet()}
  if((data.completed_forms||[]).includes('discovery'))return location.replace('portal.html');
  show('welcome');
}
$('password-setup').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget, button=form.querySelector('button');
  const password=$('new-password').value, confirmation=$('confirm-password').value;
  if(password.length<10){$('password-status').textContent='Use at least 10 characters.';return;}
  if(password!==confirmation){$('password-status').textContent='The passwords do not match.';return;}
  button.disabled=true;$('password-status').textContent='Saving your password…';
  const {error}=await db.auth.updateUser({password,data:{portal_password_set:true}});
  button.disabled=false;
  if(error){$('password-status').textContent='We could not save that password. Please try a different password.';return;}
  form.reset();form.classList.add('hidden');$('begin').classList.remove('hidden');$('password-status').textContent='';
});
$('show-password').addEventListener('change',event=>{
  const type=event.currentTarget.checked?'text':'password';
  $('new-password').type=type;
  $('confirm-password').type=type;
});
Object.assign($('show-password').style,{width:'18px',height:'18px',padding:'0',margin:'0'});
Object.assign($('show-password').closest('label').style,{display:'flex',alignItems:'center',gap:'9px',width:'max-content',maxWidth:'100%',cursor:'pointer'});
$('begin').onclick=()=>{mode='discovery';questions=discoveryQuestions;answers={...record.discovery};index=0;show('question-view');renderQuestion()};
$('back').onclick=()=>{if(index>0){index--;renderQuestion()}}; $('skip').onclick=()=>advance(true); $('next').onclick=()=>advance(false);
$('continue-design').onclick=()=>{mode='design';renderDesignSheet()};
$('save-design').onclick=()=>saveDesignSheet(false);
$('design-sheet-form').addEventListener('submit',event=>{event.preventDefault();saveDesignSheet(true)});
$('finish-now').onclick=()=>location.href='portal.html'; $('sign-out').onclick=async()=>{await db.auth.signOut();location.href='portal-login.html'};
init().catch(()=>{ $('error-message').textContent='Please refresh the page or contact ADELIE for help.'; show('error-view'); });
