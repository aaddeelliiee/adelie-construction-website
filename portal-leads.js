const cfg=window.ADELIE_PORTAL_CONFIG;
const db=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const $=id=>document.getElementById(id);
let session,isAdmin=false;
document.head.insertAdjacentHTML('beforeend',`<style>
.answer-review{grid-column:1/-1;border:1px solid #e2e0da;border-radius:10px;background:#faf9f5;padding:0 14px}.answer-review summary{padding:13px 0;font-weight:800;cursor:pointer}.answer-review dl{margin:0 0 14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.answer-review dl div{padding:11px;border-radius:8px;background:#fff}.answer-review dt{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:#686b70;font-weight:800}.answer-review dd{margin:5px 0 0;font-weight:700;overflow-wrap:anywhere}.design-sheet-ready{color:#067647;font-weight:800}@media(max-width:680px){.answer-review dl{grid-template-columns:1fr}}
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

async function loadRecords(){
  const {records}=await request('/.netlify/functions/manage-customer-onboarding');
  $('onboarding-list').innerHTML=records.length?records.map(item=>`<form class="onboarding-row" data-id="${item.id}"><div><strong>${safe(item.full_name)}</strong><span>${safe(item.email)} · ${safe(item.address)}</span></div>${answerReview(item)}<label>Stage<select name="stage">${['new','discovery','planning','proposal','contract','active','complete'].map(stage=>`<option${stage===item.stage?' selected':''}>${stage}</option>`).join('')}</select></label><fieldset><legend>Available forms</legend>${[['discovery','Project discovery'],['design','Design Sheet'],['letter_of_intent','Letter of intent'],['property_access','Property access']].map(([value,label])=>`<label><input type="checkbox" name="form" value="${value}"${item.enabled_forms.includes(value)?' checked':''}> ${label}</label>`).join('')}</fieldset><button class="portal-btn light" type="submit">Save access</button><p role="status"></p></form>`).join(''):'<p class="empty">No homeowner invitations yet.</p>';
}

async function init(){
  ({data:{session}}=await db.auth.getSession());
  if(!session)return location.replace('portal-login.html');
  const [{data:admin},{data:employee}]=await Promise.all([db.rpc('is_portal_user'),db.rpc('is_employee')]);
  isAdmin=!!admin;
  if(!admin&&!employee)return location.replace('portal.html');
  $('back-to-portal').href=employee&&!admin?'portal-employee.html':'portal-admin.html';
  if(admin){$('admin-records').classList.remove('hidden');await loadRecords()}
}

$('lead-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=$('send-invite'),status=$('lead-status');
  if(button.disabled)return;
  button.disabled=true;button.textContent='Sending welcome link…';status.textContent='';status.className='';
  try{
    const result=await request('/.netlify/functions/create-customer-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:$('lead-name').value,address:$('lead-address').value,email:$('lead-email').value})});
    form.reset();status.textContent=result.message;
    if(isAdmin)await loadRecords();
  }catch(error){status.textContent=error.message;status.className='error'}
  finally{button.disabled=false;button.textContent='Create Account & Send Welcome Link'}
});

$('onboarding-list').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.target;
  if(!form.matches('.onboarding-row'))return;
  const button=form.querySelector('button'),status=form.querySelector('[role="status"]');
  button.disabled=true;
  try{const result=await request('/.netlify/functions/manage-customer-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.id,stage:form.elements.stage.value,enabledForms:[...form.querySelectorAll('[name="form"]:checked')].map(input=>input.value)})});status.textContent=result.message}
  catch(error){status.textContent=error.message}
  finally{button.disabled=false}
});

$('logout').onclick=async()=>{await db.auth.signOut();location.href='portal-login.html'};
init();
