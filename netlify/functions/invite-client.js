const { createClient } = require('@supabase/supabase-js');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { statusCode: 500, body: JSON.stringify({ error: 'Portal environment variables are not configured.' }) };
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = (event.headers.authorization || '').replace('Bearer ', '');
  const { data: authData } = await admin.auth.getUser(token);
  if (!authData?.user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  const { data: allowed } = await admin.from('portal_admins').select('user_id').eq('user_id', authData.user.id).maybeSingle();
  if (!allowed) return { statusCode: 403, body: JSON.stringify({ error: 'Administrator access required.' }) };
  const { email, projectId, redirectTo } = JSON.parse(event.body || '{}');
  if (!email || !projectId) return { statusCode: 400, body: JSON.stringify({ error: 'Email and project are required.' }) };
  let userId;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) userId = existing.id;
  else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    userId = data.user.id;
  }
  await admin.from('profiles').upsert({ id: userId, email, full_name: email.split('@')[0] });
  const { error: memberError } = await admin.from('project_members').upsert({ project_id: projectId, user_id: userId, role: 'client' }, { onConflict: 'project_id,user_id' });
  if (memberError) return { statusCode: 400, body: JSON.stringify({ error: memberError.message }) };
  return { statusCode: 200, body: JSON.stringify({ message: existing ? 'Existing account connected to the project.' : 'Invitation sent and project access assigned.' }) };
};
