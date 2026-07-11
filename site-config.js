window.ADELIE_CONFIG = {
  googleAnalyticsId: "",       // Example: G-XXXXXXXXXX
  microsoftClarityId: "",      // Example: abc123def4
  googleSiteVerification: "",  // Search Console meta verification value
  bingSiteVerification: "",    // Bing Webmaster Tools meta verification value
  googlePlaceId: ""            // Needed for a live Google reviews integration
};

/*
 * ADELIE v6.8 Project Planner stability loader.
 * The current planner page includes its stylesheet but does not load the
 * planner JavaScript. This loader only runs on interactive-project-planner.html.
 */
(() => {
  const page = (window.location.pathname.split("/").pop() || "").toLowerCase();
  if (page !== "interactive-project-planner.html") return;

  const loadScript = (src, id, onload) => {
    if (document.getElementById(id)) {
      if (onload) onload();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    script.async = false;
    if (onload) script.addEventListener("load", onload, { once: true });
    script.addEventListener("error", () => {
      console.error("ADELIE planner failed to load:", src);
      const status = document.getElementById("planner-capture-note");
      if (status) {
        status.textContent =
          "The planner could not finish loading. Please refresh the page or contact ADELIE.";
        status.dataset.state = "error";
      }
    });
    document.head.appendChild(script);
  };

  const loadPlanner = () => {
    loadScript(
      "interactive-project-planner.js",
      "adelie-interactive-project-planner-js"
    );
  };

  if (window.jspdf?.jsPDF) {
    loadPlanner();
  } else {
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "adelie-jspdf-js",
      loadPlanner
    );
  }
})();
