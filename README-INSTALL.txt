ADELIE v6.8.1 — CONTINUE TO ROOMS FIX

WHY THE LAST PATCH FAILED
The previous loader waited for the external PDF library before loading the
actual planner. If that external script was delayed or blocked, the planner
never initialized, so Continue to Rooms did nothing.

THIS FIX
- Loads interactive-project-planner.js immediately
- Loads PDF support separately
- Ensures PDF-library problems cannot block:
  * Continue to Rooms
  * Adding rooms
  * Local autosave
  * Early Netlify lead capture
  * Completed binder submissions

INSTALL
1. Extract this ZIP.
2. Open GitHub Desktop.
3. Select Repository > Show in Explorer.
4. Copy site-config.js into the main repository folder.
5. Choose Replace the file in the destination.
6. Commit: Fix Project Planner Continue button
7. Push origin.
8. Wait for Netlify to show Published.
9. Open an Incognito window and test again.

IMPORTANT TEST
Complete name, phone, email, property address, and consent, then click
Continue to Rooms. The button intentionally will not continue if any required
contact field or consent is missing.
