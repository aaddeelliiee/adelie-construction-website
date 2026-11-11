const { createClient } = require('@supabase/supabase-js');
const portalConfig = require('../../portal-config.js');
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const response = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !portalConfig.supabaseAnonKey) return response(503, { error: 'Invitations are not configured.' });
  const token = (event.headers.authorization || '').match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return response(401, { error: 'Please sign in again.' });
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options);
  const { data: identity } = await db.auth.getUser(token);
  if (!identity.user) return response(401, { error: 'Please sign in again.' });
  const [{ data: admin }, { data: employee }] = await Promise.all([
    db.from('portal_admins').select('user_id,is_owner,permissions').eq('user_id', identity.user.id).maybeSingle(),
    db.from('employees').select('user_id').eq('user_id', identity.user.id).maybeSingle()
  ]);
  if (!employee && !admin?.is_owner && !admin?.permissions?.some(p => ['*', 'customers'].includes(p))) return response(403, { error: 'Customer access is required.' });

  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return response(400, { error: 'Invalid request.' }); }
  const fullName = String(input.fullName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const address = String(input.address || '').trim();
  if (!fullName || fullName.length > 120 || !address || address.length > 300 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response(400, { error: 'Enter the homeowner’s name, email, and property address.' });
  }

  let user;
  const { data: created, error: createError } = await db.auth.admin.createUser({ email, email_confirm: false, user_metadata: { full_name: fullName } });
  user = created?.user;
  if (createError?.code === 'email_exists' || createError?.code === 'user_already_exists') {
    for (let page = 1; page <= 10 && !user; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return response(502, { error: 'Could not verify the existing customer account.' });
      user = data.users.find(item => item.email?.toLowerCase() === email);
      if (data.users.length < 1000) break;
    }
    if (!user) return response(409, { error: 'That email already exists but could not be linked.' });
    const [{ data: protectedAdmin }, { data: protectedEmployee }] = await Promise.all([
      db.from('portal_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
      db.from('employees').select('user_id').eq('user_id', user.id).maybeSingle()
    ]);
    if (protectedAdmin || protectedEmployee) return response(409, { error: 'Use a homeowner email address, not a staff account.' });
  }
  if (!user) return response(502, { error: 'Could not create the homeowner account.' });

  const { data: onboarding, error: saveError } = await db.from('customer_onboarding').upsert({
    user_id: user.id, full_name: fullName, email, address, created_by: identity.user.id
  }, { onConflict: 'user_id' }).select('id').single();
  if (saveError) return response(503, { error: 'The homeowner record could not be saved.' });

  const mail = createClient(SUPABASE_URL, portalConfig.supabaseAnonKey, options);
  const host = event.headers.host || 'www.adelieconstruction.com';
  const redirect = `https://${host}/portal-login.html`;
  const { error: sendError } = await mail.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirect } });
  if (sendError) return response(502, { error: 'The account is ready, but the welcome email could not be sent.' });
  return response(200, { id: onboarding.id, message: `Welcome link sent to ${email}.` });
};
