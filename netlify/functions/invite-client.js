const { createClient } = require('@supabase/supabase-js');
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const customerEmail = username => `${username}@portal.adelieconstruction.com`;

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { statusCode: 500, body: JSON.stringify({ error: 'Portal access is not configured on Netlify.' }) };

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const token = (event.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) return { statusCode: 401, body: JSON.stringify({ error: 'Please sign in again.' }) };
  const { data: allowed } = await admin.from('portal_admins').select('user_id').eq('user_id', authData.user.id).maybeSingle();
  if (!allowed) return { statusCode: 403, body: JSON.stringify({ error: 'Administrator access required.' }) };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) }; }
  const username = String(payload.username || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const projectId = String(payload.projectId || '');
  if (!USERNAME_PATTERN.test(username)) return { statusCode: 400, body: JSON.stringify({ error: 'Username must be 3–32 characters using letters, numbers, dots, dashes, or underscores.' }) };
  if (password.length < 10) return { statusCode: 400, body: JSON.stringify({ error: 'Password must contain at least 10 characters.' }) };
  if (!projectId) return { statusCode: 400, body: JSON.stringify({ error: 'Choose a project.' }) };

  const email = customerEmail(username);
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return { statusCode: 400, body: JSON.stringify({ error: listError.message }) };
  let user = list.users.find(item => item.email?.toLowerCase() === email);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, { password, user_metadata: { ...user.user_metadata, portal_username: username } });
    if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { portal_username: username } });
    if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    user = data.user;
  }

  const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, email, full_name: username });
  if (profileError) return { statusCode: 400, body: JSON.stringify({ error: profileError.message }) };
  const { error: memberError } = await admin.from('project_members').upsert({ project_id: projectId, user_id: user.id, role: 'client' }, { onConflict: 'project_id,user_id' });
  if (memberError) return { statusCode: 400, body: JSON.stringify({ error: memberError.message }) };
  return { statusCode: 200, body: JSON.stringify({ message: `Customer login ready. Username: ${username}` }) };
};
