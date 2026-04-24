import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface JournalEntryLine {
  id?: string;
  line_num: number;
  acct_code: string;
  acct_name?: string;
  debit: number;
  credit: number;
  bp_code?: string;
  bp_name?: string;
  cost_center?: string;
  project_code?: string;
  dim_employee_id?: string | null;
  dim_branch_id?: string | null;
  dim_business_line_id?: string | null;
  dim_factory_id?: string | null;
  remarks?: string;
}

export interface JournalEntry {
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
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sync_status: string | null;
  sap_doc_entry: string | null;
  erp_doc_entry: string | null;
  erp_doc_num: string | null;
  last_synced_at: string | null;
  lines?: JournalEntryLine[];
}

export function useJournalEntries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-entries', activeCompanyId],
    queryFn: async () => {
      const chunkSize = 1000;
      const allRows: JournalEntry[] = [];
      let from = 0;

      while (true) {
        let query = supabase
          .from('journal_entries')
          .select('*')
          .order('doc_num', { ascending: false })
          .range(from, from + chunkSize - 1);
        if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []) as JournalEntry[];
        allRows.push(...rows);

        if (rows.length < chunkSize) break;
        from += chunkSize;
        if (from >= 100000) break;
      }

      return allRows;
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['je-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type, is_control_account, father_acct_code, is_active')
        
        .order('acct_code');
      if (error) throw error;
      return data;
    },
  });

  const getEntryLines = async (entryId: string) => {
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select('*')
      .eq('journal_entry_id', entryId)
      .order('line_num');
    if (error) throw error;
    return data;
  };

  const createEntry = useMutation({
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

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Total Debit must equal Total Credit');
      }

      const { data: entry, error } = await supabase
        .from('journal_entries')
        .insert({
          posting_date: data.posting_date,
          due_date: data.due_date || null,
          doc_date: data.doc_date || null,
          reference: data.reference || null,
          memo: data.memo || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'posted',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      const lines = data.lines.map((l, i) => ({
        journal_entry_id: entry.id,
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
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Journal Entry Created', description: 'Entry posted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const reverseEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const lines = await getEntryLines(entryId);
      const { data: original } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (!original) throw new Error('Entry not found');

      const { data: reversal, error } = await supabase
        .from('journal_entries')
        .insert({
          posting_date: new Date().toISOString().split('T')[0],
          reference: `Reversal of JE-${original.doc_num}`,
          memo: `Reversal: ${original.memo || ''}`,
          total_debit: original.total_credit,
          total_credit: original.total_debit,
          status: 'posted',
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      const reversalLines = lines.map((l: any, i: number) => ({
        journal_entry_id: reversal.id,
        line_num: i + 1,
        acct_code: l.acct_code,
        acct_name: l.acct_name,
        debit: l.credit,
        credit: l.debit,
        bp_code: l.bp_code,
        bp_name: l.bp_name,
        cost_center: l.cost_center,
        remarks: `Reversal: ${l.remarks || ''}`,
      }));

      await supabase.from('journal_entry_lines').insert(reversalLines);

      await supabase
        .from('journal_entries')
        .update({ status: 'reversed' })
        .eq('id', entryId);

      return reversal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Entry Reversed', description: 'Reversal journal entry created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('journal_entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Entry Deleted' });
    },
  });

  return {
    entries,
    accounts,
    isLoading,
    createEntry,
    reverseEntry,
    deleteEntry,
    getEntryLines,
  };
}
