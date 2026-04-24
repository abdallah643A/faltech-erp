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

export function StepGeneralSettings({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const Toggle = ({ label, labelAr, field, desc, descAr }: any) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm font-medium">{isAr ? labelAr : label}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{isAr ? descAr : desc}</p>}
      </div>
      <Switch checked={!!data[field]} onCheckedChange={v => onChange(field, v)} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'إعدادات العملة' : 'Currency Settings'}</CardTitle>
          <CardDescription className="text-xs">{isAr ? 'تحديد عملات التشغيل والتقارير' : 'Define operational and reporting currencies'}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'العملة الأساسية' : 'Base Currency'}</Label>
            <Input value={data.currency || 'SAR'} readOnly className="h-9 bg-muted" />
            <p className="text-[10px] text-muted-foreground">{isAr ? 'من الخطوة السابقة' : 'From previous step'}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'عملة التقارير الموازية' : 'Parallel/Reporting Currency'}</Label>
            <Select value={data.reporting_currency || ''} onValueChange={v => onChange('reporting_currency', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? 'لا يوجد' : 'None'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? 'لا يوجد' : 'None'}</SelectItem>
                {['USD', 'EUR', 'GBP', 'SAR', 'AED'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'عدد المنازل العشرية' : 'Decimal Places'}</Label>
            <Select value={String(data.decimal_places ?? 2)} onValueChange={v => onChange('decimal_places', parseInt(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'التنسيق والترقيم' : 'Format & Numbering'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'تنسيق التاريخ' : 'Date Format'}</Label>
            <Select value={data.date_format || 'DD/MM/YYYY'} onValueChange={v => onChange('date_format', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'].map(f =>
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'تنسيق الوقت' : 'Time Format'}</Label>
            <Select value={data.time_format || '24h'} onValueChange={v => onChange('time_format', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24-{isAr ? 'ساعة' : 'Hour'}</SelectItem>
                <SelectItem value="12h">12-{isAr ? 'ساعة' : 'Hour'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'طريقة ترقيم المستندات' : 'Document Numbering Method'}</Label>
            <Select value={data.doc_numbering || 'automatic'} onValueChange={v => onChange('doc_numbering', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">{isAr ? 'تلقائي' : 'Automatic Sequential'}</SelectItem>
                <SelectItem value="manual">{isAr ? 'يدوي' : 'Manual Entry'}</SelectItem>
                <SelectItem value="series">{isAr ? 'سلسلة مخصصة' : 'Custom Series'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'إدارة فترات الترحيل' : 'Posting Period Control'}</Label>
            <Select value={data.posting_period_control || 'monthly'} onValueChange={v => onChange('posting_period_control', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{isAr ? 'شهري' : 'Monthly'}</SelectItem>
                <SelectItem value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                <SelectItem value="yearly">{isAr ? 'سنوي' : 'Yearly'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'إعدادات الضريبة والدفع' : 'Tax & Payment Defaults'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'إعداد الضريبة الافتراضي' : 'Default Tax Setup'}</Label>
            <Select value={data.default_tax || 'vat_15'} onValueChange={v => onChange('default_tax', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vat_15">VAT 15%</SelectItem>
                <SelectItem value="vat_5">VAT 5%</SelectItem>
                <SelectItem value="zero_rated">{isAr ? 'معفاة' : 'Zero Rated'}</SelectItem>
                <SelectItem value="exempt">{isAr ? 'غير خاضعة' : 'Exempt'}</SelectItem>
                <SelectItem value="custom">{isAr ? 'مخصص' : 'Custom'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'شروط الدفع الافتراضية' : 'Default Payment Terms'}</Label>
            <Select value={data.default_payment_terms || 'net_30'} onValueChange={v => onChange('default_payment_terms', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{isAr ? 'فوري' : 'Immediate'}</SelectItem>
                <SelectItem value="net_15">Net 15</SelectItem>
                <SelectItem value="net_30">Net 30</SelectItem>
                <SelectItem value="net_45">Net 45</SelectItem>
                <SelectItem value="net_60">Net 60</SelectItem>
                <SelectItem value="net_90">Net 90</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'الوحدات والميزات' : 'Modules & Features'}</CardTitle>
          <CardDescription className="text-xs">{isAr ? 'تفعيل الميزات المطلوبة لعملك' : 'Enable the features you need for your business'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          <Toggle label="Enable Cost Centers" labelAr="تفعيل مراكز التكلفة" field="enable_cost_centers" desc="Track expenses by department or project" descAr="تتبع المصروفات حسب الإدارة أو المشروع" />
          <Toggle label="Enable Projects" labelAr="تفعيل المشاريع" field="enable_projects" desc="Project-based accounting and tracking" descAr="محاسبة وتتبع على مستوى المشاريع" />
          <Toggle label="Enable Warehouses" labelAr="تفعيل المستودعات" field="enable_warehouses" desc="Multi-warehouse inventory management" descAr="إدارة المخزون متعدد المستودعات" />
          <Toggle label="Enable Multi-Branch" labelAr="تفعيل الفروع المتعددة" field="enable_multi_branch" desc="Branch-level financial separation" descAr="فصل مالي على مستوى الفروع" />
          <Toggle label="Enable Approval Workflows" labelAr="تفعيل تدفقات الموافقة" field="enable_approvals" desc="Document approval chains" descAr="سلسلات الموافقة على المستندات" />
          <Toggle label="Enable Budget Management" labelAr="تفعيل إدارة الميزانية" field="enable_budget" desc="Budget planning and control" descAr="تخطيط ومراقبة الميزانية" />
          <Toggle label="Auto Journal Entry Numbering" labelAr="ترقيم تلقائي لقيود اليومية" field="auto_je_numbering" />
        </CardContent>
      </Card>
    </div>
  );
}
