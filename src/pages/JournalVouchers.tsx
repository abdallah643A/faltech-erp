import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJournalVouchers, JournalVoucher } from '@/hooks/useJournalVouchers';
import { useDimensions } from '@/hooks/useDimensions';
import type { JournalEntryLine } from '@/hooks/useJournalEntries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Trash2, Eye, Search, Send, Edit, XCircle, AlertTriangle, CheckCircle, Loader2, CheckCheck } from 'lucide-react';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface VoucherLine extends JournalEntryLine {
  line_type?: 'account' | 'bp';
}

export default function JournalVouchers() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const {
    vouchers, accounts, isLoading,
    createVoucher, updateVoucher, postVoucher, cancelVoucher, deleteVoucher, getVoucherLines,
  } = useJournalVouchers();

  const { activeDimensions: employees } = useDimensions('employees');
  const { activeDimensions: branches } = useDimensions('branches');
  const { activeDimensions: businessLines } = useDimensions('business_line');
  const { activeDimensions: factories } = useDimensions('factory');

  // Fetch business partners
  const { data: businessPartners = [] } = useQuery({
    queryKey: ['bp-for-vouchers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('card_code, card_name, card_type, balance')
        .order('card_code');
      if (error) throw error;
      return (data || []) as { card_code: string; card_name: string; card_type: string; balance: number | null }[];
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewVoucher, setViewVoucher] = useState<JournalVoucher | null>(null);
  const [viewLines, setViewLines] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [postingAll, setPostingAll] = useState(false);
  const [confirmPostAll, setConfirmPostAll] = useState(false);
  const [confirmPostId, setConfirmPostId] = useState<string | null>(null);

  // Form state
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<VoucherLine[]>([
    { line_num: 1, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
    { line_num: 2, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
  ]);

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const difference = totalDebit - totalCredit;

  const draftVouchers = vouchers.filter(v => v.status === 'draft');
  const balancedDraftVouchers = draftVouchers.filter(v => Math.abs(v.total_debit - v.total_credit) < 0.01);

  const addLine = () => {
    setLines([...lines, { line_num: lines.length + 1, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_num: i + 1 })));
  };

  // Build control account map for BPs: customer → AR control, vendor → AP control
  const bpControlAccountMap = useMemo(() => {
    const arAcct = accounts.find((a: any) => a.is_control_account && (a.acct_type === 'receivable' || a.acct_name?.toLowerCase().includes('receivable') || a.acct_name?.includes('مدينون') || a.acct_name?.includes('ذمم مدينة')));
    const apAcct = accounts.find((a: any) => a.is_control_account && (a.acct_type === 'payable' || a.acct_name?.toLowerCase().includes('payable') || a.acct_name?.includes('دائنون') || a.acct_name?.includes('ذمم دائنة')));
    return { customer: arAcct, vendor: apAcct, lead: arAcct };
  }, [accounts]);

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;

    if (field === 'line_type') {
      updated[idx].acct_code = '';
      updated[idx].acct_name = '';
      updated[idx].bp_code = '';
      updated[idx].bp_name = '';
    }

    if (field === 'acct_code' && updated[idx].line_type !== 'bp') {
      const acc = accounts.find((a: any) => a.acct_code === value);
      updated[idx].acct_name = acc?.acct_name || '';
    }

    if (field === 'bp_code' && updated[idx].line_type === 'bp') {
      const bp = businessPartners.find(b => b.card_code === value);
      if (bp) {
        updated[idx].bp_name = bp.card_name;
        const ctrlAcct = bpControlAccountMap[bp.card_type as keyof typeof bpControlAccountMap];
        if (ctrlAcct) {
          updated[idx].acct_code = ctrlAcct.acct_code;
          updated[idx].acct_name = ctrlAcct.acct_name;
        }
      }
    }

    setLines(updated);
  };

  const resetForm = () => {
    setPostingDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setReference('');
    setMemo('');
    setEditingId(null);
    setLines([
      { line_num: 1, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
      { line_num: 2, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
    ]);
  };

  const handleSubmit = () => {
    const validLines = lines.filter(l => l.acct_code && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) return;

    const payload = { posting_date: postingDate, due_date: dueDate || undefined, reference, memo, lines: validLines };

    if (editingId) {
      updateVoucher.mutate({ ...payload, id: editingId }, {
        onSuccess: () => { setShowForm(false); resetForm(); },
      });
    } else {
      createVoucher.mutate(payload, {
        onSuccess: () => { setShowForm(false); resetForm(); },
      });
    }
  };

  const handleView = async (v: JournalVoucher) => {
    setViewVoucher(v);
    const vLines = await getVoucherLines(v.id);
    setViewLines(vLines);
  };

  const handleEdit = async (v: JournalVoucher) => {
    const vLines = await getVoucherLines(v.id);
    setEditingId(v.id);
    setPostingDate(v.posting_date);
    setDueDate(v.due_date || '');
    setReference(v.reference || '');
    setMemo(v.memo || '');
    setLines(vLines.map((l: any) => ({
      line_num: l.line_num,
      acct_code: l.acct_code,
      acct_name: l.acct_name || '',
      debit: l.debit || 0,
      credit: l.credit || 0,
      bp_code: l.bp_code || '',
      bp_name: l.bp_name || '',
      cost_center: l.cost_center || '',
      project_code: l.project_code || '',
      dim_employee_id: l.dim_employee_id || null,
      dim_branch_id: l.dim_branch_id || null,
      dim_business_line_id: l.dim_business_line_id || null,
      dim_factory_id: l.dim_factory_id || null,
      remarks: l.remarks || '',
      line_type: l.bp_code ? 'bp' : 'account',
    })));
    setShowForm(true);
  };

  const handlePostAll = async () => {
    setConfirmPostAll(false);
    setPostingAll(true);
    let posted = 0;
    let failed = 0;
    for (const v of balancedDraftVouchers) {
      try {
        await postVoucher.mutateAsync(v.id);
        posted++;
      } catch {
        failed++;
      }
    }
    setPostingAll(false);
    toast({
      title: isAr ? 'ترحيل جماعي' : 'Bulk Post Complete',
      description: isAr
        ? `تم ترحيل ${posted} سند${failed > 0 ? `، فشل ${failed}` : ''}`
        : `${posted} vouchers posted${failed > 0 ? `, ${failed} failed` : ''}`,
    });
  };

  const handlePostSingle = (id: string) => {
    setConfirmPostId(null);
    postVoucher.mutate(id);
  };

  const filtered = vouchers.filter(v =>
    !searchQuery ||
    `JV-${v.doc_num}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.memo || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(v => v.id)));
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const statusBadge = (s: string, postedJeId: string | null) => {
    switch (s) {
      case 'posted':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><CheckCircle className="h-3 w-3" /> {isAr ? 'مرحّل' : 'Posted'}</Badge>;
      case 'draft':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">{isAr ? 'مسودة' : 'Draft'}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">{isAr ? 'ملغى' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isAr ? 'سندات القيد' : 'Journal Vouchers'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'إنشاء مسودات القيود ثم ترحيلها لقيود اليومية' : 'Create draft entries then post to Journal Entries'}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={vouchers}
            filename="journal-vouchers"
            title={isAr ? 'سندات القيد' : 'Journal Vouchers'}
            columns={[
              { key: 'doc_num', header: 'Doc#', width: 10 },
              { key: 'posting_date', header: 'Posting Date', width: 15 },
              { key: 'reference', header: 'Reference', width: 20 },
              { key: 'memo', header: 'Memo', width: 25 },
              { key: 'total_debit', header: 'Debit', width: 15 },
              { key: 'total_credit', header: 'Credit', width: 15 },
              { key: 'status', header: 'Status', width: 10 },
            ]}
            onImport={async (rows) => {
              for (const row of rows) {
                const debit = parseFloat(row['Debit']) || 0;
                const credit = parseFloat(row['Credit']) || 0;
                const acctCode = row['Account Code'] || row['acct_code'] || '';
                const acctName = accounts.find((a: any) => a.acct_code === acctCode)?.acct_name || '';
                if (acctCode && (debit > 0 || credit > 0)) {
                  await createVoucher.mutateAsync({
                    posting_date: row['Posting Date'] || new Date().toISOString().split('T')[0],
                    reference: row['Reference'] || '',
                    memo: row['Memo'] || '',
                    lines: [{ line_num: 1, acct_code: acctCode, acct_name: acctName, debit, credit, remarks: row['Remarks'] || '' }],
                  });
                }
              }
            }}
          />

          {balancedDraftVouchers.length > 0 && (
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1"
              onClick={() => setConfirmPostAll(true)}
              disabled={postingAll}
            >
              {postingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              {isAr ? `ترحيل الكل (${balancedDraftVouchers.length})` : `Post All (${balancedDraftVouchers.length})`}
            </Button>
          )}

          <ClearAllButton tableName="journal_vouchers" queryKeys={['journal-vouchers']} displayName={isAr ? 'سندات القيد' : 'Journal Vouchers'} relatedTables={['journal_voucher_lines']} />
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {isAr ? 'سند جديد' : 'New Voucher'}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={isAr ? 'بحث...' : 'Search vouchers...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-[80px]">{isAr ? 'رقم' : 'Doc#'}</TableHead>
                <TableHead>{isAr ? 'تاريخ الترحيل' : 'Posting Date'}</TableHead>
                <TableHead>{isAr ? 'المرجع' : 'Reference'}</TableHead>
                <TableHead>{isAr ? 'البيان' : 'Memo'}</TableHead>
                <TableHead className="text-right">{isAr ? 'مدين' : 'Debit'}</TableHead>
                <TableHead className="text-right">{isAr ? 'دائن' : 'Credit'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[160px]">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سندات' : 'No journal vouchers'}</TableCell></TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleView(v)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">JV-{v.doc_num}</TableCell>
                  <TableCell className="text-xs">{v.posting_date}</TableCell>
                  <TableCell className="text-xs">{v.reference || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{v.memo || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(v.total_debit)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(v.total_credit)}</TableCell>
                  <TableCell>{statusBadge(v.status, v.posted_je_id)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(v)} title={isAr ? 'عرض' : 'View'}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {v.status === 'draft' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(v)} title={isAr ? 'تعديل' : 'Edit'}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600"
                            onClick={() => setConfirmPostId(v.id)}
                            title={isAr ? 'ترحيل' : 'Post to JE'}
                            disabled={postVoucher.isPending || Math.abs(v.total_debit - v.total_credit) > 0.01}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => cancelVoucher.mutate(v.id)} title={isAr ? 'إلغاء' : 'Cancel'}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? (isAr ? 'تعديل سند القيد' : 'Edit Journal Voucher') : (isAr ? 'سند قيد جديد' : 'New Journal Voucher')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">{isAr ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                <Input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'المرجع' : 'Reference'}</Label>
                <Input value={reference} onChange={e => setReference(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'البيان' : 'Memo'}</Label>
                <Input value={memo} onChange={e => setMemo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead className="w-[90px]">{isAr ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="min-w-[180px]">{isAr ? 'حساب / شريك أعمال' : 'Account / BP'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'مدين' : 'Debit'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'دائن' : 'Credit'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'مركز تكلفة' : 'Cost Center'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'موظف' : 'Employee'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'فرع' : 'Branch'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'خط أعمال' : 'Biz Line'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'مصنع' : 'Factory'}</TableHead>
                    <TableHead className="w-[100px]">{isAr ? 'مشروع' : 'Project'}</TableHead>
                    <TableHead>{isAr ? 'ملاحظات' : 'Remarks'}</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{idx + 1}</TableCell>
                      {/* Line Type Toggle */}
                      <TableCell>
                        <Select value={line.line_type || 'account'} onValueChange={v => updateLine(idx, 'line_type', v)}>
                          <SelectTrigger className="h-8 text-xs w-[80px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account" className="text-xs">{isAr ? 'حساب' : 'Account'}</SelectItem>
                            <SelectItem value="bp" className="text-xs">{isAr ? 'شريك' : 'BP'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Account or BP selector */}
                      <TableCell>
                        {line.line_type === 'bp' ? (
                          <div className="space-y-1">
                            <Select value={line.bp_code || ''} onValueChange={v => updateLine(idx, 'bp_code', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'اختر شريك أعمال' : 'Select BP'} /></SelectTrigger>
                              <SelectContent>
                                {businessPartners.map(bp => (
                                  <SelectItem key={bp.card_code} value={bp.card_code} className="text-xs">
                                    {bp.card_code} - {bp.card_name}
                                    <span className="ml-1 text-muted-foreground">({bp.card_type === 'customer' ? 'C' : bp.card_type === 'vendor' ? 'V' : 'L'})</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {line.acct_code && (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                                  {isAr ? 'حساب مراقبة' : 'Control Acct'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground truncate" title={`${line.acct_code} - ${line.acct_name}`}>
                                  {line.acct_code} - {line.acct_name}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Select value={line.acct_code} onValueChange={v => updateLine(idx, 'acct_code', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'اختر حساب' : 'Select account'} /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a: any) => (
                                <SelectItem key={a.acct_code} value={a.acct_code} className="text-xs">{a.acct_code} - {a.acct_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" min={0} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" min={0} />
                      </TableCell>
                      <TableCell>
                        <Input value={line.cost_center || ''} onChange={e => updateLine(idx, 'cost_center', e.target.value)} className="h-8 text-xs" placeholder="-" />
                      </TableCell>
                      <TableCell>
                        <Select value={line.dim_employee_id || 'none'} onValueChange={v => updateLine(idx, 'dim_employee_id', v === 'none' ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {employees.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.cost_center}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.dim_branch_id || 'none'} onValueChange={v => updateLine(idx, 'dim_branch_id', v === 'none' ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {branches.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.cost_center}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.dim_business_line_id || 'none'} onValueChange={v => updateLine(idx, 'dim_business_line_id', v === 'none' ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {businessLines.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.cost_center}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.dim_factory_id || 'none'} onValueChange={v => updateLine(idx, 'dim_factory_id', v === 'none' ? null : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {factories.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.cost_center}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={line.project_code || ''} onChange={e => updateLine(idx, 'project_code', e.target.value)} className="h-8 text-xs" placeholder="-" />
                      </TableCell>
                      <TableCell>
                        <Input value={line.remarks || ''} onChange={e => updateLine(idx, 'remarks', e.target.value)} className="h-8 text-xs" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)} disabled={lines.length <= 2}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {isAr ? 'إضافة سطر' : 'Add Line'}
            </Button>

            {difference !== 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <span className="text-sm font-semibold text-destructive">
                  {isAr ? `السند غير متوازن بمبلغ ${formatCurrency(Math.abs(difference))} ريال` : `Voucher is out of balance by SAR ${formatCurrency(Math.abs(difference))}`}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
              <div className="flex gap-6 text-sm">
                <span>{isAr ? 'مدين' : 'Debit'}: <strong className="font-mono">{formatCurrency(totalDebit)}</strong></span>
                <span>{isAr ? 'دائن' : 'Credit'}: <strong className="font-mono">{formatCurrency(totalCredit)}</strong></span>
                {difference === 0 ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> {isAr ? 'متوازن' : 'Balanced'}
                  </span>
                ) : (
                  <span className="text-destructive font-semibold">
                    {isAr ? 'الفرق' : 'Diff'}: {formatCurrency(Math.abs(difference))}
                  </span>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={createVoucher.isPending || updateVoucher.isPending} size="sm">
                {editingId ? (isAr ? 'تحديث' : 'Update Voucher') : (isAr ? 'حفظ مسودة' : 'Save Draft')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewVoucher} onOpenChange={() => setViewVoucher(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              JV-{viewVoucher?.doc_num}
              {viewVoucher && statusBadge(viewVoucher.status, viewVoucher.posted_je_id)}
              {viewVoucher?.posted_je_id && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                  → JE
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">{isAr ? 'تاريخ الترحيل' : 'Posting Date'}:</span> <strong>{viewVoucher.posting_date}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'المرجع' : 'Reference'}:</span> <strong>{viewVoucher.reference || '-'}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'البيان' : 'Memo'}:</span> <strong>{viewVoucher.memo || '-'}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'المزامنة' : 'SAP Sync'}:</span> <strong>{viewVoucher.sap_doc_entry || 'Not synced'}</strong></div>
              </div>

              {viewVoucher.status === 'draft' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setViewVoucher(null); handleEdit(viewVoucher); }}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> {isAr ? 'تعديل' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewVoucher(null); setConfirmPostId(viewVoucher.id); }} disabled={postVoucher.isPending || Math.abs(viewVoucher.total_debit - viewVoucher.total_credit) > 0.01}>
                    <Send className="h-3.5 w-3.5 mr-1" /> {isAr ? 'ترحيل لقيد يومية' : 'Post to Journal Entry'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { cancelVoucher.mutate(viewVoucher.id); setViewVoucher(null); }}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{isAr ? 'كود الحساب' : 'Account Code'}</TableHead>
                      <TableHead>{isAr ? 'اسم الحساب' : 'Account Name'}</TableHead>
                      <TableHead>{isAr ? 'شريك أعمال' : 'BP'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'مدين' : 'Debit'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'دائن' : 'Credit'}</TableHead>
                      <TableHead>{isAr ? 'مركز تكلفة' : 'Cost Center'}</TableHead>
                      <TableHead>{isAr ? 'مشروع' : 'Project'}</TableHead>
                      <TableHead>{isAr ? 'ملاحظات' : 'Remarks'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewLines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs">{line.line_num}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{line.bp_code ? (isAr ? 'شريك' : 'BP') : (isAr ? 'حساب' : 'Acct')}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{line.acct_code}</TableCell>
                        <TableCell className="text-xs">{line.acct_name}</TableCell>
                        <TableCell className="text-xs">{line.bp_code ? `${line.bp_code} - ${line.bp_name || ''}` : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(line.debit)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(line.credit)}</TableCell>
                        <TableCell className="text-xs">{line.cost_center || '-'}</TableCell>
                        <TableCell className="text-xs">{line.project_code || '-'}</TableCell>
                        <TableCell className="text-xs">{line.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={5} className="text-xs text-right">{isAr ? 'الإجمالي' : 'Total'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(viewVoucher.total_debit)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(viewVoucher.total_credit)}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Post Single */}
      <AlertDialog open={!!confirmPostId} onOpenChange={() => setConfirmPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'تأكيد الترحيل' : 'Confirm Post to Journal Entry'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? 'سيتم إنشاء قيد يومية من هذا السند. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟'
                : 'This will create a Journal Entry from this voucher. This action cannot be undone. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePostSingle(confirmPostId!)}>
              <Send className="h-4 w-4 mr-1" /> {isAr ? 'ترحيل' : 'Post'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Post All */}
      <AlertDialog open={confirmPostAll} onOpenChange={setConfirmPostAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'ترحيل جميع السندات' : 'Post All Vouchers'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `سيتم ترحيل ${balancedDraftVouchers.length} سند مسودة متوازن إلى قيود يومية. لا يمكن التراجع. هل تريد المتابعة؟`
                : `This will post ${balancedDraftVouchers.length} balanced draft voucher(s) to Journal Entries. This cannot be undone. Continue?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePostAll}>
              <CheckCheck className="h-4 w-4 mr-1" /> {isAr ? 'ترحيل الكل' : 'Post All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
