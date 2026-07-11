ADELIE v6.8 — PROJECT PLANNER FIX

This patch was built from the current GitHub repository structure.

WHAT IT FIXES
- Loads interactive-project-planner.js on the Project Planner page
- Loads jsPDF before the planner so Project Binder export works
- Restores step navigation, room creation, autosave, Netlify lead capture,
  completed-binder submission, and PDF export
- Adds a visible loading-error message if a required script fails

INSTALL
1. Extract this ZIP.
2. Open GitHub Desktop.
3. Click Repository > Show in Explorer.
4. Copy site-config.js from this folder into the repository root.
5. Choose Replace the file in the destination.
6. In GitHub Desktop, commit with:
   Fix Project Planner loading and lead capture
7. Click Push origin.
8. Wait for Netlify to show Published.
9. Test in an Incognito window.

NETLIFY FORMS TO CHECK
- interactive-project-planner-start
- interactive-project-planner-complete

IMPORTANT
This patch changes only site-config.js. It preserves the existing planner HTML,
planner JavaScript, form definitions, styles, and the rest of the website.
