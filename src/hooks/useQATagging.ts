import { useCallback } from 'react';
import { useQAMode } from '@/contexts/QAModeContext';

/**
 * Hook for modules to auto-tag records created during QA mode.
 * Call `tagIfQA()` after successfully inserting a record.
 */
export function useQATagging(module: string, tableName: string) {
  const { isQAMode, activeRun, tagRecord } = useQAMode();

  const tagIfQA = useCallback(async (recordId: string, opts?: { label?: string; docNumber?: string }) => {
    if (!isQAMode || !activeRun) return;
    await tagRecord({
      tableName,
      recordId,
      module,
      label: opts?.label,
      docNumber: opts?.docNumber,
    });
  }, [isQAMode, activeRun, tagRecord, module, tableName]);

  return { isQAMode, activeRun, tagIfQA };
}
