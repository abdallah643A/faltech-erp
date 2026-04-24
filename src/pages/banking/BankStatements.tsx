import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBankStatements, useBankStatementLines } from '@/hooks/useBanking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Loader2, FileText, Eye, Upload, CheckCircle, XCircle, Clock, Trash2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const emptyLine = {

  transaction_date: new Date().toISOString().split('T')[0],
  reference: '',
  description: '',
  debit_amount: '0',
  credit_amount: '0',
  balance_after: '0',
};

export default function BankStatements() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lineForm, setLineForm] = useState(emptyLine);
  const [pendingLines, setPendingLines] = useState<any[]>([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [form, setForm] = useState({
    statement_number: '', bank_code: '', bank_name: '', account_number: '', currency: 'SAR',
    statement_date: new Date().toISOString().split('T')[0], opening_balance: '0', closing_balance: '0', notes: '',
  });

  const { data: statements, isLoading, create } = useBankStatements();
  const { data: lines, isLoading: linesLoading, createMany } = useBankStatementLines(detailId || undefined);

  const filtered = (statements || []).filter(s =>
    s.statement_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.account_number?.includes(searchQuery)
  );

  const handleCreate = () => {
    create.mutate({
      ...form,
      opening_balance: Number(form.opening_balance),
      closing_balance: Number(form.closing_balance),
    }, { onSuccess: () => setDialogOpen(false) });
  };

  const handleAddLine = () => {
    if (!detailId) return;
    const nextNum = (lines || []).length + 1;
    createMany.mutate([{
      statement_id: detailId,
      line_num: nextNum,
      transaction_date: lineForm.transaction_date,
      reference: lineForm.reference || null,
      description: lineForm.description || null,
      debit_amount: Number(lineForm.debit_amount) || 0,
      credit_amount: Number(lineForm.credit_amount) || 0,
      balance_after: Number(lineForm.balance_after) || 0,
      reconciliation_status: 'unmatched',
    }], {
      onSuccess: () => {
        setLineDialogOpen(false);
        setLineForm(emptyLine);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          toast({ title: 'Empty file', description: 'No data found in the uploaded file', variant: 'destructive' });
          return;
        }

        // Map common column names
        const mapped = rows.map((row, idx) => {
          const date = row['Date'] || row['date'] || row['Transaction Date'] || row['transaction_date'] || row['ValueDate'] || '';
          const ref = row['Reference'] || row['reference'] || row['Ref'] || row['ref'] || row['Check No'] || '';
          const desc = row['Description'] || row['description'] || row['Narrative'] || row['Details'] || row['Particulars'] || '';
          const debit = Number(row['Debit'] || row['debit'] || row['Debit Amount'] || row['debit_amount'] || row['Withdrawal'] || 0);
          const credit = Number(row['Credit'] || row['credit'] || row['Credit Amount'] || row['credit_amount'] || row['Deposit'] || 0);
          const balance = Number(row['Balance'] || row['balance'] || row['Balance After'] || row['balance_after'] || row['Running Balance'] || 0);

          return {
            line_num: idx + 1,
            transaction_date: date ? String(date).substring(0, 10) : new Date().toISOString().split('T')[0],
            reference: String(ref),
            description: String(desc),
            debit_amount: debit,
            credit_amount: credit,
            balance_after: balance,
          };
        });

        setPendingLines(mapped);
        setImportPreviewOpen(true);
      } catch (err: any) {
        toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!detailId || pendingLines.length === 0) return;
    const existingCount = (lines || []).length;
    const linesToInsert = pendingLines.map((l, i) => ({
      statement_id: detailId,
      line_num: existingCount + i + 1,
      transaction_date: l.transaction_date,
      reference: l.reference || null,
      description: l.description || null,
      debit_amount: l.debit_amount || 0,
      credit_amount: l.credit_amount || 0,
      balance_after: l.balance_after || 0,
      reconciliation_status: 'unmatched',
    }));

    createMany.mutate(linesToInsert, {
      onSuccess: () => {
        setImportPreviewOpen(false);
        setPendingLines([]);
        toast({ title: `${linesToInsert.length} lines imported successfully` });
      }
    });
  };

  const removePendingLine = (idx: number) => {
    setPendingLines(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_num: i + 1 })));
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'reconciled': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Upload className="h-4 w-4 text-blue-500" />;
    }
  };

  const reconStatusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case 'matched': return 'default';
      case 'partially_matched': return 'secondary';
      case 'manual': return 'outline';
      default: return 'destructive';
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'كشوف البنك' : 'Bank Statements'}</h1>
          <p className="text-muted-foreground">{language === 'ar' ? 'استيراد ومطابقة كشوف الحسابات البنكية (OBNK)' : 'Import & reconcile bank account statements (OBNK)'}</p>
        </div>
        <Button onClick={() => { setForm({ statement_number: '', bank_code: '', bank_name: '', account_number: '', currency: 'SAR', statement_date: new Date().toISOString().split('T')[0], opening_balance: '0', closing_balance: '0', notes: '' }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />{language === 'ar' ? 'كشف جديد' : 'New Statement'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: language === 'ar' ? 'إجمالي الكشوف' : 'Total Statements', value: (statements || []).length },
          { label: language === 'ar' ? 'مستوردة' : 'Imported', value: (statements || []).filter(s => s.status === 'imported').length },
          { label: language === 'ar' ? 'قيد المطابقة' : 'In Progress', value: (statements || []).filter(s => s.status === 'in_progress').length },
          { label: language === 'ar' ? 'مطابَقة' : 'Reconciled', value: (statements || []).filter(s => s.status === 'reconciled').length },
        ].map((c, i) => (
          <Card key={i}><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-muted-foreground">{c.label}</p></CardContent></Card>
        ))}
      </div>

      <Tabs value={detailId ? 'detail' : 'list'} onValueChange={v => { if (v === 'list') setDetailId(null); }}>
        <TabsList>
          <TabsTrigger value="list">{language === 'ar' ? 'قائمة الكشوف' : 'Statements List'}</TabsTrigger>
          {detailId && <TabsTrigger value="detail">{language === 'ar' ? 'تفاصيل الكشف' : 'Statement Details'}</TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><FileText className="h-5 w-5" /><CardTitle>{language === 'ar' ? 'كشوف البنك' : 'Bank Statements'}</CardTitle></div>
                <Badge variant="secondary">{filtered.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد كشوف' : 'No bank statements yet.'}</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'رقم الكشف' : 'Statement #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'البنك' : 'Bank'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحساب' : 'Account'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'الرصيد الختامي' : 'Closing'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono">{s.statement_number}</TableCell>
                          <TableCell>{s.bank_name || s.bank_code || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{s.account_number || '-'}</TableCell>
                          <TableCell>{s.statement_date}</TableCell>
                          <TableCell className="text-right">{Number(s.opening_balance).toLocaleString()} {s.currency}</TableCell>
                          <TableCell className="text-right font-medium">{Number(s.closing_balance).toLocaleString()} {s.currency}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {statusIcon(s.status)}
                              <Badge variant={s.status === 'reconciled' ? 'default' : 'secondary'}>{s.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(s.id)}>
                              <Eye className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{language === 'ar' ? 'سطور الكشف' : 'Statement Lines'}</CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'استيراد Excel' : 'Import Excel'}
                  </Button>
                  <Button size="sm" onClick={() => { setLineForm(emptyLine); setLineDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة سطر' : 'Add Line'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDetailId(null)}>
                    {language === 'ar' ? 'عودة' : 'Back'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {linesLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>
              ) : (lines || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="font-medium">{language === 'ar' ? 'لا توجد سطور بعد' : 'No statement lines yet'}</p>
                  <p className="text-sm">{language === 'ar' ? 'قم باستيراد ملف Excel أو أضف السطور يدوياً' : 'Import an Excel file or add lines manually'}</p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'استيراد من Excel' : 'Import from Excel'}
                    </Button>
                    <Button onClick={() => { setLineForm(emptyLine); setLineDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'إضافة سطر يدوي' : 'Add Manual Line'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المرجع' : 'Reference'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'المطابقة' : 'Match'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(lines || []).map(l => (
                        <TableRow key={l.id}>
                          <TableCell>{l.line_num}</TableCell>
                          <TableCell>{l.transaction_date}</TableCell>
                          <TableCell className="font-mono text-sm">{l.reference || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{l.description || '-'}</TableCell>
                          <TableCell className="text-right text-destructive">{Number(l.debit_amount) > 0 ? Number(l.debit_amount).toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-right text-green-600">{Number(l.credit_amount) > 0 ? Number(l.credit_amount).toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-right font-medium">{l.balance_after != null ? Number(l.balance_after).toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-center"><Badge variant={reconStatusColor(l.reconciliation_status)}>{l.reconciliation_status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Statement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'كشف بنك جديد' : 'New Bank Statement'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{language === 'ar' ? 'رقم الكشف' : 'Statement No.'}</Label><Input value={form.statement_number} onChange={e => setForm({ ...form, statement_number: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label><Input type="date" value={form.statement_date} onChange={e => setForm({ ...form, statement_date: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'رمز البنك' : 'Bank Code'}</Label><Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'اسم البنك' : 'Bank Name'}</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'رقم الحساب' : 'Account No.'}</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
            <div>
              <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</Label><Input type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الرصيد الختامي' : 'Closing Balance'}</Label><Input type="number" value={form.closing_balance} onChange={e => setForm({ ...form, closing_balance: e.target.value })} /></div>
            <div className="col-span-2"><Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreate} disabled={!form.statement_number || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Line Dialog */}
      <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة سطر جديد' : 'Add Statement Line'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
              <Input type="date" value={lineForm.transaction_date} onChange={e => setLineForm({ ...lineForm, transaction_date: e.target.value })} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'المرجع' : 'Reference'}</Label>
              <Input value={lineForm.reference} onChange={e => setLineForm({ ...lineForm, reference: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Input value={lineForm.description} onChange={e => setLineForm({ ...lineForm, description: e.target.value })} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'مدين (سحب)' : 'Debit (Withdrawal)'}</Label>
              <Input type="number" value={lineForm.debit_amount} onChange={e => setLineForm({ ...lineForm, debit_amount: e.target.value })} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'دائن (إيداع)' : 'Credit (Deposit)'}</Label>
              <Input type="number" value={lineForm.credit_amount} onChange={e => setLineForm({ ...lineForm, credit_amount: e.target.value })} />
            </div>
            <div>
              <Label>{language === 'ar' ? 'الرصيد بعد' : 'Balance After'}</Label>
              <Input type="number" value={lineForm.balance_after} onChange={e => setLineForm({ ...lineForm, balance_after: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLineDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleAddLine} disabled={createMany.isPending}>
              {createMany.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? `معاينة الاستيراد — ${pendingLines.length} سطر` : `Import Preview — ${pendingLines.length} lines`}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المرجع' : 'Reference'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.line_num}</TableCell>
                    <TableCell>{l.transaction_date}</TableCell>
                    <TableCell className="font-mono text-xs">{l.reference || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{l.description || '-'}</TableCell>
                    <TableCell className="text-right text-destructive">{l.debit_amount > 0 ? Number(l.debit_amount).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right text-green-600">{l.credit_amount > 0 ? Number(l.credit_amount).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">{l.balance_after ? Number(l.balance_after).toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePendingLine(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {language === 'ar'
                ? `المجاميع: مدين ${pendingLines.reduce((s, l) => s + (l.debit_amount || 0), 0).toLocaleString()} / دائن ${pendingLines.reduce((s, l) => s + (l.credit_amount || 0), 0).toLocaleString()}`
                : `Totals: Debit ${pendingLines.reduce((s, l) => s + (l.debit_amount || 0), 0).toLocaleString()} / Credit ${pendingLines.reduce((s, l) => s + (l.credit_amount || 0), 0).toLocaleString()}`
              }
            </span>
            <span className="text-xs">
              {language === 'ar' ? 'تأكد من صحة البيانات قبل الاستيراد' : 'Verify data before importing'}
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportPreviewOpen(false); setPendingLines([]); }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleConfirmImport} disabled={createMany.isPending || pendingLines.length === 0}>
              {createMany.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? `استيراد ${pendingLines.length} سطر` : `Import ${pendingLines.length} Lines`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
