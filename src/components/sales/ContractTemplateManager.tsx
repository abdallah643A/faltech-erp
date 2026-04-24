import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Plus, Copy, Edit, Eye, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const labels: Record<string, Record<string, string>> = {
  en: { title: 'Contract Templates', subtitle: 'Reusable contract templates with auto-fill placeholders', create: 'New Template', name: 'Template Name', type: 'Type', version: 'Version', lastUsed: 'Last Used', timesUsed: 'Times Used', status: 'Status', active: 'Active', draft: 'Draft', archived: 'Archived', standard: 'Standard', custom: 'Custom', nda: 'NDA', service: 'Service Agreement', supply: 'Supply Contract', maintenance: 'Maintenance', totalTemplates: 'Total Templates', mostUsed: 'Most Used', avgTimeSaved: 'Avg Time Saved', edit: 'Edit', duplicate: 'Duplicate', preview: 'Preview' },
  ar: { title: 'قوالب العقود', subtitle: 'قوالب عقود قابلة لإعادة الاستخدام مع ملء تلقائي', create: 'قالب جديد', name: 'اسم القالب', type: 'النوع', version: 'الإصدار', lastUsed: 'آخر استخدام', timesUsed: 'مرات الاستخدام', status: 'الحالة', active: 'نشط', draft: 'مسودة', archived: 'مؤرشف', standard: 'قياسي', custom: 'مخصص', nda: 'اتفاقية سرية', service: 'اتفاقية خدمة', supply: 'عقد توريد', maintenance: 'صيانة', totalTemplates: 'إجمالي القوالب', mostUsed: 'الأكثر استخداماً', avgTimeSaved: 'متوسط الوقت الموفر', edit: 'تعديل', duplicate: 'نسخ', preview: 'معاينة' },
  ur: { title: 'معاہدے ٹیمپلیٹس', subtitle: 'خودکار بھرنے کے ساتھ دوبارہ قابل استعمال معاہدے ٹیمپلیٹس', create: 'نیا ٹیمپلیٹ', name: 'ٹیمپلیٹ نام', type: 'قسم', version: 'ورژن', lastUsed: 'آخری استعمال', timesUsed: 'استعمال کی تعداد', status: 'حالت', active: 'فعال', draft: 'مسودہ', archived: 'محفوظ شدہ', standard: 'معیاری', custom: 'حسب ضرورت', nda: 'NDA', service: 'سروس معاہدہ', supply: 'سپلائی معاہدہ', maintenance: 'دیکھ بھال', totalTemplates: 'کل ٹیمپلیٹس', mostUsed: 'سب سے زیادہ استعمال', avgTimeSaved: 'اوسط بچایا وقت', edit: 'ترمیم', duplicate: 'نقل', preview: 'پیش نظارہ' },
  hi: { title: 'अनुबंध टेम्पलेट', subtitle: 'ऑटो-फिल प्लेसहोल्डर के साथ पुन: प्रयोज्य अनुबंध टेम्पलेट', create: 'नया टेम्पलेट', name: 'टेम्पलेट नाम', type: 'प्रकार', version: 'संस्करण', lastUsed: 'अंतिम उपयोग', timesUsed: 'उपयोग की संख्या', status: 'स्थिति', active: 'सक्रिय', draft: 'ड्राफ्ट', archived: 'संग्रहीत', standard: 'मानक', custom: 'कस्टम', nda: 'NDA', service: 'सेवा समझौता', supply: 'आपूर्ति अनुबंध', maintenance: 'रखरखाव', totalTemplates: 'कुल टेम्पलेट', mostUsed: 'सबसे अधिक उपयोग', avgTimeSaved: 'औसत बचा समय', edit: 'संपादित', duplicate: 'डुप्लिकेट', preview: 'पूर्वावलोकन' },
};

const mockTemplates = [
  { id: '1', name: 'Standard Supply Contract', type: 'supply', version: 'v3.2', lastUsed: '2026-03-12', timesUsed: 145, status: 'active' as const },
  { id: '2', name: 'Service Level Agreement', type: 'service', version: 'v2.1', lastUsed: '2026-03-10', timesUsed: 89, status: 'active' as const },
  { id: '3', name: 'Non-Disclosure Agreement', type: 'nda', version: 'v1.5', lastUsed: '2026-03-08', timesUsed: 234, status: 'active' as const },
  { id: '4', name: 'Annual Maintenance Contract', type: 'maintenance', version: 'v1.0', lastUsed: '2026-02-20', timesUsed: 56, status: 'active' as const },
  { id: '5', name: 'Custom Project Contract', type: 'custom', version: 'v0.9', lastUsed: '', timesUsed: 0, status: 'draft' as const },
];

export function ContractTemplateManager() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">{l.title}</h3><p className="text-sm text-muted-foreground">{l.subtitle}</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />{l.create}</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.totalTemplates}</p><p className="text-2xl font-bold">{mockTemplates.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.mostUsed}</p><p className="text-lg font-bold">NDA</p><p className="text-xs text-muted-foreground">234x</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.avgTimeSaved}</p><p className="text-2xl font-bold text-success">45min</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        {mockTemplates.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{l[t.type] || t.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{t.version}</span>
                      {t.timesUsed > 0 && <span className="text-[10px] text-muted-foreground">{t.timesUsed}x {l.timesUsed.toLowerCase()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>
                    {t.status === 'active' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                    {l[t.status]}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
