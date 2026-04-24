import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface PrintLayout {
  id: string;
  company_id: string | null;
  name: string;
  document_type: string;
  is_default: boolean;
  page_size: string;
  orientation: string;
  margins: { top: number; right: number; bottom: number; left: number };
  header_config: Record<string, any>;
  body_config: Record<string, any>;
  footer_config: Record<string, any>;
  custom_css: string | null;
  field_mappings: Array<{ field: string; label: string; width: number; visible: boolean; order: number }>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'ar_invoice', label: 'A/R Invoice' },
  { value: 'quote', label: 'Quotation' },
  { value: 'delivery_note', label: 'Delivery Note' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'incoming_payment', label: 'Incoming Payment' },
  { value: 'credit_memo', label: 'Credit Memo' },
  { value: 'ar_return', label: 'A/R Return' },
];

export function usePrintLayouts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ['print-layouts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('print_layouts').select('*').order('document_type').order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PrintLayout[];
    },
  });

  const createLayout = useMutation({
    mutationFn: async (layout: Partial<PrintLayout>) => {
      const { error } = await supabase.from('print_layouts').insert({
        ...layout,
        company_id: activeCompanyId,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-layouts'] });
      toast({ title: 'Print layout created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateLayout = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PrintLayout> & { id: string }) => {
      const { error } = await supabase.from('print_layouts').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-layouts'] });
      toast({ title: 'Print layout updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteLayout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('print_layouts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-layouts'] });
      toast({ title: 'Print layout deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const setDefault = useMutation({
    mutationFn: async ({ id, documentType }: { id: string; documentType: string }) => {
      // Unset other defaults for same doc type
      await supabase.from('print_layouts').update({ is_default: false } as any)
        .eq('document_type', documentType);
      const { error } = await supabase.from('print_layouts').update({ is_default: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-layouts'] });
      toast({ title: 'Default layout set' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getDefaultLayout = (documentType: string) => {
    return layouts.find(l => l.document_type === documentType && l.is_default && l.is_active) 
      || layouts.find(l => l.document_type === documentType && l.is_active);
  };

  return {
    layouts, isLoading,
    createLayout, updateLayout, deleteLayout, setDefault,
    getDefaultLayout,
  };
}
