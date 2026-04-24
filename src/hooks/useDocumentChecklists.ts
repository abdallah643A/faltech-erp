import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChecklistTemplate {
  id: string;
  company_id: string | null;
  document_type: string;
  name: string;
  description: string | null;
  items: { key: string; label: string; description?: string; is_mandatory?: boolean }[];
  is_mandatory: boolean;
  block_status_from: string | null;
  block_status_to: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChecklistInstance {
  id: string;
  template_id: string;
  document_type: string;
  document_id: string;
  items_progress: { key: string; label: string; completed: boolean; completed_by?: string; completed_at?: string; notes?: string }[];
  is_complete: boolean;
  created_at: string;
}

export function useDocumentChecklists(documentType: string, documentId: string, companyId?: string) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ['doc-checklists', documentType, documentId];

  // Get templates for this document type
  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates', documentType, companyId],
    queryFn: async () => {
      let q = supabase
        .from('document_checklist_templates')
        .select('*')
        .eq('document_type', documentType)
        .eq('is_active', true);
      if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
      const { data, error } = await q.order('created_at');
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        items: Array.isArray(d.items) ? d.items : JSON.parse(d.items as any || '[]'),
      })) as ChecklistTemplate[];
    },
    enabled: !!documentType,
  });

  // Get instances for this document
  const { data: instances = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_checklist_instances')
        .select('*')
        .eq('document_type', documentType)
        .eq('document_id', documentId);
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        items_progress: Array.isArray(d.items_progress) ? d.items_progress : JSON.parse(d.items_progress as any || '[]'),
      })) as ChecklistInstance[];
    },
    enabled: !!documentType && !!documentId,
  });

  // Initialize checklist from template if not exists
  const initChecklist = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');
      const progress = template.items.map(item => ({
        key: item.key,
        label: item.label,
        completed: false,
      }));
      const { error } = await supabase.from('document_checklist_instances').insert({
        template_id: templateId,
        document_type: documentType,
        document_id: documentId,
        items_progress: progress as any,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  // Toggle item completion
  const toggleItem = useMutation({
    mutationFn: async ({ instanceId, itemKey }: { instanceId: string; itemKey: string }) => {
      const instance = instances.find(i => i.id === instanceId);
      if (!instance) throw new Error('Instance not found');
      const updated = instance.items_progress.map(item => {
        if (item.key === itemKey) {
          return {
            ...item,
            completed: !item.completed,
            completed_by: !item.completed ? (profile?.full_name || user?.id || '') : undefined,
            completed_at: !item.completed ? new Date().toISOString() : undefined,
          };
        }
        return item;
      });
      const isComplete = updated.every(i => i.completed);
      const { error } = await supabase
        .from('document_checklist_instances')
        .update({ items_progress: updated as any, is_complete: isComplete })
        .eq('id', instanceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  // Check if status transition is blocked
  const isStatusBlocked = (fromStatus: string, toStatus: string): boolean => {
    for (const template of templates) {
      if (!template.is_mandatory) continue;
      if (template.block_status_from && template.block_status_from !== fromStatus) continue;
      if (template.block_status_to && template.block_status_to !== toStatus) continue;
      const instance = instances.find(i => i.template_id === template.id);
      if (!instance || !instance.is_complete) return true;
    }
    return false;
  };

  // Auto-init missing checklists
  const uninitializedTemplates = templates.filter(
    t => !instances.find(i => i.template_id === t.id)
  );

  return {
    templates,
    instances,
    uninitializedTemplates,
    isLoading,
    initChecklist,
    toggleItem,
    isStatusBlocked,
  };
}

// Admin hook for managing templates
export function useChecklistTemplateAdmin(companyId?: string) {
  const qc = useQueryClient();
  const key = ['checklist-templates-admin', companyId];

  const { data: templates = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from('document_checklist_templates').select('*').order('document_type').order('created_at');
      if (companyId) q = q.or(`company_id.eq.${companyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        items: Array.isArray(d.items) ? d.items : JSON.parse(d.items as any || '[]'),
      })) as ChecklistTemplate[];
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (template: Partial<ChecklistTemplate> & { id?: string }) => {
      if (template.id) {
        const { error } = await supabase
          .from('document_checklist_templates')
          .update({
            name: template.name,
            description: template.description,
            items: template.items as any,
            is_mandatory: template.is_mandatory,
            block_status_from: template.block_status_from,
            block_status_to: template.block_status_to,
            is_active: template.is_active,
          })
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('document_checklist_templates').insert({
          company_id: companyId || null,
          document_type: template.document_type!,
          name: template.name!,
          description: template.description,
          items: template.items as any,
          is_mandatory: template.is_mandatory ?? false,
          block_status_from: template.block_status_from,
          block_status_to: template.block_status_to,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_checklist_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { templates, isLoading, saveTemplate, deleteTemplate };
}
