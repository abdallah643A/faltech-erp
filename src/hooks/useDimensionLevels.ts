import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface DimensionLevel {
  id: string;
  company_id: string;
  dimension_number: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useDimensionLevels() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['dimension-levels', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from('dimension_levels')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('dimension_number');
      if (error) throw error;
      return data as DimensionLevel[];
    },
    enabled: !!activeCompanyId,
  });

  const upsertLevel = useMutation({
    mutationFn: async (level: { dimension_number: number; name: string; description: string | null; is_active: boolean }) => {
      if (!activeCompanyId) throw new Error('No active company');
      const { error } = await supabase
        .from('dimension_levels')
        .upsert({
          company_id: activeCompanyId,
          dimension_number: level.dimension_number,
          name: level.name,
          description: level.description,
          is_active: level.is_active,
        }, { onConflict: 'company_id,dimension_number' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimension-levels'] });
      toast({ title: 'Dimension level saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const activeLevels = levels.filter(l => l.is_active);

  return { levels, activeLevels, isLoading, upsertLevel };
}
