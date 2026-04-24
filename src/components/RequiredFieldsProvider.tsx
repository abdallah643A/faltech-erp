import React, { createContext, useContext } from 'react';
import { useRequiredFields } from '@/hooks/useRequiredFields';
import { useToast } from '@/hooks/use-toast';

interface RequiredFieldsContextType {
  module: string;
  isFieldRequired: (fieldName: string) => boolean;
  isSystemDefault: (fieldName: string) => boolean;
  toggleRequired: (fieldName: string) => void;
  validateRequiredFields: (data: Record<string, any>) => { valid: boolean; missingFields: string[] };
  getRequiredFieldNames: () => string[];
}

const RequiredFieldsContext = createContext<RequiredFieldsContextType | null>(null);

export function RequiredFieldsProvider({ module, children }: { module: string; children: React.ReactNode }) {
  const rf = useRequiredFields(module);

  const handleToggle = (fieldName: string) => {
    rf.toggleRequired.mutate(fieldName);
  };

  return (
    <RequiredFieldsContext.Provider value={{
      module,
      isFieldRequired: rf.isFieldRequired,
      isSystemDefault: rf.isSystemDefault,
      toggleRequired: handleToggle,
      validateRequiredFields: rf.validateRequiredFields,
      getRequiredFieldNames: rf.getRequiredFieldNames,
    }}>
      {children}
    </RequiredFieldsContext.Provider>
  );
}

export function useRequiredFieldsContext() {
  return useContext(RequiredFieldsContext);
}

/**
 * Validates form data against required fields. Returns true if valid.
 * Shows toast with missing field names if invalid.
 */
export function useRequiredFieldValidation() {
  const ctx = useContext(RequiredFieldsContext);
  const { toast } = useToast();

  const validate = (data: Record<string, any>, fieldLabels?: Record<string, string>): boolean => {
    if (!ctx) return true;
    const { valid, missingFields } = ctx.validateRequiredFields(data);
    if (!valid) {
      const labels = missingFields.map(f => fieldLabels?.[f] || f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      toast({
        title: 'Required fields missing',
        description: `Please fill in: ${labels.join(', ')}`,
        variant: 'destructive',
      });
    }
    return valid;
  };

  return { validate };
}
