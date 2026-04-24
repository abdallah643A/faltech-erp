import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileSearch, Loader2 } from 'lucide-react';
import { PreviewJEModal, AccountingStatusBadgeInline } from '@/components/accounting/PreviewJEModal';
import { useAccountingValidation } from '@/hooks/useAccountingValidation';
import { supabase } from '@/integrations/supabase/client';
import type { SimulationInput } from '@/services/postingEngine';

/**
 * Maps a hospital invoice or charge bundle into the ERP SimulationInput shape
 * so the existing accounting validator / posting engine can preview the JE.
 *
 * Hospital invoices behave like A/R invoices for ERP posting purposes:
 *  - Debit:  A/R Control (patient or insurance payer)
 *  - Credit: Service Revenue (per charge category / department)
 *  - Credit: Output VAT (if applicable)
 */
export interface HospitalInvoiceLike {
  id: string;
  invoice_no?: string | null;
  patient_id: string;
  encounter_id?: string | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  total?: number | null;
  payer_type?: string | null; // 'self' | 'insurance' | 'corporate'
  insurance_provider?: string | null;
  invoice_date?: string | null;
  patient?: { first_name?: string; last_name?: string; mrn?: string } | null;
}

interface HospitalJEPreviewProps {
  invoice: HospitalInvoiceLike;
  /** When true, renders only the badge + small button (compact for tables). */
  compact?: boolean;
}

export function HospitalJEPreview({ invoice, compact = false }: HospitalJEPreviewProps) {
  const { result, isValidating, showPreview, setShowPreview, validate } = useAccountingValidation();
  const [loadingCharges, setLoadingCharges] = useState(false);

  const buildSimInput = useCallback(async (): Promise<SimulationInput> => {
    setLoadingCharges(true);
    try {
      // Pull charges to derive line-level revenue postings
      let charges: any[] = [];
      const { data } = await supabase
        .from('hosp_encounter_charges')
        .select('id, description, qty, unit_price, amount, charge_item_id, department_code')
        .eq('invoice_id', invoice.id);
      charges = data || [];

      const subtotal = Number(invoice.subtotal ?? invoice.total ?? 0);
      const tax = Number(invoice.tax_amount ?? 0);
      const total = Number(invoice.total ?? subtotal + tax);

      const isInsurance =
        invoice.payer_type === 'insurance' || !!invoice.insurance_provider;

      return {
        document_type: 'ar_invoice',
        total,
        subtotal,
        tax_amount: tax,
        line_total: subtotal,
        discount_amount: 0,
        conditions: {
          customer: isInsurance
            ? `INS-${invoice.insurance_provider ?? 'UNKNOWN'}`
            : `PAT-${invoice.patient_id}`,
          ...(charges[0]?.department_code ? { branch: charges[0].department_code } : {}),
        },
      } satisfies SimulationInput;
    } finally {
      setLoadingCharges(false);
    }
  }, [invoice]);

  const handlePreview = useCallback(async () => {
    const input = await buildSimInput();
    await validate(input, { documentId: invoice.id });
    setShowPreview(true);
  }, [buildSimInput, validate, invoice.id, setShowPreview]);

  const busy = isValidating || loadingCharges;

  if (compact) {
    return (
      <>
        <div className="inline-flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePreview} disabled={busy} className="h-7 px-2">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSearch className="h-3.5 w-3.5" />}
            <span className="ml-1 text-xs">Preview JE</span>
          </Button>
          {result && <AccountingStatusBadgeInline status={result.status} />}
        </div>
        <PreviewJEModal
          open={showPreview}
          onOpenChange={setShowPreview}
          result={result}
          isLoading={busy}
          documentType="ar_invoice"
        />
      </>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePreview} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSearch className="h-4 w-4 mr-1" />}
        Preview Journal Entry
        {result && <span className="ml-2"><AccountingStatusBadgeInline status={result.status} /></span>}
      </Button>
      <PreviewJEModal
        open={showPreview}
        onOpenChange={setShowPreview}
        result={result}
        isLoading={busy}
        documentType="ar_invoice"
      />
    </>
  );
}
