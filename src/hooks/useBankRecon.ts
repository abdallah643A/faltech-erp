import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const u = supabase as any;

export function useBankImports() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['bank-imports', activeCompanyId],
    queryFn: async () => {
      let q = u.from('bank_statement_imports').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImportLines(importId?: string) {
  return useQuery({
    queryKey: ['bank-import-lines', importId],
    enabled: !!importId,
    queryFn: async () => {
      const { data, error } = await u.from('bank_statement_raw_lines')
        .select('*').eq('import_id', importId).order('line_number');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCandidates(rawLineId?: string) {
  return useQuery({
    queryKey: ['bank-candidates', rawLineId],
    enabled: !!rawLineId,
    queryFn: async () => {
      const { data, error } = await u.from('bank_match_candidates')
        .select('*').eq('raw_line_id', rawLineId)
        .order('confidence_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBankExceptions() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['bank-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = u.from('bank_exceptions').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useParseStatement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: { file_name: string; file_format: string; content: string; bank_account_id?: string; statement_date?: string; currency?: string }) => {
      const { data, error } = await supabase.functions.invoke('bank-statement-parser', {
        body: { ...payload, company_id: activeCompanyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['bank-imports'] });
      toast({ title: 'Statement parsed', description: `${data.total} lines, ${data.duplicates} duplicates` });
    },
    onError: (e: any) => toast({ title: 'Parse failed', description: e.message, variant: 'destructive' }),
  });
}

export function useRunAutoRecon() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (payload: { import_id: string; bank_account_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('bank-auto-recon', {
        body: { ...payload, company_id: activeCompanyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['bank-import-lines'] });
      qc.invalidateQueries({ queryKey: ['bank-exceptions'] });
      toast({
        title: 'Auto-recon complete',
        description: `${data.rule_matched} rule, ${data.fuzzy_matched} fuzzy, ${data.ai_suggested} AI, ${data.unresolved} unresolved`,
      });
    },
    onError: (e: any) => toast({ title: 'Auto-recon failed', description: e.message, variant: 'destructive' }),
  });
}

export function useAcceptCandidate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ candidateId, rawLineId }: { candidateId: string; rawLineId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      await u.from('bank_match_candidates').update({ is_selected: true, selected_by: user?.id, selected_at: now }).eq('id', candidateId);
      await u.from('bank_statement_raw_lines').update({ match_status: 'matched', matched_at: now, matched_by: user?.id }).eq('id', rawLineId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-import-lines'] });
      qc.invalidateQueries({ queryKey: ['bank-candidates'] });
      toast({ title: 'Match confirmed' });
    },
  });
}

export function useResolveException() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await u.from('bank_exceptions').update({
        status, resolution_notes: notes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: status === 'resolved' ? user?.id : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-exceptions'] });
      toast({ title: 'Exception updated' });
    },
  });
}
