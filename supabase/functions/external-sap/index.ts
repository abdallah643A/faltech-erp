import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SAPSession {
  sessionId: string;
  routeId: string;
}

class ExternalSAPClient {
  private baseUrl: string;
  private companyDB: string;
  private username: string;
  private password: string;
  private session: SAPSession | null = null;

  constructor(settings: { service_layer_url: string; company_db: string; username: string; password: string }) {
    this.baseUrl = settings.service_layer_url.replace(/\/$/, '');
    this.companyDB = settings.company_db;
    this.username = settings.username;
    this.password = settings.password;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.session) {
      headers['Cookie'] = `B1SESSION=${this.session.sessionId}; ROUTEID=${this.session.routeId}`;
    }
    return headers;
  }

  async login(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${this.baseUrl}/Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CompanyDB: this.companyDB, UserName: this.username, Password: this.password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        console.error('External SAP login failed:', await response.text());
        return false;
      }
      const cookies = response.headers.get('set-cookie') || '';
      const sessionMatch = cookies.match(/B1SESSION=([^;]+)/);
      const routeMatch = cookies.match(/ROUTEID=([^;]+)/);
      if (sessionMatch) {
        this.session = {
          sessionId: sessionMatch[1],
          routeId: routeMatch ? routeMatch[1] : '',
        };
        return true;
      }
      return false;
    } catch (error) {
      console.error('External SAP login error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    if (!this.session) return;
    try {
      await fetch(`${this.baseUrl}/Logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (_) {}
    this.session = null;
  }

  private async fetchJson(url: string): Promise<any> {
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SAP API error ${response.status}: ${text}`);
    }
    return response.json();
  }

  async getItemsWithStock(warehouse?: string, limit = 1000): Promise<any[]> {
    const items: any[] = [];
    let skip = 0;
    const pageSize = 50;

    while (items.length < limit) {
      const warehouseFilter = warehouse ? `&$filter=ItemWarehouseInfoCollection/any(w:w/WarehouseCode eq '${warehouse}')` : '';
      const selectFields = `ItemCode,ItemName,ItemsForeignName,PurchaseItem,SalesItem,InventoryItem,ItemWarehouseInfoCollection`;
      let url = `${this.baseUrl}/Items?$select=${selectFields}&$skip=${skip}&$top=${pageSize}${warehouseFilter}`;

      try {
        const data = await this.fetchJson(url);
        const batch = data.value || [];
        if (batch.length === 0) break;
        items.push(...batch);
        skip += pageSize;
        if (batch.length < pageSize) break;
        if (items.length >= limit) break;
      } catch (error: any) {
        // Retry without $select if property error
        if (error.message?.includes('400')) {
          url = `${this.baseUrl}/Items?$skip=${skip}&$top=${pageSize}`;
          const data = await this.fetchJson(url);
          const batch = data.value || [];
          if (batch.length === 0) break;
          items.push(...batch);
          skip += pageSize;
          if (batch.length < pageSize) break;
        } else throw error;
      }
    }
    return items;
  }

  async getItemAvailability(itemCode: string, warehouse?: string): Promise<any[]> {
    const wh = warehouse ? `&$filter=WarehouseCode eq '${warehouse}'` : '';
    try {
      const data = await this.fetchJson(`${this.baseUrl}/Items('${itemCode}')/ItemWarehouseInfoCollection?$select=WarehouseCode,InStock,Committed,Ordered${wh}`);
      return data.value || [];
    } catch {
      return [];
    }
  }

  async createDraftInvoice(invoice: any, lines: any[]): Promise<{ success: boolean; docEntry?: number; docNum?: number; error?: string }> {
    try {
      const payload = {
        CardCode: invoice.customer_code,
        DocDate: invoice.doc_date,
        DocDueDate: invoice.doc_due_date || invoice.doc_date,
        Comments: invoice.remarks || 'Reserve Invoice - Created from Multi-DB AR',
        DocumentLines: lines.map((line, idx) => ({
          ItemCode: line.item_code,
          Quantity: line.quantity,
          UnitPrice: line.unit_price,
          DiscountPercent: line.discount_percent || 0,
          WarehouseCode: line.warehouse || undefined,
          LineNum: idx,
        })),
      };

      const response = await fetch(`${this.baseUrl}/Drafts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `SAP Draft creation failed: ${errText}` };
      }

      const data = await response.json();
      return { success: true, docEntry: data.DocEntry, docNum: data.DocNum };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async verifyItemQty(itemCode: string, requestedQty: number, warehouse?: string): Promise<{ available: boolean; availableQty: number }> {
    try {
      const whFilter = warehouse ? `and WarehouseCode eq '${warehouse}'` : '';
      const data = await this.fetchJson(`${this.baseUrl}/Items('${itemCode}')/ItemWarehouseInfoCollection?$filter=InStock gt 0 ${whFilter}`);
      const whs = data.value || [];
      const totalAvailable = whs.reduce((sum: number, wh: any) => {
        const onHand = wh.InStock || 0;
        const committed = wh.Committed || 0;
        return sum + Math.max(0, onHand - committed);
      }, 0);
      return { available: totalAvailable >= requestedQty, availableQty: totalAvailable };
    } catch {
      return { available: false, availableQty: 0 };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, connectionId, itemCodes, warehouse, invoiceData, lines, limit } = await req.json();

    // Fetch connection settings
    const { data: conn, error: connError } = await supabase
      .from('sap_database_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ success: false, error: 'Database connection not found or inactive' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = new ExternalSAPClient({
      service_layer_url: conn.service_layer_url,
      company_db: conn.company_db,
      username: conn.username,
      password: conn.password,
    });

    const loggedIn = await client.login();
    if (!loggedIn) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to connect to external SAP database. Check credentials.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // ---- TEST CONNECTION ----
      if (action === 'test_connection') {
        await client.logout();
        return new Response(JSON.stringify({ success: true, message: `Connected to ${conn.company_db} successfully` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ---- SYNC ITEMS (cache available quantities) ----
      if (action === 'sync_items') {
        const sapItems = await client.getItemsWithStock(warehouse, limit || 500);
        const upsertRows: any[] = [];

        for (const sapItem of sapItems) {
          const whInfos: any[] = sapItem.ItemWarehouseInfoCollection || [];
          if (whInfos.length === 0) {
            // No warehouse info - add single row with 0 qty
            upsertRows.push({
              database_connection_id: connectionId,
              item_code: sapItem.ItemCode,
              item_name: sapItem.ItemName,
              item_name_ar: sapItem.ItemsForeignName || null,
              warehouse_code: null,
              warehouse_name: null,
              on_hand_qty: 0,
              committed_qty: 0,
              available_qty: 0,
              last_synced_at: new Date().toISOString(),
            });
          } else {
            for (const wh of whInfos) {
              const onHand = wh.InStock || 0;
              const committed = wh.Committed || 0;
              const available = Math.max(0, onHand - committed);
              upsertRows.push({
                database_connection_id: connectionId,
                item_code: sapItem.ItemCode,
                item_name: sapItem.ItemName,
                item_name_ar: sapItem.ItemsForeignName || null,
                warehouse_code: wh.WarehouseCode || null,
                warehouse_name: null,
                on_hand_qty: onHand,
                committed_qty: committed,
                available_qty: available,
                last_synced_at: new Date().toISOString(),
              });
            }
          }
        }

        // Upsert in chunks
        const chunkSize = 100;
        let upserted = 0;
        for (let i = 0; i < upsertRows.length; i += chunkSize) {
          const chunk = upsertRows.slice(i, i + chunkSize);
          await supabase
            .from('external_items')
            .upsert(chunk, { onConflict: 'database_connection_id,item_code,warehouse_code', ignoreDuplicates: false });
          upserted += chunk.length;
        }

        // Update last sync timestamp
        await supabase.from('sap_database_connections').update({ last_sync_at: new Date().toISOString(), last_sync_error: null }).eq('id', connectionId);

        await client.logout();
        return new Response(JSON.stringify({ success: true, synced: upserted, itemCount: sapItems.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ---- VERIFY QTY BEFORE SAVE ----
      if (action === 'verify_quantities') {
        const results: any[] = [];
        for (const item of (lines || [])) {
          const { available, availableQty } = await client.verifyItemQty(item.item_code, item.quantity, item.warehouse);
          results.push({
            item_code: item.item_code,
            requested: item.quantity,
            available: availableQty,
            canSell: available,
          });
        }

        await client.logout();
        const allAvailable = results.every(r => r.canSell);
        return new Response(JSON.stringify({ success: true, allAvailable, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ---- CREATE DRAFT (RESERVE) INVOICE ----
      if (action === 'create_draft') {
        // First verify quantities live
        const verifyResults: any[] = [];
        for (const line of (lines || [])) {
          const { available, availableQty } = await client.verifyItemQty(line.item_code, line.quantity, line.warehouse);
          verifyResults.push({ item_code: line.item_code, requested: line.quantity, available: availableQty, canSell: available });
        }

        const blocked = verifyResults.filter(r => !r.canSell);
        if (blocked.length > 0) {
          await client.logout();
          return new Response(JSON.stringify({
            success: false,
            error: `Insufficient stock for: ${blocked.map(b => `${b.item_code} (requested: ${b.requested}, available: ${b.available})`).join(', ')}`,
            verifyResults,
          }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Create draft invoice in external SAP
        const draftResult = await client.createDraftInvoice(invoiceData, lines);

        await client.logout();

        if (!draftResult.success) {
          return new Response(JSON.stringify({ success: false, error: draftResult.error }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          docEntry: draftResult.docEntry,
          docNum: draftResult.docNum,
          verifyResults,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await client.logout();
      return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (innerError: any) {
      await client.logout();
      throw innerError;
    }

  } catch (error: any) {
    console.error('External SAP function error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
