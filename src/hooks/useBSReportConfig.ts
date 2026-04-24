import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { balanceSheetDefinition, BSReportDefinition } from '@/config/balanceSheetMapping';

export interface DBSection {
  id: string;
  company_id: string | null;
  section_key: string;
  header_ar: string;
  header_en: string;
  section_type: string;
  display_order: number;
  total_label_ar: string | null;
  total_label_en: string | null;
}

export interface DBLine {
  id: string;
  section_id: string;
  company_id: string | null;
  line_order: number;
  label_ar: string;
  label_en: string;
}

export interface DBLineAccount {
  id: string;
  line_id: string;
  acct_from: string;
  acct_to: string | null;
  label_ar: string;
  balance_rule: string;
  is_deduction: boolean;
  display_order: number;
}

export interface DBGrandTotal {
  id: string;
  company_id: string | null;
  total_key: string;
  label_ar: string;
  label_en: string;
  sum_section_keys: string[];
  display_order: number;
}

export function useBSReportConfig() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sectionsQuery = useQuery({
    queryKey: ['bs-config-sections', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from as any)('bs_report_sections').select('*').order('display_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DBSection[];
    },
  });

  const linesQuery = useQuery({
    queryKey: ['bs-config-lines', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from as any)('bs_report_lines').select('*').order('line_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DBLine[];
    },
  });

  const accountsQuery = useQuery({
    queryKey: ['bs-config-accounts', activeCompanyId],
    enabled: (linesQuery.data?.length || 0) > 0,
    queryFn: async () => {
      const lineIds = (linesQuery.data || []).map(l => l.id);
      if (lineIds.length === 0) return [] as DBLineAccount[];
      const { data, error } = await (supabase.from as any)('bs_report_line_accounts')
        .select('*')
        .in('line_id', lineIds)
        .order('display_order');
      if (error) throw error;
      return (data || []) as DBLineAccount[];
    },
  });

  const grandTotalsQuery = useQuery({
    queryKey: ['bs-config-grand-totals', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from as any)('bs_report_grand_totals').select('*').order('display_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DBGrandTotal[];
    },
  });

  const hasDBConfig = (sectionsQuery.data?.length || 0) > 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['bs-config-sections'] });
    queryClient.invalidateQueries({ queryKey: ['bs-config-lines'] });
    queryClient.invalidateQueries({ queryKey: ['bs-config-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bs-config-grand-totals'] });
    queryClient.invalidateQueries({ queryKey: ['audit-balance-sheet'] });
  };

  const seedFromDefaults = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error('No active company');
      const def = balanceSheetDefinition;

      for (const section of def.sections) {
        const { data: sec, error: secErr } = await (supabase.from as any)('bs_report_sections').insert({
          company_id: activeCompanyId,
          section_key: section.key,
          header_ar: section.header_ar,
          header_en: section.header_en,
          section_type: section.type,
          display_order: def.sections.indexOf(section) * 10,
          total_label_ar: section.total?.label_ar || null,
          total_label_en: section.total?.label_en || null,
        }).select('id').single();
        if (secErr) throw secErr;

        for (const line of section.lines) {
          const { data: ln, error: lnErr } = await (supabase.from as any)('bs_report_lines').insert({
            section_id: sec.id,
            company_id: activeCompanyId,
            line_order: line.order,
            label_ar: line.label_ar,
            label_en: line.label_en,
          }).select('id').single();
          if (lnErr) throw lnErr;

          const acctInserts = line.accounts.map((acc, idx) => ({
            line_id: ln.id,
            acct_from: acc.from,
            acct_to: acc.to || null,
            label_ar: acc.label_ar,
            balance_rule: acc.rule,
            is_deduction: acc.is_deduction || false,
            display_order: idx,
          }));
          if (acctInserts.length > 0) {
            const { error: accErr } = await (supabase.from as any)('bs_report_line_accounts').insert(acctInserts);
            if (accErr) throw accErr;
          }
        }
      }

      for (const gt of def.grandTotals) {
        const { error: gtErr } = await (supabase.from as any)('bs_report_grand_totals').insert({
          company_id: activeCompanyId,
          total_key: gt.key,
          label_ar: gt.label_ar,
          label_en: gt.label_en,
          sum_section_keys: gt.sum_totals,
          display_order: def.grandTotals.indexOf(gt) * 10,
        });
        if (gtErr) throw gtErr;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Configuration Seeded', description: 'Default balance sheet mapping loaded into database' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const updateLineAccount = useMutation({
    mutationFn: async (params: { id: string; data: Partial<DBLineAccount> }) => {
      const { error } = await (supabase.from as any)('bs_report_line_accounts').update(params.data).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const addLineAccount = useMutation({
    mutationFn: async (params: Omit<DBLineAccount, 'id'>) => {
      const { error } = await (supabase.from as any)('bs_report_line_accounts').insert(params);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteLineAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('bs_report_line_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateLine = useMutation({
    mutationFn: async (params: { id: string; data: Partial<DBLine> }) => {
      const { error } = await (supabase.from as any)('bs_report_lines').update(params.data).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateSection = useMutation({
    mutationFn: async (params: { id: string; data: Partial<DBSection> }) => {
      const { error } = await (supabase.from as any)('bs_report_sections').update(params.data).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const clearConfig = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error('No active company');
      // Delete in order: accounts -> lines -> sections -> grand totals
      // Lines cascade from sections, accounts cascade from lines
      await (supabase.from as any)('bs_report_grand_totals').delete().eq('company_id', activeCompanyId);
      await (supabase.from as any)('bs_report_sections').delete().eq('company_id', activeCompanyId);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Config Cleared' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Build the definition from DB for the report hook
  function buildDefinitionFromDB(): BSReportDefinition | null {
    const sections = sectionsQuery.data;
    const lines = linesQuery.data;
    const accounts = accountsQuery.data;
    const grandTotals = grandTotalsQuery.data;
    if (!sections || sections.length === 0) return null;

    return {
      sections: sections.map(sec => ({
        key: sec.section_key,
        header_ar: sec.header_ar,
        header_en: sec.header_en,
        type: sec.section_type as 'header' | 'section',
        lines: (lines || [])
          .filter(l => l.section_id === sec.id)
          .map(l => ({
            order: l.line_order,
            label_ar: l.label_ar,
            label_en: l.label_en,
            accounts: (accounts || [])
              .filter(a => a.line_id === l.id)
              .map(a => ({
                from: a.acct_from,
                to: a.acct_to || undefined,
                label_ar: a.label_ar,
                rule: a.balance_rule as 'all' | 'debit_only' | 'credit_only',
                is_deduction: a.is_deduction,
              })),
          })),
        total: sec.total_label_ar ? {
          label_ar: sec.total_label_ar,
          label_en: sec.total_label_en || '',
          sum_orders: (lines || []).filter(l => l.section_id === sec.id).map(l => l.line_order),
        } : undefined,
      })),
      grandTotals: (grandTotals || []).map(gt => ({
        key: gt.total_key,
        label_ar: gt.label_ar,
        label_en: gt.label_en,
        sum_totals: gt.sum_section_keys,
      })),
    };
  }

  return {
    sections: sectionsQuery.data || [],
    lines: linesQuery.data || [],
    accounts: accountsQuery.data || [],
    grandTotals: grandTotalsQuery.data || [],
    hasDBConfig,
    isLoading: sectionsQuery.isLoading || linesQuery.isLoading || accountsQuery.isLoading,
    seedFromDefaults,
    updateLineAccount,
    addLineAccount,
    deleteLineAccount,
    updateLine,
    updateSection,
    clearConfig,
    buildDefinitionFromDB,
  };
}
