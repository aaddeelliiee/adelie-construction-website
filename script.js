
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.main-nav');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
document.querySelectorAll('.reveal').forEach(el=>new IntersectionObserver(([entry],obs)=>{if(entry.isIntersecting){entry.target.classList.add('visible');obs.unobserve(entry.target)}},{threshold:.12}).observe(el));
document.querySelectorAll('#year').forEach(el=>el.textContent=new Date().getFullYear());


const assistant=document.querySelector('#adelie-assistant');
if(assistant){
  const toggle=assistant.querySelector('.assistant-toggle');
  const panel=assistant.querySelector('.assistant-panel');
  const close=assistant.querySelector('.assistant-close');
  const messages=assistant.querySelector('.assistant-messages');
  const answers={
    services:'ADELIE offers kitchens, bathrooms, whole-home remodeling, ADUs, additions, flooring, tile, painting, pools, cabinets, electrical and plumbing coordination.',
    areas:'ADELIE serves all 18 incorporated cities in San Diego County, plus selected communities including Fallbrook and Rancho Bernardo.',
    estimate:'Complete the form below or call 1-877-ADELIEC. Your information will be routed through the website lead system.',
    process:'The process includes consultation, site review, planning, proposal, pre-construction, construction updates and final handoff.'
  };
  function openPanel(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');}
  function closePanel(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
  close.addEventListener('click',closePanel);
  assistant.querySelectorAll('[data-question]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.question;
    const user=document.createElement('div');user.className='assistant-message user';user.textContent=btn.textContent;
    const bot=document.createElement('div');bot.className='assistant-message bot';bot.textContent=answers[key]||'Please call ADELIE for help.';
    messages.append(user,bot);messages.scrollTop=messages.scrollHeight;
  }));
}
