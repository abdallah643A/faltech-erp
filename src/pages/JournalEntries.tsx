import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJournalEntries, JournalEntryLine } from '@/hooks/useJournalEntries';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { useDimensions } from '@/hooks/useDimensions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import {
  BookOpen, Plus, RotateCcw, Trash2, Eye, Search, AlertTriangle, CheckCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Cloud, CloudOff, Loader2,
} from 'lucide-react';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { AccountingValidationPanel } from '@/components/accounting/AccountingValidationPanel';
import { useSAPSync } from '@/hooks/useSAPSync';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

type SortField = 'doc_num' | 'posting_date' | 'reference' | 'memo' | 'total_debit' | 'total_credit' | 'status' | 'sync_status';
type SortDir = 'asc' | 'desc' | null;

export default function JournalEntries() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const {
    entries, accounts, isLoading,
    createEntry, reverseEntry, getEntryLines,
  } = useJournalEntries();
  const { businessPartners } = useBusinessPartners();
  const { sync: sapSync, isLoading: isSyncingRow } = useSAPSync();

  const { activeDimensions: employees } = useDimensions('employees');
  const { activeDimensions: branches } = useDimensions('branches');
  const { activeDimensions: businessLines } = useDimensions('business_line');
  const { activeDimensions: factories } = useDimensions('factory');

  const [showForm, setShowForm] = useState(false);
  const [viewEntry, setViewEntry] = useState<any>(null);
  const [viewLines, setViewLines] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [syncingEntryId, setSyncingEntryId] = useState<string | null>(null);

  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('');

  type LineType = 'account' | 'bp';
  interface ExtendedLine extends JournalEntryLine {
    line_type?: LineType;
  }
  const [lines, setLines] = useState<ExtendedLine[]>([
    { line_num: 1, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
    { line_num: 2, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
  ]);

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const difference = totalDebit - totalCredit;

  // Filter accounts: exclude title accounts (that have children) and control accounts
  const parentCodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) {
      if ((a as any).father_acct_code) set.add((a as any).father_acct_code);
    }
    return set;
  }, [accounts]);

  const jeAccounts = useMemo(() => {
    return accounts.filter((a: any) => {
      // Exclude title accounts (accounts that are parents of other accounts)
      if (parentCodes.has(a.acct_code)) return false;
      // Exclude control accounts
      if (a.is_control_account) return false;
      // Exclude inactive accounts
      if (a.is_active === false) return false;
      return true;
    });
  }, [accounts, parentCodes]);

  // Build a map of acct_code -> control account info
  const controlAccountMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      if ((a as any).is_control_account && (a as any).father_acct_code) {
        // Find children of this control account
      }
    }
    // For each non-control account, find its nearest ancestor that is a control account
    const codeToAccount = new Map<string, any>();
    for (const a of accounts) codeToAccount.set(a.acct_code, a);

    for (const a of accounts) {
      let parent = (a as any).father_acct_code;
      while (parent) {
        const p = codeToAccount.get(parent);
        if (p?.is_control_account) {
          map.set(a.acct_code, `${p.acct_code} - ${p.acct_name}`);
          break;
        }
        parent = p?.father_acct_code;
      }
    }
    return map;
  }, [accounts]);

  // Build control account map for BPs: customer → AR control, vendor → AP control
  const bpControlAccountMap = useMemo(() => {
    const arAcct = accounts.find((a: any) => a.is_control_account && (a.acct_type === 'receivable' || a.acct_name?.toLowerCase().includes('receivable') || a.acct_name?.includes('مدينون') || a.acct_name?.includes('ذمم مدينة')));
    const apAcct = accounts.find((a: any) => a.is_control_account && (a.acct_type === 'payable' || a.acct_name?.toLowerCase().includes('payable') || a.acct_name?.includes('دائنون') || a.acct_name?.includes('ذمم دائنة')));
    return { customer: arAcct, vendor: apAcct, lead: arAcct };
  }, [accounts]);

  const addLine = () => {
    setLines([...lines, { line_num: lines.length + 1, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_num: i + 1 })));
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === 'acct_code') {
      const acc = accounts.find((a: any) => a.acct_code === value);
      updated[idx].acct_name = acc?.acct_name || '';
    }
    if (field === 'line_type') {
      // Reset account/bp when switching type
      updated[idx].acct_code = '';
      updated[idx].acct_name = '';
      updated[idx].bp_code = '';
      updated[idx].bp_name = '';
    }
    if (field === 'bp_code' && updated[idx].line_type === 'bp') {
      const bp = businessPartners.find(b => b.card_code === value);
      if (bp) {
        updated[idx].bp_name = bp.card_name;
        // Auto-set control account based on BP type
        const ctrlAcct = bpControlAccountMap[bp.card_type as keyof typeof bpControlAccountMap];
        if (ctrlAcct) {
          updated[idx].acct_code = ctrlAcct.acct_code;
          updated[idx].acct_name = ctrlAcct.acct_name;
        }
      }
    }
    setLines(updated);
  };

  const handleImportJELines = async (rows: any[]) => {
    const importedLines: ExtendedLine[] = rows.map((row, i) => {
      const bpCode = row['BP Code'] || row.bp_code || '';
      const bp = bpCode ? businessPartners.find(b => b.card_code === bpCode) : null;
      let acctCode = row['Account'] || row.acct_code || '';
      let acctName = row['Account Name'] || row.acct_name || '';
      let lineType: LineType = 'account';

      if (bp) {
        lineType = 'bp';
        const ctrlAcct = bpControlAccountMap[bp.card_type as keyof typeof bpControlAccountMap];
        if (ctrlAcct) {
          acctCode = ctrlAcct.acct_code;
          acctName = ctrlAcct.acct_name;
        }
      } else if (acctCode) {
        const acc = accounts.find((a: any) => a.acct_code === acctCode);
        if (acc) acctName = acc.acct_name;
      }

      return {
        line_num: i + 1,
        line_type: lineType,
        acct_code: acctCode,
        acct_name: acctName,
        debit: Number(row['Debit'] || row.debit || 0),
        credit: Number(row['Credit'] || row.credit || 0),
        bp_code: bpCode,
        bp_name: bp?.card_name || row['BP Name'] || row.bp_name || '',
        cost_center: row['Cost Center'] || row.cost_center || '',
        project_code: row['Project'] || row.project_code || '',
        remarks: row['Remarks'] || row.remarks || '',
      };
    });
    if (importedLines.length > 0) {
      setLines(importedLines);
      setShowForm(true);
      toast({ title: isAr ? 'تم استيراد السطور' : 'Lines Imported', description: `${importedLines.length} ${isAr ? 'سطر' : 'lines'}` });
    }
  };

  const handleSubmit = () => {
    const validLines = lines.filter(l => l.acct_code && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) return;
    createEntry.mutate({
      posting_date: postingDate,
      due_date: dueDate || undefined,
      reference,
      memo,
      lines: validLines,
    }, {
      onSuccess: () => {
        setShowForm(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setPostingDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setReference('');
    setMemo('');
    setLines([
      { line_num: 1, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
      { line_num: 2, acct_code: '', acct_name: '', debit: 0, credit: 0, remarks: '', line_type: 'account' },
    ]);
  };

  const handleView = async (entry: any) => {
    setViewEntry(entry);
    const entryLines = await getEntryLines(entry.id);
    setViewLines(entryLines);
  };

  const handleSyncSingleEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncingEntryId(entryId);
    try {
      await sapSync('journal_entry', 'to_sap', entryId);
    } finally {
      setSyncingEntryId(null);
    }
  };

  const handleColumnSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortField(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }, [sortField, sortDir]);

  const syncStatusColor = (s: string | null) => {
    switch (s) {
      case 'synced': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'error': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filtered = useMemo(() => {
    let result = entries.filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = `JE-${e.doc_num}`.toLowerCase().includes(q) ||
          (e.reference || '').toLowerCase().includes(q) ||
          (e.memo || '').toLowerCase().includes(q) ||
          (e.sap_doc_entry || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (syncFilter === 'synced' && e.sync_status !== 'synced') return false;
      if (syncFilter === 'pending' && e.sync_status !== 'pending' && e.sync_status !== null) return false;
      if (syncFilter === 'not_synced' && e.sap_doc_entry) return false;
      if (syncFilter === 'error' && e.sync_status !== 'error') return false;
      return true;
    });

    if (sortField && sortDir) {
      result = [...result].sort((a, b) => {
        let aVal: any = (a as any)[sortField];
        let bVal: any = (b as any)[sortField];
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [entries, searchQuery, statusFilter, syncFilter, sortField, sortDir]);

  const {
    paginatedItems: paginatedEntries,
    currentPage,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filtered, 50);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    return <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none ${className || ''}`}
      onDoubleClick={() => handleColumnSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const statusColor = (s: string) => {
    switch (s) {
      case 'posted': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'draft': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'reversed': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {isAr ? 'قيود اليومية' : 'Journal Entries'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'إنشاء وإدارة القيود المحاسبية' : 'Create and manage accounting journal entries'}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={entries}
            filename="journal-entries"
            title="Journal Entries"
            columns={[
              { key: 'doc_num', header: 'Doc#' },
              { key: 'posting_date', header: 'Posting Date' },
              { key: 'reference', header: 'Reference' },
              { key: 'memo', header: 'Memo' },
              { key: 'total_debit', header: 'Debit' },
              { key: 'total_credit', header: 'Credit' },
              { key: 'status', header: 'Status' },
            ]}
            onImport={handleImportJELines}
          />
          <SAPSyncButton entity="journal_entry" />
          <ClearAllButton tableName="journal_entries" queryKeys={['journal-entries']} displayName={isAr ? 'قيود اليومية' : 'Journal Entries'} relatedTables={['journal_entry_lines']} />
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {isAr ? 'قيد جديد' : 'New Entry'}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isAr ? 'بحث...' : 'Search entries...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder={isAr ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Status'}</SelectItem>
              <SelectItem value="posted">{isAr ? 'مرحّل' : 'Posted'}</SelectItem>
              <SelectItem value="draft">{isAr ? 'مسودة' : 'Draft'}</SelectItem>
              <SelectItem value="reversed">{isAr ? 'معكوس' : 'Reversed'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={syncFilter} onValueChange={setSyncFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder={isAr ? 'حالة المزامنة' : 'Sync Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل المزامنة' : 'All Sync'}</SelectItem>
              <SelectItem value="synced">{isAr ? 'مزامن' : 'Synced'}</SelectItem>
              <SelectItem value="pending">{isAr ? 'معلّق' : 'Pending'}</SelectItem>
              <SelectItem value="not_synced">{isAr ? 'غير مزامن' : 'Not Synced'}</SelectItem>
              <SelectItem value="error">{isAr ? 'خطأ' : 'Error'}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {filtered.length} {isAr ? 'سجل' : 'records'}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead field="doc_num" className="w-[80px]">{isAr ? 'رقم' : 'Doc#'}</SortableHead>
                <SortableHead field="posting_date">{isAr ? 'تاريخ الترحيل' : 'Posting Date'}</SortableHead>
                <SortableHead field="reference">{isAr ? 'المرجع' : 'Reference'}</SortableHead>
                <SortableHead field="memo">{isAr ? 'البيان' : 'Memo'}</SortableHead>
                <SortableHead field="total_debit" className="text-right">{isAr ? 'مدين' : 'Debit'}</SortableHead>
                <SortableHead field="total_credit" className="text-right">{isAr ? 'دائن' : 'Credit'}</SortableHead>
                <SortableHead field="status">{isAr ? 'الحالة' : 'Status'}</SortableHead>
                <SortableHead field="sync_status">{isAr ? 'مزامنة' : 'Sync'}</SortableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد قيود' : 'No journal entries'}</TableCell></TableRow>
              ) : paginatedEntries.map(entry => (
                <TableRow key={entry.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleView(entry)}>
                  <TableCell className="font-mono text-xs">JE-{entry.doc_num}</TableCell>
                  <TableCell className="text-xs">{entry.posting_date}</TableCell>
                  <TableCell className="text-xs">{entry.reference || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{entry.memo || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(entry.total_debit)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(entry.total_credit)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(entry.status)}>{entry.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-[10px] ${syncStatusColor(entry.sync_status)}`}>
                          {entry.sap_doc_entry ? (
                            <Cloud className="h-3 w-3 mr-0.5" />
                          ) : (
                            <CloudOff className="h-3 w-3 mr-0.5" />
                          )}
                          {entry.sync_status || 'local'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {entry.sap_doc_entry
                          ? `SAP: ${entry.erp_doc_num || entry.sap_doc_entry}${entry.last_synced_at ? ` • ${new Date(entry.last_synced_at).toLocaleString()}` : ''}`
                          : (isAr ? 'غير مزامن مع SAP' : 'Not synced to SAP')
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(entry)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {entry.status === 'posted' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => reverseEntry.mutate(entry.id)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {entry.status === 'posted' && !entry.sap_doc_entry && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary"
                              disabled={syncingEntryId === entry.id}
                              onClick={(e) => handleSyncSingleEntry(entry.id, e)}
                            >
                              {syncingEntryId === entry.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {isAr ? 'مزامنة إلى SAP' : 'Push to SAP'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!isLoading && filtered.length > 0 && (
            <div className="border-t px-4">
              <PaginationControls
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'قيد يومية جديد' : 'New Journal Entry'}</DialogTitle>
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
                    <TableHead className="w-[140px]">{isAr ? 'حساب المراقبة' : 'Control Account'}</TableHead>
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
                      <TableCell>
                        <Select value={line.line_type || 'account'} onValueChange={v => updateLine(idx, 'line_type', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account" className="text-xs">{isAr ? 'حساب' : 'Account'}</SelectItem>
                            <SelectItem value="bp" className="text-xs">{isAr ? 'شريك' : 'BP'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {(line.line_type || 'account') === 'account' ? (
                          <Select value={line.acct_code} onValueChange={v => updateLine(idx, 'acct_code', v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={isAr ? 'اختر حساب' : 'Select account'} />
                            </SelectTrigger>
                            <SelectContent>
                              {jeAccounts.map((a: any) => (
                                <SelectItem key={a.acct_code} value={a.acct_code} className="text-xs">
                                  {a.acct_code} - {a.acct_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="space-y-1">
                            <Select value={line.bp_code || ''} onValueChange={v => updateLine(idx, 'bp_code', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={isAr ? 'اختر شريك أعمال' : 'Select BP'} />
                              </SelectTrigger>
                              <SelectContent>
                                {businessPartners.map(bp => (
                                  <SelectItem key={bp.card_code} value={bp.card_code} className="text-xs">
                                    {bp.card_code} - {bp.card_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {line.acct_code && (
                              <span className="text-[10px] text-muted-foreground block truncate">{line.acct_code} - {line.acct_name}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input readOnly value={controlAccountMap.get(line.acct_code) || '-'} className="h-8 text-xs bg-accent/40 border-border" />
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
                  {isAr
                    ? `القيد غير متوازن بمبلغ ${formatCurrency(Math.abs(difference))} ريال`
                    : `Journal is out of balance by SAR ${formatCurrency(Math.abs(difference))}`}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
              <div className="flex gap-6 text-sm">
                <span>{isAr ? 'مدين' : 'Debit'}: <strong className="font-mono">{formatCurrency(totalDebit)}</strong></span>
                <span>{isAr ? 'دائن' : 'Credit'}: <strong className="font-mono">{formatCurrency(totalCredit)}</strong></span>
                {difference === 0 ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {isAr ? 'متوازن' : 'Balanced'}
                  </span>
                ) : (
                  <span className="text-destructive font-semibold">
                    {isAr ? 'الفرق' : 'Diff'}: {formatCurrency(Math.abs(difference))}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <AccountingValidationPanel
                  documentType="journal_entry"
                  getDocumentData={() => ({
                    document_type: 'journal_entry',
                    total: totalDebit,
                    subtotal: totalDebit,
                    tax_amount: 0,
                  })}
                  compact
                />
                <Button onClick={handleSubmit} disabled={difference !== 0 || createEntry.isPending} size="sm">
                  {createEntry.isPending ? 'Posting...' : isAr ? 'ترحيل' : 'Post Entry'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>JE-{viewEntry?.doc_num}</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">{isAr ? 'تاريخ الترحيل' : 'Posting Date'}:</span> <strong>{viewEntry.posting_date}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'المرجع' : 'Reference'}:</span> <strong>{viewEntry.reference || '-'}</strong></div>
                <div><span className="text-muted-foreground">{isAr ? 'الحالة' : 'Status'}:</span> <Badge variant="outline" className={statusColor(viewEntry.status)}>{viewEntry.status}</Badge></div>
                <div><span className="text-muted-foreground">{isAr ? 'البيان' : 'Memo'}:</span> <strong>{viewEntry.memo || '-'}</strong></div>
                <div>
                  <span className="text-muted-foreground">{isAr ? 'مزامنة SAP' : 'SAP Sync'}:</span>{' '}
                  <Badge variant="outline" className={syncStatusColor(viewEntry.sync_status)}>
                    {viewEntry.sap_doc_entry ? <Cloud className="h-3 w-3 mr-0.5 inline" /> : <CloudOff className="h-3 w-3 mr-0.5 inline" />}
                    {viewEntry.sync_status || 'local'}
                  </Badge>
                </div>
                {viewEntry.sap_doc_entry && (
                  <div><span className="text-muted-foreground">{isAr ? 'رقم SAP' : 'SAP Doc#'}:</span> <strong className="font-mono">{viewEntry.erp_doc_num || viewEntry.sap_doc_entry}</strong></div>
                )}
                {viewEntry.last_synced_at && (
                  <div><span className="text-muted-foreground">{isAr ? 'آخر مزامنة' : 'Last Synced'}:</span> <strong>{new Date(viewEntry.last_synced_at).toLocaleString()}</strong></div>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>{isAr ? 'كود الحساب' : 'Account Code'}</TableHead>
                      <TableHead>{isAr ? 'اسم الحساب' : 'Account Name'}</TableHead>
                      <TableHead>{isAr ? 'حساب المراقبة' : 'Control Account'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'مدين' : 'Debit'}</TableHead>
                      <TableHead className="text-right">{isAr ? 'دائن' : 'Credit'}</TableHead>
                      <TableHead>{isAr ? 'مركز تكلفة' : 'Cost Center'}</TableHead>
                      <TableHead>{isAr ? 'موظف' : 'Employee'}</TableHead>
                      <TableHead>{isAr ? 'فرع' : 'Branch'}</TableHead>
                      <TableHead>{isAr ? 'خط أعمال' : 'Biz Line'}</TableHead>
                      <TableHead>{isAr ? 'مصنع' : 'Factory'}</TableHead>
                      <TableHead>{isAr ? 'مشروع' : 'Project'}</TableHead>
                      <TableHead>{isAr ? 'ملاحظات' : 'Remarks'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewLines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs">{line.line_num}</TableCell>
                        <TableCell className="font-mono text-xs">{line.acct_code}</TableCell>
                        <TableCell className="text-xs">{line.acct_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{controlAccountMap.get(line.acct_code) || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(line.debit)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(line.credit)}</TableCell>
                        <TableCell className="text-xs">{line.cost_center || '-'}</TableCell>
                        <TableCell className="text-xs">{employees.find(d => d.id === line.dim_employee_id)?.cost_center || '-'}</TableCell>
                        <TableCell className="text-xs">{branches.find(d => d.id === line.dim_branch_id)?.cost_center || '-'}</TableCell>
                        <TableCell className="text-xs">{businessLines.find(d => d.id === line.dim_business_line_id)?.cost_center || '-'}</TableCell>
                        <TableCell className="text-xs">{factories.find(d => d.id === line.dim_factory_id)?.cost_center || '-'}</TableCell>
                        <TableCell className="text-xs">{line.project_code || '-'}</TableCell>
                        <TableCell className="text-xs">{line.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4} className="text-xs text-right">{isAr ? 'الإجمالي' : 'Total'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(viewEntry.total_debit)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(viewEntry.total_credit)}</TableCell>
                      <TableCell colSpan={7}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
