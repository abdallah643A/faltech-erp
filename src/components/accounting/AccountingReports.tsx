import { useState, useMemo } from 'react';
import { useAccountingDetermination } from '@/hooks/useAccountingDetermination';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3, AlertTriangle, ArrowRight, Shield, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ACCOUNT_TYPE_LABELS } from '@/services/sapPostingEngine';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AccountingReports() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { rules, exceptions, auditLog, postingRuns } = useAccountingDetermination();
  const { postingLogs, rules: advRules } = useGLAdvancedRules();

  // Rule Usage
  const ruleUsage = useMemo(() => {
    const map: Record<string, { name: string; count: number; lastUsed: string }> = {};
    postingLogs.forEach((l: any) => {
      const ruleId = l.matched_rule_id || 'default';
      const ruleName = ruleId === 'default' ? 'Default GL Determination' : (advRules.find((r: any) => r.id === ruleId)?.rule_name || ruleId);
      if (!map[ruleId]) map[ruleId] = { name: ruleName, count: 0, lastUsed: '' };
      map[ruleId].count++;
      if (!map[ruleId].lastUsed || l.created_at > map[ruleId].lastUsed) map[ruleId].lastUsed = l.created_at;
    });
    return Object.entries(map).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count);
  }, [postingLogs, advRules]);

  // Doc type summary
  const docTypeSummary = useMemo(() => {
    const map: Record<string, { posted: number; failed: number; totalDebit: number; totalCredit: number }> = {};
    postingLogs.forEach((l: any) => {
      const t = l.document_type || 'unknown';
      if (!map[t]) map[t] = { posted: 0, failed: 0, totalDebit: 0, totalCredit: 0 };
      if (l.status === 'posted') {
        map[t].posted++;
        map[t].totalDebit += Number(l.total_debit) || 0;
        map[t].totalCredit += Number(l.total_credit) || 0;
      } else map[t].failed++;
    });
    return Object.entries(map).map(([docType, data]) => ({ docType, ...data })).sort((a, b) => b.posted - a.posted);
  }, [postingLogs]);

  // Error types
  const errorTypes = useMemo(() => {
    const map: Record<string, number> = {};
    exceptions.forEach((e: any) => {
      map[e.error_type] = (map[e.error_type] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [exceptions]);

  return (
    <Tabs defaultValue="posting_log" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="posting_log" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> {isAr ? 'سجل الترحيل' : 'Posting Log'}</TabsTrigger>
        <TabsTrigger value="rule_usage" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> {isAr ? 'استخدام القواعد' : 'Rule Usage'}</TabsTrigger>
        <TabsTrigger value="doc_summary" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> {isAr ? 'ملخص حسب نوع المستند' : 'By Doc Type'}</TabsTrigger>
        <TabsTrigger value="failed_report" className="text-xs gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {isAr ? 'تقرير الأخطاء' : 'Failed Postings'}</TabsTrigger>
        <TabsTrigger value="audit" className="text-xs gap-1"><Shield className="h-3.5 w-3.5" /> {isAr ? 'سجل التدقيق' : 'Audit Trail'}</TabsTrigger>
      </TabsList>

      {/* Posting Log */}
      <TabsContent value="posting_log">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'سجل الترحيل التلقائي' : 'Auto Journal Posting Log'}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'نوع المستند' : 'Doc Type'}</TableHead>
                  <TableHead>{isAr ? 'الرقم' : 'Doc #'}</TableHead>
                  <TableHead>{isAr ? 'مصدر الحساب' : 'Account Source'}</TableHead>
                  <TableHead>{isAr ? 'مدين' : 'Debit'}</TableHead>
                  <TableHead>{isAr ? 'دائن' : 'Credit'}</TableHead>
                  <TableHead>{isAr ? 'متوازن' : 'Balanced'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postingLogs.slice(0, 50).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant={l.status === 'posted' ? 'default' : 'destructive'} className="text-xs">{l.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.document_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{l.document_number || '-'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{l.account_source || 'default'}</Badge></TableCell>
                    <TableCell className="font-mono">{Number(l.total_debit).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{Number(l.total_credit).toFixed(2)}</TableCell>
                    <TableCell>{l.is_balanced ? '✓' : '✗'}</TableCell>
                    <TableCell className="text-xs">{l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd HH:mm') : ''}</TableCell>
                  </TableRow>
                ))}
                {postingLogs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No posting logs</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Rule Usage */}
      <TabsContent value="rule_usage">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'تقرير استخدام القواعد' : 'Rule Usage Report'}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'القاعدة' : 'Rule'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'عدد الاستخدامات' : 'Usage Count'}</TableHead>
                  <TableHead>{isAr ? 'آخر استخدام' : 'Last Used'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ruleUsage.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right font-mono">{r.count}</TableCell>
                    <TableCell className="text-xs">{r.lastUsed ? format(new Date(r.lastUsed), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                  </TableRow>
                ))}
                {ruleUsage.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Doc Type Summary */}
      <TabsContent value="doc_summary">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'ملخص الترحيل حسب نوع المستند' : 'Period Posting Summary by Document Type'}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'نوع المستند' : 'Document Type'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'ناجح' : 'Posted'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'فشل' : 'Failed'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'إجمالي مدين' : 'Total Debit'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'إجمالي دائن' : 'Total Credit'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docTypeSummary.map(d => (
                  <TableRow key={d.docType}>
                    <TableCell><Badge variant="outline" className="text-xs">{d.docType.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{d.posted}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{d.failed || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{d.totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{d.totalCredit.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {docTypeSummary.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Failed Postings */}
      <TabsContent value="failed_report">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'تقرير الترحيلات الفاشلة' : 'Failed Posting Report'}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'نوع الخطأ' : 'Error Type'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'العدد' : 'Count'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorTypes.map(e => (
                  <TableRow key={e.type}>
                    <TableCell><Badge variant="destructive" className="text-xs">{e.type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{e.count}</TableCell>
                  </TableRow>
                ))}
                {errorTypes.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No errors</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Audit Trail */}
      <TabsContent value="audit">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'سجل التدقيق' : 'Rule Change Audit Trail'}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'الإجراء' : 'Action'}</TableHead>
                  <TableHead>{isAr ? 'بواسطة' : 'Changed By'}</TableHead>
                  <TableHead>{isAr ? 'الحقول' : 'Changed Fields'}</TableHead>
                  <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell><Badge variant="outline" className="text-xs">{entry.action}</Badge></TableCell>
                    <TableCell className="text-sm">{entry.changed_by_name || 'System'}</TableCell>
                    <TableCell className="text-xs">{entry.changed_fields?.join(', ') || '-'}</TableCell>
                    <TableCell className="text-xs">{entry.created_at ? format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm') : ''}</TableCell>
                  </TableRow>
                ))}
                {auditLog.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No audit records</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
