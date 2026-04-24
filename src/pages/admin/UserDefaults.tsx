import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UserDefaults() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    default_warehouse: '',
    default_price_list: 0,
    default_branch_id: '',
    default_payment_terms: '',
    default_tax_group: '',
    default_sales_employee_code: 0,
    sap_user_code: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: defaults } = useQuery({
    queryKey: ['user-defaults', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_defaults')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (defaults) {
      setForm({
        default_warehouse: defaults.default_warehouse || '',
        default_price_list: defaults.default_price_list || 0,
        default_branch_id: defaults.default_branch_id || '',
        default_payment_terms: defaults.default_payment_terms || '',
        default_tax_group: defaults.default_tax_group || '',
        default_sales_employee_code: defaults.default_sales_employee_code || 0,
        sap_user_code: defaults.sap_user_code || '',
      });
    }
  }, [defaults]);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-list', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, code, name').eq('company_id', activeCompanyId!);
      return data || [];
    },
    enabled: !!activeCompanyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, user_id: userId! };
      if (defaults?.id) {
        const { error } = await supabase.from('user_defaults').update(payload).eq('id', defaults.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_defaults').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-defaults'] });
      toast.success(language === 'ar' ? 'تم الحفظ' : 'Defaults saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          {language === 'ar' ? 'الإعدادات الافتراضية للمستخدم' : 'User Defaults'}
        </h1>
        <p className="text-muted-foreground text-sm">{language === 'ar' ? 'تحديد الإعدادات الافتراضية' : 'Set default values for your session'}</p>
      </div>

      <div className="max-w-xl rounded-lg border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'المستودع الافتراضي' : 'Default Warehouse'}</Label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.default_warehouse} onChange={e => setForm({ ...form, default_warehouse: e.target.value })}>
            <option value="">— Select —</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.code}>{w.code} - {w.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'قائمة الأسعار الافتراضية' : 'Default Price List'}</Label>
          <input type="number" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.default_price_list} onChange={e => setForm({ ...form, default_price_list: Number(e.target.value) })} />
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'الفرع الافتراضي' : 'Default Branch'}</Label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.default_branch_id} onChange={e => setForm({ ...form, default_branch_id: e.target.value })}>
            <option value="">— Select —</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'شروط الدفع الافتراضية' : 'Default Payment Terms'}</Label>
          <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.default_payment_terms} onChange={e => setForm({ ...form, default_payment_terms: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'مجموعة الضريبة الافتراضية' : 'Default Tax Group'}</Label>
          <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.default_tax_group} onChange={e => setForm({ ...form, default_tax_group: e.target.value })} />
        </div>

        <div className="space-y-2">
          <Label>{language === 'ar' ? 'كود مستخدم SAP' : 'SAP User Code'}</Label>
          <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.sap_user_code} onChange={e => setForm({ ...form, sap_user_code: e.target.value })} />
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          <Save className="h-4 w-4 mr-2" /> {language === 'ar' ? 'حفظ' : 'Save Defaults'}
        </Button>
      </div>
    </div>
  );
}
