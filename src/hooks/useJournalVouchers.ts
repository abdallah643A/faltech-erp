import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { JournalEntryLine } from '@/hooks/useJournalEntries';

export interface JournalVoucher {
  id: string;
  doc_num: number;
  posting_date: string;
  due_date: string | null;
  doc_date: string | null;
  reference: string | null;
  memo: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  currency: string;
  posted_je_id: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useJournalVouchers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['journal-vouchers', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('journal_vouchers')
        .select('*')
        .order('doc_num', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as JournalVoucher[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['je-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type, is_control_account, father_acct_code')
        .eq('is_active', true)
        .order('acct_code');
      if (error) throw error;
      return data;
    },
  });

  const getVoucherLines = async (voucherId: string) => {
    const { data, error } = await supabase
      .from('journal_voucher_lines')
      .select('*')
      .eq('voucher_id', voucherId)
      .order('line_num');
    if (error) throw error;
    return data;
  };

  const createVoucher = useMutation({
    mutationFn: async (data: {
      posting_date: string;
      due_date?: string;
      doc_date?: string;
      reference?: string;
      memo?: string;
      lines: JournalEntryLine[];
    }) => {
      const totalDebit = data.lines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = data.lines.reduce((s, l) => s + (l.credit || 0), 0);

      const { data: voucher, error } = await supabase
        .from('journal_vouchers')
        .insert({
          posting_date: data.posting_date,
          due_date: data.due_date || null,
          doc_date: data.doc_date || null,
          reference: data.reference || null,
          memo: data.memo || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'draft',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      const lines = data.lines.map((l, i) => ({
        voucher_id: voucher.id,
        line_num: i + 1,
        acct_code: l.acct_code,
        acct_name: l.acct_name || '',
        debit: l.debit || 0,
        credit: l.credit || 0,
        bp_code: l.bp_code || null,
        bp_name: l.bp_name || null,
        cost_center: l.cost_center || null,
        project_code: l.project_code || null,
        dim_employee_id: l.dim_employee_id || null,
        dim_branch_id: l.dim_branch_id || null,
        dim_business_line_id: l.dim_business_line_id || null,
        dim_factory_id: l.dim_factory_id || null,
        remarks: l.remarks || null,
      }));

      const { error: linesError } = await supabase
        .from('journal_voucher_lines')
        .insert(lines);

      if (linesError) throw linesError;
      return voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] });
      toast({ title: 'Voucher Created', description: 'Draft voucher saved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateVoucher = useMutation({
    mutationFn: async (data: {
      id: string;
      posting_date: string;
      due_date?: string;
      doc_date?: string;
      reference?: string;
      memo?: string;
      lines: JournalEntryLine[];
    }) => {
      const totalDebit = data.lines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = data.lines.reduce((s, l) => s + (l.credit || 0), 0);

      const { error } = await supabase
        .from('journal_vouchers')
        .update({
          posting_date: data.posting_date,
          due_date: data.due_date || null,
          doc_date: data.doc_date || null,
          reference: data.reference || null,
          memo: data.memo || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .eq('id', data.id);

      if (error) throw error;

      // Delete old lines and insert new
      await supabase.from('journal_voucher_lines').delete().eq('voucher_id', data.id);

      const lines = data.lines.map((l, i) => ({
        voucher_id: data.id,
        line_num: i + 1,
        acct_code: l.acct_code,
        acct_name: l.acct_name || '',
        debit: l.debit || 0,
        credit: l.credit || 0,
        bp_code: l.bp_code || null,
        bp_name: l.bp_name || null,
        cost_center: l.cost_center || null,
        project_code: l.project_code || null,
        dim_employee_id: l.dim_employee_id || null,
        dim_branch_id: l.dim_branch_id || null,
        dim_business_line_id: l.dim_business_line_id || null,
        dim_factory_id: l.dim_factory_id || null,
        remarks: l.remarks || null,
      }));

      await supabase.from('journal_voucher_lines').insert(lines);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] });
      toast({ title: 'Voucher Updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const postVoucher = useMutation({
    mutationFn: async (voucherId: string) => {
      // Get voucher and its lines
      const { data: voucher } = await supabase
        .from('journal_vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();

      if (!voucher) throw new Error('Voucher not found');
      if (voucher.status !== 'draft') throw new Error('Only draft vouchers can be posted');

      const vLines = await getVoucherLines(voucherId);
      const totalDebit = vLines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
      const totalCredit = vLines.reduce((s: number, l: any) => s + (l.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Voucher is not balanced. Total Debit must equal Total Credit.');
      }

      // Create Journal Entry from voucher
      const { data: entry, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          posting_date: voucher.posting_date,
          due_date: voucher.due_date,
          doc_date: voucher.doc_date,
          reference: `From JV-${voucher.doc_num}${voucher.reference ? ` | ${voucher.reference}` : ''}`,
          memo: voucher.memo,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'posted',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Copy lines to JE lines
      const jeLines = vLines.map((l: any, i: number) => ({
        journal_entry_id: entry.id,
        line_num: i + 1,
        acct_code: l.acct_code,
        acct_name: l.acct_name,
        debit: l.debit || 0,
        credit: l.credit || 0,
        bp_code: l.bp_code,
        bp_name: l.bp_name,
        cost_center: l.cost_center,
        project_code: l.project_code,
        dim_employee_id: l.dim_employee_id,
        dim_branch_id: l.dim_branch_id,
        dim_business_line_id: l.dim_business_line_id,
        dim_factory_id: l.dim_factory_id,
        remarks: l.remarks,
      }));

      await supabase.from('journal_entry_lines').insert(jeLines);

      // Mark voucher as posted
      await supabase
        .from('journal_vouchers')
        .update({ status: 'posted', posted_je_id: entry.id })
        .eq('id', voucherId);

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Voucher Posted', description: 'Journal Entry created successfully from voucher' });
    },
    onError: (error: any) => {
      toast({ title: 'Post Failed', description: error.message, variant: 'destructive' });
    },
  });

  const cancelVoucher = useMutation({
    mutationFn: async (voucherId: string) => {
      const { error } = await supabase
        .from('journal_vouchers')
        .update({ status: 'cancelled' })
        .eq('id', voucherId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] });
      toast({ title: 'Voucher Cancelled' });
    },
  });

  const deleteVoucher = useMutation({
    mutationFn: async (voucherId: string) => {
      const { error } = await supabase.from('journal_vouchers').delete().eq('id', voucherId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-vouchers'] });
      toast({ title: 'Voucher Deleted' });
    },
  });

  return {
    vouchers,
    accounts,
    isLoading,
    createVoucher,
    updateVoucher,
    postVoucher,
    cancelVoucher,
    deleteVoucher,
    getVoucherLines,
  };
}
