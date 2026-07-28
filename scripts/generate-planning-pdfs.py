from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "downloads"
OUT.mkdir(exist_ok=True)

GOLD = colors.HexColor("#F5BF21")
BLACK = colors.HexColor("#171819")
GRAY = colors.HexColor("#615D55")
PALE = colors.HexColor("#F7F4E9")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=BLACK, alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["BodyText"], fontSize=11, leading=16, textColor=GRAY, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=BLACK, spaceBefore=12, spaceAfter=8))
styles.add(ParagraphStyle(name="Prompt", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=9.5, leading=13, textColor=BLACK, spaceBefore=6, spaceAfter=4))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontSize=8.5, leading=12, textColor=GRAY))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontSize=10, leading=14, borderColor=GOLD, borderWidth=1, borderPadding=9, backColor=PALE, spaceBefore=8, spaceAfter=10))

DOCS = [
    ("adelie-homeowner-project-binder.pdf", "ADELIE Homeowner Project Binder", "One place for scope, decisions, selections, progress notes and closeout.", [
        ("Project Snapshot", ["Project address and primary contacts", "What must be different when the project is finished?", "Three priorities that cannot be traded away", "Known property or access constraints"]),
        ("Scope and Responsibility", ["Work included in the contract", "Owner-supplied items", "Work specifically excluded", "Who approves field decisions?"]),
        ("Decision Log", ["Decision or question", "Responsible person", "Required-by date", "Final answer and cost/schedule effect"]),
        ("Closeout", ["Open punch-list items", "Final inspection and permit status", "Warranties and care instructions received", "Lien releases and final payment records"]),
    ]),
    ("adu-planning-workbook.pdf", "ADU Planning Workbook", "Organize feasibility, access, utilities, design and early budget questions.", [
        ("Site Feasibility", ["Proposed ADU location and approximate size", "Setbacks, easements or slope concerns", "Construction access for workers and materials", "Parking or existing structure impacts"]),
        ("Utilities", ["Electrical service capacity", "Sewer route and cleanout location", "Water and gas strategy", "Utility trenching or panel upgrades to investigate"]),
        ("Use and Design", ["Who will use the ADU?", "Accessibility or aging-in-place needs", "Privacy, daylight and outdoor-space priorities", "Storage, laundry and mechanical-equipment needs"]),
    ]),
    ("home-addition-planning-workbook.pdf", "Home Addition Planning Workbook", "Define the new space and how it connects to the existing house.", [
        ("Reason for Adding Space", ["Rooms and approximate square footage", "Daily problem the addition must solve", "Existing rooms affected by the connection", "Features that are optional rather than required"]),
        ("Connection Risks", ["Roof tie-in and drainage questions", "Foundation and floor-height alignment", "Structural openings in the existing wall", "Heating, cooling, electrical and plumbing extensions"]),
        ("Household Impact", ["Can the home remain occupied?", "Temporary kitchen or bathroom needs", "Expected yard and driveway disruption", "Items that must be protected or relocated"]),
    ]),
    ("remodel-contracts-and-payments-guide.pdf", "Contracts and Payments Guide", "Questions to answer before signing or releasing money.", [
        ("Scope Test", ["Does the contract name materials, quantities and model numbers?", "Are demolition, disposal and protection included?", "Are permit and inspection responsibilities stated?", "Are exclusions written clearly?"]),
        ("Payment Test", ["What completed work supports each payment?", "Are deposits and progress payments legal and proportionate?", "How are owner purchases and allowances reconciled?", "What remains unpaid until closeout?"]),
        ("Change Orders", ["Who may authorize a change?", "Must price and time effects be approved before work?", "How are hidden conditions documented?", "Where are signed changes stored?"]),
    ]),
    ("homeowner-remodel-planning-workbook-v2.pdf", "Complete Remodel Planning Workbook", "Clarify the project before design decisions and pricing begin.", [
        ("Goals", ["What is not working now?", "What would make the project successful?", "Must-have outcomes", "Nice-to-have outcomes"]),
        ("Constraints", ["Working budget and contingency", "Desired start and must-finish date", "Occupied-home limitations", "HOA, access, neighbor or permit concerns"]),
        ("Team Readiness", ["Plans or measurements available", "Decisions still requiring design help", "Contractors or designers already involved", "Documents and photos to gather"]),
    ]),
    ("kitchen-remodel-planning-workbook-v2.pdf", "Kitchen Planning Workbook", "Plan layout, appliances, storage, lighting and finish coordination.", [
        ("How You Use the Kitchen", ["Number of regular cooks", "Traffic paths that currently cause problems", "Entertaining and seating needs", "Accessibility or height considerations"]),
        ("Appliances and Utilities", ["Exact appliance models or target sizes", "Ventilation route and hood requirements", "Gas versus electric cooking", "Outlet, lighting and dedicated-circuit needs"]),
        ("Storage and Finishes", ["Items that need a dedicated storage location", "Countertop work zones", "Flooring durability concerns", "Cabinet, hardware and backsplash decisions"]),
    ]),
    ("bathroom-remodel-planning-workbook-v2.pdf", "Bathroom Planning Workbook", "Coordinate waterproofing, fixtures, ventilation and storage.", [
        ("Layout and Use", ["Who uses the bathroom and when?", "Tub, shower or wet-room preference", "Accessibility and slip-resistance needs", "Privacy and storage problems"]),
        ("Water Management", ["Waterproofing system to specify", "Drain location and floor slope", "Shower-door and curb details", "Ventilation capacity and exhaust route"]),
        ("Fixtures and Finishes", ["Valve and trim model numbers", "Vanity width and plumbing locations", "Tile size, layout and grout", "Lighting and electrical needs"]),
    ]),
    ("contractor-bid-comparison-scorecard.pdf", "Contractor Bid Comparison Scorecard", "Compare scope, risk and communication - not price alone.", [
        ("Bid Completeness", ["Detailed scope and exclusions", "Allowances and owner-supplied items", "Permit, protection and cleanup", "Schedule assumptions"]),
        ("Company Checks", ["License and insurance verified", "Relevant project experience", "References and recent reviews", "Who supervises the work?"]),
        ("Score Each Bid", ["Scope clarity (1-5)", "Communication plan (1-5)", "Schedule credibility (1-5)", "Change-order process (1-5)", "Overall risk (1-5)"]),
    ]),
    ("remodel-budget-and-contingency-worksheet.pdf", "Budget and Contingency Worksheet", "Separate construction, selections, soft costs and reserve funds.", [
        ("Budget Categories", ["Base construction contract", "Owner-selected finish upgrades", "Design, engineering and permit fees", "Temporary housing or storage", "Furniture and appliances outside contract"]),
        ("Contingency", ["Older-home or hidden-condition reserve", "Design changes not yet resolved", "Price-escalation or long-lead risk", "Total reserve kept outside the contract"]),
        ("Monthly Check", ["Approved contract total", "Approved change orders", "Payments made", "Committed owner purchases", "Remaining uncommitted reserve"]),
    ]),
    ("material-selection-and-deadline-tracker.pdf", "Material Selection and Deadline Tracker", "Track approvals, model numbers, lead times and deliveries.", [
        ("Selection Record", ["Room and item", "Manufacturer, model and finish", "Supplier and quoted price", "Approval deadline", "Order date and expected delivery"]),
        ("Coordination Check", ["Dimensions verified in field", "Installer requirements reviewed", "Matching trim or accessories ordered", "Delivery inspected for damage"]),
        ("Long-Lead Priorities", ["Cabinetry", "Windows and exterior doors", "Appliances", "Plumbing fixtures", "Specialty tile or stone"]),
    ]),
    ("preconstruction-home-prep-checklist.pdf", "Preconstruction Home Preparation Checklist", "Prepare access, belongings, pets and household routines.", [
        ("Before Mobilization", ["Confirm work hours and access route", "Remove valuables and wall hangings", "Photograph nearby existing conditions", "Identify shutoffs and alarm instructions"]),
        ("Living Through Work", ["Temporary kitchen or bath plan", "Dust separation and air-filter plan", "Pet and child safety plan", "Parking, deliveries and trash locations"]),
        ("Records", ["Contract and approved plans saved", "Selections and model numbers organized", "Emergency contacts confirmed", "Communication and decision process confirmed"]),
    ]),
    ("final-walkthrough-and-punch-list.pdf", "Final Walkthrough and Punch List", "Document incomplete work and closeout records before final payment.", [
        ("Walkthrough Method", ["Inspect in good daylight", "Test doors, drawers, fixtures and controls", "Use blue tape plus a numbered written list", "Assign one responsible person and due date per item"]),
        ("Closeout Records", ["Final inspection approval", "Warranties and care instructions", "Paint colors and leftover materials", "Lien releases, receipts and final invoice"]),
        ("Punch List", ["Item number and room", "Issue observed", "Photo reference", "Responsible trade", "Target correction date", "Verified complete date"]),
    ]),
]

# Public filenames linked from the download center and related resource guides.
# Keep these stable: changing a filename creates a broken bookmark for homeowners.
PUBLIC_DOCS = [
    ("preconstruction-planning-workbook.pdf", "Preconstruction Planning Workbook", "Confirm scope, access, communication and household readiness before work begins.", ["Approved plans and written scope", "Permit and inspection responsibilities", "Long-lead materials and delivery dates", "Site access, parking and staging", "Dust and floor protection", "Utility shutdown expectations", "Daily contact and decision authority", "Neighbor, pet and child considerations", "Preconstruction photos and records"]),
    ("bathroom-budget-worksheet.pdf", "Bathroom Budget Worksheet", "Build a complete bathroom budget without overlooking the work behind the finishes.", ["Demolition and disposal", "Plumbing and electrical rough-in", "Waterproofing and tile labor", "Vanity, top and storage", "Fixtures, valves and accessories", "Lighting, ventilation and mirrors", "Permit and design costs", "Temporary-use arrangements", "Contingency for hidden conditions"]),
    ("choosing-the-right-contractor.pdf", "Choosing the Right Contractor", "Compare contractors on verified qualifications, scope clarity and project controls.", ["Active license and insurance", "Relevant completed projects", "Named supervisor and communication plan", "Detailed inclusions and exclusions", "Allowance and owner-purchase rules", "Payment schedule tied to progress", "Written change-order process", "Permit and inspection responsibility", "References and warranty terms"]),
    ("bathroom-remodel-planning-workbook.pdf", "Bathroom Remodel Planning Workbook", "Coordinate layout, waterproofing, ventilation, fixtures and storage before construction.", ["Primary users and daily routines", "Tub, shower or wet-room needs", "Accessibility and slip resistance", "Waterproofing system and drain plan", "Valve and fixture model numbers", "Vanity size and storage", "Ventilation and lighting", "Tile layout and edge details", "Cleaning and maintenance priorities"]),
    ("material-selection-worksheet.pdf", "Material Selection Worksheet", "Record exact products, approvals, lead times and installation requirements.", ["Room and item", "Manufacturer and model", "Color, finish and size", "Supplier and quoted price", "Approval deadline", "Order and delivery dates", "Field dimensions verified", "Installer requirements reviewed", "Delivery inspected and stored"]),
    ("whole-home-remodel-planner.pdf", "Whole-Home Remodel Planner", "Organize scope, phasing and household decisions across the entire home.", ["Rooms and systems included", "Must-have project outcomes", "Structural and layout changes", "Electrical, plumbing and HVAC upgrades", "Finish consistency between rooms", "Phasing and temporary living plan", "Working budget and reserve", "Design and permit milestones", "Closeout and warranty records"]),
    ("selection-deadlines-guide.pdf", "Selection Deadlines Guide", "Make decisions in construction order so products do not delay field work.", ["Cabinets and layout-dependent items", "Windows and exterior doors", "Appliances and ventilation", "Plumbing fixtures and valves", "Lighting and electrical devices", "Tile, stone and flooring", "Paint, hardware and accessories", "Approval owner for each item", "Order, delivery and inspection dates"]),
    ("living-through-remodel-checklist.pdf", "Living Through a Remodel Checklist", "Prepare your household for dust, noise, limited access and temporary routines.", ["Define the construction-free living zone", "Plan temporary cooking or bathing", "Protect valuables and electronics", "Confirm work hours and deliveries", "Arrange pet and child safety", "Plan for utility interruptions", "Set up mail and package access", "Choose one daily communication channel", "Review emergency contacts and exits"]),
    ("change-order-tracker.pdf", "Change Order Tracker", "Document every proposed change before added work affects cost or schedule.", ["Change number and request date", "Reason for the change", "Detailed added or removed scope", "Labor and material price", "Schedule impact", "Supporting plan, photo or selection", "Owner approval date", "Work completion status", "Updated contract total"]),
    ("permit-preparation-checklist.pdf", "Permit Preparation Checklist", "Gather project information and confirm responsibilities before permit submittal.", ["Property address and parcel information", "Existing and proposed plans", "Structural or engineering documents", "Energy and product documentation", "HOA or neighborhood requirements", "Responsible permit applicant", "Required agency clearances", "Correction and resubmittal log", "Inspection sequence and closeout"]),
    ("remodeling-contracts-and-payments-guide.pdf", "Remodeling Contracts and Payments Guide", "Review scope, payments and change controls before signing.", ["Contractor identity and license", "Detailed scope and exclusions", "Allowances and owner purchases", "Start and completion expectations", "Progress payment milestones", "Change-order authorization", "Insurance and site protection", "Warranty and dispute terms", "Final inspection and lien releases"]),
    ("kitchen-remodel-planning-workbook.pdf", "Kitchen Remodel Planning Workbook", "Plan workflow, appliances, storage, lighting and finish coordination.", ["Number of cooks and traffic paths", "Seating and entertaining needs", "Appliance models and dimensions", "Ventilation and utility requirements", "Cabinet storage priorities", "Countertop work zones", "Lighting and outlet plan", "Flooring and finish durability", "Temporary kitchen plan"]),
    ("contractor-interview-checklist.pdf", "Contractor Interview Checklist", "Use the same practical questions in every contractor conversation.", ["Who will supervise daily work?", "How are schedules communicated?", "How are selections and allowances tracked?", "Who obtains permits and inspections?", "How are hidden conditions documented?", "When are change prices approved?", "How is the occupied home protected?", "What closeout documents are provided?", "Can recent comparable clients be contacted?"]),
    ("whole-home-budget-worksheet.pdf", "Whole-Home Budget Worksheet", "Separate construction, selections, professional costs and contingency.", ["Demolition and structural work", "Kitchen and bathroom scopes", "Electrical, plumbing and HVAC", "Windows, doors and insulation", "Flooring, paint and finish carpentry", "Design, engineering and permits", "Appliances and owner purchases", "Temporary housing and storage", "Contingency and uncommitted reserve"]),
    ("adu-planning-checklist.pdf", "ADU Planning Checklist", "Organize site feasibility, utilities, access and intended use.", ["Proposed location and size", "Setbacks, easements and slope", "Construction and emergency access", "Parking and existing-site impacts", "Electrical service capacity", "Water, sewer and gas strategy", "Privacy and daylight priorities", "Accessibility and storage needs", "Early budget and permit questions"]),
    ("homeowner-remodeling-master-checklist.pdf", "Homeowner Remodeling Master Checklist", "Track the essential decisions from first ideas through project closeout.", ["Goals, priorities and working budget", "Plans, scope and contractor selection", "License, insurance and references", "Permit and selection responsibilities", "Payment and change-order controls", "Site protection and communication", "Progress photos and decision log", "Punch list and final inspection", "Warranties, releases and care records"]),
    ("project-photo-documentation-checklist.pdf", "Project Photo Documentation Checklist", "Create a useful visual record before, during and after construction.", ["Wide photos of every affected room", "Existing damage and adjacent finishes", "Utility and shutoff locations", "Open-wall plumbing and wiring", "Framing and waterproofing stages", "Product labels and model numbers", "Inspection and correction items", "Punch-list details", "Completed work and closeout condition"]),
    ("kitchen-budget-worksheet.pdf", "Kitchen Budget Worksheet", "Build a realistic kitchen budget around scope, systems and selected products.", ["Demolition and disposal", "Cabinetry and installation", "Countertops and backsplash", "Appliances and ventilation", "Plumbing and electrical work", "Lighting and finish fixtures", "Flooring, paint and trim", "Design and permit costs", "Contingency for hidden conditions"]),
    ("post-remodel-maintenance-guide.pdf", "Post-Remodel Maintenance Guide", "Protect new work with documented care routines and warranty records.", ["Collect product care instructions", "Record paint and grout colors", "Schedule sealant and caulk checks", "Clean filters and ventilation", "Use approved surface cleaners", "Monitor plumbing connections", "Store spare tile and hardware", "Track warranty contacts and dates", "Photograph and report concerns promptly"]),
    ("final-walkthrough-checklist.pdf", "Final Walkthrough Checklist", "Inspect operation, finish quality and closeout documents before final completion.", ["Test doors, drawers and hardware", "Test fixtures, outlets and controls", "Inspect paint, tile and trim in daylight", "List incomplete or damaged items", "Assign correction owner and date", "Confirm final inspection status", "Collect warranties and care guides", "Collect releases and final invoice", "Verify every punch item complete"]),
]

for filename, title, subtitle, prompts in PUBLIC_DOCS:
    sections = [
        ("Plan and Verify", prompts[:3]),
        ("Coordinate the Work", prompts[3:6]),
        ("Document and Close Out", prompts[6:]),
    ]
    DOCS.append((filename, title, subtitle, sections))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GOLD)
    canvas.line(0.65 * inch, 0.55 * inch, 7.85 * inch, 0.55 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(0.65 * inch, 0.34 * inch, "ADELIE Construction | Built on Transparency. Crafted to Last.")
    canvas.drawRightString(7.85 * inch, 0.34 * inch, f"Page {doc.page}")
    canvas.restoreState()

def lines(count=3):
    data = [[""] for _ in range(count)]
    table = Table(data, colWidths=[7.0 * inch], rowHeights=[0.27 * inch] * count)
    table.setStyle(TableStyle([('LINEBELOW', (0,0), (-1,-1), 0.4, colors.HexColor('#BDB7AA'))]))
    return table

def make_pdf(filename, title, subtitle, sections):
    doc = SimpleDocTemplate(str(OUT / filename), pagesize=letter, rightMargin=0.65*inch, leftMargin=0.65*inch, topMargin=0.65*inch, bottomMargin=0.75*inch, title=title, author="ADELIE Construction")
    story = [Spacer(1, .45*inch), Paragraph("ADELIE CONSTRUCTION", styles["CoverSub"]), Paragraph(title, styles["CoverTitle"]), Paragraph(subtitle, styles["CoverSub"]), Spacer(1, .2*inch), Paragraph("HOMEOWNER PLANNING TOOL", styles["CoverSub"]), Spacer(1, .35*inch), Paragraph("Project name: ______________________________________________", styles["BodyText"]), Spacer(1, .2*inch), Paragraph("Property address: ___________________________________________", styles["BodyText"]), Spacer(1, .2*inch), Paragraph("Date started: ____________________   Target start: ____________________", styles["BodyText"]), Spacer(1, .35*inch), Paragraph("Use this workbook to organize questions and decisions before they become expensive field changes. It is a planning aid, not project-specific legal, design, engineering or code advice.", styles["Callout"]), PageBreak()]
    for section, prompts in sections:
        block = [Paragraph(section, styles["Section"])]
        for prompt in prompts:
            block.extend([Paragraph(prompt, styles["Prompt"]), lines(2), Spacer(1, .08*inch)])
        story.append(KeepTogether(block[:3]))
        story.extend(block[3:])
    note_lines = 20 if filename == "adelie-homeowner-project-binder.pdf" else 3
    note_title = "Project Notes and Questions for ADELIE" if filename == "adelie-homeowner-project-binder.pdf" else "Questions for ADELIE"
    story.append(KeepTogether([Spacer(1, .15*inch), Paragraph(note_title, styles["Section"]), Paragraph("Use this space for decisions that require a site visit, drawings, trade input or a written proposal.", styles["Small"]), lines(note_lines)]))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

for spec in DOCS:
    make_pdf(*spec)

print(f"Created {len(DOCS)} planning PDFs in {OUT}")
