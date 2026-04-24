import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Building2, Settings, Database, Users, BookOpen, Layers, CheckCircle, Grid3X3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  data: Record<string, any>;
  onGoToStep: (step: number) => void;
}

export function StepReview({ data, onGoToStep }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const Section = ({ icon, title, titleAr, step, children }: { icon: React.ReactNode; title: string; titleAr: string; step: number; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
            <CardTitle className="text-sm">{isAr ? titleAr : title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onGoToStep(step)} className="gap-1 text-xs h-7">
            <Edit2 className="h-3 w-3" />
            {isAr ? 'تعديل' : 'Edit'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs space-y-1">{children}</CardContent>
    </Card>
  );

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-1 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || '—'}</span>
    </div>
  );

  const users = data.users || [];
  const accounts = data.coa_accounts || [];
  const activeAccounts = accounts.filter((a: any) => a.active).length;
  const enabledModules: string[] = data.enabled_modules || [];

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">{isAr ? 'مراجعة الإعداد' : 'Review Your Setup'}</p>
          <p className="text-xs text-green-600">{isAr ? 'راجع جميع الإعدادات قبل إنشاء الشركة' : 'Review all settings before creating the company'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={<Building2 className="h-4 w-4" />} title="Company Information" titleAr="معلومات الشركة" step={0}>
          <Row label={isAr ? 'اسم الشركة' : 'Company Name'} value={data.company_name} />
          <Row label={isAr ? 'الاسم القانوني' : 'Legal Name'} value={data.legal_name} />
          <Row label={isAr ? 'رمز الشركة' : 'Company Code'} value={data.company_code} />
          <Row label={isAr ? 'البلد' : 'Country'} value={data.country} />
          <Row label={isAr ? 'العملة' : 'Currency'} value={data.currency} />
          <Row label={isAr ? 'القطاع' : 'Industry'} value={data.industry} />
          <Row label={isAr ? 'الرقم الضريبي' : 'Tax Number'} value={data.tax_number} />
        </Section>

        <Section icon={<Settings className="h-4 w-4" />} title="General Settings" titleAr="الإعدادات العامة" step={1}>
          <Row label={isAr ? 'تنسيق التاريخ' : 'Date Format'} value={data.date_format || 'DD/MM/YYYY'} />
          <Row label={isAr ? 'شروط الدفع' : 'Payment Terms'} value={data.default_payment_terms || 'Net 30'} />
          <Row label={isAr ? 'الضريبة' : 'Tax Setup'} value={data.default_tax || 'VAT 15%'} />
          <div className="flex flex-wrap gap-1 mt-2">
            {data.enable_cost_centers && <Badge variant="secondary" className="text-[10px]">{isAr ? 'مراكز التكلفة' : 'Cost Centers'}</Badge>}
            {data.enable_projects && <Badge variant="secondary" className="text-[10px]">{isAr ? 'المشاريع' : 'Projects'}</Badge>}
            {data.enable_warehouses && <Badge variant="secondary" className="text-[10px]">{isAr ? 'المستودعات' : 'Warehouses'}</Badge>}
            {data.enable_multi_branch && <Badge variant="secondary" className="text-[10px]">{isAr ? 'الفروع' : 'Multi-Branch'}</Badge>}
            {data.enable_approvals && <Badge variant="secondary" className="text-[10px]">{isAr ? 'الموافقات' : 'Approvals'}</Badge>}
            {data.enable_budget && <Badge variant="secondary" className="text-[10px]">{isAr ? 'الميزانية' : 'Budget'}</Badge>}
          </div>
        </Section>

        <Section icon={<Grid3X3 className="h-4 w-4" />} title="Enabled Modules" titleAr="الوحدات المفعلة" step={2}>
          <Row label={isAr ? 'عدد الوحدات' : 'Total Modules'} value={enabledModules.length} />
          <div className="flex flex-wrap gap-1 mt-1">
            {enabledModules.map((m: string) => (
              <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
            ))}
          </div>
        </Section>

        <Section icon={<Database className="h-4 w-4" />} title="System Initialization" titleAr="تهيئة النظام" step={3}>
          <Row label={isAr ? 'تقييم المخزون' : 'Inventory Valuation'} value={data.valuation_method || 'Moving Average'} />
          <Row label={isAr ? 'المستودع الافتراضي' : 'Default Warehouse'} value={data.default_warehouse} />
          <Row label={isAr ? 'سلسلة العملاء' : 'Customer Series'} value={data.customer_series} />
          <Row label={isAr ? 'سجل المراجعة' : 'Audit Trail'} value={data.enable_audit ? '✓' : '—'} />
        </Section>

        <Section icon={<Users className="h-4 w-4" />} title="Users" titleAr="المستخدمون" step={4}>
          <Row label={isAr ? 'عدد المستخدمين' : 'Total Users'} value={users.length} />
          {users.map((u: any, i: number) => (
            <Row key={i} label={u.full_name || `User ${i + 1}`} value={u.role} />
          ))}
        </Section>

        <Section icon={<BookOpen className="h-4 w-4" />} title="Chart of Accounts" titleAr="دليل الحسابات" step={5}>
          <Row label={isAr ? 'الطريقة' : 'Method'} value={data.coa_method === 'ifrs' ? 'IFRS Default' : data.coa_method === 'custom' ? 'Custom' : '—'} />
          <Row label={isAr ? 'إجمالي الحسابات' : 'Total Accounts'} value={accounts.length} />
          <Row label={isAr ? 'حسابات نشطة' : 'Active Accounts'} value={activeAccounts} />
        </Section>

        <Section icon={<Layers className="h-4 w-4" />} title="Master Data" titleAr="البيانات الرئيسية" step={6}>
          {['warehouses', 'departments', 'branches', 'item_groups', 'tax_codes'].map(key => {
            const items: string[] = data[`md_${key}`] || [];
            if (items.length === 0) return null;
            return <Row key={key} label={key.replace(/_/g, ' ')} value={`${items.length} items`} />;
          })}
        </Section>
      </div>
    </div>
  );
}
