import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, CheckCircle2, AlertTriangle, Clock, FileText, Download, Calculator } from 'lucide-react';

const labels: Record<string, Record<string, string>> = {
  en: { title: 'Tax Compliance Dashboard', subtitle: 'ZATCA VAT compliance monitoring and automation', filingStatus: 'Filing Status', currentPeriod: 'Current Period', vatCollected: 'VAT Collected', vatPaid: 'VAT Paid', netVAT: 'Net VAT Payable', dueDate: 'Due Date', daysLeft: 'Days Left', complianceScore: 'Compliance Score', invoiceCompliance: 'Invoice Compliance', zatcaCompliant: 'ZATCA Compliant', nonCompliant: 'Non-Compliant', pendingReview: 'Pending Review', generateReturn: 'Generate Return', downloadReport: 'Download Report', upToDate: 'Up to Date', actionRequired: 'Action Required', overdue: 'Overdue', totalInvoices: 'Total Invoices', compliantRate: 'Compliant Rate', phase2Ready: 'Phase 2 Ready', qrGenerated: 'QR Generated' },
  ar: { title: 'لوحة الامتثال الضريبي', subtitle: 'مراقبة وأتمتة امتثال ضريبة القيمة المضافة ZATCA', filingStatus: 'حالة التقديم', currentPeriod: 'الفترة الحالية', vatCollected: 'ضريبة محصلة', vatPaid: 'ضريبة مدفوعة', netVAT: 'صافي الضريبة المستحقة', dueDate: 'تاريخ الاستحقاق', daysLeft: 'أيام متبقية', complianceScore: 'نتيجة الامتثال', invoiceCompliance: 'امتثال الفواتير', zatcaCompliant: 'متوافق مع زاتكا', nonCompliant: 'غير متوافق', pendingReview: 'قيد المراجعة', generateReturn: 'إنشاء الإقرار', downloadReport: 'تحميل التقرير', upToDate: 'محدث', actionRequired: 'يتطلب إجراء', overdue: 'متأخر', totalInvoices: 'إجمالي الفواتير', compliantRate: 'معدل الامتثال', phase2Ready: 'جاهز للمرحلة 2', qrGenerated: 'QR مُنشأ' },
  ur: { title: 'ٹیکس تعمیل ڈیش بورڈ', subtitle: 'ZATCA VAT تعمیل مانیٹرنگ اور آٹومیشن', filingStatus: 'فائلنگ حالت', currentPeriod: 'موجودہ مدت', vatCollected: 'VAT وصول شدہ', vatPaid: 'VAT ادا شدہ', netVAT: 'خالص VAT قابل ادائیگی', dueDate: 'آخری تاریخ', daysLeft: 'باقی دن', complianceScore: 'تعمیل اسکور', invoiceCompliance: 'انوائس تعمیل', zatcaCompliant: 'ZATCA موافق', nonCompliant: 'غیر موافق', pendingReview: 'جائزہ زیر التوا', generateReturn: 'ریٹرن بنائیں', downloadReport: 'رپورٹ ڈاؤن لوڈ', upToDate: 'اپ ٹو ڈیٹ', actionRequired: 'کارروائی ضروری', overdue: 'تاخیر', totalInvoices: 'کل انوائسز', compliantRate: 'تعمیل شرح', phase2Ready: 'فیز 2 تیار', qrGenerated: 'QR بنایا گیا' },
  hi: { title: 'कर अनुपालन डैशबोर्ड', subtitle: 'ZATCA VAT अनुपालन निगरानी और स्वचालन', filingStatus: 'फाइलिंग स्थिति', currentPeriod: 'वर्तमान अवधि', vatCollected: 'VAT एकत्रित', vatPaid: 'VAT भुगतान', netVAT: 'शुद्ध VAT देय', dueDate: 'नियत तिथि', daysLeft: 'शेष दिन', complianceScore: 'अनुपालन स्कोर', invoiceCompliance: 'चालान अनुपालन', zatcaCompliant: 'ZATCA अनुपालित', nonCompliant: 'गैर-अनुपालित', pendingReview: 'समीक्षा लंबित', generateReturn: 'रिटर्न जनरेट करें', downloadReport: 'रिपोर्ट डाउनलोड', upToDate: 'अद्यतन', actionRequired: 'कार्रवाई आवश्यक', overdue: 'अतिदेय', totalInvoices: 'कुल चालान', compliantRate: 'अनुपालन दर', phase2Ready: 'फेज 2 तैयार', qrGenerated: 'QR जनरेटेड' },
};

export function TaxComplianceDashboard() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">{l.title}</h3><p className="text-sm text-muted-foreground">{l.subtitle}</p></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-3.5 w-3.5" />{l.downloadReport}</Button>
          <Button size="sm" className="gap-1.5"><Calculator className="h-3.5 w-3.5" />{l.generateReturn}</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="border-success/30 bg-success/5"><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-1 mb-1"><Shield className="h-3.5 w-3.5 text-success" /><span className="text-xs text-muted-foreground">{l.complianceScore}</span></div>
          <p className="text-2xl font-bold text-success">96%</p>
          <Progress value={96} className="h-1.5 mt-1" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">{l.vatCollected}</p>
          <p className="text-xl font-bold">1,245,000 SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">{l.vatPaid}</p>
          <p className="text-xl font-bold">892,000 SAR</p>
        </CardContent></Card>
        <Card className="border-primary/30"><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">{l.netVAT}</p>
          <p className="text-xl font-bold text-primary">353,000 SAR</p>
          <p className="text-[10px] text-muted-foreground mt-1">{l.dueDate}: 2026-04-30 · 47 {l.daysLeft}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{l.invoiceCompliance}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm">{l.zatcaCompliant}</span></div>
              <Badge variant="default">1,842</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-sm">{l.pendingReview}</span></div>
              <Badge variant="secondary">23</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-sm">{l.nonCompliant}</span></div>
              <Badge variant="destructive">5</Badge>
            </div>
            <Progress value={98.5} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{l.compliantRate}: 98.5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{l.filingStatus}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-success/10">
              <span className="text-sm">Q4 2025</span>
              <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />{l.upToDate}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
              <span className="text-sm">Q1 2026 ({l.currentPeriod})</span>
              <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />47 {l.daysLeft}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded bg-success/10">
                <p className="text-lg font-bold text-success">✓</p>
                <p className="text-[10px] text-muted-foreground">{l.phase2Ready}</p>
              </div>
              <div className="text-center p-2 rounded bg-primary/10">
                <p className="text-lg font-bold text-primary">1,870</p>
                <p className="text-[10px] text-muted-foreground">{l.qrGenerated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
