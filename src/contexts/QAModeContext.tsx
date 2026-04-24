import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QATestRun {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tester_name: string | null;
  environment: string | null;
  tags: string[] | null;
  notes: string | null;
  started_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface QATestRecord {
  id: string;
  test_run_id: string;
  table_name: string;
  record_id: string;
  module: string;
  label: string | null;
  doc_number: string | null;
  expected_result: string | null;
  actual_result: string | null;
  blocker_notes: string | null;
  evidence_status: string;
  created_by: string | null;
  created_at: string;
}

interface QAModeContextType {
  isQAMode: boolean;
  activeRun: QATestRun | null;
  runs: QATestRun[];
  records: QATestRecord[];
  isLoading: boolean;
  startRun: (name: string, testerName?: string, description?: string) => Promise<void>;
  endRun: () => Promise<void>;
  toggleQAMode: () => void;
  tagRecord: (params: {
    tableName: string;
    recordId: string;
    module: string;
    label?: string;
    docNumber?: string;
  }) => Promise<void>;
  updateRecord: (id: string, updates: Partial<QATestRecord>) => Promise<void>;
  deleteTestRecords: (runId: string) => Promise<void>;
  refetchRecords: () => void;
}

const QAModeContext = createContext<QAModeContextType | undefined>(undefined);

export function QAModeProvider({ children }: { children: ReactNode }) {
  const [isQAMode, setIsQAMode] = useState(() => localStorage.getItem('qa_mode') === 'true');
  const [activeRunId, setActiveRunId] = useState<string | null>(() => localStorage.getItem('qa_active_run_id'));
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => { localStorage.setItem('qa_mode', String(isQAMode)); }, [isQAMode]);
  useEffect(() => {
    if (activeRunId) localStorage.setItem('qa_active_run_id', activeRunId);
    else localStorage.removeItem('qa_active_run_id');
  }, [activeRunId]);

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['qa-test-runs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('qa_test_runs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as QATestRun[];
    },
    enabled: isQAMode,
  });

  const activeRun = runs.find(r => r.id === activeRunId && r.status === 'active') || null;

  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ['qa-test-records', activeRunId],
    queryFn: async () => {
      if (!activeRunId) return [];
      const { data, error } = await (supabase as any).from('qa_test_records').select('*').eq('test_run_id', activeRunId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as QATestRecord[];
    },
    enabled: isQAMode && !!activeRunId,
  });

  const startRun = useCallback(async (name: string, testerName?: string, description?: string) => {
    const { data, error } = await (supabase as any).from('qa_test_runs').insert({
      name, tester_name: testerName || profile?.full_name, description,
      started_by: user?.id, status: 'active', environment: 'staging',
    }).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setActiveRunId(data.id);
    setIsQAMode(true);
    qc.invalidateQueries({ queryKey: ['qa-test-runs'] });
    toast({ title: 'QA Run Started', description: `Test run "${name}" is now active` });
  }, [user, profile, qc, toast]);

  const endRun = useCallback(async () => {
    if (!activeRunId) return;
    await (supabase as any).from('qa_test_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', activeRunId);
    setActiveRunId(null);
    qc.invalidateQueries({ queryKey: ['qa-test-runs'] });
    toast({ title: 'QA Run Completed' });
  }, [activeRunId, qc, toast]);

  const tagRecord = useCallback(async (params: { tableName: string; recordId: string; module: string; label?: string; docNumber?: string }) => {
    if (!activeRunId) return;
    await (supabase as any).from('qa_test_records').insert({
      test_run_id: activeRunId,
      table_name: params.tableName,
      record_id: params.recordId,
      module: params.module,
      label: params.label,
      doc_number: params.docNumber,
      created_by: user?.id,
      evidence_status: 'pending',
    });
    refetchRecords();
  }, [activeRunId, user, refetchRecords]);

  const updateRecord = useCallback(async (id: string, updates: Partial<QATestRecord>) => {
    await (supabase as any).from('qa_test_records').update(updates).eq('id', id);
    refetchRecords();
  }, [refetchRecords]);

  const deleteTestRecords = useCallback(async (runId: string) => {
    // Get all records for this run
    const { data: recs } = await (supabase as any).from('qa_test_records').select('table_name, record_id').eq('test_run_id', runId);
    if (recs && recs.length > 0) {
      // Group by table and delete actual records
      const byTable = new Map<string, string[]>();
      for (const r of recs) {
        if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
        byTable.get(r.table_name)!.push(r.record_id);
      }
      for (const [table, ids] of byTable) {
        await (supabase as any).from(table).delete().in('id', ids);
      }
    }
    // Delete the QA records themselves
    await (supabase as any).from('qa_test_records').delete().eq('test_run_id', runId);
    // Delete the run
    await (supabase as any).from('qa_test_runs').delete().eq('id', runId);
    if (activeRunId === runId) setActiveRunId(null);
    qc.invalidateQueries({ queryKey: ['qa-test-runs'] });
    qc.invalidateQueries({ queryKey: ['qa-test-records'] });
    toast({ title: 'QA Data Cleaned Up', description: `All test records from this run have been deleted` });
  }, [activeRunId, qc, toast]);

  const toggleQAMode = useCallback(() => {
    setIsQAMode(prev => !prev);
  }, []);

  return (
    <QAModeContext.Provider value={{
      isQAMode, activeRun, runs, records, isLoading: runsLoading,
      startRun, endRun, toggleQAMode, tagRecord, updateRecord, deleteTestRecords, refetchRecords,
    }}>
      {children}
    </QAModeContext.Provider>
  );
}

export function useQAMode() {
  const ctx = useContext(QAModeContext);
  if (!ctx) throw new Error('useQAMode must be used within QAModeProvider');
  return ctx;
}
