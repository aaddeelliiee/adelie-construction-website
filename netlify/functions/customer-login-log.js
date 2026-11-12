const {createClient}=require('@supabase/supabase-js');

const reply=(statusCode,body)=>({
  statusCode,
  headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
  body:JSON.stringify(body)
});

exports.handler=async event=>{
  if(!['GET','POST'].includes(event.httpMethod))return reply(405,{error:'Method not allowed.'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return reply(500,{error:'Customer login logging is not configured.'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user)return reply(401,{error:'Please sign in again.'});

  if(event.httpMethod==='GET'){
    const {data:admin}=await db.from('portal_admins').select('is_owner,permissions').eq('user_id',user.id).maybeSingle();
    const canView=admin&&(admin.is_owner===true||admin.permissions?.includes('*')||admin.permissions?.includes('customers'));
    if(!canView)return reply(403,{error:'Customer-account permission required.'});
    let query=db.from('customer_login_log').select('*').order('logged_in_at',{ascending:false}).limit(250);
    if(!admin.is_owner&&!admin.permissions?.includes('*'))query=query.in('account_type',['customer','homeowner']);
    const {data,error}=await query;
    return error?reply(400,{error:error.message}):reply(200,{entries:data||[]});
  }

  const [{data:admin,error:adminError},{data:employee,error:employeeError},{data:membership,error:memberError},{data:onboarding,error:onboardingError}]=await Promise.all([
    db.from('portal_admins').select('full_name,is_owner').eq('user_id',user.id).maybeSingle(),
    db.from('employees').select('full_name,job_title').eq('user_id',user.id).eq('active',true).maybeSingle(),
    db.from('project_members').select('project_id,projects(name)').eq('user_id',user.id).eq('role','client').limit(1).maybeSingle(),
    db.from('customer_onboarding').select('full_name,email,address').eq('user_id',user.id).maybeSingle()
  ]);
  if(adminError||employeeError||memberError||onboardingError)return reply(400,{error:(adminError||employeeError||memberError||onboardingError).message});

  let accountType,username,projectId=null,context='';
  if(admin){
    accountType=admin.is_owner?'owner':'administrator';
    username=admin.full_name||user.user_metadata?.full_name||user.email||'Administrator';
    context=admin.is_owner?'Owner portal':'Administrator portal';
  }else if(employee){
    accountType='employee';
    username=employee.full_name||user.user_metadata?.full_name||user.email||'Employee';
    context=employee.job_title||'Employee portal';
  }else if(membership){
    accountType='customer';
    username=user.user_metadata?.portal_username||onboarding?.full_name||String(user.email||'').split('@')[0]||'Customer';
    projectId=membership.project_id;
    context=membership.projects?.name||'Project customer';
  }else if(onboarding){
    accountType='homeowner';
    username=onboarding.full_name||onboarding.email||user.email||'Homeowner';
    context=onboarding.address||'Homeowner account';
  }else{
    return {statusCode:204,headers:{'Cache-Control':'no-store'},body:''};
  }

  const forwarded=String(event.headers['x-forwarded-for']||'').split(',')[0].trim();
  const {error}=await db.from('customer_login_log').insert({
    user_id:user.id,
    project_id:projectId,
    username,
    project_name:context,
    account_type:accountType,
    ip_address:forwarded||event.headers['client-ip']||null,
    user_agent:String(event.headers['user-agent']||'').slice(0,500)
  });
  return error?reply(400,{error:error.message}):reply(201,{recorded:true});
};
