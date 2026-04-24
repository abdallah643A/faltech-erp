import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

/**
 * Quote-to-Cash Conversion — Module 2 / Enhancement #3
 *
 * Convert documents along the standard sales flow:
 *   Quotation  ──▶ Sales Order ──▶ Delivery ──▶ AR Invoice
 *
 * Each conversion:
 *   • Carries over header + lines (with selected quantities)
 *   • Supports partial conversion (per-line qty reduction)
 *   • Links the new doc back to its source via *_id reference
 *   • Updates the source doc's status to "Converted" / "Delivered" / "Invoiced"
 *
 * Tables referenced (lazy / loosely typed via `as any` to keep the hook
 * stable as schemas evolve):
 *   sales_quotations / sales_quotation_lines
 *   sales_orders     / sales_order_lines
 *   deliveries       / delivery_lines
 *   ar_invoices      / ar_invoice_lines
 */

export type ConversionTarget = 'sales_order' | 'delivery' | 'ar_invoice';

export interface ConversionLineSelection {
  /** Source line id */
  sourceLineId: string;
  /** Quantity to carry over (≤ remaining qty on source line) */
  quantity: number;
}

export interface ConvertDocumentInput {
  sourceType: 'sales_quotation' | 'sales_order' | 'delivery';
  sourceId: string;
  target: ConversionTarget;
  /** Subset of source lines + qty. If omitted, converts all lines fully. */
  lines?: ConversionLineSelection[];
}

const SOURCE_CONFIG: Record<
  ConvertDocumentInput['sourceType'],
  { headerTable: string; lineTable: string; lineFk: string; convertedStatus: string }
> = {
  sales_quotation: { headerTable: 'sales_quotations', lineTable: 'sales_quotation_lines', lineFk: 'quotation_id', convertedStatus: 'Converted' },
  sales_order:     { headerTable: 'sales_orders',     lineTable: 'sales_order_lines',     lineFk: 'sales_order_id', convertedStatus: 'Delivered' },
  delivery:        { headerTable: 'deliveries',       lineTable: 'delivery_lines',        lineFk: 'delivery_id',    convertedStatus: 'Invoiced' },
};

const TARGET_CONFIG: Record<
  ConversionTarget,
  { headerTable: string; lineTable: string; lineFk: string; sourceFk: Record<string, string> }
> = {
  sales_order: {
    headerTable: 'sales_orders',
    lineTable: 'sales_order_lines',
    lineFk: 'sales_order_id',
    sourceFk: { sales_quotation: 'quotation_id' },
  },
  delivery: {
    headerTable: 'deliveries',
    lineTable: 'delivery_lines',
    lineFk: 'delivery_id',
    sourceFk: { sales_order: 'sales_order_id' },
  },
  ar_invoice: {
    headerTable: 'ar_invoices',
    lineTable: 'ar_invoice_lines',
    lineFk: 'invoice_id',
    sourceFk: { delivery: 'delivery_id', sales_order: 'sales_order_id' },
  },
};

function recomputeLineTotal(unitPrice: number, qty: number, discountPct = 0, taxPct = 0) {
  const gross = unitPrice * qty;
  const afterDiscount = gross * (1 - (discountPct || 0) / 100);
  const tax = afterDiscount * ((taxPct || 0) / 100);
  return { line_total: afterDiscount, tax_amount: tax, total_with_tax: afterDiscount + tax };
}

export function useDocumentConversion() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const c = supabase as any;

  return useMutation({
    mutationFn: async (input: ConvertDocumentInput) => {
      if (!user) throw new Error('Not authenticated');

      const src = SOURCE_CONFIG[input.sourceType];
      const tgt = TARGET_CONFIG[input.target];

      // 1. Load source header + lines
      const { data: header, error: hErr } = await c
        .from(src.headerTable).select('*').eq('id', input.sourceId).maybeSingle();
      if (hErr) throw hErr;
      if (!header) throw new Error('Source document not found');

      const { data: srcLines, error: lErr } = await c
        .from(src.lineTable).select('*').eq(src.lineFk, input.sourceId).order('line_num');
      if (lErr) throw lErr;
      const sourceLines = (srcLines ?? []) as any[];
      if (sourceLines.length === 0) throw new Error('Source has no lines to convert');

      // 2. Resolve line selections (default = full conversion)
      const selections: ConversionLineSelection[] =
        input.lines ?? sourceLines.map(l => ({ sourceLineId: l.id, quantity: Number(l.quantity) }));

      const linesToInsert: any[] = [];
      let subtotal = 0;
      let totalTax = 0;

      selections.forEach((sel, idx) => {
        const sl = sourceLines.find(x => x.id === sel.sourceLineId);
        if (!sl || sel.quantity <= 0) return;
        const totals = recomputeLineTotal(
          Number(sl.unit_price) || 0,
          sel.quantity,
          Number(sl.discount_percent) || 0,
          Number(sl.tax_percent) || 0,
        );
        subtotal += totals.line_total;
        totalTax += totals.tax_amount;

        linesToInsert.push({
          line_num: idx + 1,
          item_code: sl.item_code,
          item_id: sl.item_id ?? null,
          description: sl.description ?? sl.item_description ?? sl.item_code,
          item_description: sl.item_description ?? sl.description ?? sl.item_code,
          quantity: sel.quantity,
          unit_price: sl.unit_price,
          unit: sl.unit ?? null,
          warehouse: sl.warehouse ?? null,
          tax_code: sl.tax_code ?? null,
          tax_percent: sl.tax_percent ?? null,
          discount_percent: sl.discount_percent ?? null,
          line_total: totals.line_total,
        });
      });

      if (linesToInsert.length === 0) throw new Error('No quantities selected for conversion');

      // 3. Build target header
      const targetHeader: any = {
        customer_id: header.customer_id ?? null,
        customer_code: header.customer_code ?? null,
        customer_name: header.customer_name ?? header.card_name ?? '',
        currency: header.currency ?? null,
        doc_date: new Date().toISOString().slice(0, 10),
        posting_date: new Date().toISOString().slice(0, 10),
        subtotal,
        tax_amount: totalTax,
        total: subtotal + totalTax,
        status: input.target === 'ar_invoice' ? 'Open' : 'Open',
        remarks: header.remarks ?? null,
        created_by: user.id,
        company_id: activeCompanyId ?? header.company_id ?? null,
        branch_id: header.branch_id ?? null,
        sales_employee_code: header.sales_employee_code ?? null,
      };

      // Doc number / due date defaults
      if (input.target === 'ar_invoice') {
        targetHeader.invoice_number = `INV-${Date.now()}`;
        targetHeader.doc_due_date = header.doc_due_date ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        targetHeader.balance_due = subtotal + totalTax;
      } else {
        targetHeader.doc_num = Math.floor(Date.now() / 1000);
      }

      // Source linkage
      const fkOnTarget = tgt.sourceFk[input.sourceType];
      if (fkOnTarget) targetHeader[fkOnTarget] = input.sourceId;

      // 4. Insert target header
      const { data: newHeader, error: insErr } = await c
        .from(tgt.headerTable).insert(targetHeader).select().single();
      if (insErr) throw insErr;

      // 5. Insert target lines
      const linesPayload = linesToInsert.map(l => ({ ...l, [tgt.lineFk]: newHeader.id }));
      const { error: linesErr } = await c.from(tgt.lineTable).insert(linesPayload);
      if (linesErr) {
        // Best-effort rollback of header
        await c.from(tgt.headerTable).delete().eq('id', newHeader.id);
        throw linesErr;
      }

      // 6. Update source status (only on full conversion)
      const isFullConversion =
        selections.length === sourceLines.length &&
        selections.every(sel => {
          const sl = sourceLines.find(x => x.id === sel.sourceLineId);
          return sl && Number(sl.quantity) === sel.quantity;
        });
      if (isFullConversion) {
        await c.from(src.headerTable)
          .update({ status: src.convertedStatus })
          .eq('id', input.sourceId);
      }

      return { id: newHeader.id, target: input.target, doc: newHeader };
    },
    onSuccess: (res) => {
      const labels: Record<ConversionTarget, string> = {
        sales_order: 'Sales Order',
        delivery: 'Delivery',
        ar_invoice: 'AR Invoice',
      };
      qc.invalidateQueries();
      toast.success(`${labels[res.target]} created`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Conversion failed'),
  });
}
