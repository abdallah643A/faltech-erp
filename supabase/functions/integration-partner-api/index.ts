import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const ENTITY_TABLES: Record<string, string> = {
  business_partners: 'business_partners',
  items: 'items',
  sales_orders: 'sales_orders',
  purchase_orders: 'purchase_orders',
  projects: 'projects',
  assets: 'assets',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const auth = await authenticate(req, admin);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const url = new URL(req.url);
    const [, entityRaw] = url.pathname.split('/').filter(Boolean).slice(-2);
    const entity = entityRaw || url.searchParams.get('entity') || '';
    const table = ENTITY_TABLES[entity];
    if (!table) return json({ error: 'Unsupported entity' }, 404);
    if (auth.client.allowed_entities?.length && !auth.client.allowed_entities.includes(entity)) return json({ error: 'Entity not allowed for client' }, 403);

    if (req.method === 'GET') {
      const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);
      const { data, error } = await admin.from(table).select('*').eq('company_id', auth.client.company_id).limit(limit);
      if (error) throw error;
      await log(admin, auth.client.company_id, 'partner-api', `read.${entity}`, 'success', entity);
      return json({ data, limit });
    }

    if (req.method === 'POST') {
      if (!auth.scopes.includes(`${entity}:write`) && !auth.scopes.includes('*')) return json({ error: 'Missing write scope' }, 403);
      const body = await req.json();
      const rows = Array.isArray(body) ? body : [body];
      const { data, error } = await admin.from(table).insert(rows.map((r) => ({ ...r, company_id: auth.client.company_id }))).select();
      if (error) throw error;
      await log(admin, auth.client.company_id, 'partner-api', `write.${entity}`, 'success', entity);
      return json({ data }, 201);
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err: any) {
    return json({ error: err.message || 'partner_api_error' }, 500);
  }
});

async function authenticate(req: Request, admin: any) {
  const apiKey = req.headers.get('x-api-key');
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (apiKey) {
    const { data, error } = await admin.from('integration_api_clients')
      .select('*')
      .eq('api_key_hash', await sha256(apiKey))
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, status: 401, error: 'Invalid API key' };
    await admin.from('integration_api_clients').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
    return { ok: true, client: data, scopes: data.scopes || [] };
  }

  if (bearer) {
    const { data: token, error } = await admin.from('integration_oauth_tokens')
      .select('*, integration_api_clients(*)')
      .eq('token_hash', await sha256(bearer))
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (!token) return { ok: false, status: 401, error: 'Invalid access token' };
    await admin.from('integration_oauth_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id);
    return { ok: true, client: token.integration_api_clients, scopes: token.scopes || [] };
  }

  return { ok: false, status: 401, error: 'Missing API key or bearer token' };
}

async function log(admin: any, companyId: string, name: string, type: string, status: string, recordType: string) {
  await admin.from('integration_monitor_events').insert({ company_id: companyId, integration_name: name, event_type: type, direction: 'inbound', status, record_type: recordType });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function sha256(input: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
