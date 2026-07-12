let portalSyncBusy=false;

async function refreshPortalData(){
  if(portalSyncBusy||!navigator.onLine||document.hidden)return;
  if(document.activeElement?.matches('input, textarea, select'))return;
  portalSyncBusy=true;
  try{
    if(document.body.classList.contains('customer-portal')){
      if(typeof init==='function')await init();
    }else if(typeof loadProjects==='function'){
      await loadProjects();
    }
  }catch(error){
    console.warn('Portal background refresh will retry.',error);
  }finally{
    portalSyncBusy=false;
  }
}

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)refreshPortalData();
});
window.addEventListener('focus',refreshPortalData);
window.addEventListener('online',refreshPortalData);
setInterval(refreshPortalData,15000);
