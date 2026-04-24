import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Plus, Palette, Copy, Send, Eye, Download, Trash2 } from 'lucide-react';

const labels: Record<string, Record<string, string>> = {
  en: { title: 'Visual Quote Designer', subtitle: 'Create professional branded quotes with drag-and-drop', newQuote: 'New Quote', templates: 'Templates', template: 'Template', professional: 'Professional', modern: 'Modern', minimal: 'Minimal', corporate: 'Corporate', item: 'Item', qty: 'Qty', price: 'Price', total: 'Total', subtotal: 'Subtotal', tax: 'Tax (15%)', grandTotal: 'Grand Total', addLine: 'Add Line', preview: 'Preview', sendQuote: 'Send Quote', duplicate: 'Duplicate', download: 'Download PDF', recentQuotes: 'Recent Quotes', customer: 'Customer', date: 'Date', status: 'Status', sent: 'Sent', viewed: 'Viewed', accepted: 'Accepted', expired: 'Expired', draft: 'Draft', conversionRate: 'Conversion Rate', avgQuoteValue: 'Avg Quote Value', quotesThisMonth: 'Quotes This Month' },
  ar: { title: 'مصمم عروض الأسعار', subtitle: 'إنشاء عروض أسعار احترافية بالسحب والإفلات', newQuote: 'عرض جديد', templates: 'القوالب', template: 'القالب', professional: 'احترافي', modern: 'عصري', minimal: 'بسيط', corporate: 'مؤسسي', item: 'الصنف', qty: 'الكمية', price: 'السعر', total: 'الإجمالي', subtotal: 'المجموع الفرعي', tax: 'الضريبة (15%)', grandTotal: 'الإجمالي الكلي', addLine: 'إضافة سطر', preview: 'معاينة', sendQuote: 'إرسال العرض', duplicate: 'نسخ', download: 'تحميل PDF', recentQuotes: 'العروض الأخيرة', customer: 'العميل', date: 'التاريخ', status: 'الحالة', sent: 'مُرسل', viewed: 'مُشاهد', accepted: 'مقبول', expired: 'منتهي', draft: 'مسودة', conversionRate: 'معدل التحويل', avgQuoteValue: 'متوسط قيمة العرض', quotesThisMonth: 'عروض هذا الشهر' },
  ur: { title: 'بصری کوٹیشن ڈیزائنر', subtitle: 'ڈریگ اینڈ ڈراپ سے پیشہ ورانہ کوٹیشنز بنائیں', newQuote: 'نئی کوٹیشن', templates: 'ٹیمپلیٹس', template: 'ٹیمپلیٹ', professional: 'پیشہ ورانہ', modern: 'جدید', minimal: 'سادہ', corporate: 'کارپوریٹ', item: 'شے', qty: 'مقدار', price: 'قیمت', total: 'کل', subtotal: 'ذیلی کل', tax: 'ٹیکس (15%)', grandTotal: 'مجموعی کل', addLine: 'لائن شامل کریں', preview: 'پیش نظارہ', sendQuote: 'کوٹیشن بھیجیں', duplicate: 'نقل', download: 'PDF ڈاؤن لوڈ', recentQuotes: 'حالیہ کوٹیشنز', customer: 'گاہک', date: 'تاریخ', status: 'حالت', sent: 'بھیجا', viewed: 'دیکھا', accepted: 'قبول', expired: 'ختم', draft: 'مسودہ', conversionRate: 'تبدیلی کی شرح', avgQuoteValue: 'اوسط کوٹیشن قدر', quotesThisMonth: 'اس ماہ کی کوٹیشنز' },
  hi: { title: 'विज़ुअल कोट डिज़ाइनर', subtitle: 'ड्रैग-एंड-ड्रॉप से प्रोफेशनल ब्रांडेड कोट बनाएं', newQuote: 'नया कोट', templates: 'टेम्पलेट', template: 'टेम्पलेट', professional: 'प्रोफेशनल', modern: 'आधुनिक', minimal: 'न्यूनतम', corporate: 'कॉर्पोरेट', item: 'वस्तु', qty: 'मात्रा', price: 'मूल्य', total: 'कुल', subtotal: 'उप-कुल', tax: 'कर (15%)', grandTotal: 'कुल योग', addLine: 'लाइन जोड़ें', preview: 'पूर्वावलोकन', sendQuote: 'कोट भेजें', duplicate: 'डुप्लिकेट', download: 'PDF डाउनलोड', recentQuotes: 'हाल के कोट', customer: 'ग्राहक', date: 'तिथि', status: 'स्थिति', sent: 'भेजा', viewed: 'देखा', accepted: 'स्वीकृत', expired: 'समाप्त', draft: 'ड्राफ्ट', conversionRate: 'रूपांतरण दर', avgQuoteValue: 'औसत कोट मूल्य', quotesThisMonth: 'इस माह के कोट' },
};

const mockLines = [
  { id: 1, item: 'Custom Aluminum Cabinet', qty: 4, price: 12500 },
  { id: 2, item: 'Glass Panel Installation', qty: 8, price: 3200 },
  { id: 3, item: 'LED Lighting System', qty: 1, price: 8500 },
];

const recentQuotes = [
  { id: '1', customer: 'Saudi Tech Corp', total: 185000, date: '2026-03-10', status: 'accepted' },
  { id: '2', customer: 'Gulf Industries', total: 320000, date: '2026-03-08', status: 'viewed' },
  { id: '3', customer: 'Vision Enterprises', total: 95000, date: '2026-03-05', status: 'sent' },
  { id: '4', customer: 'Desert Solutions', total: 450000, date: '2026-02-28', status: 'expired' },
];

export function QuoteDesigner() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;
  const [template, setTemplate] = useState('professional');

  const subtotal = mockLines.reduce((s, line) => s + line.qty * line.price, 0);
  const tax = subtotal * 0.15;
  const grandTotal = subtotal + tax;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">{l.title}</h3><p className="text-sm text-muted-foreground">{l.subtitle}</p></div>
        <div className="flex gap-2">
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">{l.professional}</SelectItem>
              <SelectItem value="modern">{l.modern}</SelectItem>
              <SelectItem value="minimal">{l.minimal}</SelectItem>
              <SelectItem value="corporate">{l.corporate}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />{l.newQuote}</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.quotesThisMonth}</p><p className="text-2xl font-bold">24</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.avgQuoteValue}</p><p className="text-2xl font-bold">262K</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.conversionRate}</p><p className="text-2xl font-bold text-success">38%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{l.recentQuotes}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{l.customer}</TableHead><TableHead>{l.total}</TableHead><TableHead>{l.date}</TableHead><TableHead>{l.status}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recentQuotes.map(q => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{q.customer}</TableCell>
                  <TableCell>{q.total.toLocaleString()} SAR</TableCell>
                  <TableCell>{q.date}</TableCell>
                  <TableCell>
                    <Badge variant={q.status === 'accepted' ? 'default' : q.status === 'viewed' ? 'secondary' : q.status === 'expired' ? 'destructive' : 'outline'}>
                      {l[q.status] || q.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
