const {createClient}=require('@supabase/supabase-js');
const crypto=require('crypto');
const BUCKET='lead-uploads',MAX_SIZE=25*1024*1024;
const ALLOWED=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']);
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed.'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return reply(500,{error:'Secure uploads are not configured.'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request.'})}
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(body.action==='download'){
    const path=String(body.path||'');
    if(!/^public-leads\/[a-f0-9-]{36}\//.test(path))return reply(400,{error:'Invalid file path.'});
    const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,60*60*24*7);
    return error?reply(400,{error:error.message}):reply(200,{url:data.signedUrl});
  }
  const fileName=String(body.fileName||'').slice(0,180),size=Number(body.size||0),type=String(body.type||'');
  if(!fileName||!Number.isFinite(size)||size<=0||size>MAX_SIZE)return reply(400,{error:'Each file must be 25 MB or smaller.'});
  if(!ALLOWED.has(type))return reply(400,{error:'Upload a JPG, PNG, WebP, HEIC, or PDF file.'});
  const clean=fileName.replace(/[^a-zA-Z0-9._-]/g,'-'),path=`public-leads/${crypto.randomUUID()}/${clean}`;
  const {data:bucket}=await db.storage.getBucket(BUCKET);
  if(!bucket){
    const {error:createError}=await db.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_SIZE,allowedMimeTypes:[...ALLOWED]});
    if(createError&&!/already exists/i.test(createError.message))return reply(400,{error:createError.message});
  }
  const {data,error}=await db.storage.from(BUCKET).createSignedUploadUrl(path);
  return error?reply(400,{error:error.message}):reply(200,{path,token:data.token});
};
