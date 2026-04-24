import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface TargetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialData?: any;
}

export function TargetFormDialog({ open, onOpenChange, onSubmit, isLoading, initialData }: TargetFormDialogProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [form, setForm] = useState({
    user_name: initialData?.user_name || '',
    period: initialData?.period || 'monthly',
    period_start: initialData?.period_start || '',
    period_end: initialData?.period_end || '',
    sales_target: initialData?.sales_target || 0,
    sales_actual: initialData?.sales_actual || 0,
    collection_target: initialData?.collection_target || 0,
    collection_actual: initialData?.collection_actual || 0,
    target_type: initialData?.target_type || 'sales',
    sales_employee_id: initialData?.sales_employee_id || '',
    branch_id: initialData?.branch_id || '',
    company_id: initialData?.company_id || '',
    region_id: initialData?.region_id || '',
    business_line_id: initialData?.business_line_id || '',
    notes: initialData?.notes || '',
  });

  // Fetch lookup data
  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['sales-employees-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('sales_employees').select('id, slp_name, slp_code').eq('is_active', true).order('slp_name');
      return data || [];
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('id, name, name_ar').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name, name_ar, region_id').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, name_ar, company_id').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: businessLines = [] } = useQuery({
    queryKey: ['dimensions-business-line-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('dimensions').select('id, cost_center, name').eq('dimension_type', 'business_line').eq('is_active', true).order('cost_center');
      return data || [];
    },
  });

  // Filter companies/branches based on selection
  const filteredCompanies = form.region_id
    ? companies.filter(c => c.region_id === form.region_id)
    : companies;

  const filteredBranches = form.company_id
    ? branches.filter(b => b.company_id === form.company_id)
    : branches;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEmployee = salesEmployees.find(se => se.id === form.sales_employee_id);
    const selectedBL = businessLines.find(bl => bl.id === form.business_line_id);

    onSubmit({
      ...form,
      sales_employee_id: form.sales_employee_id || null,
      sales_employee_name: selectedEmployee?.slp_name || null,
      branch_id: form.branch_id || null,
      company_id: form.company_id || null,
      region_id: form.region_id || null,
      business_line_id: form.business_line_id || null,
      business_line_code: selectedBL?.cost_center || null,
      business_line_name: selectedBL?.name || null,
    });
  };

  const getName = (item: { name: string; name_ar?: string | null }) =>
    isAr && item.name_ar ? item.name_ar : item.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? (isAr ? 'تعديل الهدف' : 'Edit Target') : (isAr ? 'إضافة هدف جديد' : 'Add New Target')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Target Type */}
            <div>
              <Label>{isAr ? 'نوع الهدف' : 'Target Type'}</Label>
              <Select value={form.target_type} onValueChange={v => setForm(f => ({ ...f, target_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{isAr ? 'مبيعات' : 'Sales'}</SelectItem>
                  <SelectItem value="collection">{isAr ? 'تحصيل' : 'Collection'}</SelectItem>
                  <SelectItem value="both">{isAr ? 'مبيعات وتحصيل' : 'Sales & Collection'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div>
              <Label>{isAr ? 'الفترة' : 'Period'}</Label>
              <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{isAr ? 'يومي' : 'Daily'}</SelectItem>
                  <SelectItem value="weekly">{isAr ? 'أسبوعي' : 'Weekly'}</SelectItem>
                  <SelectItem value="monthly">{isAr ? 'شهري' : 'Monthly'}</SelectItem>
                  <SelectItem value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                  <SelectItem value="yearly">{isAr ? 'سنوي' : 'Yearly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sales Employee */}
            <div>
              <Label>{isAr ? 'موظف المبيعات' : 'Sales Employee'}</Label>
              <Select value={form.sales_employee_id} onValueChange={v => {
                const emp = salesEmployees.find(se => se.id === v);
                setForm(f => ({ ...f, sales_employee_id: v, user_name: emp?.slp_name || f.user_name }));
              }}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                <SelectContent>
                  {salesEmployees.map(se => (
                    <SelectItem key={se.id} value={se.id}>{se.slp_name} ({se.slp_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Name (auto-filled or manual) */}
            <div>
              <Label>{isAr ? 'اسم المستخدم' : 'User Name'}</Label>
              <Input value={form.user_name} onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))} required />
            </div>

            {/* Region */}
            <div>
              <Label>{isAr ? 'المنطقة' : 'Region'}</Label>
              <Select value={form.region_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, region_id: v === '__none__' ? '' : v, company_id: '', branch_id: '' }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                <SelectItem value="__none__">{isAr ? 'الكل' : 'All'}</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{getName(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company */}
            <div>
              <Label>{isAr ? 'الشركة' : 'Company'}</Label>
              <Select value={form.company_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, company_id: v === '__none__' ? '' : v, branch_id: '' }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{isAr ? 'الكل' : 'All'}</SelectItem>
                  {filteredCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div>
              <Label>{isAr ? 'الفرع' : 'Branch'}</Label>
              <Select value={form.branch_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, branch_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{isAr ? 'الكل' : 'All'}</SelectItem>
                  {filteredBranches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{getName(b)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Line */}
            <div>
              <Label>{isAr ? 'خط الأعمال' : 'Business Line'}</Label>
              <Select value={form.business_line_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, business_line_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{isAr ? 'الكل' : 'All'}</SelectItem>
                  {businessLines.map(bl => (
                    <SelectItem key={bl.id} value={bl.id}>{bl.cost_center} - {bl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div>
              <Label>{isAr ? 'بداية الفترة' : 'Period Start'}</Label>
              <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} required />
            </div>
            <div>
              <Label>{isAr ? 'نهاية الفترة' : 'Period End'}</Label>
              <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} required />
            </div>

            {/* Amounts */}
            <div>
              <Label>{isAr ? 'هدف المبيعات' : 'Sales Target'}</Label>
              <Input type="number" value={form.sales_target} onChange={e => setForm(f => ({ ...f, sales_target: +e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'المبيعات الفعلية' : 'Sales Actual'}</Label>
              <Input type="number" value={form.sales_actual} onChange={e => setForm(f => ({ ...f, sales_actual: +e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'هدف التحصيل' : 'Collection Target'}</Label>
              <Input type="number" value={form.collection_target} onChange={e => setForm(f => ({ ...f, collection_target: +e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'التحصيل الفعلي' : 'Collection Actual'}</Label>
              <Input type="number" value={form.collection_actual} onChange={e => setForm(f => ({ ...f, collection_actual: +e.target.value }))} />
            </div>

            <div className="col-span-2">
              <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إنشاء' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
