ADELIE v6.9 — COMPLETE PROJECT PLANNER FIX

This is a full replacement of the Project Planner page and its JavaScript.

FILES TO REPLACE
1. interactive-project-planner.html
2. interactive-project-planner.js
3. site-config.js

WHAT THIS FIXES
- Loads the planner JavaScript directly from the HTML page
- Removes the unreliable dynamic loader
- Captures early lead data after the first step
- Lets the visitor continue immediately while data sends in the background
- Saves all entries locally
- Loads the complete project binder review
- Sends the complete binder to Netlify
- Includes Netlify form definitions directly on the planner page
- Supports room-by-room data, budget, timeline and project notes
- Allows print or Save as PDF through the browser

INSTALL
1. Extract this ZIP.
2. Open GitHub Desktop.
3. Choose Repository > Show in Explorer.
4. Copy all three files into the repository root.
5. Choose Replace files in the destination.
6. Commit: Replace and repair complete Project Planner
7. Push origin.
8. Wait for Netlify to show Published.
9. Test in an Incognito window.

NETLIFY FORMS
- interactive-project-planner-start
- interactive-project-planner-complete

IMPORTANT
After deployment, Netlify should detect both forms because their definitions are
included directly in interactive-project-planner.html.
