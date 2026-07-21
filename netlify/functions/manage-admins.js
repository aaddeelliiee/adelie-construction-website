const {createClient}=require('@supabase/supabase-js');
const ALLOWED=new Set(['projects','customers','content','employees']);
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

exports.handler=async event=>{
  if(!['GET','POST','DELETE'].includes(event.httpMethod))return reply(405,{error:'Method not allowed.'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return reply(500,{error:'Administrator management is not configured.'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user)return reply(401,{error:'Please sign in again.'});
  const {data:caller}=await db.from('portal_admins').select('*').eq('user_id',user.id).maybeSingle();
  if(!caller?.is_owner)return reply(403,{error:'Only the protected owner account can manage administrators.'});

  const listAdmins=async()=>{
    const {data:roles=[],error}=await db.from('portal_admins').select('*').order('created_at');
    if(error)throw error;
    const {data:list,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(listError)throw listError;
    const users=new Map((list?.users||[]).map(item=>[item.id,item]));
    return roles.map(role=>({user_id:role.user_id,email:users.get(role.user_id)?.email||'',full_name:role.full_name||users.get(role.user_id)?.user_metadata?.full_name||'',is_owner:role.is_owner,permissions:role.permissions||[]}));
  };

  if(event.httpMethod==='GET'){
    try{return reply(200,{administrators:await listAdmins(),current_user_id:user.id})}catch(error){return reply(400,{error:error.message})}
  }

  let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request.'})}
  const targetId=String(body.userId||'');
  if(targetId){
    const {data:target}=await db.from('portal_admins').select('*').eq('user_id',targetId).maybeSingle();
    if(!target)return reply(404,{error:'Administrator account not found.'});
    if(target.is_owner)return reply(403,{error:'The protected owner account cannot be modified or deleted.'});
  }

  if(event.httpMethod==='DELETE'){
    if(!targetId)return reply(400,{error:'Choose an administrator account.'});
    const {error}=await db.auth.admin.deleteUser(targetId);
    return error?reply(400,{error:error.message}):reply(200,{message:'Administrator account deleted.'});
  }

  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||''),fullName=String(body.fullName||'').trim();
  const permissions=[...new Set(Array.isArray(body.permissions)?body.permissions.filter(item=>ALLOWED.has(item)):[])];
  if(!/^\S+@\S+\.\S+$/.test(email))return reply(400,{error:'Enter a valid administrator email.'});
  if(!targetId&&password.length<12)return reply(400,{error:'Temporary password must be at least 12 characters.'});
  if(targetId&&password&&password.length<12)return reply(400,{error:'New password must be at least 12 characters.'});
  if(!permissions.length)return reply(400,{error:'Select at least one permission.'});

  let adminUser;
  if(targetId){
    const updates={email,email_confirm:true,user_metadata:{full_name:fullName,portal_role:'admin'}};
    if(password)updates.password=password;
    const {data,error}=await db.auth.admin.updateUserById(targetId,updates);
    if(error)return reply(400,{error:error.message});
    adminUser=data.user;
  }else{
    const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,portal_role:'admin'}});
    if(error)return reply(400,{error:error.message});
    adminUser=data.user;
  }
  const {error:roleError}=await db.from('portal_admins').upsert({user_id:adminUser.id,full_name:fullName,is_owner:false,permissions});
  if(roleError){if(!targetId)await db.auth.admin.deleteUser(adminUser.id);return reply(400,{error:roleError.message})}
  return reply(200,{message:targetId?'Administrator account updated.':'Administrator account created.'});
};
