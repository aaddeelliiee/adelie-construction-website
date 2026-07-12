const cfg=window.ADELIE_PORTAL_CONFIG,sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey),$=id=>document.getElementById(id);
let projectId=null;
const safe=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—',empty=t=>`<div class="empty">${t}</div>`;

async function init(){const {data:{session}}=await sb.auth.getSession();
if(!session)return location.href='portal-login.html';
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
async function loadSchedule(){const data=await rows('milestones','target_date',true);
$('schedule-list').innerHTML=data.length?`<div class="schedule-stack">${data.map(x=>`<article class="schedule-item"><div><strong>${safe(x.title)}</strong><span>${fmt(x.target_date)} · ${safe(x.status)}</span><p>${safe(x.description)}</p></div></article>`).join('')}</div>`:empty('No schedule has been shared yet.')}
async function loadPhotos(){const data=await rows('project_photos','taken_at',false),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-photos',x.storage_path)})));
$('photos-list').innerHTML=items.length?`<div class="photo-grid">${items.map(x=>`<figure>${x.url?`<a href="${x.url}" target="_blank" rel="noopener"><img src="${x.url}" alt="${safe(x.caption||'Project photo')}"></a>`:''}<figcaption>${safe(x.caption||'Progress photo')}</figcaption></figure>`).join('')}</div>`:empty('No photos have been shared yet.')}
async function loadDocuments(){const data=await rows('documents'),items=await Promise.all(data.map(async x=>({...x,url:await signed(x.bucket||'project-files',x.storage_path)})));
$('documents-list').innerHTML=items.length?`<ul class="portal-list">${items.map(x=>`<li><strong>${safe(x.title)}</strong><span class="portal-muted"> · ${safe(x.category)}</span><br>${x.url?`<a href="${x.url}" target="_blank" rel="noopener">Open document</a>`:'File unavailable'}</li>`).join('')}</ul>`:empty('No documents have been shared yet.')}
async function loadMessages(){const data=await rows('messages');
$('messages-list').innerHTML=data.length?`<ul class="portal-list">${data.map(x=>`<li class="${String(x.body).startsWith('IMPORTANT:')?'important-message':''}"><strong>${x.sender_role==='admin'?'ADELIE Construction':'You'}</strong><span class="portal-muted"> · ${new Date(x.created_at).toLocaleString()}</span><p>${safe(x.body)}</p></li>`).join('')}</ul>`:empty('No messages yet.')}
$('message-form').onsubmit=async e=>{e.preventDefault();
const body=$('message-body').value.trim();
if(!body)return;
const {data:{user}}=await sb.auth.getUser();
const {error}=await sb.from('messages').insert({project_id:projectId,sender_id:user.id,sender_role:'client',body});
if(!error){e.target.reset();
loadMessages()}};
$('logout').onclick=async()=>{await sb.auth.signOut();
location.href='portal-login.html'};
init();
