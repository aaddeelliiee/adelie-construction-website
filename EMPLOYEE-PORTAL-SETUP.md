# ADELIE Employee Portal Setup

This release is intentionally isolated on the `agent/employee-accounts` development branch. Do not merge it into `main` until the tests below pass in a Netlify Deploy Preview.

## 1. Apply the Supabase migration

Open Supabase **SQL Editor**, create a new query, paste all of `supabase/employee-portal.sql`, and run it once. The migration is safe to rerun.

It creates employee accounts, project assignments, employee schedules, admin-only notes, internal team chat, private employee messages, and the required row-level security policies.

Then create another query, paste all of `supabase/employee-photo-approval.sql`, and run it once. This adds the employee photo-and-note approval queue and prevents customer accounts from reading pending or rejected employee submissions.

## 2. Confirm Netlify server variables

The employee-management function uses the same existing server-only variables as customer account management:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role value must remain secret and must never appear in browser JavaScript.

## 3. Test through a Deploy Preview

Open a pull request from `agent/employee-accounts` to `main`. Netlify should create a Deploy Preview without changing the live site.

1. Sign in as an admin.
2. Open **Employees** and create two test employees.
3. Assign one employee to a test project and leave the other unassigned.
4. Add schedule items and a private admin note.
5. Sign in as the assigned employee using account type **Employee**.
6. Confirm the employee sees only assigned projects and schedule items.
7. Confirm the employee can read, but cannot reply to, the customer project board.
8. Send a Team Chat message and confirm both employees see it.
9. Send a private message and confirm only sender, recipient, and admin see it.
10. Sign in as a customer and confirm no employee schedule, employee note, team chat, or private message can be queried or displayed.
11. As the assigned employee, submit a project photo and note and confirm its status is **Pending**.
12. As the customer, confirm the pending photo is not visible.
13. As the admin, approve the submission and confirm it appears in the project's progress gallery for the customer.
14. Submit a second update, reject it with feedback, and confirm the employee can see the feedback while the customer cannot see the update.

## Security boundaries

- Customer project messages remain in `public.messages`.
- Employee team/private messages live only in `public.internal_messages`.
- Employees receive SELECT-only access to customer project boards for assigned projects.
- No employee INSERT/UPDATE/DELETE policy exists on `public.messages`.
- `public.employee_notes` has admin-only policies; employees and customers receive no access.
- Employee management uses a Netlify Function with the service-role key after verifying the caller is in `portal_admins`.
- Employee photos use `pending`, `approved`, and `rejected` states. Only approved employee photos are readable by project customers.

