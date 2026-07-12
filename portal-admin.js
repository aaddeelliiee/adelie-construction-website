const cfg=window.ADELIE_PORTAL_CONFIG,sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey),$=id=>document.getElementById(id);
let projects=[],projectId=null,schedule=[];

const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'Date TBD',empty=t=>`<div class="empty">${t}</div>`;

function show(text,type='success'){const box=$('admin-message');
box.textContent=text;
box.className='notice '+type;
scrollTo({top:0,behavior:'smooth'});
setTimeout(()=>box.classList.add('hidden'),5000)}
async function guard(){const {data:{session}}=await sb.auth.getSession();
if(!session)return location.href='portal-login.html';
const {data:isAdmin}=await sb.rpc('is_portal_admin');
if(!isAdmin)return location.href='portal.html';
await loadProjects();await loadEmployeeAdmin()}
async function loadProjects(){const {data,error}=await sb.from('projects').select('*').order('created_at',{ascending:false});
if(error)return show(error.message,'error');
projects=data||[];
$('active-count').textContent=projects.filter(p=>p.status==='Active').length;
$('current-project').innerHTML=projects.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join('');
if(!projects.some(p=>p.id===projectId))projectId=projects[0]?.id||null;
if(projectId)$('current-project').value=projectId;
if(!projectId){
  $('project-details-form').reset();
  $('progress-value').textContent='0%';
  $('schedule-count').textContent='0';
  $('message-count').textContent='0';
  $('schedule-list').innerHTML=empty('Create a project to add a schedule.');
  $('photos-list').innerHTML=empty('Create a project to share photos.');
  $('documents-list').innerHTML=empty('Create a project to share documents.');
  $('messages-list').innerHTML=empty('Create a project to send messages.');
  $('customer-uploads-list').innerHTML=empty('Create a project to receive customer uploads.');
  return;
}
await loadProject()}
async function loadProject(){const p=projects.find(x=>x.id===projectId);
if(!p)return;
$('project-name').value=p.name||'';
$('project-address').value=p.address||'';
$('project-phase').value=p.current_phase||'';
$('project-status').value=p.status||'Active';
$('project-progress').value=p.progress_percent||0;
$('progress-value').textContent=(p.progress_percent||0)+'%';
$('project-start').value=p.start_date||'';
$('project-end').value=p.target_completion_date||'';
await Promise.all([loadSchedule(),loadPhotos(),loadDocuments(),loadMessages(),loadCustomerAccounts(),loadCustomerUploads()])}
async function rows(table,order='created_at',ascending=false){const {data=[],error}=await sb.from(table).select('*').eq('project_id',projectId).order(order,{ascending});
if(error){show(error.message,'error');
return[]}return data}
async function signed(bucket,path){if(!path)return null;
if(path.startsWith('http')||path.startsWith('assets/'))return path;
const {data}=await sb.storage.from(bucket).createSignedUrl(path,3600);
return data?.signedUrl}
async function loadSchedule(){schedule=await rows('milestones','target_date',true);
$('schedule-count').textContent=schedule.length;
$('schedule-list').innerHTML=schedule.length?`<div class="schedule-stack">${schedule.map(x=>`<article class="schedule-item"><div><strong>${safe(x.title)}</strong><span>${fmt(x.target_date)} · ${safe(x.status)}</span><p>${safe(x.description)}</p></div><div class="item-actions"><button class="portal-btn light schedule-edit" data-id="${x.id}">Edit</button><button class="portal-btn danger schedule-delete" data-id="${x.id}">Delete</button></div></article>`).join('')}</div>`:empty('No schedule has been shared yet.');
document.querySelectorAll('.schedule-edit').forEach(b=>b.onclick=()=>editSchedule(b.dataset.id));
document.querySelectorAll('.schedule-delete').forEach(b=>b.onclick=()=>deleteSchedule(b.dataset.id))}
async function deleteSchedule(id){if(!confirm('Delete this schedule item? The customer will no longer see it.'))return;
const {error}=await sb.from('milestones').delete().eq('id',id);
if(error)return show(error.message,'error');
clearSchedule();show('Schedule item deleted.');loadSchedule()}
function editSchedule(id){const x=schedule.find(v=>v.id===id);
if(!x)return;
$('schedule-id').value=x.id;
$('schedule-title').value=x.title||'';
$('schedule-description').value=x.description||'';
$('schedule-date').value=x.target_date||'';
$('schedule-status').value=x.status||'Scheduled';
$('schedule-form').scrollIntoView({behavior:'smooth',block:'center'})}
function clearSchedule(){$('schedule-form').reset();
$('schedule-id').value=''}
async function loadPhotos(){const data=await rows('project_photos','taken_at',false),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-photos',x.storage_path)})));
$('photos-list').innerHTML=items.length?`<div class="photo-grid">${items.map(x=>`<figure>${x.url?`<a href="${x.url}" target="_blank" rel="noopener"><img src="${x.url}" alt="${safe(x.caption||'Project photo')}"></a>`:''}<figcaption>${safe(x.caption||'Progress photo')}</figcaption><button class="portal-btn danger photo-delete" data-id="${x.id}" data-path="${safe(x.storage_path||'')}">Delete Photo &amp; Note</button></figure>`).join('')}</div>`:empty('No photos uploaded yet.');
document.querySelectorAll('.photo-delete').forEach(b=>b.onclick=()=>deletePhoto(b.dataset.id,b.dataset.path))}
async function deletePhoto(id,path){if(!confirm('Delete this photo and its note? This cannot be undone.'))return;
if(path){const {error:storageError}=await sb.storage.from('project-photos').remove([path]);if(storageError)return show(storageError.message,'error')}
const {error}=await sb.from('project_photos').delete().eq('id',id);
if(error)return show(error.message,'error');show('Photo and note deleted.');loadPhotos();loadCustomerUploads()}
async function loadDocuments(){const data=await rows('documents'),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-files',x.storage_path)})));
$('documents-list').innerHTML=items.length?`<ul class="portal-list">${items.map(x=>`<li class="managed-row"><div><strong>${safe(x.title)}</strong><span class="portal-muted"> · ${safe(x.category)}</span><br>${x.url?`<a href="${x.url}" target="_blank" rel="noopener">Open document</a>`:'File unavailable'}</div><button class="portal-btn danger document-delete" data-id="${x.id}" data-path="${safe(x.storage_path||'')}">Delete</button></li>`).join('')}</ul>`:empty('No documents shared yet.');
document.querySelectorAll('.document-delete').forEach(b=>b.onclick=()=>deleteDocument(b.dataset.id,b.dataset.path))}
async function deleteDocument(id,path){if(!confirm('Delete this document? The customer will no longer be able to open it.'))return;
if(path&&!path.startsWith('assets/')){const {error:storageError}=await sb.storage.from('project-files').remove([path]);if(storageError)return show(storageError.message,'error')}
const {error}=await sb.from('documents').delete().eq('id',id);
if(error)return show(error.message,'error');show('Document deleted.');loadDocuments();loadCustomerUploads()}
async function loadCustomerUploads(){
  const [photos,documents]=await Promise.all([rows('project_photos','created_at',false),rows('documents','created_at',false)]);
  const customerPhotos=await Promise.all(photos.filter(item=>item.uploaded_role==='client').map(async item=>({...item,url:await signed(item.bucket||'project-photos',item.storage_path)})));
  const customerDocuments=await Promise.all(documents.filter(item=>item.uploaded_role==='client').map(async item=>({...item,url:await signed(item.bucket||'project-files',item.storage_path)})));
  const photoHtml=customerPhotos.length?`<div class="photo-grid">${customerPhotos.map(item=>`<figure>${item.url?`<a href="${item.url}" target="_blank" rel="noopener"><img src="${item.url}" alt="${safe(item.caption||'Customer photo')}"></a>`:''}<figcaption><strong>Customer photo</strong><br>${safe(item.caption||'No note provided')}</figcaption><button class="portal-btn danger customer-upload-photo-delete" data-id="${item.id}" data-path="${safe(item.storage_path)}">Delete Photo &amp; Note</button></figure>`).join('')}</div>`:empty('No customer photos yet.');
  const documentHtml=customerDocuments.length?`<ul class="portal-list">${customerDocuments.map(item=>`<li class="managed-row"><div><strong>${safe(item.title)}</strong>${item.notes?`<p>${safe(item.notes)}</p>`:''}${item.url?`<a href="${item.url}" target="_blank" rel="noopener">Open document</a>`:'File unavailable'}</div><button class="portal-btn danger customer-upload-document-delete" data-id="${item.id}" data-path="${safe(item.storage_path)}">Delete</button></li>`).join('')}</ul>`:empty('No customer documents yet.');
  $('customer-uploads-list').innerHTML=`<h3>Photos</h3>${photoHtml}<h3 style="margin-top:24px">Documents</h3>${documentHtml}`;
  document.querySelectorAll('.customer-upload-photo-delete').forEach(button=>button.onclick=()=>deletePhoto(button.dataset.id,button.dataset.path));
  document.querySelectorAll('.customer-upload-document-delete').forEach(button=>button.onclick=()=>deleteDocument(button.dataset.id,button.dataset.path));
}
async function loadMessages(){const data=await rows('messages');
$('message-count').textContent=data.filter(x=>x.sender_role==='client').length;
$('messages-list').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li><strong>${x.sender_role==='admin'?'ADELIE':'Customer'}</strong><span class="portal-muted"> · ${new Date(x.created_at).toLocaleString()}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No messages yet.')}
$('current-project').onchange=async e=>{projectId=e.target.value;
await loadProject()};
$('project-progress').oninput=e=>$('progress-value').textContent=e.target.value+'%';

$('project-details-form').onsubmit=async e=>{e.preventDefault();
const payload={name:$('project-name').value,address:$('project-address').value,current_phase:$('project-phase').value,status:$('project-status').value,progress_percent:Number($('project-progress').value),start_date:$('project-start').value||null,target_completion_date:$('project-end').value||null};
const {error}=await sb.from('projects').update(payload).eq('id',projectId);
if(error)return show(error.message,'error');
show('Project information saved.');
await loadProjects()};
$('archive-project').onclick=async()=>{const p=projects.find(x=>x.id===projectId);
if(!p||!confirm(`Archive ${p.name}? Its information will be preserved and customers can still view it.`))return;
const {error}=await sb.from('projects').update({status:'Archived'}).eq('id',projectId);
if(error)return show(error.message,'error');
show('Project archived.');await loadProjects()};
async function removeProjectFiles(bucket){const {data=[],error}=await sb.storage.from(bucket).list(projectId,{limit:1000});
if(error)return error;
const paths=data.filter(x=>x.name&&x.name!=='.emptyFolderPlaceholder').map(x=>`${projectId}/${x.name}`);
if(paths.length){const {error:removeError}=await sb.storage.from(bucket).remove(paths);return removeError}return null}
$('delete-project').onclick=async()=>{const p=projects.find(x=>x.id===projectId);
if(!p||!confirm(`Permanently delete ${p.name} and all of its portal information? This cannot be undone.`))return;
if(!confirm('Are you absolutely sure? Photos, notes, documents, schedules, and messages will be permanently deleted.'))return;
for(const bucket of ['project-photos','project-files']){const storageError=await removeProjectFiles(bucket);if(storageError)return show(storageError.message,'error')}
const {error}=await sb.from('projects').delete().eq('id',projectId);
if(error)return show(error.message,'error');
projectId=null;show('Project permanently deleted.');await loadProjects()};

$('new-project-form').onsubmit=async e=>{e.preventDefault();
const {data,error}=await sb.from('projects').insert({name:$('new-project-name').value,address:$('new-project-address').value,current_phase:'Planning',status:'Active',progress_percent:0}).select().single();
if(error)return show(error.message,'error');
projectId=data.id;
e.target.reset();
show('Project created.');
await loadProjects()};

async function loadCustomerAccounts(){
  const {data:{session}}=await sb.auth.getSession();
  const response=await fetch(`/.netlify/functions/invite-client?projectId=${encodeURIComponent(projectId)}`,{headers:{'Authorization':'Bearer '+session.access_token}});
  const out=await response.json();
  if(!response.ok){$('customer-accounts-list').innerHTML=empty(out.error||'Customer accounts could not be loaded.');return}
  $('customer-accounts-list').innerHTML=out.accounts.length?`<ul class="portal-list">${out.accounts.map(account=>`<li class="managed-row"><div><strong>${safe(account.username)}</strong><br><span class="portal-muted">Password is protected and cannot be viewed.</span></div><button class="portal-btn light customer-account-edit" data-id="${account.id}" data-username="${safe(account.username)}">Manage</button></li>`).join('')}</ul>`:empty('No customer login is linked to this project.');
  document.querySelectorAll('.customer-account-edit').forEach(button=>button.onclick=()=>editCustomerAccount(button.dataset.id,button.dataset.username));
}
function editCustomerAccount(userId,username){
  $('invite-user-id').value=userId;
  $('invite-username').value=username;
  $('invite-password').value='';
  $('invite-password').required=false;
  $('invite-password').placeholder='Leave blank to keep current password';
  $('customer-login-submit').textContent='Save Customer Login';
  $('customer-login-cancel').classList.remove('hidden');
  $('invite-username').focus();
}
function clearCustomerAccountForm(){
  $('invite-form').reset();
  $('invite-user-id').value='';
  $('invite-password').required=true;
  $('invite-password').placeholder='';
  $('customer-login-submit').textContent='Create Customer Login';
  $('customer-login-cancel').classList.add('hidden');
}
$('customer-login-cancel').onclick=clearCustomerAccountForm;

$('invite-form').onsubmit=async e=>{e.preventDefault();
const {data:{session}}=await sb.auth.getSession();
const r=await fetch('/.netlify/functions/invite-client',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({userId:$('invite-user-id').value,username:$('invite-username').value.trim(),password:$('invite-password').value,projectId})});
const out=await r.json();
if(r.ok){clearCustomerAccountForm();loadCustomerAccounts()}
show(out.message||out.error,r.ok?'success':'error')};

$('schedule-form').onsubmit=async e=>{e.preventDefault();
const id=$('schedule-id').value,payload={project_id:projectId,title:$('schedule-title').value,description:$('schedule-description').value,target_date:$('schedule-date').value||null,status:$('schedule-status').value,sort_order:0};
const result=id?await sb.from('milestones').update(payload).eq('id',id):await sb.from('milestones').insert(payload);
if(result.error)return show(result.error.message,'error');
clearSchedule();
show('Weekly schedule saved.');
loadSchedule()};
$('schedule-cancel').onclick=clearSchedule;

$('photo-form').onsubmit=async e=>{e.preventDefault();
const f=$('photo-file').files[0],path=`${projectId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
let {error}=await sb.storage.from('project-photos').upload(path,f);
if(error)return show(error.message,'error');
({error}=await sb.from('project_photos').insert({project_id:projectId,caption:$('photo-caption').value,bucket:'project-photos',storage_path:path,taken_at:new Date().toISOString()}));
if(error)return show(error.message,'error');
e.target.reset();
show('Photo and note shared.');
loadPhotos()};

$('document-form').onsubmit=async e=>{e.preventDefault();
const f=$('document-file').files[0],path=`${projectId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
let {error}=await sb.storage.from('project-files').upload(path,f);
if(error)return show(error.message,'error');
({error}=await sb.from('documents').insert({project_id:projectId,title:$('document-title').value,category:$('document-category').value,bucket:'project-files',storage_path:path,file_name:f.name}));
if(error)return show(error.message,'error');
e.target.reset();
show('Document shared.');
loadDocuments()};

$('message-form').onsubmit=async e=>{e.preventDefault();
const {data:{user}}=await sb.auth.getUser();
const body=($('message-important').checked?'IMPORTANT: ':'')+$('message-body').value.trim();
const {error}=await sb.from('messages').insert({project_id:projectId,sender_id:user.id,sender_role:'admin',body});
if(error)return show(error.message,'error');
e.target.reset();
$('message-important').checked=true;
show('Message sent.');
loadMessages()};
$('logout').onclick=async()=>{await sb.auth.signOut();
location.href='portal-login.html'};

let employees=[];
async function adminFetch(path,options={}){const {data:{session}}=await sb.auth.getSession();const response=await fetch(path,{...options,headers:{...(options.headers||{}),'Authorization':'Bearer '+session.access_token}});const out=await response.json();if(!response.ok)throw new Error(out.error||'Request failed.');return out}
async function loadEmployeeAdmin(){try{const out=await adminFetch('/.netlify/functions/manage-employees');employees=out.employees||[];const projectOptions=(out.projects||[]).map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join('');$('employee-projects').innerHTML=projectOptions;$('schedule-project').innerHTML='<option value="">No project</option>'+projectOptions;renderEmployees();fillEmployeeSelectors();await Promise.all([loadEmployeeNotes(),loadEmployeeScheduleAdmin(),loadAdminInternal()])}catch(error){show(error.message,'error')}}
function renderEmployees(){$('employees-list').innerHTML=employees.length?`<ul class="portal-list">${employees.map(e=>`<li class="managed-row"><div><strong>${safe(e.full_name)}</strong><br><span class="portal-muted">${safe(e.job_title||'Employee')} · ${e.active?'Active':'Inactive'} · ${safe(e.username)}</span></div><div class="item-actions"><button class="portal-btn light employee-edit" data-id="${e.user_id}">Manage</button><button class="portal-btn danger employee-delete" data-id="${e.user_id}">Delete</button></div></li>`).join('')}</ul>`:empty('No employees have been added.');document.querySelectorAll('.employee-edit').forEach(b=>b.onclick=()=>editEmployee(b.dataset.id));document.querySelectorAll('.employee-delete').forEach(b=>b.onclick=()=>deleteEmployee(b.dataset.id))}
function fillEmployeeSelectors(){const options=employees.filter(e=>e.active).map(e=>`<option value="${e.user_id}">${safe(e.full_name)}</option>`).join('');$('note-employee').innerHTML=options;$('schedule-employee').innerHTML=options;$('admin-internal-recipient').innerHTML='<option value="">Team Chat — everyone</option>'+employees.filter(e=>e.active).map(e=>`<option value="${e.user_id}">Private — ${safe(e.full_name)}</option>`).join('')}
function editEmployee(id){const e=employees.find(x=>x.user_id===id);if(!e)return;$('employee-id').value=e.user_id;$('employee-full-name').value=e.full_name||'';$('employee-job-title').value=e.job_title||'';$('employee-phone').value=e.phone||'';$('employee-username').value=e.username||'';$('employee-password').value='';$('employee-active').checked=e.active;[...$('employee-projects').options].forEach(o=>o.selected=(e.project_ids||[]).includes(o.value));$('employee-form').scrollIntoView({behavior:'smooth'})}
function clearEmployeeForm(){$('employee-form').reset();$('employee-id').value='';$('employee-active').checked=true;[...$('employee-projects').options].forEach(o=>o.selected=false)}
$('employee-cancel').onclick=clearEmployeeForm;
$('employee-form').onsubmit=async e=>{e.preventDefault();try{const payload={userId:$('employee-id').value,fullName:$('employee-full-name').value.trim(),jobTitle:$('employee-job-title').value.trim(),phone:$('employee-phone').value.trim(),username:$('employee-username').value.trim(),password:$('employee-password').value,active:$('employee-active').checked,projectIds:[...$('employee-projects').selectedOptions].map(o=>o.value)};await adminFetch('/.netlify/functions/manage-employees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});clearEmployeeForm();show('Employee account saved.');await loadEmployeeAdmin()}catch(error){show(error.message,'error')}};
async function deleteEmployee(id){if(!confirm('Permanently delete this employee login and assignments?'))return;try{await adminFetch('/.netlify/functions/manage-employees',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})});show('Employee account deleted.');await loadEmployeeAdmin()}catch(error){show(error.message,'error')}}
async function loadEmployeeNotes(){const {data=[]}=await sb.from('employee_notes').select('*').order('created_at',{ascending:false});$('employee-notes-list').innerHTML=data.length?`<ul class="portal-list">${data.map(n=>`<li><strong>${safe(employees.find(e=>e.user_id===n.employee_id)?.full_name||'Employee')}</strong><span class="portal-muted"> · ${new Date(n.created_at).toLocaleString()}</span><p>${safe(n.body)}</p></li>`).join('')}</ul>`:empty('No private employee notes.')}
$('employee-note-form').onsubmit=async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();const {error}=await sb.from('employee_notes').insert({employee_id:$('note-employee').value,body:$('employee-note-body').value.trim(),created_by:user.id});if(error)return show(error.message,'error');e.target.reset();show('Private note saved.');loadEmployeeNotes()};
async function loadEmployeeScheduleAdmin(){const {data=[]}=await sb.from('employee_schedule').select('*,projects(name)').order('starts_at');$('employee-schedule-list').innerHTML=data.length?`<div class="schedule-stack">${data.map(x=>`<article class="schedule-item"><div><strong>${safe(x.title)}</strong><span>${safe(employees.find(e=>e.user_id===x.employee_id)?.full_name||'Employee')} · ${new Date(x.starts_at).toLocaleString()}${x.projects?.name?' · '+safe(x.projects.name):''}</span><p>${safe(x.details||'')}</p></div><button class="portal-btn danger employee-schedule-delete" data-id="${x.id}">Delete</button></article>`).join('')}</div>`:empty('No employee schedule items.');document.querySelectorAll('.employee-schedule-delete').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this schedule item?'))return;const {error}=await sb.from('employee_schedule').delete().eq('id',b.dataset.id);if(error)return show(error.message,'error');loadEmployeeScheduleAdmin()})}
$('employee-schedule-form').onsubmit=async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();const {error}=await sb.from('employee_schedule').insert({employee_id:$('schedule-employee').value,project_id:$('schedule-project').value||null,title:$('employee-schedule-title').value.trim(),details:$('employee-schedule-details').value.trim(),starts_at:new Date($('employee-schedule-start').value).toISOString(),ends_at:$('employee-schedule-end').value?new Date($('employee-schedule-end').value).toISOString():null,status:$('employee-schedule-status').value,created_by:user.id});if(error)return show(error.message,'error');e.target.reset();show('Employee schedule updated.');loadEmployeeScheduleAdmin()};
async function loadAdminInternal(){const {data=[]}=await sb.from('internal_messages').select('*').order('created_at',{ascending:false}).limit(100);$('admin-internal-thread').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li><span class="status-pill">${x.recipient_id?'Private':'Team Chat'}</span><span class="portal-muted"> · ${new Date(x.created_at).toLocaleString()}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No internal messages.')}
$('admin-internal-form').onsubmit=async e=>{e.preventDefault();const {data:{user}}=await sb.auth.getUser();const {error}=await sb.from('internal_messages').insert({sender_id:user.id,recipient_id:$('admin-internal-recipient').value||null,project_id:projectId,body:$('admin-internal-body').value.trim()});if(error)return show(error.message,'error');e.target.reset();show('Internal message sent.');loadAdminInternal()};
guard();
