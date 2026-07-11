(() => {
  "use strict";

  const STORAGE_KEY = "adelie-project-planner-v69";
  const EARLY_KEY = "adelie-project-planner-early-v69";

  const defaults = {
    project_name: "", project_type: "", name: "", phone: "", email: "",
    property_address: "", contact_consent: false, year_built: "", stories: "",
    foundation: "", overall_goals: "", rooms: [], budget_range: "",
    contingency: "", must_haves: "", nice_to_haves: "", value_options: "",
    owner_supplied: "", desired_start: "", target_completion: "", occupied: "",
    plans_status: "", constraints: "", open_questions: ""
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {...defaults, ...saved, rooms: Array.isArray(saved.rooms) ? saved.rooms : []};
    } catch {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const saveStatus = $("#planner-save-status");
    if (saveStatus) saveStatus.textContent = "Saved on this device.";
    updateProgress();
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function bindFields() {
    $$("[name]").forEach(field => {
      if (field.closest("form[hidden]") || field.closest(".room-card")) return;
      if (!(field.name in state)) return;

      if (field.type === "checkbox") field.checked = !!state[field.name];
      else field.value = state[field.name] || "";

      const sync = () => {
        state[field.name] = field.type === "checkbox" ? field.checked : field.value;
        save();
      };

      field.addEventListener("input", sync);
      field.addEventListener("change", sync);
    });
  }

  function updateProgress() {
    const values = [
      state.name, state.phone, state.email, state.property_address,
      state.project_type, state.overall_goals, state.rooms.length,
      state.budget_range, state.desired_start
    ];
    const percent = Math.round(values.filter(Boolean).length / values.length * 100);
    $("#planner-progress-bar").style.width = percent + "%";
    $("#planner-progress-label").textContent = percent + "% complete";
    $("#planner-project-title").textContent =
      state.project_name || state.project_type || "Untitled Remodel";
  }

  function show(name) {
    $$(".planner-panel").forEach(panel =>
      panel.classList.toggle("active", panel.dataset.panel === name)
    );
    $$(".planner-steps button").forEach(button =>
      button.classList.toggle("active", button.dataset.section === name)
    );
    if (name === "review") renderReview();
    $("#planner-app").scrollIntoView({behavior: "smooth", block: "start"});
  }

  function validContact() {
    return state.name.trim() &&
      state.phone.trim() &&
      state.email.trim() &&
      state.property_address.trim() &&
      state.contact_consent;
  }

  function note(message, type = "") {
    const el = $("#planner-capture-note");
    el.textContent = message;
    el.dataset.state = type;
  }

  function formEncode(data) {
    return new URLSearchParams(
      Object.entries(data).map(([key, value]) => [
        key, typeof value === "string" ? value : JSON.stringify(value)
      ])
    ).toString();
  }

  async function sendForm(data) {
    const response = await fetch("/", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: formEncode(data),
      keepalive: true
    });
    if (!response.ok) throw new Error("Form submission failed: " + response.status);
  }

  function captureEarly() {
    const fingerprint = [state.name, state.phone, state.email, state.property_address].join("|");
    if (localStorage.getItem(EARLY_KEY) === fingerprint) {
      note("Contact details already saved with ADELIE.", "success");
      return;
    }

    note("Saving your contact information with ADELIE…", "working");

    sendForm({
      "form-name": "interactive-project-planner-start",
      name: state.name,
      phone: state.phone,
      email: state.email,
      property_address: state.property_address,
      project_type: state.project_type || "Not selected",
      project_name: state.project_name || "",
      lead_stage: "Planner started",
      contact_consent: "yes",
      page_url: location.href,
      started_at: new Date().toISOString()
    }).then(() => {
      localStorage.setItem(EARLY_KEY, fingerprint);
      note("Contact details saved with ADELIE.", "success");
    }).catch(error => {
      console.error(error);
      note("Your planner is saved, but the contact submission could not be confirmed.", "error");
    });
  }

  function addRoom() {
    state.rooms.push({
      id: "room-" + Date.now(),
      name: "", type: "", dimensions: "", priority: "",
      existing: "", goals: "", scope: "", selections: "",
      measurements: "", questions: ""
    });
    save();
    renderRooms();
  }

  function roomHtml(room, index) {
    const types = ["Kitchen","Primary bathroom","Guest bathroom","Powder room",
      "Living room","Dining room","Bedroom","Laundry room","Office","Garage",
      "ADU","Home addition","Exterior / outdoor","Other"];
    const priorities = ["Essential","High","Medium","Optional / future phase"];

    return `
      <article class="room-card" data-id="${esc(room.id)}">
        <header>
          <div><span class="room-number">Space ${index + 1}</span>
          <h3>${esc(room.name || room.type || "New room")}</h3></div>
          <button class="room-remove" type="button">Remove</button>
        </header>
        <div class="room-grid">
          <label>Room or space name<input data-field="name" value="${esc(room.name)}"></label>
          <label>Type<select data-field="type"><option value="">Choose one</option>
            ${types.map(v => `<option ${room.type === v ? "selected" : ""}>${v}</option>`).join("")}
          </select></label>
          <label>Approximate dimensions<input data-field="dimensions" value="${esc(room.dimensions)}"></label>
          <label>Priority<select data-field="priority"><option value="">Choose one</option>
            ${priorities.map(v => `<option ${room.priority === v ? "selected" : ""}>${v}</option>`).join("")}
          </select></label>
          <label class="full">Existing conditions<textarea data-field="existing" rows="3">${esc(room.existing)}</textarea></label>
          <label class="full">Goals for this space<textarea data-field="goals" rows="3">${esc(room.goals)}</textarea></label>
          <label class="full">Expected scope<textarea data-field="scope" rows="4">${esc(room.scope)}</textarea></label>
          <label class="full">Selections and products<textarea data-field="selections" rows="4">${esc(room.selections)}</textarea></label>
          <label class="full">Measurements and notes<textarea data-field="measurements" rows="3">${esc(room.measurements)}</textarea></label>
          <label class="full">Questions for contractor or designer<textarea data-field="questions" rows="3">${esc(room.questions)}</textarea></label>
        </div>
      </article>`;
  }

  function renderRooms() {
    $("#room-list").innerHTML = state.rooms.map(roomHtml).join("");
    $("#room-empty").hidden = state.rooms.length > 0;

    $$(".room-card").forEach(card => {
      const room = state.rooms.find(item => item.id === card.dataset.id);

      $$("[data-field]", card).forEach(field => {
        const sync = () => {
          room[field.dataset.field] = field.value;
          $("h3", card).textContent = room.name || room.type || "New room";
          save();
        };
        field.addEventListener("input", sync);
        field.addEventListener("change", sync);
      });

      $(".room-remove", card).addEventListener("click", () => {
        if (!confirm("Remove this room?")) return;
        state.rooms = state.rooms.filter(item => item.id !== room.id);
        save();
        renderRooms();
      });
    });
  }

  function renderReview() {
    const rooms = state.rooms.length
      ? state.rooms.map((room, i) => `
        <article class="binder-room-summary">
          <h4>${i + 1}. ${esc(room.name || room.type || "Room")}</h4>
          <p><strong>Type:</strong> ${esc(room.type || "Not specified")}</p>
          <p><strong>Dimensions:</strong> ${esc(room.dimensions || "To verify")}</p>
          ${room.goals ? `<p><strong>Goals:</strong> ${esc(room.goals)}</p>` : ""}
          ${room.scope ? `<p><strong>Scope:</strong> ${esc(room.scope)}</p>` : ""}
          ${room.selections ? `<p><strong>Selections:</strong> ${esc(room.selections)}</p>` : ""}
          ${room.questions ? `<p><strong>Questions:</strong> ${esc(room.questions)}</p>` : ""}
        </article>`).join("")
      : "<p>No rooms have been added.</p>";

    $("#binder-review").innerHTML = `
      <section><h3>Contact and property</h3>
        <p><strong>Name:</strong> ${esc(state.name)}</p>
        <p><strong>Phone:</strong> ${esc(state.phone)}</p>
        <p><strong>Email:</strong> ${esc(state.email)}</p>
        <p><strong>Property:</strong> ${esc(state.property_address)}</p>
        <p><strong>Project:</strong> ${esc(state.project_name || state.project_type)}</p>
        <p><strong>Home:</strong> ${esc([state.year_built && "Built " + state.year_built, state.stories, state.foundation].filter(Boolean).join(" · "))}</p>
        <p><strong>Goals:</strong> ${esc(state.overall_goals)}</p>
      </section>
      <section><h3>Room-by-room plan</h3>${rooms}</section>
      <section><h3>Budget and priorities</h3>
        <p><strong>Budget:</strong> ${esc(state.budget_range)}</p>
        <p><strong>Contingency:</strong> ${esc(state.contingency)}</p>
        <p><strong>Must-haves:</strong> ${esc(state.must_haves)}</p>
        <p><strong>Optional upgrades:</strong> ${esc(state.nice_to_haves)}</p>
        <p><strong>Value options:</strong> ${esc(state.value_options)}</p>
        <p><strong>Owner-supplied:</strong> ${esc(state.owner_supplied)}</p>
      </section>
      <section><h3>Timeline and logistics</h3>
        <p><strong>Desired start:</strong> ${esc(state.desired_start)}</p>
        <p><strong>Target completion:</strong> ${esc(state.target_completion)}</p>
        <p><strong>Occupied:</strong> ${esc(state.occupied)}</p>
        <p><strong>Plans/permits:</strong> ${esc(state.plans_status)}</p>
        <p><strong>Constraints:</strong> ${esc(state.constraints)}</p>
        <p><strong>Open questions:</strong> ${esc(state.open_questions)}</p>
      </section>`;
  }

  function summaryText() {
    return [
      `Project: ${state.project_name || state.project_type}`,
      `Name: ${state.name}`,
      `Phone: ${state.phone}`,
      `Email: ${state.email}`,
      `Property: ${state.property_address}`,
      `Goals: ${state.overall_goals}`,
      `Rooms: ${state.rooms.map(r => r.name || r.type).filter(Boolean).join(", ")}`,
      `Budget: ${state.budget_range}`,
      `Desired start: ${state.desired_start}`,
      `Must-haves: ${state.must_haves}`,
      `Constraints: ${state.constraints}`,
      `Open questions: ${state.open_questions}`
    ].join("\n");
  }

  async function sendComplete() {
    const status = $("#binder-export-status");
    status.textContent = "Sending your complete binder to ADELIE…";

    try {
      await sendForm({
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
        room_names: state.rooms.map(r => r.name || r.type).filter(Boolean).join(", "),
        project_summary: summaryText(),
        binder_json: JSON.stringify(state),
        contact_consent: state.contact_consent ? "yes" : "no",
        lead_stage: "Complete project binder",
        submitted_at: new Date().toISOString()
      });

      status.textContent = "Your complete project binder was sent to ADELIE successfully.";
    } catch (error) {
      console.error(error);
      status.textContent = "The binder could not be sent. Your information remains saved on this device.";
    }
  }

  function init() {
    bindFields();
    renderRooms();
    updateProgress();

    $("#continue-to-rooms").addEventListener("click", () => {
      if (!validContact()) {
        note("Complete your name, phone, email, property address and consent before continuing.", "error");
        return;
      }
      show("rooms");
      captureEarly();
    });

    $$(".planner-steps button").forEach(button =>
      button.addEventListener("click", () => show(button.dataset.section))
    );

    $$("[data-next]").forEach(button =>
      button.addEventListener("click", () => show(button.dataset.next))
    );

    $$("[data-back]").forEach(button =>
      button.addEventListener("click", () => show(button.dataset.back))
    );

    $("#add-room").addEventListener("click", addRoom);
    $("#add-first-room").addEventListener("click", addRoom);
    $("#send-binder-lead").addEventListener("click", sendComplete);
    $("#print-binder").addEventListener("click", () => {
      renderReview();
      window.print();
    });

    $(".planner-reset").addEventListener("click", () => {
      if (!confirm("Start a new binder and erase saved information?")) return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EARLY_KEY);
      location.reload();
    });

    $("#year").textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once: true});
  } else {
    init();
  }
})();