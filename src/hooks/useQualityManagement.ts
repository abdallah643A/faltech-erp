import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useQualityTests() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: tests, isLoading } = useQuery({
    queryKey: ['quality-tests', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('quality_tests' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createTest = useMutation({
    mutationFn: async (test: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const testNumber = `QT-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('quality_tests' as any).insert({ ...test, test_number: testNumber, created_by: user?.id }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-tests'] }); toast({ title: 'Quality test created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTest = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('quality_tests' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-tests'] }); toast({ title: 'Quality test updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { tests, isLoading, createTest, updateTest };
}

export function useQualityTestLines(testId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: lines, isLoading } = useQuery({
    queryKey: ['quality-test-lines', testId],
    queryFn: async () => {
      if (!testId) return [];
      const { data, error } = await (supabase.from('quality_test_lines' as any).select('*').eq('quality_test_id', testId).order('created_at') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!testId,
  });

  const createLine = useMutation({
    mutationFn: async (line: any) => {
      const { data, error } = await (supabase.from('quality_test_lines' as any).insert(line).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-test-lines'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('quality_test_lines' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-test-lines'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { lines, isLoading, createLine, updateLine };
}
