import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    if (body.grant_type !== 'client_credentials') return json({ error: 'unsupported_grant_type' }, 400);
    if (!body.client_id || !body.client_secret) return json({ error: 'client_id and client_secret required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const secretHash = await sha256(body.client_secret);

    const { data: client, error } = await admin
      .from('integration_api_clients')
      .select('*')
      .eq('oauth_client_id', body.client_id)
      .eq('oauth_client_secret_hash', secretHash)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    if (!client) return json({ error: 'invalid_client' }, 401);
    if (client.expires_at && new Date(client.expires_at) < new Date()) return json({ error: 'client_expired' }, 401);

    const requested = typeof body.scope === 'string' ? body.scope.split(/\s+/).filter(Boolean) : [];
    const allowed = client.scopes || [];
    const scopes = requested.length ? requested.filter((s: string) => allowed.includes(s)) : allowed;
    const token = `erp_at_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
    const expiresIn = 3600;

    const { error: insertError } = await admin.from('integration_oauth_tokens').insert({
      client_id: client.id,
      token_hash: await sha256(token),
      scopes,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
    if (insertError) throw insertError;

    await admin.from('integration_api_clients').update({ last_used_at: new Date().toISOString() }).eq('id', client.id);

    return json({ access_token: token, token_type: 'Bearer', expires_in: expiresIn, scope: scopes.join(' ') });
  } catch (err: any) {
    return json({ error: err.message || 'token_error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function sha256(input: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
