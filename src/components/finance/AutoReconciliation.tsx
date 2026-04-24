import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { Brain, CheckCircle2, Clock, AlertTriangle, Zap, Link2, XCircle } from 'lucide-react';

const labels: Record<string, Record<string, string>> = {
  en: { title: 'AI Auto-Reconciliation', subtitle: 'AI-powered bank statement matching with confidence scoring', runAI: 'Run AI Match', matchRate: 'Match Rate', autoMatched: 'Auto-Matched', manualReview: 'Manual Review', unmatched: 'Unmatched', totalTransactions: 'Total Transactions', bankRef: 'Bank Reference', amount: 'Amount', matchedTo: 'Matched To', confidence: 'Confidence', status: 'Status', matched: 'Matched', review: 'Review', failed: 'Failed', date: 'Date', description: 'Description', high: 'High', medium: 'Medium', low: 'Low' },
  ar: { title: 'التسوية التلقائية بالذكاء الاصطناعي', subtitle: 'مطابقة كشوف البنك المدعومة بالذكاء الاصطناعي مع تقييم الثقة', runAI: 'تشغيل المطابقة', matchRate: 'معدل المطابقة', autoMatched: 'مطابقة تلقائية', manualReview: 'مراجعة يدوية', unmatched: 'غير مطابق', totalTransactions: 'إجمالي المعاملات', bankRef: 'مرجع البنك', amount: 'المبلغ', matchedTo: 'مطابق مع', confidence: 'الثقة', status: 'الحالة', matched: 'مطابق', review: 'مراجعة', failed: 'فشل', date: 'التاريخ', description: 'الوصف', high: 'عالي', medium: 'متوسط', low: 'منخفض' },
  ur: { title: 'AI خودکار تطبیق', subtitle: 'اعتماد اسکورنگ کے ساتھ AI سے چلنے والی بینک اسٹیٹمنٹ میچنگ', runAI: 'AI میچ چلائیں', matchRate: 'میچ شرح', autoMatched: 'خودکار میچ', manualReview: 'دستی جائزہ', unmatched: 'غیر مطابق', totalTransactions: 'کل لین دین', bankRef: 'بینک حوالہ', amount: 'رقم', matchedTo: 'مطابقت', confidence: 'اعتماد', status: 'حالت', matched: 'مطابق', review: 'جائزہ', failed: 'ناکام', date: 'تاریخ', description: 'تفصیل', high: 'زیادہ', medium: 'درمیانہ', low: 'کم' },
  hi: { title: 'AI ऑटो-समाधान', subtitle: 'विश्वास स्कोरिंग के साथ AI-संचालित बैंक विवरण मिलान', runAI: 'AI मैच चलाएं', matchRate: 'मैच दर', autoMatched: 'ऑटो-मैच', manualReview: 'मैन्युअल समीक्षा', unmatched: 'बेमेल', totalTransactions: 'कुल लेनदेन', bankRef: 'बैंक संदर्भ', amount: 'राशि', matchedTo: 'से मिलान', confidence: 'विश्वास', status: 'स्थिति', matched: 'मिलान', review: 'समीक्षा', failed: 'विफल', date: 'तिथि', description: 'विवरण', high: 'उच्च', medium: 'मध्यम', low: 'निम्न' },
};

const mockTransactions = [
  { id: '1', bankRef: 'BNK-2026-4521', date: '2026-03-12', description: 'Saudi Tech Corp Payment', amount: 185000, matchedTo: 'INV-1042', confidence: 98, status: 'matched' as const },
  { id: '2', bankRef: 'BNK-2026-4522', date: '2026-03-12', description: 'Gulf Ind Transfer', amount: 52300, matchedTo: 'INV-1038', confidence: 87, status: 'matched' as const },
  { id: '3', bankRef: 'BNK-2026-4523', date: '2026-03-11', description: 'Vision Ent Payment', amount: 23500, matchedTo: 'INV-1035?', confidence: 62, status: 'review' as const },
  { id: '4', bankRef: 'BNK-2026-4524', date: '2026-03-11', description: 'Unknown Transfer', amount: 8750, matchedTo: '', confidence: 0, status: 'failed' as const },
  { id: '5', bankRef: 'BNK-2026-4525', date: '2026-03-10', description: 'Desert Sol. Pmt', amount: 145000, matchedTo: 'INV-1029', confidence: 95, status: 'matched' as const },
];

export function AutoReconciliation() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;

  const matched = mockTransactions.filter(t => t.status === 'matched').length;
  const review = mockTransactions.filter(t => t.status === 'review').length;
  const failed = mockTransactions.filter(t => t.status === 'failed').length;
  const matchRate = Math.round(matched / mockTransactions.length * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">{l.title}</h3><p className="text-sm text-muted-foreground">{l.subtitle}</p></div>
        <Button size="sm" className="gap-1.5"><Brain className="h-3.5 w-3.5" />{l.runAI}</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">{l.matchRate}</p><p className="text-2xl font-bold text-success">{matchRate}%</p><Progress value={matchRate} className="h-1.5 mt-1" /></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /><span className="text-xs text-muted-foreground">{l.autoMatched}</span></div><p className="text-2xl font-bold">{matched}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><Clock className="h-3.5 w-3.5 text-warning" /><span className="text-xs text-muted-foreground">{l.manualReview}</span></div><p className="text-2xl font-bold text-warning">{review}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-muted-foreground">{l.unmatched}</span></div><p className="text-2xl font-bold text-destructive">{failed}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{l.bankRef}</TableHead><TableHead>{l.date}</TableHead><TableHead>{l.description}</TableHead>
              <TableHead>{l.amount}</TableHead><TableHead>{l.matchedTo}</TableHead><TableHead>{l.confidence}</TableHead><TableHead>{l.status}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {mockTransactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.bankRef}</TableCell>
                  <TableCell className="text-xs">{t.date}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className="font-semibold">{t.amount.toLocaleString()} SAR</TableCell>
                  <TableCell>{t.matchedTo ? <Badge variant="outline">{t.matchedTo}</Badge> : '-'}</TableCell>
                  <TableCell>
                    {t.confidence > 0 ? (
                      <div className="flex items-center gap-1">
                        <Progress value={t.confidence} className="h-1.5 w-12" />
                        <span className={`text-xs font-bold ${t.confidence >= 85 ? 'text-success' : t.confidence >= 60 ? 'text-warning' : 'text-destructive'}`}>{t.confidence}%</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'matched' ? 'default' : t.status === 'review' ? 'secondary' : 'destructive'}>
                      {t.status === 'matched' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : t.status === 'review' ? <Clock className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {l[t.status]}
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
