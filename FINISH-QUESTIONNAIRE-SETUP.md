# Finish and design questionnaire

Based on main at de27f7fe27f7a6aee9cd1ec815c7279b3c3d7317. Apply the files at the repository root, keeping their paths. Review changes before merging if main has moved.

## Launch

1. In a test Supabase project with the portal schema and admin permissions already installed, run `supabase/finish-questionnaire.sql`.
2. In Netlify, set `SUPABASE_ANON_KEY` to the public key of the same project used by the existing Supabase URL and service-role variables. Netlify supplies `URL`; make sure its hostname matches the public portal hostname.
3. In Supabase Auth, allow the exact portal login URL (for example, `https://www.adelieconstruction.com/portal-login.html`) as a redirect. Set up production SMTP and check that the Magic Link email template uses the clickable confirmation URL. Disable email-link click tracking if it rewrites authentication links.
4. On a test project, use an admin with the Customers permission to email an invite to a test homeowner. Check receipt, click the link in a separate browser, verify that the questionnaire opens, save a draft, then sign out and use the email sign-in form to resume. Submit selections and verify that the correct project shows them in the admin portal. Test a regular employee and a different customer to verify that they cannot create invitations or read the responses.
5. Repeat the database and environment setup in production before deploying the portal changes. Leave the existing username and password sign-in available to current customers.

## At the door

Give the employee an administrator account with Customers permission if they should issue invites and review customer accounts and questionnaires. Project creation requires Projects permission. For staff with Customers permission only, the office can create the project first. In the admin portal, select that project, confirm the address, and enter the homeowner's name and email. The phone number is optional. The homeowner uses the sign-in link in the invitation and can request a fresh link from the sign-in page.

The questionnaire captures design preferences. Formal approval and signatures are handled with the proposal.

