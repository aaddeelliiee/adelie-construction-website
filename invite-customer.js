const cfg=window.ADELIE_PORTAL_CONFIG,sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey),$=id=>document.getElementById(id);
function show(text,type='success'){const box=$('invite-message');box.textContent=text;box.className='notice '+type}
async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return location.href='portal-login.html';
  const {data:isAdmin}=await sb.rpc('is_portal_admin');
  if(!isAdmin)return location.href='portal.html';
  const {data=[],error}=await sb.from('projects').select('id,name').order('name');
  if(error)return show(error.message,'error');
  $('invite-project').innerHTML=data.map(project=>`<option value="${project.id}">${project.name}</option>`).join('');
}
$('invite-form').onsubmit=async event=>{
  event.preventDefault();
  const button=event.submitter;
  button.disabled=true;
  button.textContent='Creating login…';
  const {data:{session}}=await sb.auth.getSession();
  const response=await fetch('/.netlify/functions/invite-client',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
    body:JSON.stringify({username:$('invite-username').value.trim(),password:$('invite-password').value,projectId:$('invite-project').value})
  });
  const out=await response.json();
  show(out.message||out.error,response.ok?'success':'error');
  if(response.ok)event.target.reset();
  button.disabled=false;
  button.textContent='Create Customer Login';
};
init();
