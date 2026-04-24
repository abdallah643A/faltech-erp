import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

const COUNTRIES = [
  'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'Egypt', 'Jordan', 'Lebanon', 'Iraq', 'Morocco', 'Tunisia', 'Algeria',
  'United States', 'United Kingdom', 'Germany', 'France', 'India', 'Pakistan',
  'Turkey', 'Malaysia', 'Indonesia', 'Singapore', 'Other'
];

const INDUSTRIES = [
  'Construction & Contracting', 'Manufacturing', 'Trading & Distribution', 'Real Estate',
  'Healthcare', 'Education', 'Technology', 'Food & Beverage', 'Retail', 'Professional Services',
  'Oil & Gas', 'Transportation', 'Agriculture', 'Hospitality', 'Financial Services', 'Other'
];

const TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain',
  'Africa/Cairo', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Asia/Karachi',
  'Europe/Berlin', 'Asia/Singapore', 'Asia/Istanbul'
];

const FISCAL_VARIANTS = ['Calendar Year (Jan-Dec)', 'Apr-Mar', 'Jul-Jun', 'Oct-Sep', 'Custom'];

interface FieldProps {
  label: string;
  labelAr: string;
  field: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  placeholderAr?: string;
  isAr: boolean;
  value: string;
  onFieldChange: (field: string, value: string) => void;
}

function Field({ label, labelAr, field, required, type = 'text', placeholder, placeholderAr, isAr, value, onFieldChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {isAr ? labelAr : label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={e => onFieldChange(field, e.target.value)}
        placeholder={isAr ? (placeholderAr || '') : (placeholder || '')}
        className="h-9"
      />
    </div>
  );
}

interface StepBasicInfoProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function StepBasicInfo({ data, onChange }: StepBasicInfoProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'معلومات الشركة الأساسية' : 'Company Identity'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name" labelAr="اسم الشركة" field="company_name" required placeholder="e.g. AlRajhi Group" isAr={isAr} value={data.company_name || ''} onFieldChange={onChange} />
          <Field label="Legal Name" labelAr="الاسم القانوني" field="legal_name" required placeholder="e.g. AlRajhi Group LLC" isAr={isAr} value={data.legal_name || ''} onFieldChange={onChange} />
          <Field label="Company Code" labelAr="رمز الشركة" field="company_code" required placeholder="e.g. ARG" isAr={isAr} value={data.company_code || ''} onFieldChange={onChange} />
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {isAr ? 'البلد' : 'Country'} <span className="text-destructive">*</span>
            </Label>
            <Select value={data.country || ''} onValueChange={v => onChange('country', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? 'اختر البلد' : 'Select Country'} /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="City" labelAr="المدينة" field="city" required isAr={isAr} value={data.city || ''} onFieldChange={onChange} />
          <Field label="Address" labelAr="العنوان" field="address" isAr={isAr} value={data.address || ''} onFieldChange={onChange} />
          <Field label="Postal Code" labelAr="الرمز البريدي" field="postal_code" isAr={isAr} value={data.postal_code || ''} onFieldChange={onChange} />
          <Field label="Phone" labelAr="الهاتف" field="phone" type="tel" isAr={isAr} value={data.phone || ''} onFieldChange={onChange} />
          <Field label="Email" labelAr="البريد الإلكتروني" field="email" type="email" required isAr={isAr} value={data.email || ''} onFieldChange={onChange} />
          <Field label="Website" labelAr="الموقع الإلكتروني" field="website" type="url" isAr={isAr} value={data.website || ''} onFieldChange={onChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'المعلومات الضريبية والتنظيمية' : 'Tax & Regulatory Information'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tax Number / VAT Number" labelAr="الرقم الضريبي" field="tax_number" required isAr={isAr} value={data.tax_number || ''} onFieldChange={onChange} />
          <Field label="Commercial Registration No." labelAr="رقم السجل التجاري" field="cr_number" required isAr={isAr} value={data.cr_number || ''} onFieldChange={onChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{isAr ? 'إعدادات إقليمية' : 'Regional Settings'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'العملة' : 'Currency'} <span className="text-destructive">*</span></Label>
            <Select value={data.currency || 'SAR'} onValueChange={v => onChange('currency', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'USD', 'EUR', 'GBP', 'EGP', 'INR', 'PKR'].map(c =>
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'اللغة الافتراضية' : 'Default Language'}</Label>
            <Select value={data.default_language || 'en'} onValueChange={v => onChange('default_language', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="ur">اردو</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'المنطقة الزمنية' : 'Time Zone'}</Label>
            <Select value={data.timezone || 'Asia/Riyadh'} onValueChange={v => onChange('timezone', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'بداية السنة المالية' : 'Fiscal Year Start'}</Label>
            <Input type="date" value={data.fiscal_year_start || ''} onChange={e => onChange('fiscal_year_start', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'نوع السنة المالية' : 'Fiscal Year Variant'}</Label>
            <Select value={data.fiscal_year_variant || 'Calendar Year (Jan-Dec)'} onValueChange={v => onChange('fiscal_year_variant', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FISCAL_VARIANTS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{isAr ? 'القطاع' : 'Industry'}</Label>
            <Select value={data.industry || ''} onValueChange={v => onChange('industry', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? 'اختر القطاع' : 'Select Industry'} /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
