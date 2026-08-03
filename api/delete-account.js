import { createClient } from '@supabase/supabase-js';

// Deleting a Supabase auth user requires the service-role key, which
// bypasses RLS and must never reach the browser — hence this running as a
// server-side function instead of a client-side call. items/settings rows
// are cleaned up automatically via their `on delete cascade` foreign keys.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  // Verifies the token belongs to a real, currently-valid session — this is
  // what proves the request actually came from the signed-in account owner.
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: { user }, error: getUserError } = await anonClient.auth.getUser(token);
  if (getUserError || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  res.status(200).json({ ok: true });
}
