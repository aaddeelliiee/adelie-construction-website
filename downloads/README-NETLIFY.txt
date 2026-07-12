ADELIE Construction Website — Netlify-Ready Edition

RECOMMENDED DEPLOYMENT
1. Create a Netlify account.
2. Unzip this package.
3. In Netlify, create a new project using the drag-and-drop deployment option.
4. Drag the unzipped adelie_website_netlify folder into the upload area.
5. Open the temporary .netlify.app address and review every page.
6. In Domain management, add www.adelieconstruction.com and adelieconstruction.com.
7. Keep DNS managed by the current provider. Do not change nameservers.
8. Replace only the old website records:
   - CNAME: www -> your Netlify site address
   - A: @ -> 75.2.60.5, unless Netlify shows a different customized value
9. Do not delete or edit Neo email MX, SPF, DKIM, DMARC, or verification TXT records.
10. Make www.adelieconstruction.com the primary domain in Netlify.
11. Wait for DNS verification and the automatic HTTPS certificate.

CONTACT FORM
This edition uses Netlify Forms. Submissions appear in the Netlify dashboard.
After deployment, enable form detection and configure email notifications to hello@adelieconstruction.com.

UPDATES
To publish a future update, drag the updated website folder into the deploy drop zone on the site's Deploys page.

IMPORTANT
No CSLB license number or licensed-contractor claim is included yet. Add the license number after issuance and confirm the required advertising format.
