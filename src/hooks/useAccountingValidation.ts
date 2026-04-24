import { useState, useCallback } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { validateAccounting, type AccountingValidationResult } from '@/services/accountingValidator';
import { type SimulationInput } from '@/services/postingEngine';

export function useAccountingValidation() {
  const { activeCompanyId } = useActiveCompany();
  const [result, setResult] = useState<AccountingValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const validate = useCallback(async (
    input: SimulationInput,
    options?: { documentId?: string; checkActiveAccounts?: boolean; checkDimensions?: boolean }
  ): Promise<AccountingValidationResult> => {
    setIsValidating(true);
    try {
      const res = await validateAccounting(input, activeCompanyId || undefined, options);
      setResult(res);
      return res;
    } finally {
      setIsValidating(false);
    }
  }, [activeCompanyId]);

  const validateAndBlock = useCallback(async (
    input: SimulationInput,
    options?: { documentId?: string }
  ): Promise<boolean> => {
    const res = await validate(input, options);
    if (!res.canProceed) {
      setShowPreview(true);
    }
    return res.canProceed;
  }, [validate]);

  const reset = useCallback(() => {
    setResult(null);
    setShowPreview(false);
  }, []);

  return {
    result,
    isValidating,
    showPreview,
    setShowPreview,
    validate,
    validateAndBlock,
    reset,
  };
}
