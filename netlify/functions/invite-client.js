const { createClient } = require('@supabase/supabase-js');
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const DOMAIN = 'portal.adelieconstruction.com';
const customerEmail = username => `${username}@${DOMAIN}`;
const response = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) });

exports.handler = async event => {
  if (!['GET','POST','DELETE'].includes(event.httpMethod)) return response(405,{error:'Method not allowed.'});
  const url=process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return response(500,{error:'Portal access is not configured on Netlify.'});
  const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
  const token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const {data:authData,error:authError}=await admin.auth.getUser(token);
  if(authError||!authData?.user)return response(401,{error:'Please sign in again.'});
  const {data:allowed}=await admin.from('portal_admins').select('is_owner,permissions').eq('user_id',authData.user.id).maybeSingle();
  if(!allowed||(allowed.is_owner!==true&&!allowed.permissions?.includes('*')&&!allowed.permissions?.includes('customers')))return response(403,{error:'Customer-account permission required.'});

  const {data:userList,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listError)return response(400,{error:listError.message});

  if(event.httpMethod==='GET'){
    const projectId=String(event.queryStringParameters?.projectId||'');
    if(!projectId)return response(400,{error:'Choose a project.'});
    const {data:members=[],error}=await admin.from('project_members').select('user_id').eq('project_id',projectId).eq('role','client');
    if(error)return response(400,{error:error.message});
    const memberIds=new Set(members.map(item=>item.user_id));
    const accounts=userList.users.filter(user=>memberIds.has(user.id)).map(user=>({
      id:user.id,
      username:user.user_metadata?.portal_username||String(user.email||'').replace(`@${DOMAIN}`,'')
    }));
    return response(200,{accounts});
  }

  let payload;
  try{payload=JSON.parse(event.body||'{}')}catch{return response(400,{error:'Invalid request.'})}
  if(event.httpMethod==='DELETE'){
    const userId=String(payload.userId||'');
    const projectId=String(payload.projectId||'');
    if(!userId||!projectId)return response(400,{error:'Choose a customer login to delete.'});
    const {data:membership,error:membershipError}=await admin.from('project_members').select('user_id').eq('project_id',projectId).eq('user_id',userId).eq('role','client').maybeSingle();
    if(membershipError)return response(400,{error:membershipError.message});
    if(!membership)return response(403,{error:'That customer is not linked to this project.'});
    const customer=userList.users.find(user=>user.id===userId);
    if(!customer)return response(404,{error:'Customer account not found.'});
    const {error}=await admin.auth.admin.deleteUser(userId);
    if(error)return response(400,{error:error.message});
    return response(200,{message:'Customer login deleted.'});
  }

  const username=String(payload.username||'').trim().toLowerCase();
  const password=String(payload.password||'');
  const projectId=String(payload.projectId||'');
  const userId=String(payload.userId||'');
  if(!USERNAME_PATTERN.test(username))return response(400,{error:'Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.'});
  if(!projectId)return response(400,{error:'Choose a project.'});
  if(!userId&&password.length<10)return response(400,{error:'Password must contain at least 10 characters.'});
  if(userId&&password&&password.length<10)return response(400,{error:'New password must contain at least 10 characters.'});

  const email=customerEmail(username);
  const emailOwner=userList.users.find(user=>user.email?.toLowerCase()===email);
  let user;
  if(userId){
    const {data:membership}=await admin.from('project_members').select('user_id').eq('project_id',projectId).eq('user_id',userId).eq('role','client').maybeSingle();
    if(!membership)return response(403,{error:'That customer is not linked to this project.'});
    if(emailOwner&&emailOwner.id!==userId)return response(400,{error:'That username is already in use.'});
    const current=userList.users.find(item=>item.id===userId);
    if(!current)return response(404,{error:'Customer account not found.'});
    const updates={email,email_confirm:true,user_metadata:{...current.user_metadata,portal_username:username}};
    if(password)updates.password=password;
    const {data,error}=await admin.auth.admin.updateUserById(userId,updates);
    if(error)return response(400,{error:error.message});
    user=data.user;
  }else if(emailOwner){
    const {data,error}=await admin.auth.admin.updateUserById(emailOwner.id,{password,user_metadata:{...emailOwner.user_metadata,portal_username:username}});
    if(error)return response(400,{error:error.message});
    user=data.user;
  }else{
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{portal_username:username}});
    if(error)return response(400,{error:error.message});
    user=data.user;
  }

  const {error:profileError}=await admin.from('profiles').upsert({id:user.id,email,full_name:username});
  if(profileError)return response(400,{error:profileError.message});
  const {error:memberError}=await admin.from('project_members').upsert({project_id:projectId,user_id:user.id,role:'client'},{onConflict:'project_id,user_id'});
  if(memberError)return response(400,{error:memberError.message});
  if(password){
    const verifier=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
    const {error:verifyError}=await verifier.auth.signInWithPassword({email,password});
    if(verifyError)return response(400,{error:`The account was saved, but login verification failed: ${verifyError.message}`});
    await verifier.auth.signOut();
  }
  return response(200,{message:`Customer login saved. Username: ${username}`});
};
