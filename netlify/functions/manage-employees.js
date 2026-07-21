const { createClient } = require('@supabase/supabase-js');
const DOMAIN='employees.adelieconstruction.com';
const USERNAME=/^[a-z0-9._-]{3,32}$/;
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

exports.handler=async event=>{
  if(!['GET','POST','DELETE'].includes(event.httpMethod))return reply(405,{error:'Method not allowed.'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return reply(500,{error:'Employee management is not configured.'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user)return reply(401,{error:'Please sign in again.'});
  const {data:admin}=await db.from('portal_admins').select('is_owner,permissions').eq('user_id',user.id).maybeSingle();
  if(!admin||(admin.is_owner!==true&&!admin.permissions?.includes('*')&&!admin.permissions?.includes('employees')))return reply(403,{error:'Employee-management permission required.'});

  if(event.httpMethod==='GET'){
    const [{data:employees,error},{data:assignments},{data:projects}]=await Promise.all([
      db.from('employees').select('*').order('full_name'),
      db.from('employee_project_assignments').select('*'),
      db.from('projects').select('id,name').order('name')
    ]);
    if(error)return reply(400,{error:error.message});
    const {data:list}=await db.auth.admin.listUsers({page:1,perPage:1000});
    const users=new Map((list?.users||[]).map(x=>[x.id,x]));
    return reply(200,{employees:(employees||[]).map(x=>({...x,username:users.get(x.user_id)?.user_metadata?.portal_username||'' ,project_ids:(assignments||[]).filter(a=>a.employee_id===x.user_id).map(a=>a.project_id)})),projects:projects||[]});
  }

  let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request.'})}
  if(event.httpMethod==='DELETE'){
    const id=String(body.userId||'');
    if(!id)return reply(400,{error:'Employee required.'});
    const {error}=await db.auth.admin.deleteUser(id);
    return error?reply(400,{error:error.message}):reply(200,{message:'Employee account deleted.'});
  }

  const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||''),userId=String(body.userId||'');
  if(!USERNAME.test(username))return reply(400,{error:'Username must be 3-32 letters, numbers, dots, dashes, or underscores.'});
  if(!userId&&password.length<10)return reply(400,{error:'Temporary password must be at least 10 characters.'});
  const email=`${username}@${DOMAIN}`;
  let employeeUser;
  if(userId){
    const updates={email,email_confirm:true,user_metadata:{portal_username:username,portal_role:'employee'}};
    if(password)updates.password=password;
    const {data,error}=await db.auth.admin.updateUserById(userId,updates);if(error)return reply(400,{error:error.message});employeeUser=data.user;
  }else{
    const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{portal_username:username,portal_role:'employee'}});if(error)return reply(400,{error:error.message});employeeUser=data.user;
  }
  const {error:employeeError}=await db.from('employees').upsert({user_id:employeeUser.id,full_name:String(body.fullName||username),job_title:String(body.jobTitle||''),phone:String(body.phone||''),active:body.active!==false});
  if(employeeError)return reply(400,{error:employeeError.message});
  await db.from('employee_project_assignments').delete().eq('employee_id',employeeUser.id);
  const projectIds=Array.isArray(body.projectIds)?body.projectIds.filter(Boolean):[];
  if(projectIds.length){const {error}=await db.from('employee_project_assignments').insert(projectIds.map(project_id=>({employee_id:employeeUser.id,project_id})));if(error)return reply(400,{error:error.message});}
  return reply(200,{message:'Employee account saved.'});
};
