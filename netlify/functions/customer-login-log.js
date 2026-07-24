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
    const {data,error}=await db.from('customer_login_log').select('*').order('logged_in_at',{ascending:false}).limit(250);
    return error?reply(400,{error:error.message}):reply(200,{entries:data||[]});
  }

  const {data:membership,error:memberError}=await db.from('project_members').select('project_id,projects(name)').eq('user_id',user.id).eq('role','client').limit(1).maybeSingle();
  if(memberError)return reply(400,{error:memberError.message});
  if(!membership)return {statusCode:204,headers:{'Cache-Control':'no-store'},body:''};

  const forwarded=String(event.headers['x-forwarded-for']||'').split(',')[0].trim();
  const username=user.user_metadata?.portal_username||String(user.email||'').split('@')[0]||'Customer';
  const {error}=await db.from('customer_login_log').insert({
    user_id:user.id,
    project_id:membership.project_id,
    username,
    project_name:membership.projects?.name||'',
    ip_address:forwarded||event.headers['client-ip']||null,
    user_agent:String(event.headers['user-agent']||'').slice(0,500)
  });
  return error?reply(400,{error:error.message}):reply(201,{recorded:true});
};
