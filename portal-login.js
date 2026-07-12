const cfg=window.ADELIE_PORTAL_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const msg=document.getElementById('login-message');
function show(text,type=''){msg.textContent=text;msg.className='notice '+type}
async function route(){const {data}=await sb.auth.getSession();if(!data.session)return;const {data:isAdmin}=await sb.rpc('is_portal_admin');if(isAdmin)return location.href='portal-admin.html';const {data:isEmployee}=await sb.rpc('is_employee');location.href=isEmployee?'portal-employee.html':'portal.html'}
route();
document.getElementById('login-form').addEventListener('submit',async event=>{
  event.preventDefault();
  show('Signing in…');
  const loginId=document.getElementById('login-id').value.trim().toLowerCase();
  let authEmail=loginId;
  if(!loginId.includes('@')){
    const employeeLogin=document.getElementById('account-type')?.value==='employee';
    authEmail=`${loginId}@${employeeLogin?'employees':'portal'}.adelieconstruction.com`;
  }
  const password=document.getElementById('password').value;
  const {error}=await sb.auth.signInWithPassword({email:authEmail,password});
  if(error)return show('Username or password is incorrect. Ask ADELIE to confirm the username or assign a new password.','error');
  route();
});
