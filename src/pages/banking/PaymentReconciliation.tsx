import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBankStatements, useBankStatementLines, usePaymentReconciliations } from '@/hooks/useBanking';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Link2, CheckCircle, XCircle, Search, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentReconciliation() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [selectedStatement, setSelectedStatement] = useState<string>('');
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('');

  const { data: statements } = useBankStatements();
  const { data: lines, isLoading: linesLoading } = useBankStatementLines(selectedStatement || undefined);
  const { data: reconciliations, create: createRecon, confirm: confirmRecon } = usePaymentReconciliations(selectedStatement || undefined);

  // Get unreconciled incoming payments for matching
  const { data: payments } = useQuery({
    queryKey: ['unreconciled_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_payments')
        .select('*')
        .order('doc_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const unmatchedLines = (lines || []).filter(l => l.reconciliation_status === 'unmatched');
  const matchedLines = (lines || []).filter(l => l.reconciliation_status !== 'unmatched');
  const totalLines = (lines || []).length;
  const matchPercent = totalLines > 0 ? Math.round((matchedLines.length / totalLines) * 100) : 0;

  const openMatchDialog = (line: any) => {
  const { t } = useLanguage();

    setSelectedLine(line);
    setSelectedPayment('');
    setMatchDialogOpen(true);
  };

  const handleAutoMatch = () => {
    if (!lines || !payments) return;
    let matched = 0;

    unmatchedLines.forEach(line => {
      const amount = Number(line.credit_amount) > 0 ? Number(line.credit_amount) : Number(line.debit_amount);
      // Try to find a payment with matching amount
      const matchingPayment = payments.find(p =>
        Math.abs(Number(p.total_amount) - amount) < 0.01 &&
        !matchedLines.some(ml => ml.matched_payment_id === p.id)
      );

      if (matchingPayment) {
        createRecon.mutate({
          bank_statement_id: selectedStatement,
          statement_line_id: line.id,
          payment_id: matchingPayment.id,
          payment_type: 'incoming_payment',
          payment_reference: matchingPayment.doc_num?.toString(),
          statement_amount: amount,
          payment_amount: Number(matchingPayment.total_amount),
          match_type: 'auto',
          match_confidence: 95,
          status: 'pending',
        });
        matched++;
      }
    });

    toast({
      title: language === 'ar' ? 'المطابقة التلقائية' : 'Auto-Match Complete',
      description: `${matched} ${language === 'ar' ? 'سطور تم مطابقتها' : 'lines matched'}`,
    });
  };

  const handleManualMatch = () => {
    if (!selectedLine || !selectedPayment) return;
    const payment = payments?.find(p => p.id === selectedPayment);
    if (!payment) return;

    const amount = Number(selectedLine.credit_amount) > 0 ? Number(selectedLine.credit_amount) : Number(selectedLine.debit_amount);

    createRecon.mutate({
      bank_statement_id: selectedStatement,
      statement_line_id: selectedLine.id,
      payment_id: payment.id,
      payment_type: 'incoming_payment',
      payment_reference: payment.doc_num?.toString(),
      statement_amount: amount,
      payment_amount: Number(payment.total_amount),
      match_type: 'manual',
      match_confidence: 100,
      status: 'pending',
    }, { onSuccess: () => setMatchDialogOpen(false) });
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'مطابقة المدفوعات' : 'Payment Reconciliation'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'مطابقة كشوف البنك مع المدفوعات المسجلة' : 'Match bank statement lines to recorded payments'}</p>
        </div>
      </div>

      {/* Statement Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Label>{language === 'ar' ? 'اختر كشف البنك' : 'Select Bank Statement'}</Label>
              <Select value={selectedStatement} onValueChange={setSelectedStatement}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select statement...'} /></SelectTrigger>
                <SelectContent>
                  {(statements || []).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.statement_number} - {s.bank_name || s.bank_code} ({s.statement_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStatement && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <Label>{language === 'ar' ? 'نسبة المطابقة' : 'Match Progress'}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={matchPercent} className="flex-1" />
                    <span className="text-sm font-medium">{matchPercent}%</span>
                  </div>
                </div>
                <div className="pt-5">
                  <Button onClick={handleAutoMatch} disabled={unmatchedLines.length === 0}>
                    <Zap className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'مطابقة تلقائية' : 'Auto-Match'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedStatement && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{totalLines}</p><p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي السطور' : 'Total Lines'}</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{matchedLines.length}</p><p className="text-sm text-muted-foreground">{language === 'ar' ? 'مطابَقة' : 'Matched'}</p></CardContent></Card>
          <Card className="border-yellow-500"><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-yellow-600">{unmatchedLines.length}</p><p className="text-sm text-muted-foreground">{language === 'ar' ? 'غير مطابَقة' : 'Unmatched'}</p></CardContent></Card>
        </div>
      )}

      {selectedStatement && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Link2 className="h-5 w-5" /><CardTitle>{language === 'ar' ? 'سطور غير مطابقة' : 'Unmatched Lines'}</CardTitle></div>
              <Badge variant="destructive">{unmatchedLines.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {linesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
            ) : unmatchedLines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p>{language === 'ar' ? 'جميع السطور مطابَقة!' : 'All lines are matched!'}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الطرف المقابل' : 'Counterparty'}</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedLines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{l.line_num}</TableCell>
                        <TableCell>{l.transaction_date}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{l.description || l.reference || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${Number(l.credit_amount) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {Number(l.credit_amount) > 0 ? `+${Number(l.credit_amount).toLocaleString()}` : `-${Number(l.debit_amount).toLocaleString()}`}
                        </TableCell>
                        <TableCell>{l.counterparty_name || '-'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openMatchDialog(l)}>
                            <Link2 className="h-3 w-3 mr-1" />{language === 'ar' ? 'مطابقة' : 'Match'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reconciliation History */}
      {selectedStatement && (reconciliations || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{language === 'ar' ? 'سجل المطابقات' : 'Reconciliation Log'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المرجع' : 'Payment Ref'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'مبلغ الكشف' : 'Statement Amt'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'مبلغ الدفعة' : 'Payment Amt'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'الفرق' : 'Diff'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الثقة' : 'Confidence'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reconciliations || []).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.payment_reference || '-'}</TableCell>
                      <TableCell className="text-right">{Number(r.statement_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(r.payment_amount).toLocaleString()}</TableCell>
                      <TableCell className={`text-right ${Number(r.difference) !== 0 ? 'text-destructive' : 'text-green-600'}`}>{Number(r.difference).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.match_type}</Badge></TableCell>
                      <TableCell className="text-center">{r.match_confidence ? `${r.match_confidence}%` : '-'}</TableCell>
                      <TableCell className="text-center"><Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => confirmRecon.mutate(r.id)}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'مطابقة يدوية' : 'Manual Match'}</DialogTitle></DialogHeader>
          {selectedLine && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-3 pb-2">
                  <p className="text-sm font-medium">{language === 'ar' ? 'سطر الكشف' : 'Statement Line'}</p>
                  <p className="text-sm text-muted-foreground">{selectedLine.description || selectedLine.reference}</p>
                  <p className="text-lg font-bold mt-1">
                    {Number(selectedLine.credit_amount) > 0
                      ? `+${Number(selectedLine.credit_amount).toLocaleString()}`
                      : `-${Number(selectedLine.debit_amount).toLocaleString()}`
                    } SAR
                  </p>
                </CardContent>
              </Card>

              <div>
                <Label>{language === 'ar' ? 'اختر الدفعة المقابلة' : 'Select Matching Payment'}</Label>
                <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر دفعة...' : 'Select payment...'} /></SelectTrigger>
                  <SelectContent>
                    {(payments || []).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.doc_num} - {p.customer_name} - {Number(p.total_amount).toLocaleString()} {p.currency || 'SAR'} ({p.doc_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleManualMatch} disabled={!selectedPayment || createRecon.isPending}>
              {createRecon.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Link2 className="h-4 w-4 mr-2" />{language === 'ar' ? 'مطابقة' : 'Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
