import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 25), 100);
    const { data: deliveries, error } = await admin
      .from('integration_webhook_deliveries')
      .select('*, integration_webhook_subscriptions(*)')
      .in('status', ['pending', 'retrying'])
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const results = [];
    for (const delivery of deliveries || []) {
      const sub = delivery.integration_webhook_subscriptions;
      if (!sub || sub.status !== 'active') continue;
      const payload = JSON.stringify({ id: delivery.event_id, topic: delivery.topic, created_at: delivery.created_at, data: delivery.payload });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await hmacSha256(sub.signing_secret_hash || sub.id, `${timestamp}.${payload}`);
      try {
        const res = await fetch(sub.endpoint_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ERP-Integration-Webhooks/1.0',
            'X-ERP-Event': delivery.topic,
            'X-ERP-Delivery': delivery.id,
            'X-ERP-Timestamp': timestamp,
            'X-ERP-Signature': `sha256=${signature}`,
            ...(sub.headers || {}),
          },
          body: payload,
        });
        const responseBody = await res.text();
        await admin.rpc('integration_mark_delivery_result', {
          p_delivery_id: delivery.id,
          p_success: res.ok,
          p_response_status: res.status,
          p_response_body: responseBody.slice(0, 4000),
          p_error_message: res.ok ? null : `HTTP ${res.status}`,
        });
        await admin.from('integration_monitor_events').insert({
          company_id: delivery.company_id,
          integration_name: 'webhook-dispatcher',
          event_type: delivery.topic,
          direction: 'outbound',
          status: res.ok ? 'success' : 'failed',
          error_message: res.ok ? null : `HTTP ${res.status}`,
          record_type: 'webhook_delivery',
          record_id: delivery.id,
        });
        results.push({ id: delivery.id, ok: res.ok, status: res.status });
      } catch (err: any) {
        await admin.rpc('integration_mark_delivery_result', {
          p_delivery_id: delivery.id,
          p_success: false,
          p_response_status: null,
          p_response_body: null,
          p_error_message: err.message,
        });
        results.push({ id: delivery.id, ok: false, error: err.message });
      }
    }

    return json({ processed: results.length, results });
  } catch (err: any) {
    return json({ error: err.message || 'dispatcher_error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
