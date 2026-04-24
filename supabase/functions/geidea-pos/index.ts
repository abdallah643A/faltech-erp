import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Provider Adapter Interface ──
interface ProviderAdapter {
  name: string;
  initiatePayment(params: PaymentRequest, settings: Record<string, string>, txnRef: string, callbackUrl: string): Promise<ProviderResult>;
  checkStatus?(providerRef: string, settings: Record<string, string>): Promise<ProviderResult>;
  cancelPayment?(providerRef: string, settings: Record<string, string>): Promise<{ success: boolean }>;
  refundPayment?(params: RefundRequest, settings: Record<string, string>): Promise<ProviderResult>;
}

interface ProviderResult {
  success: boolean;
  status: 'approved' | 'declined' | 'pending' | 'processing' | 'failed';
  card_type?: string;
  card_last_four?: string;
  card_scheme?: string;
  auth_code?: string;
  rrn?: string;
  response_code?: string;
  response_message?: string;
  receipt_number?: string;
  provider_ref?: string;
  raw_response?: any;
}

interface PaymentRequest {
  amount: number;
  currency?: string;
  terminal_id?: string;
  merchant_reference?: string;
  source_module: string;
  source_document_id?: string;
  source_document_number?: string;
  customer_name?: string;
  company_id?: string;
  branch_id?: string;
  cashier_id?: string;
  cashier_name?: string;
  idempotency_key?: string;
}

interface RefundRequest {
  original_payment_id: string;
  refund_amount: number;
  currency?: string;
  reason?: string;
  provider_transaction_ref?: string;
}

// ── Mock Provider ──
const mockProvider: ProviderAdapter = {
  name: 'mock',
  async initiatePayment(params) {
    await new Promise(r => setTimeout(r, 2500));
    const cardTypes = ['VISA', 'MASTERCARD', 'MADA'];
    const card = cardTypes[Math.floor(Math.random() * cardTypes.length)];
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    return {
      success: true, status: 'approved',
      card_type: card, card_scheme: card, card_last_four: last4,
      auth_code: String(Math.floor(100000 + Math.random() * 900000)),
      rrn: String(Math.floor(100000000000 + Math.random() * 900000000000)),
      response_code: '000', response_message: 'Approved (Mock)',
      receipt_number: `RCP-${Date.now()}`,
      provider_ref: `MOCK-${Date.now()}`,
      raw_response: { mock: true, card_scheme: card, last4 },
    };
  },
  async refundPayment(params) {
    await new Promise(r => setTimeout(r, 1500));
    return {
      success: true, status: 'approved',
      response_code: '000', response_message: 'Refund Approved (Mock)',
      provider_ref: `MOCK-RFD-${Date.now()}`,
      raw_response: { mock: true, refund: true },
    };
  },
};

// ── Geidea Provider ──
const geideaProvider: ProviderAdapter = {
  name: 'geidea',
  async initiatePayment(params, settings, txnRef, callbackUrl) {
    const apiKey = settings.geidea_api_key;
    const merchantId = settings.geidea_merchant_id;
    const baseUrl = settings.geidea_base_url || 'https://api.merchant.geidea.net';
    if (!apiKey || !merchantId) throw new Error('Geidea API credentials not configured');

    const resp = await fetch(`${baseUrl}/pgw/api/v1/direct/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(merchantId + ':' + apiKey)}` },
      body: JSON.stringify({ amount: params.amount, currency: params.currency || 'SAR', merchantReferenceId: txnRef, callbackUrl }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.detailedResponseMessage || 'Geidea API Error');
    return { success: true, status: 'processing', raw_response: data, provider_ref: data.session?.id };
  },
  async refundPayment(params, settings) {
    const apiKey = settings.geidea_api_key;
    const merchantId = settings.geidea_merchant_id;
    const baseUrl = settings.geidea_base_url || 'https://api.merchant.geidea.net';
    if (!apiKey || !merchantId) throw new Error('Geidea credentials not configured');

    const resp = await fetch(`${baseUrl}/pgw/api/v1/direct/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(merchantId + ':' + apiKey)}` },
      body: JSON.stringify({ orderId: params.provider_transaction_ref, refundAmount: params.refund_amount }),
    });
    const data = await resp.json();
    if (!resp.ok) return { success: false, status: 'failed' as const, response_message: data?.detailedResponseMessage, raw_response: data };
    return { success: true, status: 'approved' as const, provider_ref: data.orderId, response_code: data.responseCode, response_message: data.detailedResponseMessage, raw_response: data };
  },
};

// ── HyperPay Provider (stub) ──
const hyperpayProvider: ProviderAdapter = {
  name: 'hyperpay',
  async initiatePayment() { throw new Error('HyperPay integration not yet configured'); },
  async refundPayment() { throw new Error('HyperPay refund not yet configured'); },
};

function getProvider(name: string, isMock: boolean): ProviderAdapter {
  if (isMock) return mockProvider;
  switch (name) {
    case 'geidea': return geideaProvider;
    case 'hyperpay': return hyperpayProvider;
    default: return mockProvider;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userId = claimsData.claims.sub;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'initiate';

    // Load settings
    const { data: allSettings } = await supabase.from('bank_pos_settings').select('setting_key, setting_value');
    const settings: Record<string, string> = {};
    (allSettings || []).forEach((s: any) => { settings[s.setting_key] = s.setting_value; });
    const isMock = settings.geidea_mode !== 'live';

    if (action === 'initiate') {
      const body: PaymentRequest = await req.json();
      if (!body.amount || body.amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Idempotency check
      if (body.idempotency_key) {
        const { data: existing } = await supabase.from('bank_pos_payments').select('*').eq('idempotency_key', body.idempotency_key).maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ success: existing.status === 'approved', transaction: existing, duplicate: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Resolve terminal
      let terminalId = body.terminal_id;
      let providerName = 'geidea';
      if (!terminalId) {
        const { data: defaultTerm } = await supabase.from('bank_pos_settings').select('setting_value').eq('setting_key', 'default_terminal_id').single();
        if (defaultTerm?.setting_value) {
          const { data: term } = await supabase.from('bank_pos_terminals').select('id, provider').eq('terminal_id', defaultTerm.setting_value).single();
          terminalId = term?.id;
          if (term?.provider) providerName = term.provider;
        }
        if (!terminalId) {
          const { data: first } = await supabase.from('bank_pos_terminals').select('id, provider').eq('is_active', true).limit(1).single();
          terminalId = first?.id;
          if (first?.provider) providerName = first.provider;
        }
      } else {
        const { data: term } = await supabase.from('bank_pos_terminals').select('provider').eq('id', terminalId).single();
        if (term?.provider) providerName = term.provider;
      }

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', userId).single();
      const txnRef = `POS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create pending payment record
      const { data: txn, error: txnError } = await supabase.from('bank_pos_payments').insert({
        transaction_ref: txnRef,
        terminal_id: terminalId,
        amount: body.amount,
        currency: body.currency || 'SAR',
        status: 'pending',
        merchant_reference: body.merchant_reference || txnRef,
        source_module: body.source_module,
        source_document_id: body.source_document_id,
        source_document_number: body.source_document_number,
        customer_name: body.customer_name,
        initiated_by: userId,
        initiated_by_name: profile?.full_name || 'User',
        company_id: body.company_id || null,
        branch_id: body.branch_id || null,
        cashier_id: body.cashier_id || userId,
        cashier_name: body.cashier_name || profile?.full_name,
        idempotency_key: body.idempotency_key || null,
        provider: providerName,
      }).select().single();
      if (txnError) throw txnError;

      // Audit log
      await supabase.from('pos_payment_audit_log').insert({
        payment_id: txn.id, action: 'payment_initiated', action_type: 'info',
        details: { amount: body.amount, provider: providerName, mock: isMock },
        performed_by: userId, performed_by_name: profile?.full_name,
      });

      await supabase.from('bank_pos_payments').update({ status: 'processing' }).eq('id', txn.id);
      const callbackUrl = `${supabaseUrl}/functions/v1/geidea-pos?action=callback`;
      const provider = getProvider(providerName, isMock);

      try {
        const result = await provider.initiatePayment(body, settings, txnRef, callbackUrl);

        if (result.status === 'approved') {
          const { data: completed } = await supabase.from('bank_pos_payments').update({
            status: 'approved', card_type: result.card_type, card_last_four: result.card_last_four,
            card_scheme: result.card_scheme, auth_code: result.auth_code, rrn: result.rrn,
            response_code: result.response_code, response_message: result.response_message,
            receipt_number: result.receipt_number, provider_transaction_ref: result.provider_ref,
            completed_at: new Date().toISOString(), raw_response: result.raw_response,
          }).eq('id', txn.id).select().single();

          // Update terminal last transaction
          if (terminalId) {
            await supabase.from('bank_pos_terminals').update({
              last_transaction_at: new Date().toISOString(), connection_status: 'online', last_ping_at: new Date().toISOString(),
            }).eq('id', terminalId);
          }

          await supabase.from('pos_payment_audit_log').insert({
            payment_id: txn.id, action: 'payment_approved', action_type: 'success',
            details: { auth_code: result.auth_code, card: result.card_type, last4: result.card_last_four },
            performed_by: userId,
          });

          return new Response(JSON.stringify({ success: true, transaction: completed, mock: isMock }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else if (result.status === 'processing') {
          // Live mode - waiting for callback
          await supabase.from('bank_pos_payments').update({
            provider_transaction_ref: result.provider_ref, raw_response: result.raw_response,
          }).eq('id', txn.id);
          return new Response(JSON.stringify({ success: true, transaction: { ...txn, status: 'processing' }, awaiting_callback: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          await supabase.from('bank_pos_payments').update({
            status: result.status === 'declined' ? 'declined' : 'failed',
            response_code: result.response_code, response_message: result.response_message,
            failed_at: new Date().toISOString(), raw_response: result.raw_response,
          }).eq('id', txn.id);

          await supabase.from('pos_payment_audit_log').insert({
            payment_id: txn.id, action: `payment_${result.status}`, action_type: 'error',
            details: { code: result.response_code, message: result.response_message },
            performed_by: userId,
          });

          return new Response(JSON.stringify({ success: false, error: result.response_message, transaction: { ...txn, status: result.status } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (providerErr: any) {
        await supabase.from('bank_pos_payments').update({
          status: 'failed', response_message: providerErr.message, failed_at: new Date().toISOString(),
        }).eq('id', txn.id);
        throw providerErr;
      }

    } else if (action === 'status') {
      const txnId = url.searchParams.get('id');
      if (!txnId) return new Response(JSON.stringify({ error: 'Transaction ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data, error } = await supabase.from('bank_pos_payments').select('*').eq('id', txnId).single();
      if (error) throw error;
      return new Response(JSON.stringify({ transaction: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (action === 'cancel') {
      const { id } = await req.json();
      const { data, error } = await supabase.from('bank_pos_payments')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', id).in('status', ['pending', 'processing']).select().single();
      if (error) throw error;
      await supabase.from('pos_payment_audit_log').insert({ payment_id: id, action: 'payment_cancelled', action_type: 'warning', performed_by: userId });
      return new Response(JSON.stringify({ success: true, transaction: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (action === 'refund') {
      const body: RefundRequest & { terminal_id?: string; company_id?: string; branch_id?: string } = await req.json();
      const { data: original } = await supabase.from('bank_pos_payments').select('*').eq('id', body.original_payment_id).single();
      if (!original || original.status !== 'approved') {
        return new Response(JSON.stringify({ error: 'Original payment not found or not approved' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const maxRefund = original.amount - (original.refund_amount || 0);
      if (body.refund_amount > maxRefund) {
        return new Response(JSON.stringify({ error: `Refund exceeds max (${maxRefund})` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', userId).single();
      const providerName = original.provider || 'geidea';
      const provider = getProvider(providerName, isMock);

      // Create refund record
      const { data: refund, error: refErr } = await supabase.from('pos_card_refunds').insert({
        refund_number: '', original_payment_id: body.original_payment_id,
        pos_transaction_id: original.pos_transaction_id, terminal_id: original.terminal_id,
        provider: providerName, refund_amount: body.refund_amount, currency: original.currency,
        reason: body.reason, status: 'processing',
        initiated_by: userId, initiated_by_name: profile?.full_name,
        company_id: original.company_id, branch_id: original.branch_id,
      } as any).select().single();
      if (refErr) throw refErr;

      try {
        const result = await provider.refundPayment!({ ...body, provider_transaction_ref: original.provider_transaction_ref || original.transaction_ref }, settings);
        const refundStatus = result.success ? 'approved' : 'failed';

        await supabase.from('pos_card_refunds').update({
          status: refundStatus, provider_refund_ref: result.provider_ref,
          auth_code: result.auth_code, response_code: result.response_code,
          response_message: result.response_message, completed_at: result.success ? new Date().toISOString() : null,
        }).eq('id', refund.id);

        if (result.success) {
          await supabase.from('bank_pos_payments').update({
            refund_amount: (original.refund_amount || 0) + body.refund_amount,
            refunded_at: new Date().toISOString(),
          }).eq('id', body.original_payment_id);
        }

        await supabase.from('pos_payment_audit_log').insert({
          payment_id: body.original_payment_id, action: `refund_${refundStatus}`, action_type: result.success ? 'success' : 'error',
          details: { refund_id: refund.id, amount: body.refund_amount, reason: body.reason },
          performed_by: userId, performed_by_name: profile?.full_name,
        });

        return new Response(JSON.stringify({ success: result.success, refund: { ...refund, status: refundStatus } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        await supabase.from('pos_card_refunds').update({ status: 'failed', response_message: err.message }).eq('id', refund.id);
        throw err;
      }

    } else if (action === 'callback') {
      const body = await req.json();
      const txnRef = body.merchantReferenceId;
      if (!txnRef) return new Response(JSON.stringify({ error: 'Missing reference' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const admin = createClient(supabaseUrl, serviceKey);
      const status = body.responseCode === '000' ? 'approved' : 'declined';
      await admin.from('bank_pos_payments').update({
        status, card_type: body.cardScheme, card_last_four: body.maskedCardNumber?.slice(-4),
        card_scheme: body.cardScheme, auth_code: body.authorizationCode, rrn: body.rrn,
        response_code: body.responseCode, response_message: body.detailedResponseMessage || body.responseMessage,
        receipt_number: body.receiptNumber, provider_transaction_ref: body.orderId,
        completed_at: status === 'approved' ? new Date().toISOString() : null,
        failed_at: status === 'declined' ? new Date().toISOString() : null,
        raw_response: body,
      }).eq('transaction_ref', txnRef);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (action === 'ping') {
      const { terminal_id } = await req.json();
      await supabase.from('bank_pos_terminals').update({
        connection_status: 'online', last_ping_at: new Date().toISOString(),
      }).eq('id', terminal_id);
      return new Response(JSON.stringify({ success: true, status: 'online' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('POS Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
