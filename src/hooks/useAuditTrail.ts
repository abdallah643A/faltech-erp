import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditEntry {
  id: string;
  action: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_fields: string[] | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  // Compatibility fields mapped from action/values
  user_name: string;
  user_email: string;
  record_id: string;
  table_name: string;
  ip_address: string;
  richAction: string;
}

type AuditFilters = { table_name?: string; record_id?: string; user_id?: string; limit?: number };

export function useAuditTrail(filtersOrModule?: string | AuditFilters, entityId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Normalize args
  const isStringArg = typeof filtersOrModule === 'string';
  const module = isStringArg ? filtersOrModule : undefined;
  const filters: AuditFilters = isStringArg ? {} : (filtersOrModule || {});
  const effectiveEntityId = entityId || filters.record_id;
  const effectiveLimit = filters.limit || 50;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['audit_trail', module, filters, effectiveEntityId],
    queryFn: async () => {
      let query = supabase
        .from('acct_rule_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(effectiveLimit);

      if (module) {
        query = query.ilike('action', `%${module}%`);
      }
      if (filters.table_name) {
        query = query.ilike('action', `%${filters.table_name}%`);
      }
      if (effectiveEntityId) {
        query = query.eq('rule_id', effectiveEntityId);
      }
      if (filters.user_id) {
        query = query.eq('changed_by', filters.user_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map to compatibility shape
      return (data || []).map((d: any) => ({
        ...d,
        user_name: d.changed_by_name || '',
        user_email: d.changed_by_name || '',
        record_id: d.rule_id || '',
        table_name: (d.action || '').replace(/\[|\]/g, '').split(' ')[0] || '',
        ip_address: '',
        richAction: d.action || '',
      })) as AuditEntry[];
    },
  });

  const logAction = useMutation({
    mutationFn: async (entry: {
      action: string;
      changedFields?: string[];
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      entityId?: string;
    }) => {
      const { error } = await supabase.from('acct_rule_audit_log').insert({
        action: `[${module || 'system'}] ${entry.action}`,
        changed_by: user?.id || null,
        changed_by_name: user?.email || 'System',
        changed_fields: entry.changedFields || [],
        old_values: (entry.oldValues || {}) as any,
        new_values: (entry.newValues || {}) as any,
        rule_id: entry.entityId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_trail'] });
    },
  });

  return { entries, isLoading, logAction: logAction.mutate, isLogging: logAction.isPending };
}
