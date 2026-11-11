const cfg=window.ADELIE_PORTAL_CONFIG;
const db=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const $=id=>document.getElementById(id);
let session,isAdmin=false,isOwner=false,records=[];
document.head.insertAdjacentHTML('beforeend',`<style>
.answer-review{grid-column:1/-1;border:1px solid #e2e0da;border-radius:10px;background:#faf9f5;padding:0 14px}.answer-review summary{padding:13px 0;font-weight:800;cursor:pointer}.answer-review dl{margin:0 0 14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.answer-review dl div{padding:11px;border-radius:8px;background:#fff}.answer-review dt{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:#686b70;font-weight:800}.answer-review dd{margin:5px 0 0;font-weight:700;overflow-wrap:anywhere}.design-sheet-ready{color:#067647;font-weight:800}.homeowner-actions{display:flex;gap:8px;flex-wrap:wrap}.removed-row{grid-template-columns:minmax(220px,1fr) auto}.removed-meta{color:#686b70;font-size:.82rem}@media(max-width:680px){.answer-review dl{grid-template-columns:1fr}}
</style>`);
const safe=value=>String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
const discoveryLabels={spaces:'Remodel areas',extent:'Expected scope',priority:'Top priorities',timing:'Ideal start',budget:'Working investment range',occupancy:'Living in the home',vision:'What they want us to know'};

function answerReview(item){
  const entries=Object.entries(item.discovery||{});
  return `<details class="answer-review"><summary>View initial answers${entries.length?` (${entries.length})`:''}</summary>${entries.length?`<dl>${entries.map(([key,value])=>`<div><dt>${safe(discoveryLabels[key]||key)}</dt><dd>${safe(Array.isArray(value)?value.join(', '):value)}</dd></div>`).join('')}</dl>`:'<p>No initial answers have been saved yet.</p>'}${Object.keys(item.design_answers||{}).length?'<p class="design-sheet-ready">Design Sheet saved and editable in the customer account.</p>':''}</details>`;
}

async function request(url,options={}){
  const response=await fetch(url,{...options,headers:{...(options.headers||{}),'Authorization':`Bearer ${session.access_token}`}});
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||'Request failed.');
  return body;
}

function activeCard(item){
  return `<form class="onboarding-row" data-id="${item.id}"><div><strong>${safe(item.full_name)}</strong><span>${safe(item.email)} · ${safe(item.address)}</span></div>${answerReview(item)}<label>Stage<select name="stage">${['new','discovery','planning','proposal','contract','active','complete'].map(stage=>`<option${stage===item.stage?' selected':''}>${stage}</option>`).join('')}</select></label><fieldset><legend>Available forms</legend>${[['discovery','Project discovery'],['design','Design Sheet'],['letter_of_intent','Letter of intent'],['property_access','Property access']].map(([value,label])=>`<label><input type="checkbox" name="form" value="${value}"${item.enabled_forms.includes(value)?' checked':''}> ${label}</label>`).join('')}</fieldset><div class="homeowner-actions"><button class="portal-btn light" type="submit">Save access</button><button class="portal-btn danger archive-homeowner" type="button">Delete from admin list</button></div><p role="status"></p></form>`;
}

function removedCard(item){
  const removed=item.archived_at?new Date(item.archived_at).toLocaleString():'Unknown date';
  return `<article class="onboarding-row removed-row" data-id="${item.id}"><div><strong>${safe(item.full_name)}</strong><span>${safe(item.email)} · ${safe(item.address)}</span><span class="removed-meta">Removed ${safe(removed)}</span></div>${answerReview(item)}<div class="homeowner-actions"><button class="portal-btn light restore-homeowner" type="button">Restore</button><button class="portal-btn danger purge-homeowner" type="button">Permanently Delete</button></div><p role="status"></p></article>`;
}

function renderRecords(){
  const active=records.filter(item=>!item.archived_at),removed=records.filter(item=>item.archived_at);
  $('onboarding-list').innerHTML=active.length?active.map(activeCard).join(''):'<p class="empty">No active homeowner accounts.</p>';
  $('removed-list').innerHTML=removed.length?removed.map(removedCard).join(''):'<p class="empty">No removed homeowner accounts.</p>';
}

async function loadRecords(){
  const result=await request('/.netlify/functions/manage-customer-onboarding');
  records=result.records||[];isOwner=!!result.isOwner;
  $('removed-tab').classList.toggle('hidden',!isOwner);
  renderRecords();
}

function showTab(name){
  document.querySelectorAll('.homeowner-panel').forEach(panel=>panel.classList.toggle('hidden',panel.id!==`${name}-panel`));
  document.querySelectorAll('[data-tab]').forEach(button=>{button.classList.toggle('primary',button.dataset.tab===name);button.classList.toggle('light',button.dataset.tab!==name)});
}

async function accountAction(button,action){
  const row=button.closest('[data-id]'),status=row.querySelector('[role="status"]');
  button.disabled=true;status.textContent='';
  try{const result=await request('/.netlify/functions/manage-customer-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.dataset.id,action})});status.textContent=result.message;await loadRecords()}
  catch(error){status.textContent=error.message;button.disabled=false}
}

async function init(){
  ({data:{session}}=await db.auth.getSession());
  if(!session)return location.replace('portal-login.html');
  const [{data:admin},{data:employee}]=await Promise.all([db.rpc('is_portal_user'),db.rpc('is_employee')]);
  isAdmin=!!admin;
  if(!admin&&!employee)return location.replace('portal.html');
  $('back-to-portal').href=employee&&!admin?'portal-employee.html':'portal-admin.html';
  if(admin){await loadRecords();showTab('active')}else{showTab('new')}
}

document.querySelector('.homeowner-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(button&&!button.classList.contains('hidden'))showTab(button.dataset.tab)});

$('lead-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=$('send-invite'),status=$('lead-status');
  if(button.disabled)return;
  button.disabled=true;button.textContent='Sending welcome link…';status.textContent='';status.className='';
  try{const result=await request('/.netlify/functions/create-customer-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:$('lead-name').value,address:$('lead-address').value,email:$('lead-email').value})});form.reset();status.textContent=result.message;if(isAdmin){await loadRecords();showTab('active')}}
  catch(error){status.textContent=error.message;status.className='error'}
  finally{button.disabled=false;button.textContent='Create Account & Send Welcome Link'}
});

$('onboarding-list').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.target;if(!form.matches('.onboarding-row'))return;
  const button=form.querySelector('[type="submit"]'),status=form.querySelector('[role="status"]');button.disabled=true;
  try{const result=await request('/.netlify/functions/manage-customer-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.id,stage:form.elements.stage.value,enabledForms:[...form.querySelectorAll('[name="form"]:checked')].map(input=>input.value)})});status.textContent=result.message}
  catch(error){status.textContent=error.message}finally{button.disabled=false}
});

$('onboarding-list').addEventListener('click',event=>{const button=event.target.closest('.archive-homeowner');if(!button)return;const row=button.closest('[data-id]'),item=records.find(record=>record.id===row.dataset.id);if(confirm(`Remove ${item?.full_name||'this homeowner'} from the active admin list? Your protected owner account will retain the complete record.`))accountAction(button,'archive')});
$('removed-list').addEventListener('click',event=>{const restore=event.target.closest('.restore-homeowner'),purge=event.target.closest('.purge-homeowner');if(restore)return accountAction(restore,'restore');if(!purge)return;const row=purge.closest('[data-id]'),item=records.find(record=>record.id===row.dataset.id);if(confirm(`Permanently delete ${item?.full_name||'this homeowner'} and all saved account data? This cannot be undone.`))accountAction(purge,'purge')});

$('logout').onclick=async()=>{await db.auth.signOut();location.href='portal-login.html'};
init();
