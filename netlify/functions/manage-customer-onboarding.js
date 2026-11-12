const { createClient } = require('@supabase/supabase-js');

const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const out = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

exports.handler = async event => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return out(503, { error: 'Not configured.' });
  const token = (event.headers.authorization || '').match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return out(401, { error: 'Please sign in again.' });

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options);
  const { data: identity } = await db.auth.getUser(token);
  if (!identity.user) return out(401, { error: 'Please sign in again.' });
  const { data: admin } = await db.from('portal_admins').select('is_owner,permissions').eq('user_id', identity.user.id).maybeSingle();
  const canManage = admin?.is_owner || admin?.permissions?.some(permission => ['*', 'customers'].includes(permission));
  if (!canManage) return out(403, { error: 'Customer access is required.' });

  if (event.httpMethod === 'GET') {
    let query = db.from('customer_onboarding').select('*').order('created_at', { ascending: false });
    if (!admin.is_owner) query = query.is('archived_at', null);
    const { data, error } = await query;
    return error ? out(503, { error: 'Could not load homeowners.' }) : out(200, { records: data, isOwner: !!admin.is_owner });
  }
  if (event.httpMethod !== 'POST') return out(405, { error: 'Method not allowed.' });

  let input;
  try { input = JSON.parse(event.body || '{}'); } catch { return out(400, { error: 'Invalid request.' }); }
  if (!input.id) return out(400, { error: 'Choose a homeowner account.' });

  if (input.action === 'archive') {
    const { error } = await db.from('customer_onboarding').update({ archived_at: new Date().toISOString(), archived_by: identity.user.id, updated_at: new Date().toISOString() }).eq('id', input.id).is('archived_at', null);
    return error ? out(503, { error: 'Could not remove this homeowner from the active list.' }) : out(200, { message: 'Homeowner moved to the protected removed list.' });
  }
  if (input.action === 'restore') {
    if (!admin.is_owner) return out(403, { error: 'Only the protected owner can restore homeowners.' });
    const { error } = await db.from('customer_onboarding').update({ archived_at: null, archived_by: null, updated_at: new Date().toISOString() }).eq('id', input.id);
    return error ? out(503, { error: 'Could not restore this homeowner.' }) : out(200, { message: 'Homeowner restored.' });
  }
  if (input.action === 'purge') {
    if (!admin.is_owner) return out(403, { error: 'Only the protected owner can permanently delete homeowners.' });
    const { data: record, error: lookupError } = await db.from('customer_onboarding').select('user_id,email,archived_at').eq('id', input.id).maybeSingle();
    if (lookupError || !record) return out(404, { error: 'Homeowner record not found.' });
    if (!record.archived_at) return out(409, { error: 'Move the homeowner to Removed Homeowners before permanently deleting them.' });
    const [{ data: documents, error: documentLookupError }, { data: photos, error: photoLookupError }] = await Promise.all([
      db.from('documents').select('storage_path,bucket').eq('uploaded_by', record.user_id).eq('uploaded_role', 'client'),
      db.from('project_photos').select('storage_path,bucket').eq('uploaded_by', record.user_id).eq('uploaded_role', 'client')
    ]);
    if (documentLookupError || photoLookupError) return out(503, { error: 'Could not inventory this homeowner’s uploaded files.' });
    const removals = [
      ['project-files', (documents || []).filter(item => (item.bucket || 'project-files') === 'project-files').map(item => item.storage_path)],
      ['project-photos', (photos || []).filter(item => (item.bucket || 'project-photos') === 'project-photos').map(item => item.storage_path)]
    ];
    for (const [bucket, paths] of removals) {
      if (!paths.length) continue;
      const { error: storageError } = await db.storage.from(bucket).remove(paths);
      if (storageError) return out(503, { error: `Could not remove all customer files from ${bucket}. Nothing else was deleted.` });
    }
    const [{ error: documentDeleteError }, { error: photoDeleteError }] = await Promise.all([
      db.from('documents').delete().eq('uploaded_by', record.user_id).eq('uploaded_role', 'client'),
      db.from('project_photos').delete().eq('uploaded_by', record.user_id).eq('uploaded_role', 'client')
    ]);
    if (documentDeleteError || photoDeleteError) return out(503, { error: 'Files were removed, but their portal records could not be cleared.' });
    const { error } = await db.auth.admin.deleteUser(record.user_id, false);
    return error ? out(503, { error: 'Customer files were cleared, but the login could not be permanently deleted.' }) : out(200, { message: `${record.email} was fully deleted and can now start from scratch.` });
  }

  if (input.action === 'update_answers') {
    const allowed = {
      spaces: ['Kitchen','Bathroom','Whole house','Addition','Exterior / outdoor living','Flooring / paint only','Not sure yet'],
      extent: ['A focused refresh','Replace finishes and fixtures','Change the layout','Major structural changes','I’m not sure yet'],
      priority: ['Better function','A new look and feel','More space','Accessibility or aging in place','Energy efficiency','Resale value','Repair damage or wear'],
      timing: ['As soon as possible','Within 3 months','3–6 months','6–12 months','More than a year away','Just exploring'],
      budget: ['Under $25,000','$25,000–$75,000','$75,000–$150,000','$150,000–$300,000','$300,000+','I’d like guidance'],
      occupancy: ['Yes','No','Not sure yet','This is not my primary residence']
    };
    const source = input.discovery || {}, discovery = {};
    for (const key of ['spaces','priority']) discovery[key] = [...new Set((Array.isArray(source[key]) ? source[key] : []).filter(value => allowed[key].includes(value)))];
    for (const key of ['extent','timing','budget','occupancy']) if (allowed[key].includes(source[key])) discovery[key] = source[key];
    const vision = String(source.vision || '').trim().slice(0, 1600);
    if (vision) discovery.vision = vision;
    if (!discovery.spaces.length) return out(400, { error: 'Choose at least one remodel area.' });
    const { error } = await db.from('customer_onboarding').update({ discovery, updated_at: new Date().toISOString() }).eq('id', input.id).is('archived_at', null);
    return error ? out(503, { error: 'Could not update the project answers.' }) : out(200, { message: 'Project answers updated. The Design Sheet will now use the new remodel areas.' });
  }

  const allowedForms = ['discovery', 'design', 'letter_of_intent', 'property_access'];
  const enabledForms = [...new Set((input.enabledForms || []).filter(item => allowedForms.includes(item)))];
  const allowedStages = ['new', 'discovery', 'planning', 'proposal', 'contract', 'active', 'complete'];
  if (!allowedStages.includes(input.stage)) return out(400, { error: 'Choose a valid homeowner stage.' });
  const { error } = await db.from('customer_onboarding').update({ enabled_forms: enabledForms, stage: input.stage, updated_at: new Date().toISOString() }).eq('id', input.id).is('archived_at', null);
  return error ? out(503, { error: 'Could not update this homeowner.' }) : out(200, { message: 'Homeowner access updated.' });
};
