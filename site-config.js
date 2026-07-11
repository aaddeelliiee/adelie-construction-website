window.ADELIE_CONFIG = {
  googleAnalyticsId: "",
  microsoftClarityId: "",
  googleSiteVerification: "",
  bingSiteVerification: "",
  googlePlaceId: ""
};

/*
 * ADELIE v6.11.1 — assistant lead capture repair
 * Captures any form inside #adelie-assistant through Netlify Forms.
 */
(() => {
  "use strict";

  const encode = data =>
    new URLSearchParams(
      Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ).toString();

  const postLead = async data => {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(data),
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`ADELIE assistant submission failed: ${response.status}`);
    }
  };

  const readField = (form, name) => {
    const field = form.querySelector(`[name="${name}"]`);
    return field ? String(field.value || "").trim() : "";
  };

  const setStatus = (form, message, state = "") => {
    let status =
      form.querySelector(".assistant-submit-status") ||
      form.closest("#adelie-assistant")?.querySelector(".assistant-submit-status");

    if (!status) {
      status = document.createElement("p");
      status.className = "assistant-submit-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      form.appendChild(status);
    }

    status.textContent = message;
    status.dataset.state = state;
  };

  const bindAssistantLead = () => {
    const assistant = document.querySelector("#adelie-assistant");
    if (!assistant) return;

    const forms = [
      ...assistant.querySelectorAll("form"),
      ...document.querySelectorAll("form.assistant-lead")
    ];

    forms.forEach(form => {
      if (form.dataset.leadCaptureBound === "true") return;
      form.dataset.leadCaptureBound = "true";

      form.addEventListener("submit", async event => {
        event.preventDefault();

        const submitButton = form.querySelector('[type="submit"]');
        const name = readField(form, "name");
        const email = readField(form, "email");
        const phone = readField(form, "phone");

        if (!name || (!email && !phone)) {
          setStatus(
            form,
            "Please provide your name and either a phone number or email address.",
            "error"
          );
          return;
        }

        const data = {
          "form-name": "ai-lead",
          name,
          email,
          phone,
          property_address: readField(form, "property_address"),
          city: readField(form, "city"),
          project_type: readField(form, "project_type"),
          budget_range: readField(form, "budget_range"),
          timeline: readField(form, "timeline"),
          project_details:
            readField(form, "project_details") ||
            readField(form, "message") ||
            "Lead submitted through Ask ADELIE.",
          assistant_transcript: readField(form, "assistant_transcript"),
          contact_consent:
            readField(form, "contact_consent") ||
            (form.querySelector('[name="contact_consent"]')?.checked ? "yes" : ""),
          lead_source: "Ask ADELIE assistant",
          page_url: window.location.href,
          submitted_at: new Date().toISOString()
        };

        if (submitButton) submitButton.disabled = true;
        setStatus(form, "Sending your information to ADELIE…", "working");

        try {
          await postLead(data);
          setStatus(
            form,
            "Thank you. Your information was sent to ADELIE successfully.",
            "success"
          );
          form.reset();
        } catch (error) {
          console.error(error);
          setStatus(
            form,
            "Your information could not be sent. Please call 1-877-ADELIEC or try again.",
            "error"
          );
        } finally {
          if (submitButton) submitButton.disabled = false;
        }
      });
    });
  };

  const start = () => {
    bindAssistantLead();

    const observer = new MutationObserver(() => bindAssistantLead());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

/*
 * ADELIE v6.11.2 — reduce assistant form friction.
 * Makes the project-details field optional on every Ask ADELIE form.
 */
(() => {
  "use strict";

  const updateAssistantForms = () => {
    document.querySelectorAll(
      '#adelie-assistant textarea[name="project_details"], form.assistant-lead textarea[name="project_details"]'
    ).forEach(field => {
      field.required = false;
      field.removeAttribute("required");
      field.setAttribute("aria-required", "false");
      field.placeholder = "Anything else you would like us to know? (optional)";

      const label = field.closest("label");
      if (label) {
        const textNodes = [...label.childNodes].filter(
          node => node.nodeType === Node.TEXT_NODE
        );
        textNodes.forEach(node => {
          node.textContent = node.textContent
            .replace(/\s*\*\s*$/, "")
            .replace(/Project Details, Goals(?:,| &)? Questions/i,
              "Project details, goals, or questions (optional)");
        });
      }
    });

    document.querySelectorAll(
      '#adelie-assistant form, form.assistant-lead'
    ).forEach(form => {
      const button = form.querySelector('[type="submit"]');
      if (button && /^(submit|send)$/i.test(button.textContent.trim())) {
        button.textContent = "Request My Free Consultation";
      }

      if (!form.querySelector(".assistant-privacy-note")) {
        const note = document.createElement("p");
        note.className = "assistant-privacy-note";
        note.textContent =
          "No obligation. Your information is sent directly to ADELIE Construction and is not sold.";
        if (button) button.insertAdjacentElement("afterend", note);
        else form.appendChild(note);
      }
    });
  };

  const start = () => {
    updateAssistantForms();
    const observer = new MutationObserver(updateAssistantForms);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
