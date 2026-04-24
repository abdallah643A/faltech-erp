import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const body = await req.json();
    if (!body.template_id || !Array.isArray(body.rows)) return json({ error: 'template_id and rows[] required' }, 400);

    const { data: template, error } = await admin.from('integration_import_export_templates').select('*').eq('id', body.template_id).maybeSingle();
    if (error) throw error;
    if (!template) return json({ error: 'Template not found' }, 404);

    const columns = Array.isArray(template.column_definitions) ? template.column_definitions : [];
    const required = columns.filter((c: any) => c.required).map((c: any) => c.key);
    const validationErrors: any[] = [];

    body.rows.forEach((row: any, index: number) => {
      for (const key of required) if (row[key] === undefined || row[key] === null || row[key] === '') validationErrors.push({ row: index + 1, field: key, error: 'required' });
    });

    await admin.from('integration_monitor_events').insert({
      company_id: template.company_id,
      integration_name: 'template-processor',
      event_type: `${template.template_type}.${template.entity_name}`,
      direction: template.direction,
      status: validationErrors.length ? 'failed' : 'success',
      error_details: validationErrors.length ? { validationErrors } : null,
      record_type: template.entity_name,
      owner_name: claims.claims.email,
    });

    return json({ valid: validationErrors.length === 0, validationErrors, acceptedRows: validationErrors.length ? 0 : body.rows.length });
  } catch (err: any) {
    return json({ error: err.message || 'template_processor_error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
