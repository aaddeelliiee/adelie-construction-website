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
await loadProjects()}
async function loadProjects(){const {data,error}=await sb.from('projects').select('*').order('created_at',{ascending:false});
if(error)return show(error.message,'error');
projects=data||[];
$('active-count').textContent=projects.filter(p=>p.status==='Active').length;
$('current-project').innerHTML=projects.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join('');
if(!projectId&&projects.length)projectId=projects[0].id;
if(projectId)$('current-project').value=projectId;
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
await Promise.all([loadSchedule(),loadPhotos(),loadDocuments(),loadMessages()])}
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
if(error)return show(error.message,'error');show('Photo and note deleted.');loadPhotos()}
async function loadDocuments(){const data=await rows('documents'),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-files',x.storage_path)})));
$('documents-list').innerHTML=items.length?`<ul class="portal-list">${items.map(x=>`<li class="managed-row"><div><strong>${safe(x.title)}</strong><span class="portal-muted"> · ${safe(x.category)}</span><br>${x.url?`<a href="${x.url}" target="_blank" rel="noopener">Open document</a>`:'File unavailable'}</div><button class="portal-btn danger document-delete" data-id="${x.id}" data-path="${safe(x.storage_path||'')}">Delete</button></li>`).join('')}</ul>`:empty('No documents shared yet.');
document.querySelectorAll('.document-delete').forEach(b=>b.onclick=()=>deleteDocument(b.dataset.id,b.dataset.path))}
async function deleteDocument(id,path){if(!confirm('Delete this document? The customer will no longer be able to open it.'))return;
if(path&&!path.startsWith('assets/')){const {error:storageError}=await sb.storage.from('project-files').remove([path]);if(storageError)return show(storageError.message,'error')}
const {error}=await sb.from('documents').delete().eq('id',id);
if(error)return show(error.message,'error');show('Document deleted.');loadDocuments()}
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

$('invite-form').onsubmit=async e=>{e.preventDefault();
const {data:{session}}=await sb.auth.getSession();
const r=await fetch('/.netlify/functions/invite-client',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({email:$('invite-email').value.trim(),projectId,redirectTo:location.origin+'/portal-login.html'})});
const out=await r.json();
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
guard();
