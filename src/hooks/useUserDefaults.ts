import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserDefaults {
  id: string;
  user_id: string;
  default_branch_id: string | null;
  default_warehouse: string | null;
  default_sales_employee_code: number | null;
  default_price_list: number | null;
  default_payment_terms: string | null;
  default_tax_group: string | null;
  sap_user_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDefaultSeries {
  id: string;
  user_id: string;
  object_code: string;
  series: number;
  series_name: string | null;
  created_at: string;
}

export interface UserDocAuthorization {
  id: string;
  user_id: string;
  document_type: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_print: boolean;
  can_close: boolean;
  can_cancel: boolean;
  max_amount: number | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  { code: '23', label: 'Sales Quotations', labelAr: 'عروض الأسعار' },
  { code: '17', label: 'Sales Orders', labelAr: 'أوامر البيع' },
  { code: '15', label: 'Delivery Notes', labelAr: 'مذكرات التسليم' },
  { code: '13', label: 'AR Invoices', labelAr: 'فواتير العملاء' },
  { code: '14', label: 'AR Credit Memos', labelAr: 'إشعارات دائنة' },
  { code: '24', label: 'Incoming Payments', labelAr: 'المدفوعات الواردة' },
  { code: '22', label: 'Purchase Orders', labelAr: 'أوامر الشراء' },
  { code: '18', label: 'AP Invoices', labelAr: 'فواتير الموردين' },
  { code: '20', label: 'Goods Receipt PO', labelAr: 'استلام بضاعة' },
  { code: '1470000113', label: 'Purchase Requests', labelAr: 'طلبات الشراء' },
  { code: '540000006', label: 'Purchase Quotations', labelAr: 'عروض أسعار الشراء' },
  { code: 'MR', label: 'Material Requests', labelAr: 'طلبات المواد' },
  { code: '30', label: 'Journal Entries', labelAr: 'قيود يومية' },
  { code: '2', label: 'Business Partners', labelAr: 'الشركاء التجاريون' },
];

export function useUserDefaults(targetUserId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  const { data: defaults, isLoading: loadingDefaults } = useQuery({
    queryKey: ['user-defaults', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_defaults' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as UserDefaults | null;
    },
    enabled: !!userId,
  });

  const { data: defaultSeries = [], isLoading: loadingSeries } = useQuery({
    queryKey: ['user-default-series', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_default_series' as any)
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as unknown as UserDefaultSeries[];
    },
    enabled: !!userId,
  });

  const { data: docAuthorizations = [], isLoading: loadingAuths } = useQuery({
    queryKey: ['user-doc-authorizations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_document_authorizations' as any)
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as unknown as UserDocAuthorization[];
    },
    enabled: !!userId,
  });

  const saveDefaults = useMutation({
    mutationFn: async (values: Partial<UserDefaults>) => {
      if (!userId) throw new Error('No user');
      const { error } = await supabase
        .from('user_defaults' as any)
        .upsert({ user_id: userId, ...values }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-defaults', userId] });
      toast({ title: 'Defaults saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveDefaultSeries = useMutation({
    mutationFn: async (items: { object_code: string; series: number; series_name?: string }[]) => {
      if (!userId) throw new Error('No user');
      const rows = items.map(i => ({ user_id: userId, ...i }));
      const { error } = await supabase
        .from('user_default_series' as any)
        .upsert(rows, { onConflict: 'user_id,object_code' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-default-series', userId] });
      toast({ title: 'Default series saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveDocAuthorizations = useMutation({
    mutationFn: async (items: Partial<UserDocAuthorization>[]) => {
      if (!userId) throw new Error('No user');
      const rows = items.map(i => ({ user_id: userId, ...i }));
      const { error } = await supabase
        .from('user_document_authorizations' as any)
        .upsert(rows, { onConflict: 'user_id,document_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-doc-authorizations', userId] });
      toast({ title: 'Authorizations saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Get the default series for a specific document type (for use when creating documents)
  const getDefaultSeries = (objectCode: string): number | undefined => {
    return defaultSeries.find(s => s.object_code === objectCode)?.series;
  };

  // Check if user can perform action on document type
  const canPerformAction = (documentType: string, action: 'create' | 'read' | 'update' | 'delete' | 'print' | 'close' | 'cancel'): boolean => {
    const auth = docAuthorizations.find(a => a.document_type === documentType);
    if (!auth) return true; // If no specific auth set, allow (fall back to role-based)
    const key = `can_${action}` as keyof UserDocAuthorization;
    return auth[key] as boolean;
  };

  return {
    defaults,
    defaultSeries,
    docAuthorizations,
    loadingDefaults,
    loadingSeries,
    loadingAuths,
    saveDefaults,
    saveDefaultSeries,
    saveDocAuthorizations,
    getDefaultSeries,
    canPerformAction,
  };
}
