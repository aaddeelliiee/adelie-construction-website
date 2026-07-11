window.ADELIE_CONFIG = {
  googleAnalyticsId: "",       // Example: G-XXXXXXXXXX
  microsoftClarityId: "",      // Example: abc123def4
  googleSiteVerification: "",  // Search Console meta verification value
  bingSiteVerification: "",    // Bing Webmaster Tools meta verification value
  googlePlaceId: ""            // Needed for a live Google reviews integration
};

/*
 * ADELIE v6.8.1 Project Planner loader
 * Important: the planner must load immediately. PDF export is optional and
 * must never block Continue, room creation, autosave, or Netlify lead capture.
 */
(() => {
  const run = () => {
    const page = (window.location.pathname.split("/").pop() || "").toLowerCase();
    if (page !== "interactive-project-planner.html") return;

    const addScript = (src, id) => {
      if (document.getElementById(id)) return;
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener("error", () => {
        console.error("ADELIE failed to load:", src);
        if (id === "adelie-project-planner-js") {
          const note = document.getElementById("planner-capture-note");
          if (note) {
            note.textContent =
              "The Project Planner could not load. Please refresh the page or contact ADELIE.";
            note.dataset.state = "error";
          }
        }
      });
      document.body.appendChild(script);
    };

    // Load the planner first. This restores Continue, rooms, saving and forms.
    addScript(
      "interactive-project-planner.js?v=6.8.1",
      "adelie-project-planner-js"
    );

    // Load PDF support separately so a CDN issue cannot disable the planner.
    if (!window.jspdf?.jsPDF) {
      addScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        "adelie-jspdf-js"
      );
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
