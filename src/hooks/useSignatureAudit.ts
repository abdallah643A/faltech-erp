import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSignatureAudit(signatureId?: string) {
  return useQuery({
    queryKey: ['signature-audit', signatureId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('signature_audit_log' as any)
        .select('*').eq('signature_id', signatureId).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!signatureId,
  });
}

export function useLogSignatureEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { signature_id: string; event_type: string; event_data?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      const payload = {
        ...entry,
        actor_user_id: user?.id,
        actor_name: user?.email,
        user_agent: ua,
      };
      const { data, error } = await (supabase.from('signature_audit_log' as any).insert(payload).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['signature-audit', vars.signature_id] }),
  });
}

export async function computeCertHash(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
