const adeliePortalConfig = {
  supabaseUrl: 'https://vctnzenargxmgiyqemzx.supabase.co',
  supabaseAnonKey: 'sb_publishable_8YaocjxuguBunSVkKzfEWQ_BWL2QWyk',
  companyName: 'ADELIE Construction',
  supportEmail: 'hello@adelieconstruction.com',
  supportPhone: '(760) 705-0418'
};

if (typeof window !== 'undefined') {
  window.ADELIE_PORTAL_CONFIG = adeliePortalConfig;
  window.ADELIE_RECORD_PORTAL_LOGIN = async session => {
    if (!session?.user?.id || !session.access_token) return;
    const key = `adelie-login-recorded:${session.user.id}:${session.access_token.slice(-16)}`;
    if (sessionStorage.getItem(key)) return;
    try {
      const response = await fetch('/.netlify/functions/customer-login-log', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (response.ok) sessionStorage.setItem(key, '1');
    } catch (error) {
      console.warn('Login activity could not be recorded.', error);
    }
  };
}
if (typeof module !== 'undefined') module.exports = adeliePortalConfig;
