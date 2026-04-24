// Provider-agnostic telematics ingest endpoint.
// Accepts: { asset_id, points: [{ recorded_at, latitude, longitude, speed_kmh?, heading?, odometer?, ignition_on?, fuel_level_pct?, engine_temp?, raw? }], provider? }
// Or single: { asset_id, recorded_at, latitude, longitude, ... }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provider-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    if (!body?.asset_id) {
      return new Response(JSON.stringify({ error: 'asset_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const provider = body.provider || req.headers.get('x-provider-key') || 'manual';
    const rawPoints = Array.isArray(body.points) ? body.points : [body];

    const rows = rawPoints
      .filter((p: any) => p && p.latitude != null && p.longitude != null)
      .map((p: any) => ({
        asset_id: body.asset_id,
        trip_id: p.trip_id || body.trip_id || null,
        recorded_at: p.recorded_at || new Date().toISOString(),
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        speed_kmh: p.speed_kmh != null ? Number(p.speed_kmh) : null,
        heading: p.heading != null ? Number(p.heading) : null,
        altitude: p.altitude != null ? Number(p.altitude) : null,
        odometer: p.odometer != null ? Number(p.odometer) : null,
        ignition_on: p.ignition_on ?? null,
        fuel_level_pct: p.fuel_level_pct != null ? Number(p.fuel_level_pct) : null,
        engine_temp: p.engine_temp != null ? Number(p.engine_temp) : null,
        provider,
        raw_payload: p.raw ?? p,
      }));

    if (!rows.length) {
      return new Response(JSON.stringify({ error: 'no valid points' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error } = await admin.from('fleet_telematics_points').insert(rows);
    if (error) throw error;

    // Update vehicle current_odometer with the latest non-null odometer
    const latest = rows
      .filter((r: any) => r.odometer != null)
      .sort((a: any, b: any) => a.recorded_at < b.recorded_at ? 1 : -1)[0];
    if (latest?.odometer != null) {
      await admin.from('fleet_assets')
        .update({ current_odometer: latest.odometer })
        .eq('id', body.asset_id);
    }

    return new Response(JSON.stringify({ success: true, ingested: rows.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('fleet-telematics-ingest error', err);
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
