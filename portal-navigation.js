(()=>{
  const nav=document.querySelector('.portal-sidebar');
  if(!nav)return;

  const groups=[...nav.querySelectorAll('.portal-nav-group')];
  groups.forEach((heading,index)=>{
    heading.setAttribute('role','button');heading.setAttribute('tabindex','0');heading.setAttribute('aria-expanded','true');
    let node=heading.nextElementSibling;
    while(node&&!node.classList.contains('portal-nav-group')){if(node.matches('a')){node.classList.add('portal-group-item');node.dataset.portalGroup=String(index)}node=node.nextElementSibling}
    const toggle=()=>{const open=heading.getAttribute('aria-expanded')!=='false';heading.setAttribute('aria-expanded',String(!open));nav.querySelectorAll(`[data-portal-group="${index}"]`).forEach(link=>link.classList.toggle('portal-group-collapsed',open))};
    heading.addEventListener('click',toggle);heading.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}});
  });

  const loading=document.createElement('div');loading.className='portal-loading-layer';loading.innerHTML='<div class="portal-loading-mark">Preparing your workspace</div>';document.body.append(loading);

  nav.setAttribute('aria-label','Portal sections');
  const links=[...nav.querySelectorAll('a[href^="#"]')];
  const panels=links.map(link=>document.getElementById(link.hash.slice(1))).filter(Boolean);
  if(!links.length||!panels.length)return;

  document.body.classList.add('portal-section-mode');
  panels.forEach(panel=>panel.classList.add('portal-section-panel'));

  function showSection({scroll=false}={}){
    const requested=location.hash;
    const availableLinks=links.filter(link=>!link.classList.contains('hidden'));
    if(!availableLinks.length)return;
    const activeLink=availableLinks.find(link=>link.hash===requested)||availableLinks[0];
    const activePanel=document.getElementById(activeLink.hash.slice(1));

    loading.classList.add('visible');

    panels.forEach(panel=>{panel.hidden=panel!==activePanel});
    links.forEach(link=>{
      const active=link===activeLink;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });

    if(scroll)window.scrollTo({top:0,behavior:'smooth'});
    setTimeout(()=>loading.classList.remove('visible'),180);
  }

  links.forEach(link=>link.addEventListener('click',()=>{
    if(location.hash===link.hash)showSection({scroll:true});
  }));
  window.addEventListener('hashchange',()=>showSection({scroll:true}));
  window.addEventListener('portalpermissionschange',()=>showSection());
  showSection();
})();
