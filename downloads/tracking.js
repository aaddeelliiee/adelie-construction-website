(function () {
  const cfg = window.ADELIE_CONFIG || {};

  if (cfg.googleSiteVerification) {
    const m = document.createElement("meta");
    m.name = "google-site-verification";
    m.content = cfg.googleSiteVerification;
    document.head.appendChild(m);
  }
  if (cfg.bingSiteVerification) {
    const m = document.createElement("meta");
    m.name = "msvalidate.01";
    m.content = cfg.bingSiteVerification;
    document.head.appendChild(m);
  }

  if (cfg.googleAnalyticsId) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.googleAnalyticsId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", cfg.googleAnalyticsId);
  }

  if (cfg.microsoftClarityId) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,"clarity","script",cfg.microsoftClarityId);
  }
})();
