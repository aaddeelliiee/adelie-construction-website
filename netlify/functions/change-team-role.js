const {createClient}=require('@supabase/supabase-js');
const DOMAIN='employees.adelieconstruction.com',USERNAME=/^[a-z0-9._-]{3,32}$/,ALLOWED=new Set(['projects','customers','content','employees']);
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed.'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return reply(503,{error:'Team roles are not configured.'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const {data:{user}}=await db.auth.getUser(token);if(!user)return reply(401,{error:'Please sign in again.'});
  const {data:owner}=await db.from('portal_admins').select('is_owner').eq('user_id',user.id).maybeSingle();if(!owner?.is_owner)return reply(403,{error:'Only the protected owner can change team roles.'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request.'})}const userId=String(body.userId||''),action=String(body.action||'');if(!userId)return reply(400,{error:'Choose a team member.'});
  if(action==='promote'){
    const email=String(body.email||'').trim().toLowerCase(),permissions=[...new Set((body.permissions||[]).filter(x=>ALLOWED.has(x)))];if(!/^\S+@\S+\.\S+$/.test(email))return reply(400,{error:'Enter the email this administrator will use to sign in.'});if(!permissions.length)return reply(400,{error:'Select at least one administrator permission.'});
    const {data:employee}=await db.from('employees').select('*').eq('user_id',userId).maybeSingle();if(!employee)return reply(404,{error:'Employee account not found.'});
    const {error:authError}=await db.auth.admin.updateUserById(userId,{email,email_confirm:true,user_metadata:{full_name:employee.full_name,portal_role:'admin'}});if(authError)return reply(400,{error:authError.message});
    const {error:roleError}=await db.from('portal_admins').upsert({user_id:userId,full_name:employee.full_name,is_owner:false,permissions});if(roleError)return reply(400,{error:roleError.message});
    await db.from('employees').update({active:false,updated_at:new Date().toISOString()}).eq('user_id',userId);return reply(200,{message:`${employee.full_name} is now an administrator.`});
  }
  if(action==='demote'){
    const username=String(body.username||'').trim().toLowerCase();if(!USERNAME.test(username))return reply(400,{error:'Enter a 3–32 character employee username.'});
    const {data:admin}=await db.from('portal_admins').select('*').eq('user_id',userId).maybeSingle();if(!admin||admin.is_owner)return reply(403,{error:'This administrator cannot be converted.'});
    const email=`${username}@${DOMAIN}`,fullName=admin.full_name||username;const {error:authError}=await db.auth.admin.updateUserById(userId,{email,email_confirm:true,user_metadata:{portal_username:username,portal_role:'employee'}});if(authError)return reply(400,{error:authError.message});
    const {error:employeeError}=await db.from('employees').upsert({user_id:userId,full_name:fullName,job_title:String(body.jobTitle||'Team Member'),active:true,updated_at:new Date().toISOString()});if(employeeError)return reply(400,{error:employeeError.message});
    const {error:roleError}=await db.from('portal_admins').delete().eq('user_id',userId);return roleError?reply(400,{error:roleError.message}):reply(200,{message:`${fullName} is now an employee.`});
  }
  return reply(400,{error:'Choose a valid role change.'});
};
