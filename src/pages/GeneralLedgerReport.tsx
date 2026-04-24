import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useGeneralLedgerData, type GLFilters, type GLAccountSummary } from '@/hooks/useGeneralLedgerData';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Download, Printer, FileText, ChevronDown, ChevronRight, Filter, Play, Search,
  BookOpen, TrendingUp, TrendingDown, DollarSign, BarChart3, Hash, ArrowUpDown,
  ExternalLink, ChevronUp, Users, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const currentYear = new Date().getFullYear();
const COLORS = ['hsl(var(--primary))', 'hsl(142,76%,36%)', 'hsl(38,92%,50%)', 'hsl(var(--destructive))', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'];
const PAGE_SIZE = 25;

export default function GeneralLedgerReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<GLFilters>({
    companyIds: [], dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    acctCodeFrom: '', acctCodeTo: '', singleAccount: '', branchId: '',
    costCenter: '', projectCode: '', departmentId: '', sourceModule: '',
    sourceDocNumber: '', postingStatus: 'posted', includeZeroBalance: false,
    viewMode: 'summary', searchQuery: '',
  });
  const [generated, setGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [reconciliationFilter, setReconciliationFilter] = useState<'all' | 'reconciled' | 'not_reconciled'>('all');
  const [selectedBPs, setSelectedBPs] = useState<Set<string>>(new Set());
  const [bpSearch, setBpSearch] = useState('');
  const [bpDialogOpen, setBpDialogOpen] = useState(false);
  const [customerGroupFilter, setCustomerGroupFilter] = useState('all');
  const [vendorGroupFilter, setVendorGroupFilter] = useState('all');
  const [selectedAccountCodes, setSelectedAccountCodes] = useState<Set<string>>(new Set());
  const [acctDialogOpen, setAcctDialogOpen] = useState(false);
  const [acctSearch, setAcctSearch] = useState('');
  useDefaultReportCompanyIds(setFilters);

  const { accountSummaries, totals, dailyMovement, sourceModuleBreakdown, topAccountsByMovement, isLoading } = useGeneralLedgerData(filters, generated);

  const { data: branches = [] } = useQuery({
    queryKey: ['glr-branches'],
    queryFn: async () => { const { data } = await supabase.from('branches').select('id, name').order('name'); return data || []; },
  });
  const { data: costCenters = [] } = useQuery({
    queryKey: ['glr-cost-centers'],
    queryFn: async () => { const { data } = await supabase.from('cost_centers').select('id, name, code').order('code'); return data || []; },
  });
  const { data: allBPs = [] } = useQuery({
    queryKey: ['glr-bps', filters.companyIds],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name, card_type, group_code').order('card_code');
      if (filters.companyIds.length > 0) q = q.in('company_id', filters.companyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['glr-all-accounts', filters.companyIds],
    queryFn: async () => {
      let q = supabase.from('chart_of_accounts').select('acct_code, acct_name, acct_type, is_active').eq('is_active', true).order('acct_code');
      if (filters.companyIds.length > 0) q = q.in('company_id', filters.companyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  const customerGroups = useMemo(() => {
    const gs = new Set<string>();
    allBPs.filter((b: any) => b.card_type !== 'S').forEach((b: any) => { if (b.group_code) gs.add(b.group_code); });
    return Array.from(gs).sort();
  }, [allBPs]);
  const vendorGroups = useMemo(() => {
    const gs = new Set<string>();
    allBPs.filter((b: any) => b.card_type === 'S').forEach((b: any) => { if (b.group_code) gs.add(b.group_code); });
    return Array.from(gs).sort();
  }, [allBPs]);
  const filteredBPs = useMemo(() => {
    let list = allBPs;
    if (customerGroupFilter !== 'all') list = list.filter((b: any) => b.card_type !== 'S' ? b.group_code === customerGroupFilter : true);
    if (vendorGroupFilter !== 'all') list = list.filter((b: any) => b.card_type === 'S' ? b.group_code === vendorGroupFilter : true);
    if (bpSearch) { const s = bpSearch.toLowerCase(); list = list.filter((b: any) => b.card_code?.toLowerCase().includes(s) || b.card_name?.toLowerCase().includes(s)); }
    return list;
  }, [allBPs, bpSearch, customerGroupFilter, vendorGroupFilter]);
  const filteredAcctList = useMemo(() => {
    if (!acctSearch) return allAccounts;
    const s = acctSearch.toLowerCase();
    return allAccounts.filter((a: any) => a.acct_code?.toLowerCase().includes(s) || a.acct_name?.toLowerCase().includes(s));
  }, [allAccounts, acctSearch]);
  const toggleBP = (code: string) => { setSelectedBPs(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; }); };
  const toggleAcct = (code: string) => { setSelectedAccountCodes(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; }); };

  const toggleExpand = (code: string) => {
    setExpandedAccounts(prev => { const s = new Set(prev); s.has(code) ? s.delete(code) : s.add(code); return s; });
  };

  // Filter by reconciliation, selected accounts, selected BPs
  const filteredSummaries = useMemo(() => {
    let result = accountSummaries;
    if (reconciliationFilter === 'reconciled') result = result.filter(a => Math.abs(a.closingBalance) < 0.01);
    if (reconciliationFilter === 'not_reconciled') result = result.filter(a => Math.abs(a.closingBalance) >= 0.01);
    if (selectedAccountCodes.size > 0) result = result.filter(a => selectedAccountCodes.has(a.acctCode));
    return result;
  }, [accountSummaries, reconciliationFilter, selectedAccountCodes]);

  // Pagination
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSummaries.slice(start, start + PAGE_SIZE);
  }, [filteredSummaries, currentPage]);
  const totalPages = Math.ceil(filteredSummaries.length / PAGE_SIZE);

  const navigateToSource = (sourceModule: string, sourceDocNumber: string) => {
    const mod = (sourceModule || '').toLowerCase();
    if (mod.includes('ar') || mod.includes('invoice')) navigate(`/ar-invoices`);
    else if (mod.includes('ap')) navigate(`/ap-invoices`);
    else if (mod.includes('payment') || mod.includes('receipt')) navigate(`/incoming-payments`);
    else if (mod.includes('journal') || mod.includes('manual')) navigate(`/journal-entries`);
    else if (mod.includes('payroll')) navigate(`/payroll`);
    else if (mod.includes('asset') || mod.includes('depreciation')) navigate(`/assets`);
    else navigate(`/journal-entries`);
  };

  const exportExcel = () => {
    const rows: any[] = [];
    for (const acct of accountSummaries) {
      rows.push({ 'Account Code': acct.acctCode, 'Account Name': acct.acctName, 'Opening Balance': acct.openingBalance, 'Total Debit': acct.totalDebit, 'Total Credit': acct.totalCredit, 'Closing Balance': acct.closingBalance, 'Transactions': acct.transactionCount });
      if (filters.viewMode === 'detailed') {
        for (const t of acct.transactions) {
          rows.push({ 'Account Code': '', 'Account Name': '', 'Date': t.postingDate, 'JE#': t.jeNumber, 'Source': t.sourceModule, 'Doc#': t.sourceDocNumber, 'Description': t.description, 'Debit': t.debit, 'Credit': t.credit, 'Running Balance': t.runningBalance, 'Reference': t.reference });
        }
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'General Ledger');
    XLSX.writeFile(wb, `GeneralLedger_${filters.dateFrom}_${filters.dateTo}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF('l');
    doc.setFontSize(16);
    doc.text('General Ledger Report', 14, 20);
    doc.setFontSize(9);
    doc.text(`Period: ${filters.dateFrom} to ${filters.dateTo}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 33);

    const head = [['Acct Code', 'Account Name', 'Opening', 'Debit', 'Credit', 'Closing', 'Txns']];
    const body = accountSummaries.map(a => [
      a.acctCode, a.acctName, formatSAR(a.openingBalance),
      formatSAR(a.totalDebit), formatSAR(a.totalCredit), formatSAR(a.closingBalance),
      String(a.transactionCount),
    ]);
    body.push(['', 'Grand Total', '', formatSAR(totals.totalDebit), formatSAR(totals.totalCredit), '', String(totals.transactionCount)]);
    autoTable(doc, { head, body, startY: 40, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 64, 175] } });
    doc.save(`GeneralLedger_${filters.dateFrom}_${filters.dateTo}.pdf`);
  };

  // KPIs
  const kpis = [
    { label: 'Accounts', value: String(totals.accountCount), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Opening Debit', value: formatSARShort(totals.openingDebit), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Opening Credit', value: formatSARShort(totals.openingCredit), icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Period Debit', value: formatSARShort(totals.totalDebit), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Period Credit', value: formatSARShort(totals.totalCredit), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Closing Debit', value: formatSARShort(totals.closingDebit), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Closing Credit', value: formatSARShort(totals.closingCredit), icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Transactions', value: String(totals.transactionCount), icon: Hash, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> General Ledger Report
          </h1>
          <p className="text-sm text-muted-foreground">Transaction-level ledger analysis with drill-down to source documents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!generated}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!generated}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!generated}><Printer className="h-4 w-4 mr-1" />Print</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div>
              <Label className="text-xs">Company</Label>
              <CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters({ ...filters, companyIds: v })} />
            </div>
            <div>
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Accounts</Label>
              <Dialog open={acctDialogOpen} onOpenChange={setAcctDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-9 justify-start text-xs font-mono">
                    {selectedAccountCodes.size > 0 ? `${selectedAccountCodes.size} selected` : filters.singleAccount || 'All Accounts'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh]">
                  <DialogHeader><DialogTitle>Select Accounts</DialogTitle></DialogHeader>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search accounts..." value={acctSearch} onChange={e => setAcctSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedAccountCodes(new Set(filteredAcctList.map((a: any) => a.acct_code)))}>All</Button>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedAccountCodes(new Set())}>Clear</Button>
                    </div>
                    <div className="border rounded-md max-h-[400px] overflow-y-auto">
                      {filteredAcctList.map((a: any) => (
                        <div key={a.acct_code} className={cn("flex items-center gap-2 px-2 py-1 text-xs border-b last:border-b-0 cursor-pointer hover:bg-accent/50", selectedAccountCodes.has(a.acct_code) && "bg-primary/10")} onClick={() => toggleAcct(a.acct_code)}>
                          <Checkbox checked={selectedAccountCodes.has(a.acct_code)} className="h-3.5 w-3.5" />
                          <span className="font-mono text-muted-foreground shrink-0 w-16">{a.acct_code}</span>
                          <span className="truncate">{a.acct_name}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{a.acct_type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <Label className="text-xs">Business Partners</Label>
              <Dialog open={bpDialogOpen} onOpenChange={setBpDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-9 justify-start text-xs">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {selectedBPs.size > 0 ? `${selectedBPs.size} selected` : 'All BPs'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader><DialogTitle>Select Business Partners</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search..." value={bpSearch} onChange={e => setBpSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedBPs(new Set(filteredBPs.map((b: any) => b.card_code)))}>All</Button>
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelectedBPs(new Set())}>Clear</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Customer Group</Label>
                        <Select value={customerGroupFilter} onValueChange={setCustomerGroupFilter}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Customer Groups</SelectItem>
                            {customerGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Vendor Group</Label>
                        <Select value={vendorGroupFilter} onValueChange={setVendorGroupFilter}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Vendor Groups</SelectItem>
                            {vendorGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="border rounded-md max-h-[350px] overflow-y-auto">
                      {filteredBPs.map((bp: any) => (
                        <div key={bp.id} className={cn("flex items-center gap-2 px-2 py-1 text-xs border-b last:border-b-0 cursor-pointer hover:bg-accent/50", selectedBPs.has(bp.card_code) && "bg-primary/10")} onClick={() => toggleBP(bp.card_code)}>
                          <Checkbox checked={selectedBPs.has(bp.card_code)} className="h-3.5 w-3.5" />
                          <span className="font-mono text-muted-foreground shrink-0">{bp.card_code}</span>
                          <span className="truncate">{bp.card_name}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{bp.card_type === 'S' ? 'Vendor' : bp.card_type === 'L' ? 'Lead' : 'Customer'}</Badge>
                          {bp.group_code && <Badge variant="secondary" className="text-[9px] shrink-0">{bp.group_code}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={filters.branchId} onValueChange={v => setFilters({ ...filters, branchId: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reconciliation</Label>
              <Select value={reconciliationFilter} onValueChange={(v) => setReconciliationFilter(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                  <SelectItem value="not_reconciled">Not Reconciled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">View</Label>
              <Select value={filters.viewMode} onValueChange={v => setFilters({ ...filters, viewMode: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => { setGenerated(true); setCurrentPage(1); }} className="w-full h-9" disabled={isLoading}>
                <Play className="h-4 w-4 mr-1" />{isLoading ? 'Loading...' : 'Generate'}
              </Button>
            </div>
          </div>

          {/* Selected tags */}
          {(selectedBPs.size > 0 || selectedAccountCodes.size > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAccountCodes.size > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <BookOpen className="h-3 w-3" /> {selectedAccountCodes.size} accounts
                  <button onClick={() => setSelectedAccountCodes(new Set())}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {selectedBPs.size > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Users className="h-3 w-3" /> {selectedBPs.size} partners
                  <button onClick={() => setSelectedBPs(new Set())}><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}

          {/* Advanced */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 text-xs">
                <Filter className="h-3 w-3 mr-1" />Advanced {showAdvanced ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Account From</Label>
                  <Input placeholder="e.g. 1000" value={filters.acctCodeFrom} onChange={e => setFilters({ ...filters, acctCodeFrom: e.target.value })} className="h-9 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Account To</Label>
                  <Input placeholder="e.g. 9999" value={filters.acctCodeTo} onChange={e => setFilters({ ...filters, acctCodeTo: e.target.value })} className="h-9 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Cost Center</Label>
                  <Select value={filters.costCenter} onValueChange={v => setFilters({ ...filters, costCenter: v === 'all' ? '' : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {costCenters.map((c: any) => <SelectItem key={c.id} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Project</Label>
                  <Input placeholder="Project code" value={filters.projectCode} onChange={e => setFilters({ ...filters, projectCode: e.target.value })} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Source Module</Label>
                  <Select value={filters.sourceModule} onValueChange={v => setFilters({ ...filters, sourceModule: v === 'all' ? '' : v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="ar_invoice">AR Invoice</SelectItem>
                      <SelectItem value="ap_invoice">AP Invoice</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="manual">Manual Journal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.postingStatus} onValueChange={v => setFilters({ ...filters, postingStatus: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="posted">Posted Only</SelectItem>
                      <SelectItem value="draft">Draft Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={filters.includeZeroBalance} onCheckedChange={v => setFilters({ ...filters, includeZeroBalance: v })} />
                  <Label className="text-xs">Include Zero Balance</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {kpis.map(k => (
              <Card key={k.label} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-3 pb-2 px-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground truncate">{k.label}</p>
                    <div className={`p-1 rounded ${k.bg}`}><k.icon className={`h-3 w-3 ${k.color}`} /></div>
                  </div>
                  <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Balance Check */}
          <Card className="border-primary/20">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Balance Proof:</span>
                <span>Total Debit: {formatSAR(totals.totalDebit)} | Total Credit: {formatSAR(totals.totalCredit)}</span>
                <Badge variant={Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'default' : 'destructive'}>
                  {Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? '✓ Balanced' : `✗ Diff: ${formatSAR(totals.totalDebit - totals.totalCredit)}`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {dailyMovement.length > 1 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Debit vs Credit Trend</CardTitle></CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyMovement.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                      <RTooltip formatter={(v: number) => formatSAR(v)} />
                      <Legend />
                      <Bar dataKey="debit" name="Debit" fill="hsl(var(--primary))" />
                      <Bar dataKey="credit" name="Credit" fill="hsl(142,76%,36%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {sourceModuleBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Source Modules</CardTitle></CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceModuleBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                        {sourceModuleBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RTooltip formatter={(v: number) => formatSAR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by account code or name..."
                value={filters.searchQuery}
                onChange={e => { setFilters({ ...filters, searchQuery: e.target.value }); setCurrentPage(1); }}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpandedAccounts(new Set(paginatedAccounts.map(a => a.acctCode)))}>Expand All</Button>
            <Button variant="ghost" size="sm" onClick={() => setExpandedAccounts(new Set())}>Collapse All</Button>
          </div>

          {/* Ledger Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="w-7"></TableHead>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                      <TableHead className="text-center">Txns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccounts.map(acct => (
                      <>
                        <TableRow
                          key={acct.acctCode}
                          className="cursor-pointer hover:bg-accent/50 text-xs"
                          onClick={() => toggleExpand(acct.acctCode)}
                        >
                          <TableCell className="w-7 px-2">
                            {acct.transactionCount > 0 ? (
                              expandedAccounts.has(acct.acctCode) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono font-medium">{acct.acctCode}</TableCell>
                          <TableCell className="font-semibold">{acct.acctName}</TableCell>
                          <TableCell className={cn("text-right font-mono", acct.openingBalance < 0 && 'text-destructive')}>{formatSAR(acct.openingBalance)}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">{acct.totalDebit > 0 ? formatSAR(acct.totalDebit) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{acct.totalCredit > 0 ? formatSAR(acct.totalCredit) : '—'}</TableCell>
                          <TableCell className={cn("text-right font-mono font-bold", acct.closingBalance < 0 && 'text-destructive')}>{formatSAR(acct.closingBalance)}</TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{acct.transactionCount}</Badge></TableCell>
                        </TableRow>

                        {/* Expanded transaction detail rows */}
                        {expandedAccounts.has(acct.acctCode) && (
                          <>
                            {/* Opening balance row */}
                            <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 text-[11px]">
                              <TableCell></TableCell>
                              <TableCell colSpan={3} className="font-semibold text-muted-foreground italic">Opening Balance</TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatSAR(acct.openingBalance)}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            {acct.transactions.map(t => (
                              <TableRow key={t.id} className="bg-muted/10 text-[11px] hover:bg-muted/30">
                                <TableCell></TableCell>
                                <TableCell className="font-mono text-muted-foreground">
                                  {t.postingDate ? format(new Date(t.postingDate), 'dd/MM/yyyy') : '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="text-[9px] px-1 shrink-0">{t.sourceModule}</Badge>
                                    <span className="font-mono text-[10px]">{t.jeNumber}</span>
                                    {t.sourceDocNumber && <span className="text-muted-foreground text-[10px]">| {t.sourceDocNumber}</span>}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigateToSource(t.sourceModule, t.sourceDocNumber); }}
                                      className="ml-1 p-0.5 rounded hover:bg-accent"
                                      title="Open source document"
                                    >
                                      <ExternalLink className="h-3 w-3 text-primary" />
                                    </button>
                                  </div>
                                  {t.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">{t.description}</p>}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-[10px]">
                                  {t.reference && <span>{t.reference}</span>}
                                  {t.costCenter && <span className="ml-1">CC:{t.costCenter}</span>}
                                  {t.project && <span className="ml-1">P:{t.project}</span>}
                                </TableCell>
                                <TableCell className="text-right font-mono text-blue-600">{t.debit > 0 ? formatSAR(t.debit) : ''}</TableCell>
                                <TableCell className="text-right font-mono text-emerald-600">{t.credit > 0 ? formatSAR(t.credit) : ''}</TableCell>
                                <TableCell className={cn("text-right font-mono text-[10px]", t.runningBalance < 0 && 'text-destructive')}>{formatSAR(t.runningBalance)}</TableCell>
                                <TableCell className="text-center text-muted-foreground text-[10px]">{t.status}</TableCell>
                              </TableRow>
                            ))}
                            {/* Closing balance row */}
                            <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 text-[11px] border-b-2">
                              <TableCell></TableCell>
                              <TableCell colSpan={3} className="font-semibold text-muted-foreground italic">Closing Balance</TableCell>
                              <TableCell className="text-right font-mono text-blue-600 font-semibold">{formatSAR(acct.totalDebit)}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-600 font-semibold">{formatSAR(acct.totalCredit)}</TableCell>
                              <TableCell className={cn("text-right font-mono font-bold", acct.closingBalance < 0 && 'text-destructive')}>{formatSAR(acct.closingBalance)}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </>
                        )}
                      </>
                    ))}

                    {/* Grand Total */}
                    <TableRow className="bg-muted font-bold border-t-2 text-xs">
                      <TableCell></TableCell>
                      <TableCell colSpan={2}>Grand Total ({totals.accountCount} accounts)</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(totals.openingDebit - totals.openingCredit)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-600">{formatSAR(totals.totalDebit)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{formatSAR(totals.totalCredit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(totals.closingDebit - totals.closingCredit)}</TableCell>
                      <TableCell className="text-center">{totals.transactionCount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages} ({accountSummaries.length} accounts)
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
