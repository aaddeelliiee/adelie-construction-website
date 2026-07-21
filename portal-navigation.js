(()=>{
  const nav=document.querySelector('.portal-sidebar');
  if(!nav)return;

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

    panels.forEach(panel=>{panel.hidden=panel!==activePanel});
    links.forEach(link=>{
      const active=link===activeLink;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });

    if(scroll)window.scrollTo({top:0,behavior:'smooth'});
  }

  links.forEach(link=>link.addEventListener('click',()=>{
    if(location.hash===link.hash)showSection({scroll:true});
  }));
  window.addEventListener('hashchange',()=>showSection({scroll:true}));
  window.addEventListener('portalpermissionschange',()=>showSection());
  showSection();
})();
