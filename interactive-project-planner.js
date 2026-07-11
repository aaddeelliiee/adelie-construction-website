(() => {
  "use strict";

  const STORAGE_KEY = "adelieInteractiveProjectBinderV2";
  const EARLY_CAPTURE_KEY = "adelieInteractivePlannerLeadV2";
  const COMPLETE_CAPTURE_KEY = "adelieInteractivePlannerCompleteV2";

  const defaultState = {
    project_name: "",
    project_type: "",
    name: "",
    phone: "",
    email: "",
    property_address: "",
    contact_consent: false,
    year_built: "",
    stories: "",
    foundation: "",
    overall_goals: "",
    rooms: [],
    budget_range: "",
    contingency: "",
    must_haves: "",
    nice_to_haves: "",
    value_options: "",
    owner_supplied: "",
    desired_start: "",
    target_completion: "",
    occupied: "",
    plans_status: "",
    constraints: "",
    open_questions: "",
    updated_at: ""
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let state = loadState();
  let initialized = false;

  function cloneDefault() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        ...cloneDefault(),
        ...saved,
        rooms: Array.isArray(saved.rooms) ? saved.rooms : []
      };
    } catch (error) {
      console.error("Could not load planner state:", error);
      return cloneDefault();
    }
  }

  function saveState() {
    state.updated_at = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Could not save planner state:", error);
    }

    const status = $("#planner-save-status");
    if (status) {
      status.textContent =
        "Saved " +
        new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) +
        " on this device.";
    }
    updateProgress();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function setCaptureNote(message, kind = "") {
    const note = $("#planner-capture-note");
    if (!note) return;
    note.textContent = message;
    note.dataset.state = kind;
  }

  function contactReady() {
    return Boolean(
      state.name.trim() &&
      state.phone.trim() &&
      state.email.trim() &&
      state.property_address.trim() &&
      state.contact_consent
    );
  }

  function bindMainFields() {
    $$("[name]").forEach(field => {
      if (field.closest(".room-card")) return;
      if (!(field.name in state)) return;

      if (field.type === "checkbox") {
        field.checked = Boolean(state[field.name]);
      } else {
        field.value = state[field.name] || "";
      }

      const update = () => {
        state[field.name] =
          field.type === "checkbox" ? field.checked : field.value;
        saveState();
        updateTitle();
      };

      field.addEventListener("input", update);
      field.addEventListener("change", update);
    });
  }

  function updateTitle() {
    const title = $("#planner-project-title");
    if (title) {
      title.textContent =
        state.project_name || state.project_type || "Untitled Remodel";
    }
  }

  function calculateProgress() {
    const checks = [
      state.project_name,
      state.project_type,
      state.property_address,
      state.overall_goals,
      state.rooms.length > 0,
      state.budget_range,
      state.must_haves,
      state.desired_start,
      state.constraints
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  function updateProgress() {
    const percent = calculateProgress();
    const bar = $("#planner-progress-bar");
    const label = $("#planner-progress-label");
    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}% complete`;
    updateTitle();
  }

  function showPanel(panelName) {
    $$(".planner-panel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.panel === panelName);
    });
    $$(".planner-steps button").forEach(button => {
      button.classList.toggle("active", button.dataset.section === panelName);
    });

    if (panelName === "review") renderReview();

    const planner = $("#planner-app");
    if (planner) {
      window.scrollTo({
        top: Math.max(0, planner.offsetTop - 20),
        behavior: "smooth"
      });
    }
  }

  function roomTemplate(room, index) {
    const types = [
      "Kitchen",
      "Primary bathroom",
      "Guest bathroom",
      "Powder room",
      "Living room",
      "Dining room",
      "Bedroom",
      "Laundry room",
      "Office",
      "Garage",
      "ADU",
      "Home addition",
      "Exterior / outdoor",
      "Other"
    ];

    const priorities = [
      "Essential",
      "High",
      "Medium",
      "Optional / future phase"
    ];

    return `
      <article class="room-card" data-room-id="${escapeHtml(room.id)}">
        <header>
          <div>
            <span class="room-number">Space ${index + 1}</span>
            <h3>${escapeHtml(room.name || room.type || "New room")}</h3>
          </div>
          <button class="room-remove" type="button">Remove</button>
        </header>

        <div class="room-grid">
          <label>Room or space name
            <input data-room="name" value="${escapeHtml(room.name)}"
              placeholder="Example: Main kitchen">
          </label>

          <label>Type
            <select data-room="type">
              <option value="">Choose one</option>
              ${types.map(type =>
                `<option value="${escapeHtml(type)}" ${room.type === type ? "selected" : ""}>${escapeHtml(type)}</option>`
              ).join("")}
            </select>
          </label>

          <label>Approximate dimensions
            <input data-room="dimensions" value="${escapeHtml(room.dimensions)}"
              placeholder="Example: 12 ft x 16 ft">
          </label>

          <label>Priority
            <select data-room="priority">
              <option value="">Choose one</option>
              ${priorities.map(priority =>
                `<option value="${escapeHtml(priority)}" ${room.priority === priority ? "selected" : ""}>${escapeHtml(priority)}</option>`
              ).join("")}
            </select>
          </label>

          <label class="full">Existing conditions
            <textarea data-room="existing" rows="3">${escapeHtml(room.existing)}</textarea>
          </label>

          <label class="full">Goals for this space
            <textarea data-room="goals" rows="3">${escapeHtml(room.goals)}</textarea>
          </label>

          <label class="full">Expected scope
            <textarea data-room="scope" rows="4">${escapeHtml(room.scope)}</textarea>
          </label>

          <label class="full">Selections and products
            <textarea data-room="selections" rows="4">${escapeHtml(room.selections)}</textarea>
          </label>

          <label class="full">Measurements and notes
            <textarea data-room="measurements" rows="3">${escapeHtml(room.measurements)}</textarea>
          </label>

          <label class="full">Questions for the contractor or designer
            <textarea data-room="questions" rows="3">${escapeHtml(room.questions)}</textarea>
          </label>
        </div>
      </article>
    `;
  }

  function renderRooms() {
    const roomList = $("#room-list");
    const emptyState = $("#room-empty");
    if (!roomList || !emptyState) return;

    roomList.innerHTML = state.rooms.map(roomTemplate).join("");
    emptyState.hidden = state.rooms.length > 0;

    $$(".room-card").forEach(card => {
      const room = state.rooms.find(item => item.id === card.dataset.roomId);
      if (!room) return;

      $$("[data-room]", card).forEach(field => {
        const update = () => {
          room[field.dataset.room] = field.value;
          const heading = $("h3", card);
          if (heading) heading.textContent = room.name || room.type || "New room";
          saveState();
        };
        field.addEventListener("input", update);
        field.addEventListener("change", update);
      });

      const removeButton = $(".room-remove", card);
      if (removeButton) {
        removeButton.addEventListener("click", () => {
          if (!window.confirm("Remove this room from the binder?")) return;
          state.rooms = state.rooms.filter(item => item.id !== room.id);
          saveState();
          renderRooms();
        });
      }
    });
  }

  function addRoom() {
    state.rooms.push({
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: "",
      type: "",
      dimensions: "",
      priority: "",
      existing: "",
      goals: "",
      scope: "",
      selections: "",
      measurements: "",
      questions: ""
    });
    saveState();
    renderRooms();

    window.setTimeout(() => {
      const fields = $$(".room-card input");
      const lastField = fields[fields.length - 1];
      if (lastField) lastField.focus();
    }, 50);
  }

  function encodeForm(data) {
    const values = Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(", ") : String(value ?? "")
    ]);
    return new URLSearchParams(values).toString();
  }

  async function postNetlify(data) {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeForm(data),
      keepalive: true
    });
    if (!response.ok) {
      throw new Error(`Netlify submission failed: ${response.status}`);
    }
  }

  function captureEarlyLeadInBackground() {
    const fingerprint = [
      state.name,
      state.phone,
      state.email,
      state.property_address,
      state.project_type
    ].join("|").toLowerCase();

    if (localStorage.getItem(EARLY_CAPTURE_KEY) === fingerprint) {
      setCaptureNote(
        "Contact details already saved with ADELIE. You can continue building the binder.",
        "success"
      );
      return;
    }

    setCaptureNote("Saving your contact information with ADELIE…", "working");

    postNetlify({
      "form-name": "interactive-project-planner-start",
      name: state.name,
      phone: state.phone,
      email: state.email,
      property_address: state.property_address,
      project_type: state.project_type || "Not selected yet",
      project_name: state.project_name || "",
      lead_stage: "Planner started",
      contact_consent: "yes",
      page_url: window.location.href,
      started_at: new Date().toISOString()
    }).then(() => {
      localStorage.setItem(EARLY_CAPTURE_KEY, fingerprint);
      setCaptureNote(
        "Contact details saved. ADELIE can follow up even if you finish the binder later.",
        "success"
      );
    }).catch(error => {
      console.error(error);
      setCaptureNote(
        "You can continue planning. Your binder is saved locally, but the contact submission could not be confirmed.",
        "error"
      );
    });
  }

  function renderReview() {
    const container = $("#binder-review");
    if (!container) return;

    const roomSections = state.rooms.length
      ? state.rooms.map((room, index) => `
          <article class="binder-room-summary">
            <h4>${index + 1}. ${escapeHtml(room.name || room.type || "Room")}</h4>
            <p><strong>Type:</strong> ${escapeHtml(room.type || "Not specified")}</p>
            <p><strong>Dimensions:</strong> ${escapeHtml(room.dimensions || "To verify")}</p>
            ${room.goals ? `<p><strong>Goals:</strong> ${escapeHtml(room.goals)}</p>` : ""}
            ${room.scope ? `<p><strong>Scope:</strong> ${escapeHtml(room.scope)}</p>` : ""}
            ${room.selections ? `<p><strong>Selections:</strong> ${escapeHtml(room.selections)}</p>` : ""}
            ${room.questions ? `<p><strong>Questions:</strong> ${escapeHtml(room.questions)}</p>` : ""}
          </article>
        `).join("")
      : '<p class="muted">No rooms have been added.</p>';

    container.innerHTML = `
      <section>
        <h3>Project overview</h3>
        <p><strong>Project:</strong> ${escapeHtml(state.project_name || state.project_type || "Untitled remodel")}</p>
        <p><strong>Property:</strong> ${escapeHtml(state.property_address || "Not provided")}</p>
        <p><strong>Homeowner:</strong> ${escapeHtml(state.name || "Not provided")}</p>
        ${state.overall_goals ? `<p><strong>Goals:</strong> ${escapeHtml(state.overall_goals)}</p>` : ""}
      </section>

      <section>
        <h3>Room-by-room plan</h3>
        ${roomSections}
      </section>

      <section>
        <h3>Budget and priorities</h3>
        <p><strong>Budget:</strong> ${escapeHtml(state.budget_range || "Not established")}</p>
        <p><strong>Contingency:</strong> ${escapeHtml(state.contingency || "Not established")}</p>
        ${state.must_haves ? `<p><strong>Must-haves:</strong> ${escapeHtml(state.must_haves)}</p>` : ""}
        ${state.nice_to_haves ? `<p><strong>Optional upgrades:</strong> ${escapeHtml(state.nice_to_haves)}</p>` : ""}
      </section>

      <section>
        <h3>Timeline and logistics</h3>
        <p><strong>Desired start:</strong> ${escapeHtml(state.desired_start || "Not provided")}</p>
        <p><strong>Occupancy:</strong> ${escapeHtml(state.occupied || "Not provided")}</p>
        <p><strong>Plans / permits:</strong> ${escapeHtml(state.plans_status || "Not provided")}</p>
        ${state.constraints ? `<p><strong>Constraints:</strong> ${escapeHtml(state.constraints)}</p>` : ""}
      </section>
    `;
  }

  function buildTextSummary() {
    return [
      `Interactive Project Binder: ${state.project_name || state.project_type || "Untitled remodel"}`,
      `Property: ${state.property_address}`,
      `Homeowner: ${state.name}`,
      `Phone: ${state.phone}`,
      `Email: ${state.email}`,
      `Goals: ${state.overall_goals}`,
      `Rooms: ${state.rooms.map(room => room.name || room.type).filter(Boolean).join(", ")}`,
      `Budget: ${state.budget_range}`,
      `Timeline: ${state.desired_start}`,
      `Must-haves: ${state.must_haves}`,
      `Constraints: ${state.constraints}`,
      `Open questions: ${state.open_questions}`
    ].filter(line => !line.endsWith(": ")).join("\n");
  }

  async function sendCompletedBinder() {
    const status = $("#binder-export-status");
    if (!contactReady()) {
      if (status) {
        status.textContent =
          "Return to Project Overview and complete the required contact information first.";
      }
      showPanel("overview");
      return;
    }

    if (status) status.textContent = "Sending your binder summary to ADELIE…";

    try {
      await postNetlify({
        "form-name": "interactive-project-planner-complete",
        name: state.name,
        phone: state.phone,
        email: state.email,
        property_address: state.property_address,
        project_name: state.project_name,
        project_type: state.project_type,
        budget_range: state.budget_range,
        desired_start: state.desired_start,
        room_count: state.rooms.length,
        room_names: state.rooms.map(room => room.name || room.type).filter(Boolean).join(", "),
        project_summary: buildTextSummary(),
        binder_json: JSON.stringify(state),
        contact_consent: "yes",
        lead_stage: "Binder summary completed",
        submitted_at: new Date().toISOString()
      });

      localStorage.setItem(COMPLETE_CAPTURE_KEY, new Date().toISOString());
      if (status) {
        status.textContent =
          "Your project binder summary was sent to ADELIE successfully.";
      }
    } catch (error) {
      console.error(error);
      if (status) {
        status.textContent =
          "The summary could not be sent. Your binder is still saved on this device.";
      }
    }
  }

  function exportBinder() {
    renderReview();

    if (window.jspdf?.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const margin = 48;
      const maxWidth = 516;
      let y = 58;

      const addLine = (text, size = 10, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(String(text || ""), maxWidth);
        lines.forEach(line => {
          if (y > 735) {
            doc.addPage();
            y = 58;
          }
          doc.text(line, margin, y);
          y += size + 4;
        });
        y += 4;
      };

      doc.setDrawColor(245, 191, 33);
      doc.setLineWidth(4);
      doc.line(margin, 42, 564, 42);
      addLine("ADELIE PROJECT BINDER", 22, true);
      addLine(state.project_name || state.project_type || "Preliminary Remodel Plan", 15, true);
      addLine(`Prepared ${new Date().toLocaleDateString()}`);
      addLine("");
      addLine(`Homeowner: ${state.name}`, 10, true);
      addLine(`Phone: ${state.phone}`);
      addLine(`Email: ${state.email}`);
      addLine(`Property: ${state.property_address}`);
      addLine(`Project type: ${state.project_type}`);
      addLine("");
      addLine("Overall goals", 14, true);
      addLine(state.overall_goals || "Not provided.");

      state.rooms.forEach((room, index) => {
        addLine("");
        addLine(`${index + 1}. ${room.name || room.type || "Room"}`, 14, true);
        addLine(`Type: ${room.type || "Not specified"}`);
        addLine(`Dimensions: ${room.dimensions || "To verify"}`);
        addLine(`Priority: ${room.priority || "Not ranked"}`);
        if (room.goals) addLine(`Goals: ${room.goals}`);
        if (room.scope) addLine(`Scope: ${room.scope}`);
        if (room.selections) addLine(`Selections: ${room.selections}`);
        if (room.questions) addLine(`Questions: ${room.questions}`);
      });

      addLine("");
      addLine("Budget and priorities", 14, true);
      addLine(`Target budget: ${state.budget_range || "Not established"}`);
      addLine(`Contingency: ${state.contingency || "Not established"}`);
      if (state.must_haves) addLine(`Must-haves: ${state.must_haves}`);
      if (state.nice_to_haves) addLine(`Optional upgrades: ${state.nice_to_haves}`);

      addLine("");
      addLine("Timeline and logistics", 14, true);
      addLine(`Desired start: ${state.desired_start || "Not provided"}`);
      addLine(`Target completion: ${state.target_completion || "Not provided"}`);
      addLine(`Occupancy: ${state.occupied || "Not provided"}`);
      addLine(`Plans / permits: ${state.plans_status || "Not provided"}`);
      if (state.constraints) addLine(`Constraints: ${state.constraints}`);

      const filename = (
        state.project_name ||
        "ADELIE Project Binder"
      ).replace(/[^a-z0-9 _-]/gi, "").trim() || "ADELIE Project Binder";

      doc.save(`${filename}.pdf`);

      const status = $("#binder-export-status");
      if (status) status.textContent = "Your ADELIE Project Binder PDF was downloaded.";
      return;
    }

    window.print();
  }

  function resetPlanner() {
    if (!window.confirm(
      "Start a new binder? This will erase the planner information saved on this device."
    )) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EARLY_CAPTURE_KEY);
    state = cloneDefault();
    window.location.reload();
  }

  function init() {
    if (initialized) return;
    if (!$("#planner-app")) return;
    initialized = true;

    bindMainFields();
    renderRooms();
    updateProgress();

    $$(".planner-steps button").forEach(button => {
      button.addEventListener("click", () => showPanel(button.dataset.section));
    });

    $$("[data-next]").forEach(button => {
      button.addEventListener("click", () => {
        const currentPanel = button.closest('[data-panel="overview"]');

        if (currentPanel) {
          if (!contactReady()) {
            setCaptureNote(
              "Complete your name, phone, email, property address and contact consent before continuing.",
              "error"
            );
            return;
          }

          // Do not block the planner while the lead submission runs.
          showPanel(button.dataset.next);
          captureEarlyLeadInBackground();
          return;
        }

        showPanel(button.dataset.next);
      });
    });

    $$("[data-back]").forEach(button => {
      button.addEventListener("click", () => showPanel(button.dataset.back));
    });

    $("#add-room")?.addEventListener("click", addRoom);
    $("#add-first-room")?.addEventListener("click", addRoom);
    $("#export-binder")?.addEventListener("click", exportBinder);
    $("#print-binder")?.addEventListener("click", () => window.print());
    $("#send-binder-lead")?.addEventListener("click", sendCompletedBinder);
    $("#send-to-consultation")?.addEventListener("click", () => {
      window.location.href = "contact.html";
    });
    $(".planner-reset")?.addEventListener("click", resetPlanner);

    window.addEventListener("beforeprint", renderReview);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
