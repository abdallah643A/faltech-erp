import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SettingSource = 'system_default' | 'company_override' | 'branch_override';

export interface SettingDefinition {
  key: string;
  label: string;
  labelAr?: string;
  type: 'text' | 'number' | 'switch' | 'select' | 'date' | 'textarea' | 'password';
  options?: { value: string; label: string }[];
  defaultValue: string;
  helpText?: string;
  section: string;
  tab?: string;
  required?: boolean;
  dependsOn?: { key: string; value: string }[];
  affectsModules?: string[];
  criticalChange?: boolean;
  requiresApproval?: boolean;
  effectType?: 'immediate' | 'next_session' | 'future_transactions';
  validation?: (value: string, allSettings: Record<string, string>) => string | null;
}

export function useSettingsService(module: string) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['settings', module, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from('general_settings')
        .select('*')
        .eq('company_id', activeCompanyId)
        .eq('setting_group', module);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });

  useEffect(() => {
    if (dbSettings) {
      const vals: Record<string, string> = {};
      dbSettings.forEach((s) => {
        vals[s.setting_key] = s.setting_value || '';
      });
      setLocalValues(vals);
      setOriginalValues(vals);
      setIsDirty(false);
    }
  }, [dbSettings]);

  const getValue = useCallback((key: string, defaultValue = ''): string => {
    return localValues[key] ?? defaultValue;
  }, [localValues]);

  const setValue = useCallback((key: string, value: string) => {
    setLocalValues(prev => {
      const next = { ...prev, [key]: value };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(originalValues));
      return next;
    });
  }, [originalValues]);

  const validate = useCallback((definitions: SettingDefinition[]): boolean => {
    const errors: Record<string, string> = {};
    definitions.forEach(def => {
      const val = localValues[def.key] ?? def.defaultValue;
      if (def.required && (!val || val.trim() === '')) {
        errors[def.key] = 'Required';
      }
      if (def.validation) {
        const err = def.validation(val, localValues);
        if (err) errors[def.key] = err;
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [localValues]);

  const saveMutation = useMutation({
    mutationFn: async (changes: { key: string; value: string; oldValue?: string }[]) => {
      if (!activeCompanyId || !user) throw new Error('No active company or user');

      for (const { key, value } of changes) {
        const { error } = await supabase.from('general_settings').upsert(
          {
            company_id: activeCompanyId,
            setting_group: module,
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,setting_group,setting_key' as any }
        );
        if (error) {
          // Fallback: try delete then insert
          await supabase.from('general_settings')
            .delete()
            .eq('company_id', activeCompanyId)
            .eq('setting_group', module)
            .eq('setting_key', key);
          const { error: insErr } = await supabase.from('general_settings').insert({
            company_id: activeCompanyId,
            setting_group: module,
            setting_key: key,
            setting_value: value,
          });
          if (insErr) throw insErr;
        }
      }

      // Audit log
      const auditChanges = changes.filter(c => c.oldValue !== c.value);
      if (auditChanges.length > 0) {
        await supabase.from('acct_rule_audit_log').insert(
          auditChanges.map(({ key, value, oldValue }) => ({
            action: `[${module}] Setting changed: ${key}`,
            changed_by: user.id,
            changed_by_name: user.email || 'Unknown',
            changed_fields: [key],
            old_values: { [key]: oldValue || '' } as any,
            new_values: { [key]: value } as any,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', module] });
      setOriginalValues({ ...localValues });
      setIsDirty(false);
      toast.success('Settings saved successfully');
    },
    onError: (err: any) => toast.error(`Failed to save: ${err.message}`),
  });

  const save = useCallback((definitions: SettingDefinition[]) => {
    if (!validate(definitions)) {
      toast.error('Please fix validation errors');
      return;
    }
    const changes = Object.entries(localValues).map(([key, value]) => ({
      key, value, oldValue: originalValues[key],
    }));
    saveMutation.mutate(changes);
  }, [localValues, originalValues, validate, saveMutation]);

  const reset = useCallback(() => {
    setLocalValues({ ...originalValues });
    setIsDirty(false);
    setValidationErrors({});
  }, [originalValues]);

  const resetToDefaults = useCallback((definitions: SettingDefinition[]) => {
    const defaults: Record<string, string> = {};
    definitions.forEach(d => { defaults[d.key] = d.defaultValue; });
    setLocalValues(defaults);
    setIsDirty(true);
  }, []);

  const getChangeSummary = useCallback(() => {
    return Object.entries(localValues)
      .filter(([key, val]) => val !== (originalValues[key] || ''))
      .map(([key, newValue]) => ({ key, oldValue: originalValues[key] || '', newValue }));
  }, [localValues, originalValues]);

  return {
    getValue, setValue, isDirty, isLoading, isSaving: saveMutation.isPending,
    validationErrors, save, reset, resetToDefaults, getChangeSummary, validate, localValues,
  };
}
