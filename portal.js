const cfg=window.ADELIE_PORTAL_CONFIG,sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey),$=id=>document.getElementById(id);
let projectId=null,projectName='',currentUserId=null;
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—',empty=t=>`<div class="empty">${t}</div>`;

async function init(){const {data:{session}}=await sb.auth.getSession();
if(!session)return location.href='portal-login.html';
currentUserId=session.user.id;
$('user-email').textContent=session.user.email;
const {data:isAdmin}=await sb.rpc('is_portal_admin');
if(isAdmin)return location.href='portal-admin.html';
const {data:members,error}=await sb.from('project_members').select('project_id,projects(*)').eq('user_id',session.user.id).limit(1);
if(error||!members?.length){projectId=null;
$('app').classList.add('hidden');
$('loading').classList.remove('hidden');
$('loading').innerHTML=empty('Your account is active, but a project has not been assigned yet. Please contact ADELIE.');
return}const p=members[0].projects;
projectId=p.id;
projectName=p.name||'Customer project';
$('project-name').textContent=p.name;
$('project-address').textContent=p.address;
$('project-status').textContent=p.status;
$('current-phase').textContent=p.current_phase;
$('start-date').textContent=fmt(p.start_date);
$('completion-date').textContent=fmt(p.target_completion_date);
$('progress-bar').style.width=(p.progress_percent||0)+'%';
$('progress-label').textContent=(p.progress_percent||0)+'% complete';
await Promise.all([loadSchedule(),loadPhotos(),loadDocuments(),loadMessages()]);
$('loading').classList.add('hidden');
$('app').classList.remove('hidden')}
async function rows(table,order='created_at',ascending=false){const {data=[],error}=await sb.from(table).select('*').eq('project_id',projectId).order(order,{ascending});
return error?[]:data}async function signed(bucket,path){if(!path)return null;
if(path.startsWith('http')||path.startsWith('assets/'))return path;
const {data}=await sb.storage.from(bucket).createSignedUrl(path,3600);
return data?.signedUrl}
async function notifyCustomerUpload({type,fileName,note,customer}){
const body=new URLSearchParams({'form-name':'customer-portal-upload',project:projectName,customer:customer||'Customer portal user',upload_type:type,file_name:fileName,note:note||'',uploaded_at:new Date().toLocaleString(),portal_url:new URL('portal-admin.html',location.href).href});
const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
if(!response.ok)throw new Error('Upload saved, but the email notification could not be sent.');
}
async function loadSchedule(){const data=await rows('milestones','target_date',true);
$('schedule-list').innerHTML=data.length?`<div class="schedule-stack">${data.map(x=>`<article class="schedule-item"><div><strong>${safe(x.title)}</strong><span>${fmt(x.target_date)} · ${safe(x.status)}</span><p>${safe(x.description)}</p></div></article>`).join('')}</div>`:empty('No schedule has been shared yet.')}
async function loadPhotos(){const data=await rows('project_photos','taken_at',false),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-photos',x.storage_path)})));
$('photos-list').innerHTML=items.length?`<div class="photo-grid">${items.map(x=>`<figure>${x.url?`<a href="${x.url}" target="_blank" rel="noopener"><img src="${x.url}" alt="${safe(x.caption||'Project photo')}"></a>`:''}<figcaption>${safe(x.caption||'Progress photo')}</figcaption>${x.uploaded_role==='client'&&x.uploaded_by===currentUserId?`<button class="portal-btn danger customer-photo-delete" data-id="${x.id}" data-path="${safe(x.storage_path)}">Delete Photo &amp; Note</button>`:''}</figure>`).join('')}</div>`:empty('No photos have been shared yet.');
document.querySelectorAll('.customer-photo-delete').forEach(button=>button.onclick=()=>deleteCustomerPhoto(button.dataset.id,button.dataset.path))}
async function loadDocuments(){const data=await rows('documents'),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-files',x.storage_path)})));
$('documents-list').innerHTML=items.length?`<ul class="portal-list">${items.map(x=>`<li class="managed-row"><div><strong>${safe(x.title)}</strong><span class="portal-muted"> · ${safe(x.category)}</span>${x.notes?`<p>${safe(x.notes)}</p>`:''}${x.url?`<a href="${x.url}" target="_blank" rel="noopener">Open document</a>`:'File unavailable'}</div>${x.uploaded_role==='client'&&x.uploaded_by===currentUserId?`<button class="portal-btn danger customer-document-delete" data-id="${x.id}" data-path="${safe(x.storage_path)}">Delete</button>`:''}</li>`).join('')}</ul>`:empty('No documents have been shared yet.');
document.querySelectorAll('.customer-document-delete').forEach(button=>button.onclick=()=>deleteCustomerDocument(button.dataset.id,button.dataset.path))}
async function deleteCustomerPhoto(id,path){
  if(!confirm('Delete this photo and note? This cannot be undone.'))return;
  const {error:storageError}=await sb.storage.from('project-photos').remove([path]);
  if(storageError)return alert(storageError.message);
  const {error}=await sb.from('project_photos').delete().eq('id',id).eq('uploaded_by',currentUserId);
  if(error)return alert(error.message);
  loadPhotos();
}
async function deleteCustomerDocument(id,path){
  if(!confirm('Delete this document and note? This cannot be undone.'))return;
  const {error:storageError}=await sb.storage.from('project-files').remove([path]);
  if(storageError)return alert(storageError.message);
  const {error}=await sb.from('documents').delete().eq('id',id).eq('uploaded_by',currentUserId);
  if(error)return alert(error.message);
  loadDocuments();
}
async function loadMessages(){const data=await rows('messages');
$('messages-list').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li class="${String(x.body).startsWith('IMPORTANT:')?'important-message':''}"><strong>${x.sender_role==='admin'?'ADELIE Construction':'You'}</strong><span class="portal-muted"> · ${new Date(x.created_at).toLocaleString()}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No messages yet.')}
$('message-form').onsubmit=async e=>{e.preventDefault();
const body=$('message-body').value.trim();
if(!body)return;
const {data:{user}}=await sb.auth.getUser();
const {error}=await sb.from('messages').insert({project_id:projectId,sender_id:user.id,sender_role:'client',body});
if(!error){e.target.reset();
loadMessages()}};
$('customer-photo-form').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('[type="submit"]'),file=$('customer-photo-file').files[0],note=$('customer-photo-note').value.trim();
  if(form.dataset.uploading==='true'||!file)return;
  if(!confirm(`Share "${file.name}" with ADELIE?`))return;
  form.dataset.uploading='true';button.disabled=true;button.textContent='Uploading...';
  try{
  const {data:{user}}=await sb.auth.getUser();
  const path=`${projectId}/customer/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
  let {error}=await sb.storage.from('project-photos').upload(path,file);
  if(!error)({error}=await sb.from('project_photos').insert({project_id:projectId,caption:note,bucket:'project-photos',storage_path:path,taken_at:new Date().toISOString(),uploaded_by:user.id,uploaded_role:'client'}));
  if(error){await sb.storage.from('project-photos').remove([path]);alert(error.message)}else{event.target.reset();await Promise.all([loadPhotos(),notifyCustomerUpload({type:'Photo',fileName:file.name,note,customer:user.email}).catch(()=>{})]);alert('Photo shared with ADELIE.')}
  }finally{form.dataset.uploading='false';button.disabled=false;button.textContent='Share Photo'}
};
$('customer-document-form').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('[type="submit"]'),file=$('customer-document-file').files[0],title=$('customer-document-title').value.trim(),notes=$('customer-document-note').value.trim();
  if(form.dataset.uploading==='true'||!file)return;
  if(!confirm(`Share "${file.name}" with ADELIE?`))return;
  form.dataset.uploading='true';button.disabled=true;button.textContent='Uploading...';
  try{
  const {data:{user}}=await sb.auth.getUser();
  const path=`${projectId}/customer/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
  let {error}=await sb.storage.from('project-files').upload(path,file);
  if(!error)({error}=await sb.from('documents').insert({project_id:projectId,title,category:'Customer Upload',notes,bucket:'project-files',storage_path:path,file_name:file.name,uploaded_by:user.id,uploaded_role:'client'}));
  if(error){await sb.storage.from('project-files').remove([path]);alert(error.message)}else{event.target.reset();await Promise.all([loadDocuments(),notifyCustomerUpload({type:'Document',fileName:file.name,note:notes,customer:user.email}).catch(()=>{})]);alert('Document shared with ADELIE.')}
  }finally{form.dataset.uploading='false';button.disabled=false;button.textContent='Share Document'}
};
$('logout').onclick=async()=>{await sb.auth.signOut();
location.href='portal-login.html'};
init();
