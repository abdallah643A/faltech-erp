import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: currency || 'SAR',
    minimumFractionDigits: 2,
  }).format(value);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Require Bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify user authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check user has sales_rep, manager, or admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['sales_rep', 'manager', 'admin']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse request body and require quoteId
    const { quoteId } = await req.json();

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: 'Quote ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate quoteId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(quoteId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid quote ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Fetch quote from database (RLS enforces access control)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_lines(*)
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: 'Quote not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Get customer email from business_partners table
    const { data: customer } = await supabase
      .from('business_partners')
      .select('email, card_name')
      .eq('card_code', quote.customer_code)
      .single();

    const toEmail = customer?.email;
    if (!toEmail || !toEmail.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Customer email not found or invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Use only database data (cannot be tampered)
    const lineItems = quote.quote_lines?.map((line: any) => ({
      itemCode: line.item_code,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unit_price,
      lineTotal: line.line_total,
    })) || [];

    const customerName = customer.card_name || quote.customer_name;
    const currency = quote.currency || 'SAR';

    // Build line items HTML
    const lineItemsHtml = lineItems.length > 0
      ? `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Unit Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map((item: any) => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.itemCode}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(item.unitPrice, currency)}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(item.lineTotal, currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '';

    const subtotal = quote.subtotal || 0;
    const discountAmount = quote.discount_amount || 0;
    const taxAmount = quote.tax_amount || 0;
    const total = quote.total || 0;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Quote #Q-${quote.quote_number}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your business</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="font-size: 16px;">Dear <strong>${customerName}</strong>,</p>
          
          <p>Please find below your quote details:</p>
          
          ${lineItemsHtml}
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Subtotal:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(subtotal, currency)}</td>
              </tr>
              ${discountAmount > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;">Discount:</td>
                  <td style="padding: 8px 0; text-align: right; color: #dc2626;">-${formatCurrency(discountAmount, currency)}</td>
                </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #666;">Tax (VAT):</td>
                <td style="padding: 8px 0; text-align: right;">${formatCurrency(taxAmount, currency)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e5e5;">
                <td style="padding: 12px 0; font-size: 18px; font-weight: bold;">Total:</td>
                <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #1e40af;">${formatCurrency(total, currency)}</td>
              </tr>
            </table>
          </div>
          
          ${quote.valid_until ? `
            <p style="background: #fef3c7; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong>⏰ This quote is valid until:</strong> ${new Date(quote.valid_until).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          ` : ''}
          
          ${quote.notes ? `
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 6px;">
              <strong>Notes:</strong>
              <p style="margin: 8px 0 0 0;">${quote.notes}</p>
            </div>
          ` : ''}
          
          <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br><strong>Al Rajhi Smart Suite Team</strong></p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="margin: 0; color: #666; font-size: 12px;">This is an automated email. Please do not reply directly.</p>
        </div>
      </body>
      </html>
    `;

    // 8. Send email with validated data
    const emailResponse = await resend.emails.send({
      from: "Al Rajhi Smart Suite <noreply@resend.dev>",
      to: [toEmail],
      subject: `Quote #Q-${quote.quote_number} from Al Rajhi Smart Suite`,
      html: emailHtml,
    });

    console.log("Quote email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-quote-email function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while sending the email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
