const cfg=window.ADELIE_PORTAL_CONFIG,sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey),$=id=>document.getElementById(id);
let userId=null,projects=[],projectId=null;
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),empty=t=>`<div class="empty">${t}</div>`,when=d=>new Date(d).toLocaleString();

async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return location.href='portal-login.html';
  userId=session.user.id;
  const {data:isEmployee}=await sb.rpc('is_employee');
  if(!isEmployee)return location.href='portal.html';
  const {data:employee}=await sb.from('employees').select('*').eq('user_id',userId).single();
  $('employee-name').textContent=employee?.full_name||'Employee';
  const {data:assignments=[]}=await sb.from('employee_project_assignments').select('project_id,projects(*)').eq('employee_id',userId);
  projects=assignments.map(x=>x.projects).filter(Boolean);
  $('employee-project').innerHTML=projects.map(x=>`<option value="${x.id}">${safe(x.name)}</option>`).join('');
  projectId=projects[0]?.id||null;
  await Promise.all([loadSchedule(),loadRecipients(),loadInternal()]);
  await loadProject();
}

async function loadSchedule(){
  const {data=[]}=await sb.from('employee_schedule').select('*,projects(name)').eq('employee_id',userId).order('starts_at');
  $('employee-schedule').innerHTML=data.length?`<div class="schedule-stack">${data.map(x=>`<article class="schedule-item"><div><strong>${safe(x.title)}</strong><span>${when(x.starts_at)}${x.projects?.name?' · '+safe(x.projects.name):''}</span><p>${safe(x.details||'')}</p></div><span class="status-pill">${safe(x.status)}</span></article>`).join('')}</div>`:empty('No shifts or project visits are scheduled.');
}

async function loadProject(){
  const p=projects.find(x=>x.id===projectId);
  $('employee-project-info').innerHTML=p?`<h3>${safe(p.name)}</h3><p>${safe(p.address||'')}</p><p><strong>Phase:</strong> ${safe(p.current_phase||'Not set')} · <strong>Status:</strong> ${safe(p.status)}</p>`:empty('No project is assigned.');
  if(!projectId){
    $('customer-schedule-list').innerHTML=empty('No project selected.');
    $('employee-board').innerHTML=empty('No project selected.');
    $('employee-submissions').innerHTML=empty('No project selected.');
    return;
  }
  await Promise.all([loadCustomerSchedule(),loadCustomerBoard(),loadSubmissions()]);
}

async function loadCustomerSchedule(){
  const {data=[]}=await sb.from('milestones').select('*').eq('project_id',projectId).order('target_date',{ascending:true});
  $('customer-schedule-list').innerHTML=data.length?`<div class="schedule-stack">${data.map(x=>`<article class="schedule-item"><div><strong>${safe(x.title)}</strong><span>${x.target_date?new Date(x.target_date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'Date TBD'} · ${safe(x.status)}</span><p>${safe(x.description||'')}</p></div><span class="status-pill">Read only</span></article>`).join('')}</div>`:empty('No customer-visible schedule items have been shared.');
}

async function loadCustomerBoard(){
  const {data=[]}=await sb.from('messages').select('*').eq('project_id',projectId).order('created_at');
  $('employee-board').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li><strong>${x.sender_role==='admin'?'ADELIE Admin':'Customer'}</strong><span class="portal-muted"> · ${when(x.created_at)}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No customer-board messages yet.');
}

async function signed(path){
  if(!path)return null;
  const {data}=await sb.storage.from('project-photos').createSignedUrl(path,3600);
  return data?.signedUrl;
}

async function loadSubmissions(){
  const {data=[],error}=await sb.from('project_photos').select('*').eq('project_id',projectId).eq('uploaded_by',userId).eq('uploaded_role','employee').order('created_at',{ascending:false});
  if(error){$('employee-submissions').innerHTML=empty(error.message);return}
  const items=await Promise.all(data.map(async item=>({...item,url:await signed(item.storage_path)})));
  $('employee-submissions').innerHTML=items.length?`<div class="photo-grid">${items.map(item=>`<figure>${item.url?`<a href="${item.url}" target="_blank" rel="noopener"><img src="${item.url}" alt="${safe(item.caption||'Project update')}"></a>`:''}<figcaption><span class="status-pill status-${safe(item.approval_status||'pending')}">${safe(item.approval_status||'pending')}</span><p>${safe(item.caption)}</p>${item.review_note?`<p><strong>Admin feedback:</strong> ${safe(item.review_note)}</p>`:''}</figcaption></figure>`).join('')}</div>`:empty('You have not submitted an update for this project yet.');
}

async function loadRecipients(){
  const {data=[]}=await sb.rpc('employee_directory');
  $('internal-recipient').innerHTML='<option value="">Team Chat — all employees and admins</option>'+data.filter(x=>x.user_id!==userId).map(x=>`<option value="${x.user_id}">Private — ${safe(x.full_name)}</option>`).join('');
}

async function loadInternal(){
  const {data=[]}=await sb.from('internal_messages').select('*').order('created_at',{ascending:false}).limit(100);
  $('internal-thread').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li><span class="status-pill">${x.recipient_id?'Private':'Team Chat'}</span> <strong>${x.sender_id===userId?'You':'ADELIE Team'}</strong><span class="portal-muted"> · ${when(x.created_at)}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No internal messages yet.');
}

$('employee-update-form').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('[type="submit"]'),file=$('employee-update-photo').files[0],note=$('employee-update-note').value.trim();
  if(!projectId||!file||form.dataset.uploading==='true')return;
  if(file.size>15*1024*1024)return alert('Please choose a photo smaller than 15 MB.');
  form.dataset.uploading='true';button.disabled=true;button.textContent='Submitting...';
  const path=`${projectId}/employee/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
  try{
    let {error}=await sb.storage.from('project-photos').upload(path,file);
    if(!error)({error}=await sb.from('project_photos').insert({project_id:projectId,caption:note,bucket:'project-photos',storage_path:path,taken_at:new Date().toISOString(),uploaded_by:userId,uploaded_role:'employee',approval_status:'pending'}));
    if(error){await sb.storage.from('project-photos').remove([path]);return alert(error.message)}
    form.reset();alert('Update submitted for administrator approval.');await loadSubmissions();
  }finally{form.dataset.uploading='false';button.disabled=false;button.textContent='Submit for Approval'}
};

$('employee-project').onchange=event=>{projectId=event.target.value;loadProject()};
$('internal-message-form').onsubmit=async event=>{event.preventDefault();const {error}=await sb.from('internal_messages').insert({sender_id:userId,recipient_id:$('internal-recipient').value||null,project_id:projectId,body:$('internal-body').value.trim()});if(error)return alert(error.message);event.target.reset();loadInternal()};
$('logout').onclick=async()=>{await sb.auth.signOut();location.href='portal-login.html'};
init();
