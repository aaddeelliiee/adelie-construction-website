(()=>{
  const topActions=document.querySelector('.portal-top-actions');
  if(!topActions||typeof sb==='undefined')return;

  const accountButton=document.createElement('button');
  accountButton.type='button';
  accountButton.className='portal-btn light';
  accountButton.textContent='My Account';
  const logoutButton=topActions.querySelector('#logout');
  topActions.insertBefore(accountButton,logoutButton||null);

  const modal=document.createElement('div');
  modal.className='portal-modal hidden';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','account-modal-title');
  modal.innerHTML=`<div class="account-modal-panel"><div class="account-modal-heading"><div><p class="portal-kicker">Signed-in account</p><h2 id="account-modal-title">My Account</h2></div><button class="account-close" type="button" aria-label="Close account settings">&times;</button></div><p id="account-email" class="portal-muted"></p><hr><h3>Change My Password</h3><p class="portal-muted">Use at least 12 characters. This changes only your own signed-in account.</p><form id="account-password-form" class="portal-form"><label>New password<input id="account-new-password" type="password" minlength="12" autocomplete="new-password" required></label><label>Confirm new password<input id="account-confirm-password" type="password" minlength="12" autocomplete="new-password" required></label><p id="account-status" class="notice hidden account-status"></p><div class="button-row"><button class="portal-btn primary" type="submit">Change My Password</button><button class="portal-btn light account-cancel" type="button">Cancel</button></div></form></div>`;
  document.body.appendChild(modal);

  const close=()=>{modal.classList.add('hidden');modal.querySelector('#account-password-form').reset()};
  accountButton.onclick=async()=>{
    const {data:{user}}=await sb.auth.getUser();
    modal.querySelector('#account-email').textContent=user?.email?`Signed in as ${user.email}`:'';
    modal.querySelector('#account-status').className='notice hidden account-status';
    modal.classList.remove('hidden');
    modal.querySelector('#account-new-password').focus();
  };
  modal.querySelector('.account-close').onclick=close;
  modal.querySelector('.account-cancel').onclick=close;
  modal.onclick=event=>{if(event.target===modal)close()};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.classList.contains('hidden'))close()});
  modal.querySelector('#account-password-form').onsubmit=async event=>{
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('[type="submit"]'),password=modal.querySelector('#account-new-password').value,confirmation=modal.querySelector('#account-confirm-password').value,status=modal.querySelector('#account-status');
    status.className='notice account-status';
    if(password!==confirmation){status.textContent='The two passwords do not match.';status.classList.add('error');return}
    button.disabled=true;button.textContent='Changing...';
    const {error}=await sb.auth.updateUser({password});
    button.disabled=false;button.textContent='Change My Password';
    if(error){status.textContent=error.message;status.classList.add('error');return}
    form.reset();status.textContent='Your password has been changed successfully.';status.classList.add('success');
  };
})();
