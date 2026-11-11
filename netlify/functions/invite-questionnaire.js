const { createClient } = require('@supabase/supabase-js');

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed.' });
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !URL) {
    return reply(503, { error: 'Customer email invitations are not configured.' });
  }
  const token = (event.headers.authorization || '').match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, { error: 'Please sign in again.' });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options);
  const { data: identity, error: authError } = await admin.auth.getUser(token);
  if (authError || !identity.user) return reply(401, { error: 'Please sign in again.' });
  const { data: access, error: accessError } = await admin.from('portal_admins')
    .select('is_owner,permissions').eq('user_id', identity.user.id).maybeSingle();
  if (accessError) return reply(503, { error: 'Could not check customer permissions.' });
  if (!access?.is_owner && !access?.permissions?.some(permission => ['*', 'customers'].includes(permission))) {
    return reply(403, { error: 'Customer-account permission required.' });
  }

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { error: 'Invalid request.' });
  }
  const projectId = String(input?.projectId || '');
  const email = String(input?.email || '').trim().toLowerCase();
  const name = String(input?.name || '').trim();
  const phone = String(input?.phone || '').trim();
  if (!uuid.test(projectId) || !name || name.length > 120 || phone.length > 40 ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      /@(?:portal|employees)\.adelieconstruction\.com$/.test(email)) {
    return reply(400, { error: 'Select a project and enter the homeowner’s name and email address.' });
  }
  const { data: project, error: projectError } = await admin.from('projects')
    .select('id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return reply(404, { error: 'Select an existing project.' });

  let { data: created, error: createError } = await admin.auth.admin.createUser({
    email, email_confirm: false,
    app_metadata: { finish_questionnaire_project: projectId, invited_by: identity.user.id }
  });
  let customer = created?.user;
  if (createError?.code === 'email_exists' || createError?.code === 'user_already_exists') {
    const { data: matches, error } = await admin.rpc('find_finish_invitee', {
      target_project: projectId, contact_email: email
    });
    if (error || !matches) {
      return reply(409, { error: 'That email belongs to another account. Contact the portal administrator.' });
    }
    customer = { id: matches };
  }
  if (!customer) return reply(502, { error: 'Could not create the customer login.' });

  const { error: assignError } = await admin.rpc('assign_finish_questionnaire', {
    target_project: projectId, customer: customer.id,
    contact_email: email, contact_name: name, contact_phone: phone
  });
  if (assignError) {
    return reply(503, { error: 'The questionnaire could not be assigned. Retry this email for the same project.' });
  }

  const emailClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
  const redirect = new globalThis.URL('/portal-login.html', URL).href;
  const { error: sendError } = await emailClient.auth.signInWithOtp({
    email, options: { shouldCreateUser: false, emailRedirectTo: redirect }
  });
  if (sendError) {
    return reply(502, { error: 'The login is ready, but the email could not be sent. Retry or ask the homeowner to request a sign-in link.' });
  }
  return reply(200, { message: 'Questionnaire invitation emailed to the homeowner.' });
};
