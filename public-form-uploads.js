document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('form[name="project-inquiry"],form[name="project-rescue-application"]');
  if(!form||!window.supabase||!window.ADELIE_PORTAL_CONFIG)return;
  const client=window.supabase.createClient(window.ADELIE_PORTAL_CONFIG.supabaseUrl,window.ADELIE_PORTAL_CONFIG.supabaseAnonKey);
  const files=[...form.querySelectorAll('input[type="file"]')],button=form.querySelector('[type="submit"]');
  const status=document.createElement('p');status.className='form-note';status.setAttribute('aria-live','polite');button.before(status);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(form.dataset.submitting==='true')return;
    const selected=files.filter(input=>input.files[0]);
    if(selected.some(input=>input.files[0].size>25*1024*1024)){status.textContent='Each photo must be 25 MB or smaller.';return}
    form.dataset.submitting='true';button.disabled=true;const original=button.textContent;button.textContent=selected.length?'Uploading photos...':'Sending...';
    try{
      const links=[];
      for(let index=0;index<selected.length;index++){
        const file=selected[index].files[0];status.textContent=`Uploading photo ${index+1} of ${selected.length}...`;
        const signed=await fetch('/.netlify/functions/lead-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:file.name,size:file.size,type:file.type})});
        const upload=await signed.json();if(!signed.ok)throw new Error(upload.error||'Could not prepare the upload.');
        const {error}=await client.storage.from('lead-uploads').uploadToSignedUrl(upload.path,upload.token,file,{contentType:file.type});if(error)throw error;
        const downloadResponse=await fetch('/.netlify/functions/lead-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'download',path:upload.path})});
        const download=await downloadResponse.json();if(!downloadResponse.ok)throw new Error(download.error||'Could not create the secure file link.');
        links.push(`${file.name}: ${download.url}`);
      }
      status.textContent='Sending your project details...';
      const data=new FormData(form);files.forEach(input=>data.delete(input.name));
      if(links.length){
        const messageField=data.has('message')?'message':'help-request',current=String(data.get(messageField)||'');
        data.set(messageField,`${current}\n\nSecure photo links (available for 7 days):\n${links.join('\n')}`);
      }
      const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data).toString()});
      if(!response.ok)throw new Error('Your details could not be submitted. Please try again.');
      location.href=form.getAttribute('action')||'/thank-you.html';
    }catch(error){status.textContent=error.message||'The upload failed. Please try again.';form.dataset.submitting='false';button.disabled=false;button.textContent=original}
  });
});
