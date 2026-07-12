# ADELIE Platform 7.1 — Detailed Setup

## 1. Deploy the website
Upload the contents of this folder to the same Netlify site that hosts ADELIE Construction. The ZIP provided has the website files at its root.

## 2. Run the final database migration
1. Open Supabase.
2. Select project `vctnzenargxmgiyqemzx`.
3. Open **SQL Editor**.
4. Click **New query**.
5. Open `supabase/adelie-platform-v1.sql` from this package.
6. Copy the entire file, paste it into Supabase, and click **Run** once.

The script is designed to be safe if the original portal schema has already been run. It creates missing tables, enables RLS, creates policies, creates private storage buckets, adds indexes, and seeds expanded Vista001 sample records.

## 3. Confirm RLS
At the bottom of the SQL results, every listed table should show `rowsecurity = true`. You can rerun this verification query at any time:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname='public'
order by tablename;
```

## 4. Create your administrator user
1. Open **Authentication → Users**.
2. Create or invite your administrator email.
3. Copy the user's UUID.
4. Run this in SQL Editor, replacing the placeholder:

```sql
insert into public.portal_admins(user_id)
values ('YOUR-ADMIN-USER-UUID')
on conflict do nothing;
```

## 5. Add Netlify environment variables
In Netlify: **Site configuration → Environment variables**.

Add:
- `SUPABASE_URL` = `https://vctnzenargxmgiyqemzx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = your private Supabase service-role key

Find the service-role key in Supabase under **Project Settings → API Keys**. Never paste it into HTML or JavaScript.

## 6. Redeploy after adding variables
Netlify environment variables take effect on a new deploy. Trigger a redeploy after saving them.

## 7. Test administrator access
1. Visit `/portal-login.html`.
2. Sign in with the admin account.
3. You should be redirected to `/portal-admin.html`.
4. Confirm Vista001 appears.
5. Add a daily log or task and confirm it appears in `/portal.html` for the connected client.

## 8. Connect a client to Vista001
Create/invite the client's Auth user, then either use the admin invitation form or run:

```sql
insert into public.project_members(project_id,user_id,role)
select p.id,u.id,'client'
from public.projects p
cross join auth.users u
where p.name='Vista001'
  and lower(u.email)=lower('CLIENT_EMAIL_HERE')
on conflict do nothing;
```

## 9. Storage structure
Files must be uploaded under a folder whose first segment is the project UUID:
- `project-files/<PROJECT_UUID>/filename.pdf`
- `project-photos/<PROJECT_UUID>/photo.jpg`

The admin dashboard handles this structure automatically. RLS prevents clients from opening files for projects they do not belong to.

## 10. Security test
Create a second test client and second project. Confirm each client sees only their assigned project. Do not use the portal with real customer contracts or payment information until this test passes.
