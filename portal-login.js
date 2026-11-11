const cfg=window.ADELIE_PORTAL_CONFIG;
const sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const msg=document.getElementById('login-message');
function show(text,type=''){msg.textContent=text;msg.className='notice '+type}
async function route() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: isAdmin } = await sb.rpc('is_portal_user');
  if (isAdmin) return location.replace('portal-admin.html');
  const { data: isEmployee } = await sb.rpc('is_employee');
  if (isEmployee) return location.replace('portal-employee.html');
  const { data: onboarding } = await sb.from('customer_onboarding')
    .select('id,project_id').eq('user_id', session.user.id).maybeSingle();
  if (onboarding && !onboarding.project_id) return location.replace('portal-questionnaire.html');
  const { data: questionnaires } = await sb.from('finish_questionnaires')
    .select('project_id').eq('user_id', session.user.id).is('submitted_at', null).limit(1);
  if (questionnaires?.length) return location.replace('portal-questionnaire.html?project=' + encodeURIComponent(questionnaires[0].project_id));
  location.replace('portal.html');
}
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
  const {data,error}=await sb.auth.signInWithPassword({email:authEmail,password});
  if(error)return show('Username or password is incorrect. Ask ADELIE to confirm the username or assign a new password.','error');
  if(data.session){
    try{
      await fetch('/.netlify/functions/customer-login-log',{
        method:'POST',
        headers:{'Authorization':'Bearer '+data.session.access_token}
      });
    }catch(error){
      console.warn('Customer login activity could not be recorded.',error);
    }
  }
  route();
});

document.getElementById('email-link-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    const email = document.getElementById('email-link-address').value.trim().toLowerCase();
    await sb.auth.signInWithOtp({
      email, options: { shouldCreateUser: false, emailRedirectTo: new URL('portal-login.html', location.href).href }
    });
    show('If this email is linked to a portal account, check your inbox for a sign-in link.');
  } catch {
    show('The request could not be sent. Please try again.', 'error');
  } finally {
    button.disabled = false;
  }
});
