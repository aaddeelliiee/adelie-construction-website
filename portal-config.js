const adeliePortalConfig = {
  supabaseUrl: 'https://vctnzenargxmgiyqemzx.supabase.co',
  supabaseAnonKey: 'sb_publishable_8YaocjxuguBunSVkKzfEWQ_BWL2QWyk',
  companyName: 'ADELIE Construction',
  supportEmail: 'hello@adelieconstruction.com',
  supportPhone: '(760) 705-0418'
};

if (typeof window !== 'undefined') window.ADELIE_PORTAL_CONFIG = adeliePortalConfig;
if (typeof module !== 'undefined') module.exports = adeliePortalConfig;
