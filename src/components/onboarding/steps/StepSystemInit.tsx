import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function StepSystemInit({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'إدارة المخزون' : 'Inventory Management'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'طريقة تقييم المخزون' : 'Inventory Valuation Method'}</Label>
            <Select value={data.valuation_method || 'moving_average'} onValueChange={v => onChange('valuation_method', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="moving_average">{isAr ? 'المتوسط المتحرك' : 'Moving Average'}</SelectItem>
                <SelectItem value="fifo">FIFO</SelectItem>
                <SelectItem value="standard">{isAr ? 'التكلفة المعيارية' : 'Standard Cost'}</SelectItem>
                <SelectItem value="serial_batch">{isAr ? 'رقم تسلسلي/دفعة' : 'Serial/Batch'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'المستودع الافتراضي' : 'Default Warehouse'}</Label>
            <Input value={data.default_warehouse || ''} onChange={e => onChange('default_warehouse', e.target.value)} className="h-9" placeholder={isAr ? 'مثال: WH-01' : 'e.g. WH-01'} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'طريقة توليد رمز الصنف' : 'Item Code Generation'}</Label>
            <Select value={data.item_code_method || 'manual'} onValueChange={v => onChange('item_code_method', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{isAr ? 'يدوي' : 'Manual'}</SelectItem>
                <SelectItem value="auto_sequential">{isAr ? 'تلقائي متسلسل' : 'Auto Sequential'}</SelectItem>
                <SelectItem value="prefix_sequential">{isAr ? 'بادئة + تسلسل' : 'Prefix + Sequential'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'سلاسل الترقيم' : 'Numbering Series'}</CardTitle>
          <CardDescription className="text-xs">{isAr ? 'تحديد سلاسل الترقيم للكيانات الرئيسية' : 'Define numbering series for key entities'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Customer Series', labelAr: 'سلسلة العملاء', field: 'customer_series', ph: 'C-00001' },
            { label: 'Vendor Series', labelAr: 'سلسلة الموردين', field: 'vendor_series', ph: 'V-00001' },
            { label: 'Employee Series', labelAr: 'سلسلة الموظفين', field: 'employee_series', ph: 'E-00001' },
            { label: 'Document Series', labelAr: 'سلسلة المستندات', field: 'document_series', ph: 'DOC-00001' },
          ].map(s => (
            <div key={s.field} className="flex items-center gap-4">
              <Label className="text-sm font-medium w-40 shrink-0">{isAr ? s.labelAr : s.label}</Label>
              <Input value={data[s.field] || ''} onChange={e => onChange(s.field, e.target.value)} className="h-9" placeholder={s.ph} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'إعدادات متقدمة' : 'Advanced Settings'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          {[
            { label: 'Create Financial Periods', labelAr: 'إنشاء الفترات المالية', field: 'create_periods', desc: 'Auto-create monthly periods for the fiscal year', descAr: 'إنشاء فترات شهرية تلقائياً للسنة المالية' },
            { label: 'Opening Balances Entry', labelAr: 'إدخال أرصدة افتتاحية', field: 'opening_balances', desc: 'Allow entering opening balances after creation', descAr: 'السماح بإدخال أرصدة افتتاحية بعد الإنشاء' },
            { label: 'Exchange Rate Setup', labelAr: 'إعداد أسعار الصرف', field: 'exchange_rate_setup', desc: 'Configure exchange rate management', descAr: 'تهيئة إدارة أسعار الصرف' },
            { label: 'Enable Audit Trail', labelAr: 'تفعيل سجل المراجعة', field: 'enable_audit', desc: 'Track all user actions and data changes', descAr: 'تتبع جميع إجراءات المستخدمين وتغييرات البيانات' },
            { label: 'Enable Notifications', labelAr: 'تفعيل الإشعارات', field: 'enable_notifications' },
            { label: 'User Authorization Baseline', labelAr: 'أساس صلاحيات المستخدمين', field: 'auth_baseline', desc: 'Create default roles and permissions', descAr: 'إنشاء أدوار وصلاحيات افتراضية' },
          ].map(item => (
            <div key={item.field} className="flex items-center justify-between py-2.5">
              <div>
                <Label className="text-sm font-medium">{isAr ? item.labelAr : item.label}</Label>
                {item.desc && <p className="text-xs text-muted-foreground">{isAr ? item.descAr : item.desc}</p>}
              </div>
              <Switch checked={!!data[item.field]} onCheckedChange={v => onChange(item.field, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
