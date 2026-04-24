import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ARInvoiceLine {
  id?: string;
  invoice_id?: string;
  line_num: number;
  item_id?: string;
  item_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_code?: string;
  tax_percent: number;
  line_total: number;
  warehouse?: string;
  cost_center?: string;
}

export interface ARInvoice {
  id?: string;
  doc_num?: number;
  doc_date: string;
  doc_due_date?: string | null;
  customer_id?: string | null;
  customer_code: string;
  customer_name: string;
  contact_person?: string | null;
  num_at_card?: string | null;
  currency: string | null;
  doc_rate: number | null;
  subtotal: number;
  discount_percent: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total: number;
  paid_amount: number | null;
  balance_due: number | null;
  payment_terms?: string | null;
  sales_rep_id?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  shipping_method?: string | null;
  remarks?: string | null;
  status: string | null;
  sap_doc_entry?: string | null;
  sync_status?: string | null;
  series?: number | null;
  created_at?: string;
  lines?: ARInvoiceLine[];
}

export function useARInvoices() {
  const [invoices, setInvoices] = useState<ARInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ar_invoices')
        .select('*')
        .order('doc_num', { ascending: false });

      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInvoices((data || []) as ARInvoice[]);
    } catch (error: any) {
      toast({
        title: 'Error fetching invoices',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceWithLines = async (invoiceId: string): Promise<ARInvoice | null> => {
    try {
      const [invoiceResult, linesResult] = await Promise.all([
        supabase.from('ar_invoices').select('*').eq('id', invoiceId).single(),
        supabase.from('ar_invoice_lines').select('*').eq('invoice_id', invoiceId).order('line_num'),
      ]);

      if (invoiceResult.error) throw invoiceResult.error;
      
      return {
        ...(invoiceResult.data as ARInvoice),
        lines: linesResult.data || [],
      };
    } catch (error: any) {
      toast({
        title: 'Error fetching invoice',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const createInvoice = async (invoice: Partial<ARInvoice>, lines: Omit<ARInvoiceLine, 'id' | 'invoice_id'>[]) => {
    try {
      // Create the invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('ar_invoices')
        .insert({
          doc_date: invoice.doc_date,
          doc_due_date: invoice.doc_due_date,
          customer_id: invoice.customer_id,
          customer_code: invoice.customer_code!,
          customer_name: invoice.customer_name!,
          num_at_card: invoice.num_at_card,
          currency: invoice.currency,
          doc_rate: invoice.doc_rate,
          subtotal: invoice.subtotal,
          discount_percent: invoice.discount_percent,
          discount_amount: invoice.discount_amount,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          paid_amount: invoice.paid_amount,
          balance_due: invoice.balance_due,
          payment_terms: invoice.payment_terms,
          billing_address: invoice.billing_address,
          shipping_address: invoice.shipping_address,
          shipping_method: invoice.shipping_method,
          remarks: invoice.remarks,
           status: invoice.status || 'open',
          created_by: user?.id,
          sales_rep_id: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create the lines
      if (lines.length > 0) {
        const linesWithInvoiceId = lines.map((line) => ({
          line_num: line.line_num,
          item_id: line.item_id || null,
          item_code: line.item_code,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_percent: line.discount_percent,
          tax_code: line.tax_code,
          tax_percent: line.tax_percent,
          line_total: line.line_total,
          warehouse: line.warehouse,
          cost_center: line.cost_center,
          invoice_id: invoiceData.id,
        }));

        const { error: linesError } = await supabase
          .from('ar_invoice_lines')
          .insert(linesWithInvoiceId);

        if (linesError) throw linesError;
      }

      toast({
        title: 'Invoice created',
        description: `Invoice #${invoiceData.doc_num} created successfully`,
      });

      fetchInvoices();
      return invoiceData;
    } catch (error: any) {
      toast({
        title: 'Error creating invoice',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateInvoice = async (
    invoiceId: string,
    invoice: Partial<ARInvoice>,
    lines?: ARInvoiceLine[]
  ) => {
    try {
      // Build update object with only valid fields
      const updateData: Record<string, any> = {};
      if (invoice.doc_date !== undefined) updateData.doc_date = invoice.doc_date;
      if (invoice.doc_due_date !== undefined) updateData.doc_due_date = invoice.doc_due_date;
      if (invoice.customer_code !== undefined) updateData.customer_code = invoice.customer_code;
      if (invoice.customer_name !== undefined) updateData.customer_name = invoice.customer_name;
      if (invoice.subtotal !== undefined) updateData.subtotal = invoice.subtotal;
      if (invoice.total !== undefined) updateData.total = invoice.total;
      if (invoice.tax_amount !== undefined) updateData.tax_amount = invoice.tax_amount;
      if (invoice.status !== undefined) updateData.status = invoice.status;
      if (invoice.remarks !== undefined) updateData.remarks = invoice.remarks;
      
      const { error: invoiceError } = await supabase
        .from('ar_invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // If lines are provided, replace them
      if (lines) {
        // Delete existing lines
        await supabase.from('ar_invoice_lines').delete().eq('invoice_id', invoiceId);

        // Insert new lines
        if (lines.length > 0) {
          const linesWithInvoiceId = lines.map((line) => ({
            line_num: line.line_num,
            item_id: line.item_id || null,
            item_code: line.item_code,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            discount_percent: line.discount_percent,
            tax_code: line.tax_code,
            tax_percent: line.tax_percent,
            line_total: line.line_total,
            warehouse: line.warehouse,
            cost_center: line.cost_center,
            invoice_id: invoiceId,
          }));

          const { error: linesError } = await supabase
            .from('ar_invoice_lines')
            .insert(linesWithInvoiceId);

          if (linesError) throw linesError;
        }
      }

      toast({
        title: 'Invoice updated',
        description: 'Invoice updated successfully',
      });

      fetchInvoices();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('ar_invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'Invoice deleted',
        description: 'Invoice deleted successfully',
      });

      fetchInvoices();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error deleting invoice',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    loading,
    fetchInvoices,
    fetchInvoiceWithLines,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
}
