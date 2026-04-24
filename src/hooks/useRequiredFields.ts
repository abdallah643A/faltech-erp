import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface RequiredFieldSetting {
  id: string;
  company_id: string | null;
  module: string;
  field_name: string;
  is_required: boolean;
  is_system_default: boolean;
}

export function useRequiredFields(module: string) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings = [] } = useQuery({
    queryKey: ['required-fields', module, activeCompanyId],
    queryFn: async () => {
      // Fetch system defaults (company_id IS NULL) and company-specific overrides
      const { data, error } = await (supabase
        .from('required_field_settings' as any)
        .select('*')
        .eq('module', module)
        .or(`company_id.is.null${activeCompanyId ? `,company_id.eq.${activeCompanyId}` : ''}`) as any);
      if (error) throw error;
      return (data || []) as RequiredFieldSetting[];
    },
  });

  // Merge: company-specific overrides take precedence over system defaults
  const mergedSettings = (() => {
    const map = new Map<string, RequiredFieldSetting>();
    // First add system defaults
    settings.filter(s => !s.company_id).forEach(s => map.set(s.field_name, s));
    // Then override with company-specific
    settings.filter(s => s.company_id).forEach(s => map.set(s.field_name, s));
    return map;
  })();

  const isFieldRequired = (fieldName: string): boolean => {
    const setting = mergedSettings.get(fieldName);
    return setting?.is_required ?? false;
  };

  const isSystemDefault = (fieldName: string): boolean => {
    const setting = mergedSettings.get(fieldName);
    return setting?.is_system_default ?? false;
  };

  const toggleRequired = useMutation({
    mutationFn: async (fieldName: string) => {
      if (isSystemDefault(fieldName)) {
        throw new Error('System default required fields cannot be changed');
      }

      const companyId = activeCompanyId;
      if (!companyId) throw new Error('No active company selected');

      const currentSetting = mergedSettings.get(fieldName);
      const newRequired = !(currentSetting?.is_required ?? false);

      const { data: { user } } = await supabase.auth.getUser();

      // Upsert company-specific setting
      const { error } = await (supabase
        .from('required_field_settings' as any)
        .upsert({
          company_id: companyId,
          module,
          field_name: fieldName,
          is_required: newRequired,
          is_system_default: false,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,module,field_name' }) as any);

      if (error) throw error;
      return { fieldName, newRequired };
    },
    onSuccess: ({ fieldName, newRequired }) => {
      queryClient.invalidateQueries({ queryKey: ['required-fields', module] });
      toast({
        title: newRequired ? 'Field marked as required' : 'Field marked as optional',
        description: `"${fieldName}" has been updated. Double-click again to toggle.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Cannot change field', description: error.message, variant: 'destructive' });
    },
  });

  const validateRequiredFields = (data: Record<string, any>): { valid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    mergedSettings.forEach((setting, fieldName) => {
      if (setting.is_required) {
        const value = data[fieldName];
        if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
          missingFields.push(fieldName);
        }
      }
    });
    return { valid: missingFields.length === 0, missingFields };
  };

  const getRequiredFieldNames = (): string[] => {
    const names: string[] = [];
    mergedSettings.forEach((setting, fieldName) => {
      if (setting.is_required) names.push(fieldName);
    });
    return names;
  };

  return {
    isFieldRequired,
    isSystemDefault,
    toggleRequired,
    validateRequiredFields,
    getRequiredFieldNames,
    settings: Array.from(mergedSettings.values()),
  };
}
