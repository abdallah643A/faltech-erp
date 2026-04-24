import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface EntityRelationship {
  id: string;
  company_id: string | null;
  source_entity: string;
  source_id: string;
  source_label: string | null;
  target_entity: string;
  target_id: string;
  target_label: string | null;
  relationship_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

const ENTITY_LABELS: Record<string, string> = {
  business_partners: 'Business Partner',
  sales_orders: 'Sales Order',
  ar_invoices: 'A/R Invoice',
  quotes: 'Quote',
  delivery_notes: 'Delivery Note',
  incoming_payments: 'Incoming Payment',
  purchase_orders: 'Purchase Order',
  items: 'Item',
  leads: 'Lead',
  opportunities: 'Opportunity',
  activities: 'Activity',
  projects: 'Project',
};

export function useEntityRelationships(entity?: string, entityId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: relationships = [], isLoading } = useQuery({
    queryKey: ['entity-relationships', entity, entityId, activeCompanyId],
    queryFn: async () => {
      if (!entity || !entityId) return [];
      const { data: sourceData } = await supabase
        .from('entity_relationships')
        .select('*')
        .eq('source_entity', entity)
        .eq('source_id', entityId);
      const { data: targetData } = await supabase
        .from('entity_relationships')
        .select('*')
        .eq('target_entity', entity)
        .eq('target_id', entityId);
      return [...(sourceData || []), ...(targetData || [])] as EntityRelationship[];
    },
    enabled: !!entity && !!entityId,
  });

  const { data: allRelationships = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-entity-relationships', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('entity_relationships').select('*').order('created_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as EntityRelationship[];
    },
  });

  const createRelationship = useMutation({
    mutationFn: async (rel: Partial<EntityRelationship>) => {
      const { error } = await supabase.from('entity_relationships').insert({
        ...rel,
        company_id: activeCompanyId,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['all-entity-relationships'] });
      toast({ title: 'Relationship created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRelationship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entity_relationships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['all-entity-relationships'] });
      toast({ title: 'Relationship removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return {
    relationships, isLoading,
    allRelationships, loadingAll,
    createRelationship, deleteRelationship,
    ENTITY_LABELS,
  };
}
