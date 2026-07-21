const cfg=window.ADELIE_PORTAL_CONFIG,sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey),$=id=>document.getElementById(id);
let projects=[],projectId=null,schedule=[],adminAccess={is_owner:false,permissions:[]};

const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'Date TBD',empty=t=>`<div class="empty">${t}</div>`;

function show(text,type='success'){const box=$('admin-message');
box.textContent=text;
box.className='notice '+type;
scrollTo({top:0,behavior:'smooth'});
setTimeout(()=>box.classList.add('hidden'),5000)}
async function guard(){const {data:{session}}=await sb.auth.getSession();
if(!session)return location.href='portal-login.html';
const {data:isAdmin}=await sb.rpc('is_portal_user');
if(!isAdmin)return location.href='portal.html';
const {data:access,error}=await sb.from('portal_admins').select('is_owner,permissions').eq('user_id',session.user.id).single();
if(error)return show(error.message,'error');
adminAccess=access||adminAccess;applyAdminAccess();
await loadProjects();
if(hasPermission('employees'))await loadEmployeeAdmin();
if(adminAccess.is_owner)await loadAdministratorAccounts()}
function hasPermission(permission){return adminAccess.is_owner||adminAccess.permissions?.includes('*')||adminAccess.permissions?.includes(permission)}
function applyAdminAccess(){
  document.querySelectorAll('[data-requires-permission]').forEach(element=>element.classList.toggle('hidden',!hasPermission(element.dataset.requiresPermission)));
  document.querySelectorAll('[data-owner-only]').forEach(element=>element.classList.toggle('hidden',!adminAccess.is_owner));
  window.dispatchEvent(new Event('portalpermissionschange'));
}
async function loadProjects(){const {data,error}=await sb.from('projects').select('*').order('created_at',{ascending:false});
if(error)return show(error.message,'error');
projects=data||[];
$('active-count').textContent=projects.filter(p=>p.status==='Active').length;
const projectOptions=projects.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join('');
$('current-project').innerHTML=projectOptions;
$('customer-project-select').innerHTML=projectOptions;
if(!projects.some(p=>p.id===projectId))projectId=projects[0]?.id||null;
if(projectId){$('current-project').value=projectId;$('customer-project-select').value=projectId}
setProjectSetupAvailability();
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
  $('employee-approval-list').innerHTML=empty('Create a project to receive employee updates.');
  return;
}
await loadProject()}
async function loadProject(){const p=projects.find(x=>x.id===projectId);
if(!p)return;
$('current-project').value=projectId;
$('customer-project-select').value=projectId;
$('customer-project-confirmation').innerHTML=`Customer access will be linked to <strong>${safe(p.name)}</strong>${p.address?` at ${safe(p.address)}`:''}.`;
$('project-name').value=p.name||'';
$('project-address').value=p.address||'';
$('project-phase').value=p.current_phase||'';
$('project-status').value=p.status||'Active';
$('project-progress').value=p.progress_percent||0;
$('progress-value').textContent=(p.progress_percent||0)+'%';
$('project-start').value=p.start_date||'';
$('project-end').value=p.target_completion_date||'';
const tasks=[];
if(hasPermission('content'))tasks.push(loadSchedule(),loadPhotos(),loadDocuments(),loadMessages(),loadCustomerUploads(),loadEmployeeApprovals());
if(hasPermission('customers'))tasks.push(loadCustomerAccounts());
await Promise.all(tasks)}
function setProjectSetupAvailability(){
  const hasProject=Boolean(projectId);
  [...$('invite-form').elements,...$('project-details-form').elements].forEach(control=>control.disabled=!hasProject);
  $('customer-project-select').disabled=!hasProject;
  if(!hasProject)$('customer-project-confirmation').textContent='Create a project in Step 1 before creating a customer login.';
}
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
async function loadPhotos(){const data=(await rows('project_photos','taken_at',false)).filter(x=>x.uploaded_role!=='employee'||x.approval_status==='approved'),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-photos',x.storage_path)})));
$('photos-list').innerHTML=items.length?`<div class="photo-grid">${items.map(x=>`<figure>${x.url?`<a href="${x.url}" target="_blank" rel="noopener"><img src="${x.url}" alt="${safe(x.caption||'Project photo')}"></a>`:''}<figcaption><span class="status-pill status-approved">Visible to customer</span><p>${safe(x.caption||'Progress photo')}</p></figcaption><button class="portal-btn danger photo-delete" data-id="${x.id}" data-path="${safe(x.storage_path||'')}">Delete Photo &amp; Note</button></figure>`).join('')}</div>`:empty('No customer-visible photos have been published yet.');
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
async function loadEmployeeApprovals(){
  const data=await rows('project_photos','created_at',false);
  const submissions=await Promise.all(data.filter(item=>item.uploaded_role==='employee').map(async item=>({...item,url:await signed(item.bucket||'project-photos',item.storage_path)})));
  const pending=submissions.filter(item=>(item.approval_status||'pending')==='pending');
  const reviewed=submissions.filter(item=>item.approval_status&&item.approval_status!=='pending');
  const pendingHtml=pending.length?`<div class="approval-grid">${pending.map(item=>`<article class="approval-card"><div>${item.url?`<a href="${item.url}" target="_blank" rel="noopener"><img src="${item.url}" alt="${safe(item.caption||'Employee project update')}"></a>`:''}</div><div><span class="status-pill status-pending">Pending · Not visible to customer</span><h3>${safe(item.caption||'No note provided')}</h3><p class="portal-muted">Submitted ${new Date(item.created_at).toLocaleString()}</p><label>Feedback to employee<textarea class="approval-note" data-id="${item.id}" maxlength="1000" placeholder="Optional feedback"></textarea></label><div class="item-actions"><button class="portal-btn primary employee-photo-approve" data-id="${item.id}">Approve &amp; Publish</button><button class="portal-btn danger employee-photo-reject" data-id="${item.id}">Reject</button></div></div></article>`).join('')}</div>`:empty('No updates are waiting for approval.');
  const reviewedHtml=reviewed.length?`<details class="review-history"><summary>Reviewed employee updates (${reviewed.length})</summary><div class="approval-grid">${reviewed.map(item=>`<article class="approval-card compact"><div>${item.url?`<a href="${item.url}" target="_blank" rel="noopener"><img src="${item.url}" alt="${safe(item.caption||'Employee project update')}"></a>`:''}</div><div><span class="status-pill status-${safe(item.approval_status)}">${item.approval_status==='approved'?'Approved · Visible to customer':'Rejected · Not visible to customer'}</span><h3>${safe(item.caption||'No note provided')}</h3>${item.review_note?`<p><strong>Review note:</strong> ${safe(item.review_note)}</p>`:''}</div></article>`).join('')}</div></details>`:'';
  $('employee-approval-list').innerHTML=pendingHtml+reviewedHtml;
  document.querySelectorAll('.employee-photo-approve').forEach(button=>button.onclick=()=>reviewEmployeePhoto(button.dataset.id,'approved'));
  document.querySelectorAll('.employee-photo-reject').forEach(button=>button.onclick=()=>reviewEmployeePhoto(button.dataset.id,'rejected'));
}
async function reviewEmployeePhoto(id,status){
  const note=document.querySelector(`.approval-note[data-id="${id}"]`)?.value.trim()||null;
  if(!confirm(status==='approved'?'Approve and publish this update to the customer?':'Reject this update?'))return;
  const {data:{user}}=await sb.auth.getUser();
  const {error}=await sb.from('project_photos').update({approval_status:status,review_note:note,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',id);
  if(error)return show(error.message,'error');show(status==='approved'?'Update approved and published to the customer.':'Update rejected.');await Promise.all([loadEmployeeApprovals(),loadPhotos()])
}
async function loadMessages(){const data=await rows('messages');
$('message-count').textContent=data.filter(x=>x.sender_role==='client').length;
$('messages-list').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li><strong>${x.sender_role==='admin'?'ADELIE':'Customer'}</strong><span class="portal-muted"> · ${new Date(x.created_at).toLocaleString()}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No messages yet.')}
async function selectProject(id){projectId=id;$('current-project').value=id;$('customer-project-select').value=id;clearCustomerAccountForm();await loadProject()}
$('current-project').onchange=e=>selectProject(e.target.value);
$('customer-project-select').onchange=e=>selectProject(e.target.value);
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
await loadProjects();
$('customer-project-confirmation').scrollIntoView({behavior:'smooth',block:'center'});
$('invite-username').focus();
show('Project created and selected. Complete Step 2 to create its customer login.')};

async function loadCustomerAccounts(){
  const {data:{session}}=await sb.auth.getSession();
  const response=await fetch(`/.netlify/functions/invite-client?projectId=${encodeURIComponent(projectId)}`,{headers:{'Authorization':'Bearer '+session.access_token}});
  const out=await response.json();
  if(!response.ok){$('customer-accounts-list').innerHTML=empty(out.error||'Customer accounts could not be loaded.');return}
  $('customer-accounts-list').innerHTML=out.accounts.length?`<p class="portal-muted"><strong>Logins linked to this project</strong></p><ul class="portal-list">${out.accounts.map(account=>`<li class="managed-row"><div><strong>${safe(account.username)}</strong><br><span class="portal-muted">Password is protected and cannot be viewed.</span></div><div class="item-actions"><button class="portal-btn light customer-account-edit" data-id="${account.id}" data-username="${safe(account.username)}">Manage</button><button class="portal-btn danger customer-account-delete" data-id="${account.id}" data-username="${safe(account.username)}">Delete</button></div></li>`).join('')}</ul>`:empty('No customer login is linked to this project yet.');
  document.querySelectorAll('.customer-account-edit').forEach(button=>button.onclick=()=>editCustomerAccount(button.dataset.id,button.dataset.username));
  document.querySelectorAll('.customer-account-delete').forEach(button=>button.onclick=()=>deleteCustomerAccount(button.dataset.id,button.dataset.username));
}
async function deleteCustomerAccount(userId,username){
  if(!confirm(`Permanently delete the customer login "${username}"? They will no longer be able to sign in. Project information and uploads will not be deleted.`))return;
  const {data:{session}}=await sb.auth.getSession();
  const r=await fetch('/.netlify/functions/invite-client',{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({userId,projectId})});
  const out=await r.json();
  if(r.ok){if($('invite-user-id').value===userId)clearCustomerAccountForm();await loadCustomerAccounts()}
  show(out.message||out.error,r.ok?'success':'error');
}
function editCustomerAccount(userId,username){
  $('invite-user-id').value=userId;
  $('invite-username').value=username;
  $('invite-password').value='';
  $('invite-password').required=false;
  $('invite-password').placeholder='Leave blank to keep current password';
  $('customer-login-submit').textContent='Save Login for Selected Project';
  $('customer-login-cancel').classList.remove('hidden');
  $('invite-username').focus();
}
function clearCustomerAccountForm(){
  $('invite-form').reset();
  $('invite-user-id').value='';
  $('invite-password').required=true;
  $('invite-password').placeholder='';
  $('customer-login-submit').textContent='Create Login for Selected Project';
  $('customer-login-cancel').classList.add('hidden');
}
$('customer-login-cancel').onclick=clearCustomerAccountForm;

$('invite-form').onsubmit=async e=>{e.preventDefault();
if(!projectId)return show('Create or select a project before creating a customer login.','error');
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
const form=e.currentTarget,button=form.querySelector('[type="submit"]'),f=$('photo-file').files[0];
if(form.dataset.uploading==='true'||!f)return;
if(!confirm(`Upload "${f.name}" to this project?`))return;
form.dataset.uploading='true';button.disabled=true;button.textContent='Uploading...';
const path=`${projectId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
try{
let {error}=await sb.storage.from('project-photos').upload(path,f);
if(error){show(error.message,'error');return}
({error}=await sb.from('project_photos').insert({project_id:projectId,caption:$('photo-caption').value,bucket:'project-photos',storage_path:path,taken_at:new Date().toISOString()}));
if(error){await sb.storage.from('project-photos').remove([path]);show(error.message,'error');return}
form.reset();show('Photo uploaded successfully.');await loadPhotos()
}finally{form.dataset.uploading='false';button.disabled=false;button.textContent='Upload Photo'}};

$('document-form').onsubmit=async e=>{e.preventDefault();
const form=e.currentTarget,button=form.querySelector('[type="submit"]'),f=$('document-file').files[0];
if(form.dataset.uploading==='true'||!f)return;
if(!confirm(`Upload "${f.name}" to this project?`))return;
form.dataset.uploading='true';button.disabled=true;button.textContent='Uploading...';
const path=`${projectId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
try{
let {error}=await sb.storage.from('project-files').upload(path,f);
if(error){show(error.message,'error');return}
({error}=await sb.from('documents').insert({project_id:projectId,title:$('document-title').value,category:$('document-category').value,bucket:'project-files',storage_path:path,file_name:f.name}));
if(error){await sb.storage.from('project-files').remove([path]);show(error.message,'error');return}
form.reset();show('Document uploaded successfully.');await loadDocuments()
}finally{form.dataset.uploading='false';button.disabled=false;button.textContent='Upload Document'}};

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

let administrators=[];
const permissionLabels={projects:'Projects',customers:'Customer Accounts',content:'Customer-Facing Content',employees:'Employees'};
async function loadAdministratorAccounts(){
  try{
    const out=await adminFetch('/.netlify/functions/manage-admins');administrators=out.administrators||[];
    $('administrators-list').innerHTML=administrators.length?`<ul class="portal-list">${administrators.map(account=>`<li class="managed-row"><div><strong>${safe(account.full_name||account.email)}</strong>${account.is_owner?'<span class="owner-badge">Protected Owner</span>':''}<br><span class="portal-muted">${safe(account.email)}</span><div class="permission-tags">${account.is_owner||account.permissions?.includes('*')?'<span>Full access</span>':(account.permissions||[]).map(permission=>`<span>${safe(permissionLabels[permission]||permission)}</span>`).join('')}</div></div>${account.is_owner?'':`<div class="item-actions"><button class="portal-btn light administrator-edit" data-id="${account.user_id}">Manage</button><button class="portal-btn danger administrator-delete" data-id="${account.user_id}">Delete</button></div>`}</li>`).join('')}</ul>`:empty('No administrator accounts found.');
    document.querySelectorAll('.administrator-edit').forEach(button=>button.onclick=()=>editAdministrator(button.dataset.id));
    document.querySelectorAll('.administrator-delete').forEach(button=>button.onclick=()=>deleteAdministrator(button.dataset.id));
  }catch(error){show(error.message,'error')}
}
function editAdministrator(id){
  const account=administrators.find(item=>item.user_id===id);if(!account||account.is_owner)return;
  $('administrator-id').value=account.user_id;$('administrator-full-name').value=account.full_name||'';$('administrator-email').value=account.email||'';$('administrator-password').value='';$('administrator-password').required=false;
  document.querySelectorAll('[name="administrator-permission"]').forEach(input=>input.checked=(account.permissions||[]).includes(input.value)||account.permissions?.includes('*'));
  $('administrator-submit').textContent='Save Administrator';$('administrator-form').scrollIntoView({behavior:'smooth',block:'center'});
}
function clearAdministratorForm(){$('administrator-form').reset();$('administrator-id').value='';$('administrator-password').required=true;$('administrator-submit').textContent='Create Administrator'}
$('administrator-cancel').onclick=clearAdministratorForm;
$('administrator-form').onsubmit=async event=>{
  event.preventDefault();
  const permissions=[...document.querySelectorAll('[name="administrator-permission"]:checked')].map(input=>input.value);
  if(!permissions.length)return show('Select at least one administrator ability.','error');
  try{
    await adminFetch('/.netlify/functions/manage-admins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:$('administrator-id').value,fullName:$('administrator-full-name').value.trim(),email:$('administrator-email').value.trim(),password:$('administrator-password').value,permissions})});
    clearAdministratorForm();show('Administrator account saved.');await loadAdministratorAccounts();
  }catch(error){show(error.message,'error')}
};
async function deleteAdministrator(id){
  const account=administrators.find(item=>item.user_id===id);if(!account||account.is_owner)return;
  if(!confirm(`Permanently delete administrator "${account.email}"? They will immediately lose access.`))return;
  try{await adminFetch('/.netlify/functions/manage-admins',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})});show('Administrator account deleted.');await loadAdministratorAccounts()}catch(error){show(error.message,'error')}
}
guard();
