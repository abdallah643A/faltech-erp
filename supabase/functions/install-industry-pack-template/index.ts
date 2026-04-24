import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { template_id, company_id } = await req.json();
    if (!template_id || !company_id) {
      return new Response(JSON.stringify({ error: 'template_id and company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id ?? null;
    }

    // Fetch template
    const { data: template, error: tErr } = await supabase
      .from('industry_pack_templates').select('*').eq('id', template_id).single();
    if (tErr || !template) throw new Error(tErr?.message ?? 'Template not found');

    // Resolve dependencies — ensure required packs are active
    const { data: deps } = await supabase
      .from('industry_pack_dependencies').select('*')
      .eq('pack_key', template.pack_key).eq('is_hard', true);

    const missing: string[] = [];
    for (const d of deps ?? []) {
      const { data: act } = await supabase
        .from('tenants_industry_activations').select('is_active')
        .eq('company_id', company_id).eq('pack_key', d.depends_on_pack_key).maybeSingle();
      if (!act?.is_active) missing.push(d.depends_on_pack_key);
    }
    if (missing.length) {
      return new Response(JSON.stringify({
        error: 'Missing required pack dependencies', missing,
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert/update installation row as installing
    const { data: install, error: iErr } = await supabase
      .from('tenants_pack_installations').upsert({
        company_id, pack_key: template.pack_key,
        template_id, version: template.version,
        install_status: 'installing', installed_by: userId,
      }, { onConflict: 'company_id,template_id' }).select().single();
    if (iErr) throw iErr;

    // "Seed" — for now we just record the payload; real seeders would create rows in module tables
    const seeded = template.seed_payload ?? {};
    const counts: Record<string, number> = {};
    for (const k of Object.keys(seeded)) {
      counts[k] = Array.isArray(seeded[k]) ? seeded[k].length : 1;
    }

    await supabase.from('tenants_pack_installations').update({
      install_status: 'installed',
      seeded_records: counts,
      installed_at: new Date().toISOString(),
    }).eq('id', install.id);

    // Auto-activate the pack if not already
    await supabase.from('tenants_industry_activations').upsert({
      company_id, pack_key: template.pack_key,
      is_active: true, activated_at: new Date().toISOString(), activated_by: userId,
    }, { onConflict: 'company_id,pack_key' });

    return new Response(JSON.stringify({ success: true, installation_id: install.id, counts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? 'Install failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
