// Provider-agnostic delivery aggregator webhook ingest
// POST /restaurant-aggregator-webhook
// Body: { provider, event_type, external_order_id, company_id, branch_id, order, raw }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const signature = req.headers.get('x-signature') ?? null;

    // Validate
    if (!body.provider) {
      return new Response(JSON.stringify({ error: 'provider required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Always log raw payload
    const { data: webhookRow, error: logErr } = await supabase
      .from('rest_aggregator_webhooks')
      .insert({
        company_id: body.company_id ?? null,
        provider: body.provider,
        event_type: body.event_type ?? 'order.created',
        external_order_id: body.external_order_id ?? body.order?.id ?? null,
        signature,
        raw_payload: body,
      })
      .select()
      .single();

    if (logErr) throw logErr;

    // 2. Try to upsert aggregator order
    let aggOrderId: string | null = null;
    if (body.company_id && body.external_order_id) {
      const { data: existing } = await supabase
        .from('rest_aggregator_orders')
        .select('id')
        .eq('aggregator_name', body.provider)
        .eq('external_order_id', body.external_order_id)
        .maybeSingle();

      const orderRow = {
        company_id: body.company_id,
        branch_id: body.branch_id ?? null,
        aggregator_name: body.provider,
        external_order_id: body.external_order_id,
        platform_fee: body.order?.platform_fee ?? 0,
        commission_percent: body.order?.commission_percent ?? 0,
        commission_amount: body.order?.commission_amount ?? 0,
        status: mapStatus(body.event_type),
        raw_payload: body.order ?? body,
      };

      if (existing) {
        await supabase.from('rest_aggregator_orders').update(orderRow).eq('id', existing.id);
        aggOrderId = existing.id;
      } else {
        const { data: newRow } = await supabase.from('rest_aggregator_orders')
          .insert(orderRow).select('id').single();
        aggOrderId = newRow?.id ?? null;
      }
    }

    // 3. Mark webhook processed
    await supabase.from('rest_aggregator_webhooks').update({
      processed: true,
      processed_at: new Date().toISOString(),
      aggregator_order_id: aggOrderId,
    }).eq('id', webhookRow.id);

    return new Response(JSON.stringify({ success: true, aggregator_order_id: aggOrderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('aggregator webhook error', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapStatus(event?: string): string {
  if (!event) return 'received';
  if (event.includes('accept')) return 'accepted';
  if (event.includes('ready')) return 'ready';
  if (event.includes('pick')) return 'picked_up';
  if (event.includes('deliver')) return 'delivered';
  if (event.includes('cancel')) return 'cancelled';
  return 'received';
}
