(() => {
  "use strict";

  const STORAGE_KEY = "adelie-project-planner-v610";
  const EARLY_KEY = "adelie-project-planner-early-v610";

  const defaults = {
    project_name:"", project_type:"", name:"", phone:"", email:"",
    property_address:"", contact_consent:false, year_built:"", stories:"",
    foundation:"", primary_goal:"", design_readiness:"", overall_goals:"",
    rooms:[], budget_range:"", contingency:"", budget_flexibility:"",
    project_approach:"", must_haves:"", nice_to_haves:"",
    desired_start:"", target_completion:"", occupied:"", plans_status:"",
    access_status:"", household_status:"", constraints:""
  };

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  let state = load();

  function fresh(){ return JSON.parse(JSON.stringify(defaults)); }
  function load(){
    try{
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {...fresh(), ...saved, rooms:Array.isArray(saved.rooms)?saved.rooms:[]};
    }catch{ return fresh(); }
  }
  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status=$("#planner-save-status");
    if(status) status.textContent="Saved on this device.";
    updateProgress();
  }
  function esc(v){
    return String(v??"").replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[c]);
  }

  function bindFields(){
    $$("[name]").forEach(field=>{
      if(field.closest("form[hidden]") || field.closest(".room-card")) return;
      if(!(field.name in state)) return;
      if(field.type==="checkbox") field.checked=!!state[field.name];
      else field.value=state[field.name] || "";
      const sync=()=>{
        state[field.name]=field.type==="checkbox"?field.checked:field.value;
        save();
      };
      field.addEventListener("input",sync);
      field.addEventListener("change",sync);
    });
  }

  function updateProgress(){
    const values=[
      state.name,state.phone,state.email,state.property_address,state.project_type,
      state.primary_goal||state.overall_goals,state.rooms.length,state.budget_range,
      state.desired_start
    ];
    const percent=Math.round(values.filter(Boolean).length/values.length*100);
    const bar=$("#planner-progress-bar"), label=$("#planner-progress-label"), title=$("#planner-project-title");
    if(bar) bar.style.width=percent+"%";
    if(label) label.textContent=percent+"% complete";
    if(title) title.textContent=state.project_name||state.project_type||"Untitled Remodel";
  }

  function show(name){
    $$(".planner-panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===name));
    $$(".planner-steps button").forEach(b=>b.classList.toggle("active",b.dataset.section===name));
    if(name==="review") renderReview();
    $("#planner-app")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function validContact(){
    return !!(state.name.trim()&&state.phone.trim()&&state.email.trim()&&
      state.property_address.trim()&&state.contact_consent);
  }
  function note(message,type=""){
    const el=$("#planner-capture-note");
    if(el){el.textContent=message;el.dataset.state=type;}
  }
  function formEncode(data){
    return new URLSearchParams(Object.entries(data).map(([k,v])=>[
      k,typeof v==="string"?v:JSON.stringify(v)
    ])).toString();
  }
  async function sendForm(data){
    const response=await fetch("/",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:formEncode(data),
      keepalive:true
    });
    if(!response.ok) throw new Error("Form submission failed: "+response.status);
  }
  function captureEarly(){
    const fingerprint=[state.name,state.phone,state.email,state.property_address].join("|");
    if(localStorage.getItem(EARLY_KEY)===fingerprint){
      note("Contact details already saved with ADELIE.","success"); return;
    }
    note("Saving your contact information with ADELIE…","working");
    sendForm({
      "form-name":"interactive-project-planner-start",
      name:state.name,phone:state.phone,email:state.email,
      property_address:state.property_address,
      project_type:state.project_type||"Not selected",
      project_name:state.project_name||"",
      lead_stage:"Planner started",contact_consent:"yes",
      page_url:location.href,started_at:new Date().toISOString()
    }).then(()=>{
      localStorage.setItem(EARLY_KEY,fingerprint);
      note("Contact details saved with ADELIE.","success");
    }).catch(error=>{
      console.error(error);
      note("Your planner is saved, but the contact submission could not be confirmed.","error");
    });
  }

  const roomTypes=["Kitchen","Primary bathroom","Guest bathroom","Powder room",
    "Living room","Dining room","Bedroom","Laundry room","Office","Garage",
    "ADU","Home addition","Exterior / outdoor","Other"];

  function createRoom(type=""){
    return {
      id:"room-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),
      name:"",type, size:"",priority:"",condition:"",layout_change:"",
      plumbing_change:"",electrical_change:"",structural_change:"",
      selection_status:"",scope_items:[],notes:""
    };
  }

  function addRoom(type=""){
    state.rooms.push(createRoom(type));
    save(); renderRooms();
    const last=$$(".room-card").at(-1);
    last?.scrollIntoView({behavior:"smooth",block:"center"});
  }

  function checked(room,value){return room.scope_items?.includes(value)?"checked":"";}

  function roomHtml(room,index){
    const priorities=["Essential","High","Medium","Optional / future phase"];
    const sizes=["Small","Average","Large","Not sure"];
    const conditions=["Good — mainly cosmetic update","Functional but outdated",
      "Layout does not work well","Known damage or repairs needed","Not sure"];
    const choices=(items,current)=>items.map(v=>
      `<option value="${esc(v)}" ${current===v?"selected":""}>${esc(v)}</option>`
    ).join("");

    return `<article class="room-card" data-id="${esc(room.id)}">
      <header><div><span class="room-number">Space ${index+1}</span>
      <h3>${esc(room.name||room.type||"New room")}</h3></div>
      <button class="room-remove" type="button">Remove</button></header>

      <div class="room-grid">
        <label>Room type<select data-field="type"><option value="">Choose one</option>
          ${choices(roomTypes,room.type)}</select></label>
        <label>Custom name <span class="optional-note">(optional)</span>
          <input data-field="name" value="${esc(room.name)}" placeholder="Example: Main kitchen"></label>

        <label>Approximate size<select data-field="size"><option value="">Choose one</option>
          ${choices(sizes,room.size)}</select></label>
        <label>Priority<select data-field="priority"><option value="">Choose one</option>
          ${choices(priorities,room.priority)}</select></label>

        <label>Current condition<select data-field="condition"><option value="">Choose one</option>
          ${choices(conditions,room.condition)}</select></label>
        <label>Layout changes<select data-field="layout_change"><option value="">Choose one</option>
          ${choices(["Keep the existing layout","Minor layout adjustments","Major layout change","Not sure"],room.layout_change)}</select></label>

        <label>Plumbing changes<select data-field="plumbing_change"><option value="">Choose one</option>
          ${choices(["No plumbing work expected","Replace fixtures in current locations","Move or add plumbing","Not sure"],room.plumbing_change)}</select></label>
        <label>Electrical changes<select data-field="electrical_change"><option value="">Choose one</option>
          ${choices(["No major electrical work expected","New lighting or devices","Major electrical changes","Not sure"],room.electrical_change)}</select></label>

        <label>Walls or structural changes<select data-field="structural_change"><option value="">Choose one</option>
          ${choices(["No wall changes expected","Non-structural wall changes","Possible structural changes","Not sure"],room.structural_change)}</select></label>
        <label>Selection progress<select data-field="selection_status"><option value="">Choose one</option>
          ${choices(["No selections yet","Collecting ideas","Some products selected","Most selections complete"],room.selection_status)}</select></label>

        <fieldset class="full room-option-group">
          <legend>What work is likely included?</legend>
          <div class="room-checkboxes">
            ${["Demolition","Cabinets or built-ins","Countertops","Flooring",
              "Tile or stone","Painting","Lighting","Plumbing fixtures",
              "Windows or doors","Appliances","Storage improvements","Accessibility upgrades"]
              .map(v=>`<label><input type="checkbox" data-scope-item="${esc(v)}" ${checked(room,v)}> ${esc(v)}</label>`).join("")}
          </div>
        </fieldset>

        <label class="full">Extra details <span class="optional-note">(optional)</span>
          <textarea data-field="notes" rows="3" placeholder="Only add information not covered by the choices above.">${esc(room.notes)}</textarea>
        </label>
      </div>
    </article>`;
  }

  function renderRooms(){
    const list=$("#room-list"), empty=$("#room-empty"), another=$("#add-another-wrap");
    list.innerHTML=state.rooms.map(roomHtml).join("");
    empty.hidden=state.rooms.length>0;
    another.hidden=state.rooms.length===0;

    $$(".room-card").forEach(card=>{
      const room=state.rooms.find(r=>r.id===card.dataset.id);
      $$("[data-field]",card).forEach(field=>{
        const sync=()=>{
          room[field.dataset.field]=field.value;
          $("h3",card).textContent=room.name||room.type||"New room";
          save();
        };
        field.addEventListener("input",sync);
        field.addEventListener("change",sync);
      });
      $$("[data-scope-item]",card).forEach(box=>{
        box.addEventListener("change",()=>{
          const value=box.dataset.scopeItem;
          room.scope_items=room.scope_items||[];
          if(box.checked && !room.scope_items.includes(value)) room.scope_items.push(value);
          if(!box.checked) room.scope_items=room.scope_items.filter(v=>v!==value);
          save();
        });
      });
      $(".room-remove",card).addEventListener("click",()=>{
        if(!confirm("Remove this room?")) return;
        state.rooms=state.rooms.filter(r=>r.id!==room.id);
        save();renderRooms();
      });
    });
  }

  function renderReview(){
    const rooms=state.rooms.length?state.rooms.map((r,i)=>`
      <article class="binder-room-summary">
        <h4>${i+1}. ${esc(r.name||r.type||"Room")}</h4>
        <p><strong>Size:</strong> ${esc(r.size||"Not specified")} · <strong>Priority:</strong> ${esc(r.priority||"Not specified")}</p>
        <p><strong>Condition:</strong> ${esc(r.condition||"Not specified")}</p>
        <p><strong>Layout:</strong> ${esc(r.layout_change||"Not specified")}</p>
        <p><strong>Plumbing:</strong> ${esc(r.plumbing_change||"Not specified")}</p>
        <p><strong>Electrical:</strong> ${esc(r.electrical_change||"Not specified")}</p>
        <p><strong>Structural:</strong> ${esc(r.structural_change||"Not specified")}</p>
        <p><strong>Selections:</strong> ${esc(r.selection_status||"Not specified")}</p>
        <p><strong>Likely scope:</strong> ${esc((r.scope_items||[]).join(", ")||"Not selected")}</p>
        ${r.notes?`<p><strong>Notes:</strong> ${esc(r.notes)}</p>`:""}
      </article>`).join(""):"<p>No rooms have been added.</p>";

    $("#binder-review").innerHTML=`
      <section><h3>Contact and property</h3>
        <p><strong>Name:</strong> ${esc(state.name)}</p>
        <p><strong>Phone:</strong> ${esc(state.phone)}</p>
        <p><strong>Email:</strong> ${esc(state.email)}</p>
        <p><strong>Property:</strong> ${esc(state.property_address)}</p>
        <p><strong>Project:</strong> ${esc(state.project_name||state.project_type)}</p>
        <p><strong>Home:</strong> ${esc([state.year_built,state.stories,state.foundation].filter(Boolean).join(" · "))}</p>
        <p><strong>Primary goal:</strong> ${esc(state.primary_goal)}</p>
        <p><strong>Planning status:</strong> ${esc(state.design_readiness)}</p>
        ${state.overall_goals?`<p><strong>Additional details:</strong> ${esc(state.overall_goals)}</p>`:""}
      </section>
      <section><h3>Room-by-room plan</h3>${rooms}</section>
      <section><h3>Budget and priorities</h3>
        <p><strong>Budget:</strong> ${esc(state.budget_range)}</p>
        <p><strong>Contingency:</strong> ${esc(state.contingency)}</p>
        <p><strong>Flexibility:</strong> ${esc(state.budget_flexibility)}</p>
        <p><strong>Approach:</strong> ${esc(state.project_approach)}</p>
        <p><strong>Highest priority:</strong> ${esc(state.must_haves)}</p>
        ${state.nice_to_haves?`<p><strong>Optional items:</strong> ${esc(state.nice_to_haves)}</p>`:""}
      </section>
      <section><h3>Timeline and logistics</h3>
        <p><strong>Desired start:</strong> ${esc(state.desired_start)}</p>
        <p><strong>Target completion:</strong> ${esc(state.target_completion)}</p>
        <p><strong>Occupied:</strong> ${esc(state.occupied)}</p>
        <p><strong>Plans/permits:</strong> ${esc(state.plans_status)}</p>
        <p><strong>Access:</strong> ${esc(state.access_status)}</p>
        <p><strong>Household:</strong> ${esc(state.household_status)}</p>
        ${state.constraints?`<p><strong>Other details:</strong> ${esc(state.constraints)}</p>`:""}
      </section>`;
  }

  function summaryText(){
    return [
      `Project: ${state.project_name||state.project_type}`,
      `Name: ${state.name}`,`Phone: ${state.phone}`,`Email: ${state.email}`,
      `Property: ${state.property_address}`,`Goal: ${state.primary_goal}`,
      `Rooms: ${state.rooms.map(r=>r.name||r.type).filter(Boolean).join(", ")}`,
      `Budget: ${state.budget_range}`,`Desired start: ${state.desired_start}`,
      `Priority: ${state.must_haves}`,`Access: ${state.access_status}`,
      `Other details: ${state.constraints}`
    ].join("\n");
  }

  async function sendComplete(){
    const status=$("#binder-export-status");
    status.textContent="Sending your complete binder to ADELIE…";
    try{
      await sendForm({
        "form-name":"interactive-project-planner-complete",
        name:state.name,phone:state.phone,email:state.email,
        property_address:state.property_address,project_name:state.project_name,
        project_type:state.project_type,budget_range:state.budget_range,
        desired_start:state.desired_start,room_count:state.rooms.length,
        room_names:state.rooms.map(r=>r.name||r.type).filter(Boolean).join(", "),
        project_summary:summaryText(),binder_json:JSON.stringify(state),
        contact_consent:state.contact_consent?"yes":"no",
        lead_stage:"Complete project binder",submitted_at:new Date().toISOString()
      });
      status.textContent="Your complete project binder was sent to ADELIE successfully.";
    }catch(error){
      console.error(error);
      status.textContent="The binder could not be sent. Your information remains saved on this device.";
    }
  }

  function init(){
    bindFields();renderRooms();updateProgress();

    $("#continue-to-rooms")?.addEventListener("click",()=>{
      if(!validContact()){
        note("Complete your name, phone, email, property address and consent before continuing.","error");
        return;
      }
      show("rooms");captureEarly();
    });

    $$(".planner-steps button").forEach(b=>b.addEventListener("click",()=>show(b.dataset.section)));
    $$("[data-next]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.next)));
    $$("[data-back]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.back)));

    $$("[data-add-room-type]").forEach(b=>b.addEventListener("click",()=>addRoom(b.dataset.addRoomType)));
    $("#add-custom-room")?.addEventListener("click",()=>addRoom("Other"));
    $("#add-another-room")?.addEventListener("click",()=>{
      $("#room-type-choices")?.scrollIntoView({behavior:"smooth",block:"center"});
    });

    $("#send-binder-lead")?.addEventListener("click",sendComplete);
    $("#print-binder")?.addEventListener("click",()=>{renderReview();window.print();});

    $(".planner-reset")?.addEventListener("click",()=>{
      if(!confirm("Start a new binder and erase saved information?"))return;
      localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(EARLY_KEY);location.reload();
    });

    const year=$("#year");if(year)year.textContent=new Date().getFullYear();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();