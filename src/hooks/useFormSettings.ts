import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useFormSettings(formKey: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['form-settings', formKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await (supabase.from('user_form_settings' as any).select('*').eq('user_id', user.id).eq('form_key', formKey).maybeSingle() as any);
      if (error) throw error;
      return data;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (updates: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('user_form_settings' as any).upsert({
        user_id: user.id,
        form_key: formKey,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,form_key' }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['form-settings', formKey] }); toast({ title: 'Settings saved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { settings, isLoading, saveSettings };
}
