# ADELIE Remodel Cost Planner — pricing methodology

Version `2026.11.3` is a planning model for San Diego County. It is deliberately shown as a range and must not be presented as an ADELIE bid, proposal, or guaranteed price. The starting bands intentionally favor a useful consultation range rather than an extreme worst-case spread. Detailed selections replace the corresponding finish-level allowances—so keeping flooring or choosing imported cabinets can lower a premium starting range—while genuinely additional scope is added separately.

## How the range is built

1. A broad range is created from project type, affected square footage, finish level, and scope intensity.
2. As the homeowner supplies detail, the model progressively blends in installed unit-cost ranges for cabinets, counters, tile, fixtures, flooring, drywall, paint, trim, electrical, doors, windows, appliances, design, and permits.
3. Occupied construction, home age, site access, and the selected contingency adjust the result.
4. The low and high figures include typical labor, material allowances, project supervision, contractor overhead, and profit. They exclude financing, temporary housing, hazardous-material remediation, extraordinary structural or geotechnical conditions, and unselected work.

## Current pricing anchors

- San Diego whole-home remodeling is publicly reported around $100–$300 per square foot, with other local 2026 guides reporting roughly $150–$400 depending on scope and finish: https://www.greatbuildz.com/blog/san-diego-home-renovation-costs/ and https://blog.sfconstructiongroup.com/home-remodel-cost-san-diego-2026/
- California DIR's 2026 San Diego carpenter determination lists a $77.71 total hourly journeyperson package before contractor supervision, overhead, profit, travel, and project-specific inefficiency: https://www.dir.ca.gov/oprl/2026-1/PWD/Determinations/SanDiego/SD-023-31-4.pdf
- Home Depot's current installed countertop guide reports approximately $43–$140 per square foot, with premium stones and project details affecting the result: https://www.homedepot.com/services/c/cost-install-countertops/6228e49a9
- Home Depot reports average cabinet refacing near $15,000 for a 27-linear-foot, 200-square-foot kitchen and notes geography, trim, structural work, plumbing, electrical, and permits can increase cabinet installation cost: https://www.homedepot.com/services/c/cost-cabinet-refacing/bf24dfc4c and https://www.homedepot.com/services/c/cost-cabinet-installation/4954fb9e1
- Drywall finish definitions follow the standard Level 3–5 framework; Level 5 adds a full skim coat and is appropriate where critical lighting or glossy finishes could reveal joints: https://www.lowes.com/pdf/Five_Levels_of_Finish.pdf

Public consumer guides are only calibration points. The editable model in `portal-estimator-pricing.js` is the source of truth for the portal. ADELIE should replace the defaults with its own awarded subcontractor prices, supplier quotes, crew production rates, actual job-cost history, and target margin. Review at least quarterly and create a new pricing-version label whenever rates change.
