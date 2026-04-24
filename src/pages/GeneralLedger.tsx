import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BookOpen, Download, ChevronRight, ChevronDown,
  ArrowUpDown, RefreshCw, Printer, Search, Plus, Minus, ArrowLeft, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useActiveCompany } from '@/hooks/useActiveCompany';

// Tree building utilities for accounts
interface AcctTreeNode {
  account: any;
  children: AcctTreeNode[];
}

function buildAccountTree(accounts: any[]): AcctTreeNode[] {
  const map = new Map<string, AcctTreeNode>();
  const roots: AcctTreeNode[] = [];
  for (const a of accounts) {
    map.set(a.acct_code, { account: a, children: [] });
  }
  function findNearestAncestor(fatherCode: string | null): string | null {
    let code = fatherCode;
    while (code) {
      if (map.has(code)) return code;
      code = code.slice(0, -1) || null;
    }
    return null;
  }
  for (const a of accounts) {
    const node = map.get(a.acct_code)!;
    if (a.father_acct_code) {
      if (map.has(a.father_acct_code)) {
        map.get(a.father_acct_code)!.children.push(node);
      } else {
        const ancestor = findNearestAncestor(a.father_acct_code);
        if (ancestor) {
          map.get(ancestor)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function GLTreeItem({ node, expanded, toggleExpand, selectedCodes, onToggleSelect, depth = 0 }: {
  node: AcctTreeNode;
  expanded: Set<string>;
  toggleExpand: (code: string) => void;
  selectedCodes: Set<string>;
  onToggleSelect: (code: string) => void;
  depth?: number;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.account.acct_code);
  const isSelected = selectedCodes.has(node.account.acct_code);
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors text-xs"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button className="p-0.5 rounded hover:bg-muted shrink-0" onClick={(e) => { e.stopPropagation(); toggleExpand(node.account.acct_code); }}>
            {isExpanded ? <Minus className="h-3 w-3 text-muted-foreground" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(node.account.acct_code)}
          className="h-3.5 w-3.5 shrink-0"
        />
        <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{node.account.acct_code}</span>
        <span className="truncate text-foreground">{node.account.acct_name}</span>
      </div>
      {isExpanded && hasChildren && node.children.map(child => (
        <GLTreeItem key={child.account.acct_code} node={child} expanded={expanded} toggleExpand={toggleExpand} selectedCodes={selectedCodes} onToggleSelect={onToggleSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

interface GLEntry {
  id: string;
  acct_code: string;
  acct_name: string;
  posting_date: string;
  doc_type: string;
  doc_num: string;
  ref_1: string;
  remarks: string;
  debit: number;
  credit: number;
  balance: number;
  bp_name: string;
}

interface AccountSummary {
  acct_code: string;
  acct_name: string;
  acct_type: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  entries: GLEntry[];
}

export default function GeneralLedger() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId } = useActiveCompany();

  // Selection Criteria state
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);

  // BP multi-select
  const [useBP, setUseBP] = useState(false);
  const [selectedBPIds, setSelectedBPIds] = useState<Set<string>>(new Set());
  const [bpSearch, setBpSearch] = useState('');
  const [customerGroup, setCustomerGroup] = useState('all');
  const [vendorGroup, setVendorGroup] = useState('all');

  // Account multi-select
  const [useAccounts, setUseAccounts] = useState(true);
  const [selectedAcctCodes, setSelectedAcctCodes] = useState<Set<string>>(new Set());
  const [acctSearch, setAcctSearch] = useState('');
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(new Set());

  // Date selection
  const [usePostingDate, setUsePostingDate] = useState(true);
  const [useDueDate, setUseDueDate] = useState(false);
  const [useDocDate, setUseDocDate] = useState(false);
  const currentYear = new Date().getFullYear();
  const [postingDateFrom, setPostingDateFrom] = useState(`${currentYear}-01-01`);
  const [postingDateTo, setPostingDateTo] = useState(`${currentYear}-12-31`);
  const [dueDateFrom, setDueDateFrom] = useState(`${currentYear}-01-01`);
  const [dueDateTo, setDueDateTo] = useState(`${currentYear}-12-31`);
  const [docDateFrom, setDocDateFrom] = useState(`${currentYear}-01-01`);
  const [docDateTo, setDocDateTo] = useState(`${currentYear}-12-31`);

  // Options
  const [showOpeningBalance, setShowOpeningBalance] = useState(true);
  const [obMode, setObMode] = useState<'company' | 'fiscal'>('company');
  const [hideZeroBalanced, setHideZeroBalanced] = useState(false);
  const [hideNoPostings, setHideNoPostings] = useState(true);
  const [displayPostings, setDisplayPostings] = useState('all');
  const [reconFilter, setReconFilter] = useState<'all' | 'reconciled' | 'not_reconciled'>('all');

  // Report state
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'acct_code' | 'closing_balance'>('acct_code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const dateFrom = usePostingDate ? postingDateFrom : (useDocDate ? docDateFrom : postingDateFrom);
  const dateTo = usePostingDate ? postingDateTo : (useDocDate ? docDateTo : postingDateTo);

  // Data queries
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['gl-accounts', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('acct_code');
      if (activeCompanyId) {
        q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: businessPartners = [] } = useQuery({
    queryKey: ['gl-business-partners', activeCompanyId],
    queryFn: async () => {
      let q = supabase
        .from('business_partners')
        .select('id, card_code, card_name, card_type, group_code')
        .order('card_code');
      if (activeCompanyId) {
        q = q.eq('company_id', activeCompanyId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: customerGroups = [] } = useQuery({
    queryKey: ['gl-customer-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('customer_groups').select('id, group_code, group_name').order('group_name');
      return data || [];
    },
  });

  const { data: vendorGroups = [] } = useQuery({
    queryKey: ['gl-vendor-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('vendor_groups').select('id, group_code, group_name').order('group_name');
      return data || [];
    },
  });

  // Filter BPs by search and group
  const filteredBPs = useMemo(() => {
    let result = businessPartners;
    if (customerGroup !== 'all') {
      result = result.filter((bp: any) => bp.card_type === 'C' ? bp.group_code === customerGroup : true);
    }
    if (vendorGroup !== 'all') {
      result = result.filter((bp: any) => bp.card_type === 'S' ? bp.group_code === vendorGroup : true);
    }
    if (bpSearch) {
      const q = bpSearch.toLowerCase();
      result = result.filter((bp: any) =>
        bp.card_code?.toLowerCase().includes(q) || bp.card_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [businessPartners, bpSearch, customerGroup, vendorGroup]);

  // Filter accounts tree by search
  const filteredAccounts = useMemo(() => {
    if (!acctSearch) return accounts;
    const q = acctSearch.toLowerCase();
    return accounts.filter((a: any) =>
      a.acct_code?.toLowerCase().includes(q) || a.acct_name?.toLowerCase().includes(q)
    );
  }, [accounts, acctSearch]);

  const toggleBP = (id: string) => {
    setSelectedBPIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAcct = (code: string) => {
    setSelectedAcctCodes(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const selectAllAccounts = () => {
    setSelectedAcctCodes(new Set(accounts.map((a: any) => a.acct_code)));
  };

  const clearAllAccounts = () => {
    setSelectedAcctCodes(new Set());
  };

  const selectAllBPs = () => {
    setSelectedBPIds(new Set(filteredBPs.map((bp: any) => bp.id)));
  };

  const clearAllBPs = () => {
    setSelectedBPIds(new Set());
  };

  const toggleTreeNode = (code: string) => {
    setTreeExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['gl-ar-invoices', dateFrom, dateTo, activeCompanyId],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase
        .from('ar_invoices')
        .select('doc_num, customer_name, customer_code, doc_date, total, tax_amount, subtotal, status')
        .gte('doc_date', dateFrom)
        .lte('doc_date', dateTo)
        .order('doc_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['gl-ap-invoices', dateFrom, dateTo, activeCompanyId],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase
        .from('ap_invoices')
        .select('invoice_number, vendor_name, vendor_code, doc_date, total, tax_amount, subtotal, status')
        .gte('doc_date', dateFrom)
        .lte('doc_date', dateTo)
        .order('doc_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['gl-payments', dateFrom, dateTo, activeCompanyId],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase
        .from('incoming_payments')
        .select('payment_number, doc_date, total_amount, payment_method, customer_name, status')
        .gte('doc_date', dateFrom)
        .lte('doc_date', dateTo)
        .order('doc_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Build GL data
  const glData: AccountSummary[] = useMemo(() => {
    if (!reportGenerated) return [];
    const accountMap = new Map<string, AccountSummary>();

    // Determine which accounts to include
    const selectedBPCodes = useBP && selectedBPIds.size > 0
      ? new Set(businessPartners.filter((bp: any) => selectedBPIds.has(bp.id)).map((bp: any) => bp.card_code))
      : null;

    accounts.forEach((acc: any) => {
      // If accounts are selected, only show those
      if (useAccounts && selectedAcctCodes.size > 0 && !selectedAcctCodes.has(acc.acct_code)) return;

      accountMap.set(acc.acct_code, {
        acct_code: acc.acct_code,
        acct_name: acc.acct_name,
        acct_type: acc.acct_type || 'N/A',
        opening_balance: showOpeningBalance ? (acc.balance || 0) : 0,
        total_debit: 0,
        total_credit: 0,
        closing_balance: acc.balance || 0,
        entries: [],
      });
    });

    // AR Invoices
    arInvoices.forEach((inv: any) => {
      if (selectedBPCodes && !selectedBPCodes.has(inv.customer_code)) return;

      const receivableAcct = accounts.find((a: any) => a.acct_type === 'receivable' || a.acct_name?.toLowerCase().includes('receivable'));
      const revenueAcct = accounts.find((a: any) => a.acct_type === 'revenue' || a.acct_name?.toLowerCase().includes('revenue') || a.acct_name?.toLowerCase().includes('sales'));

      if (receivableAcct && accountMap.has(receivableAcct.acct_code)) {
        const summary = accountMap.get(receivableAcct.acct_code)!;
        summary.total_debit += inv.total || 0;
        summary.closing_balance = summary.opening_balance + summary.total_debit - summary.total_credit;
        summary.entries.push({
          id: `ar-${inv.doc_num}-dr`, acct_code: receivableAcct.acct_code, acct_name: receivableAcct.acct_name,
          posting_date: inv.doc_date, doc_type: 'AR Invoice', doc_num: `INV-${inv.doc_num}`,
          ref_1: inv.customer_code || '', remarks: `AR Invoice - ${inv.customer_name}`,
          debit: inv.total || 0, credit: 0, balance: summary.closing_balance, bp_name: inv.customer_name || '',
        });
      }
      if (revenueAcct && accountMap.has(revenueAcct.acct_code)) {
        const summary = accountMap.get(revenueAcct.acct_code)!;
        summary.total_credit += inv.subtotal || inv.total || 0;
        summary.closing_balance = summary.opening_balance + summary.total_debit - summary.total_credit;
        summary.entries.push({
          id: `ar-${inv.doc_num}-cr`, acct_code: revenueAcct.acct_code, acct_name: revenueAcct.acct_name,
          posting_date: inv.doc_date, doc_type: 'AR Invoice', doc_num: `INV-${inv.doc_num}`,
          ref_1: '', remarks: `Revenue - ${inv.customer_name}`,
          debit: 0, credit: inv.subtotal || inv.total || 0, balance: summary.closing_balance, bp_name: inv.customer_name || '',
        });
      }
    });

    // AP Invoices
    apInvoices.forEach((inv: any) => {
      if (selectedBPCodes && !selectedBPCodes.has(inv.vendor_code)) return;

      const payableAcct = accounts.find((a: any) => a.acct_type === 'payable' || a.acct_name?.toLowerCase().includes('payable'));
      if (payableAcct && accountMap.has(payableAcct.acct_code)) {
        const summary = accountMap.get(payableAcct.acct_code)!;
        summary.total_credit += inv.total || 0;
        summary.closing_balance = summary.opening_balance + summary.total_debit - summary.total_credit;
        summary.entries.push({
          id: `ap-${inv.invoice_number}-cr`, acct_code: payableAcct.acct_code, acct_name: payableAcct.acct_name,
          posting_date: inv.doc_date, doc_type: 'AP Invoice', doc_num: inv.invoice_number,
          ref_1: inv.vendor_code || '', remarks: `AP Invoice - ${inv.vendor_name}`,
          debit: 0, credit: inv.total || 0, balance: summary.closing_balance, bp_name: inv.vendor_name || '',
        });
      }
    });

    // Incoming Payments
    payments.forEach((pmt: any) => {
      const cashAcct = accounts.find((a: any) => a.acct_type === 'cash' || a.acct_name?.toLowerCase().includes('cash') || a.acct_name?.toLowerCase().includes('bank'));
      if (cashAcct && accountMap.has(cashAcct.acct_code)) {
        const summary = accountMap.get(cashAcct.acct_code)!;
        summary.total_debit += pmt.total_amount || 0;
        summary.closing_balance = summary.opening_balance + summary.total_debit - summary.total_credit;
        summary.entries.push({
          id: `pmt-${pmt.payment_number}-dr`, acct_code: cashAcct.acct_code, acct_name: cashAcct.acct_name,
          posting_date: pmt.doc_date, doc_type: 'Payment', doc_num: pmt.payment_number || '',
          ref_1: pmt.payment_method || '', remarks: `Payment - ${pmt.customer_name || 'N/A'}`,
          debit: pmt.total_amount || 0, credit: 0, balance: summary.closing_balance, bp_name: pmt.customer_name || '',
        });
      }
    });

    let result = Array.from(accountMap.values());

    if (hideNoPostings) result = result.filter(a => a.total_debit > 0 || a.total_credit > 0 || a.opening_balance !== 0);
    if (hideZeroBalanced) result = result.filter(a => a.closing_balance !== 0);
    if (displayPostings === 'debit') result = result.filter(a => a.total_debit > 0);
    if (displayPostings === 'credit') result = result.filter(a => a.total_credit > 0);

    // Reconciliation filter
    if (reconFilter === 'reconciled') {
      result = result.filter(a => Math.abs(a.closing_balance) < 0.01);
    } else if (reconFilter === 'not_reconciled') {
      result = result.filter(a => Math.abs(a.closing_balance) >= 0.01);
    }

    result.sort((a, b) => {
      const val = sortField === 'acct_code' ? a.acct_code.localeCompare(b.acct_code) : a.closing_balance - b.closing_balance;
      return sortDir === 'asc' ? val : -val;
    });

    return result;
  }, [accounts, arInvoices, apInvoices, payments, reportGenerated, useAccounts, selectedAcctCodes, useBP, selectedBPIds, businessPartners, showOpeningBalance, hideNoPostings, hideZeroBalanced, displayPostings, reconFilter, sortField, sortDir]);

  const totals = useMemo(() => ({
    debit: glData.reduce((s, a) => s + a.total_debit, 0),
    credit: glData.reduce((s, a) => s + a.total_credit, 0),
    balance: glData.reduce((s, a) => s + a.closing_balance, 0),
  }), [glData]);

  const toggleExpand = (code: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const handleOK = () => {
    setReportGenerated(true);
    setShowCriteria(false);
  };

  const handleBack = () => {
    setShowCriteria(true);
  };

  const handleExport = () => {
    const headers = ['Account Code', 'Account Name', 'Type', 'Opening Balance', 'Total Debit', 'Total Credit', 'Closing Balance'];
    const rows = glData.map(a => [a.acct_code, a.acct_name, a.acct_type, a.opening_balance, a.total_debit, a.total_credit, a.closing_balance]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  };

  const acctTree = useMemo(() => buildAccountTree(acctSearch ? filteredAccounts : accounts), [accounts, filteredAccounts, acctSearch]);

  return (
    <div className="space-y-4 page-enter">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {reportGenerated && !showCriteria && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {isAr ? 'دفتر الأستاذ العام' : 'General Ledger'}
            </h1>
            <p className="text-xs text-muted-foreground">{isAr ? 'تقرير دفتر الأستاذ العام - نمط SAP B1' : 'General Ledger Report — SAP B1 HANA Style'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {reportGenerated && !showCriteria && (
            <Button variant="outline" size="sm" onClick={handleBack}>
              <Search className="h-3.5 w-3.5 mr-1" />
              {isAr ? 'معايير الاختيار' : 'Selection Criteria'}
            </Button>
          )}
          {reportGenerated && (
            <>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-3.5 w-3.5 mr-1" />
                {isAr ? 'تصدير' : 'Export'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                {isAr ? 'طباعة' : 'Print'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* SAP B1 Style Selection Criteria Panel */}
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <div className="bg-primary px-4 py-2">
            <h2 className="text-sm font-semibold text-primary-foreground">
              {isAr ? 'دفتر الأستاذ العام - معايير الاختيار' : 'General Ledger - Selection Criteria'}
            </h2>
          </div>
          <CardContent className="p-4 space-y-4">
            {/* Top section: BP + Accounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Business Partner */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="useBP" checked={useBP} onCheckedChange={(v) => setUseBP(!!v)} />
                  <Label htmlFor="useBP" className="text-sm font-semibold">{isAr ? 'شريك أعمال' : 'Business Partner'}</Label>
                </div>
                {useBP && (
                  <>
                    <div className="pl-6 space-y-2">
                      {/* Search */}
                      <div className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={bpSearch}
                          onChange={e => setBpSearch(e.target.value)}
                          placeholder={isAr ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                          className="h-7 text-xs flex-1"
                        />
                      </div>

                      {/* Select/Clear all */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllBPs}>
                          {isAr ? 'تحديد الكل' : 'Select All'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={clearAllBPs}>
                          {isAr ? 'مسح الكل' : 'Clear All'}
                        </Button>
                        {selectedBPIds.size > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{selectedBPIds.size} {isAr ? 'محدد' : 'selected'}</Badge>
                        )}
                      </div>

                      {/* BP list with checkboxes */}
                      <div className="border rounded-md max-h-40 overflow-y-auto bg-card">
                        {filteredBPs.length === 0 ? (
                          <p className="text-center py-3 text-xs text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No partners found'}</p>
                        ) : filteredBPs.slice(0, 200).map((bp: any) => (
                          <div
                            key={bp.id}
                            className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent/50 text-xs border-b last:border-b-0"
                            onClick={() => toggleBP(bp.id)}
                          >
                            <Checkbox
                              checked={selectedBPIds.has(bp.id)}
                              onCheckedChange={() => toggleBP(bp.id)}
                              className="h-3.5 w-3.5 shrink-0"
                            />
                            <span className="font-mono text-[11px] text-muted-foreground shrink-0">{bp.card_code}</span>
                            <span className="truncate">{bp.card_name}</span>
                            <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{bp.card_type === 'S' ? (isAr ? 'مورد' : 'Vendor') : (isAr ? 'عميل' : 'Customer')}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Groups */}
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <div>
                        <label className="text-xs text-muted-foreground">{isAr ? 'مجموعة العملاء' : 'Customer Group'}</label>
                        <Select value={customerGroup} onValueChange={setCustomerGroup}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                            {customerGroups.map((g: any) => (
                              <SelectItem key={g.id} value={g.group_code}>{g.group_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{isAr ? 'مجموعة الموردين' : 'Vendor Group'}</label>
                        <Select value={vendorGroup} onValueChange={setVendorGroup}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                            {vendorGroups.map((g: any) => (
                              <SelectItem key={g.id} value={g.group_code}>{g.group_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Accounts list with multi-select */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="useAccounts" checked={useAccounts} onCheckedChange={(v) => setUseAccounts(!!v)} />
                  <Label htmlFor="useAccounts" className="text-sm font-semibold">{isAr ? 'الحسابات' : 'Accounts'}</Label>
                </div>
                {useAccounts && (
                  <>
                    <div className="pl-6 space-y-2">
                      {/* Search */}
                      <div className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={acctSearch}
                          onChange={e => setAcctSearch(e.target.value)}
                          placeholder={isAr ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                          className="h-7 text-xs flex-1"
                        />
                      </div>

                      {/* Select/Clear all */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllAccounts}>
                          {isAr ? 'تحديد الكل' : 'Select All'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={clearAllAccounts}>
                          {isAr ? 'مسح الكل' : 'Clear All'}
                        </Button>
                        {selectedAcctCodes.size > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{selectedAcctCodes.size} {isAr ? 'محدد' : 'selected'}</Badge>
                        )}
                      </div>

                      {/* Hierarchical tree with checkboxes */}
                      <div className="border rounded overflow-hidden max-h-72 overflow-y-auto bg-card">
                        {acctTree.length === 0 ? (
                          <p className="text-center py-4 text-xs text-muted-foreground">{isAr ? 'لا توجد حسابات' : 'No accounts found'}</p>
                        ) : (
                          <div className="py-1">
                            {acctTree.map(node => (
                              <GLTreeItem
                                key={node.account.acct_code}
                                node={node}
                                expanded={treeExpanded}
                                toggleExpand={toggleTreeNode}
                                selectedCodes={selectedAcctCodes}
                                onToggleSelect={toggleAcct}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="border-t pt-3">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? 'التحديد' : 'Selection'}</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="postingDate" checked={usePostingDate} onCheckedChange={(v) => setUsePostingDate(!!v)} />
                    <Label htmlFor="postingDate" className="text-xs whitespace-nowrap">{isAr ? 'تاريخ الترحيل' : 'Posting Date'}</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{isAr ? 'من' : 'From'}</span>
                    <Input type="date" value={postingDateFrom} onChange={e => setPostingDateFrom(e.target.value)} className="h-7 text-xs" disabled={!usePostingDate} />
                  </div>
                  <span className="text-xs text-muted-foreground">{isAr ? 'إلى' : 'To'}</span>
                  <Input type="date" value={postingDateTo} onChange={e => setPostingDateTo(e.target.value)} className="h-7 text-xs" disabled={!usePostingDate} />
                </div>
                <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="dueDate" checked={useDueDate} onCheckedChange={(v) => setUseDueDate(!!v)} />
                    <Label htmlFor="dueDate" className="text-xs whitespace-nowrap">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{isAr ? 'من' : 'From'}</span>
                    <Input type="date" value={dueDateFrom} onChange={e => setDueDateFrom(e.target.value)} className="h-7 text-xs" disabled={!useDueDate} />
                  </div>
                  <span className="text-xs text-muted-foreground">{isAr ? 'إلى' : 'To'}</span>
                  <Input type="date" value={dueDateTo} onChange={e => setDueDateTo(e.target.value)} className="h-7 text-xs" disabled={!useDueDate} />
                </div>
                <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="docDate" checked={useDocDate} onCheckedChange={(v) => setUseDocDate(!!v)} />
                    <Label htmlFor="docDate" className="text-xs whitespace-nowrap">{isAr ? 'تاريخ المستند' : 'Document Date'}</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{isAr ? 'من' : 'From'}</span>
                    <Input type="date" value={docDateFrom} onChange={e => setDocDateFrom(e.target.value)} className="h-7 text-xs" disabled={!useDocDate} />
                  </div>
                  <span className="text-xs text-muted-foreground">{isAr ? 'إلى' : 'To'}</span>
                  <Input type="date" value={docDateTo} onChange={e => setDocDateTo(e.target.value)} className="h-7 text-xs" disabled={!useDocDate} />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="border-t pt-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="showOB" checked={showOpeningBalance} onCheckedChange={(v) => setShowOpeningBalance(!!v)} />
                    <Label htmlFor="showOB" className="text-xs">{isAr ? 'رصيد افتتاحي للفترة' : 'Opening Balance for Period'}</Label>
                  </div>
                  {showOpeningBalance && (
                    <RadioGroup value={obMode} onValueChange={(v) => setObMode(v as 'company' | 'fiscal')} className="pl-6 space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="company" id="obCompany" />
                        <Label htmlFor="obCompany" className="text-xs">{isAr ? 'من بداية نشاط الشركة' : 'OB from Start of Company Activity'}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="fiscal" id="obFiscal" />
                        <Label htmlFor="obFiscal" className="text-xs">{isAr ? 'من بداية السنة المالية' : 'OB from Start of Fiscal Year'}</Label>
                      </div>
                    </RadioGroup>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{isAr ? 'العرض' : 'Display'}</label>
                    <Select value={displayPostings} onValueChange={setDisplayPostings}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isAr ? 'جميع الحركات' : 'All Postings'}</SelectItem>
                        <SelectItem value="debit">{isAr ? 'مدين فقط' : 'Debit Only'}</SelectItem>
                        <SelectItem value="credit">{isAr ? 'دائن فقط' : 'Credit Only'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="hideZero" checked={hideZeroBalanced} onCheckedChange={(v) => setHideZeroBalanced(!!v)} />
                    <Label htmlFor="hideZero" className="text-xs">{isAr ? 'إخفاء الحسابات الصفرية' : 'Hide Zero Balanced Acct'}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="hideNoPost" checked={hideNoPostings} onCheckedChange={(v) => setHideNoPostings(!!v)} />
                    <Label htmlFor="hideNoPost" className="text-xs">{isAr ? 'إخفاء الحسابات بدون حركات' : 'Hide Acct with no Postings'}</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{isAr ? 'التسوية' : 'Reconciliation'}</label>
                    <Select value={reconFilter} onValueChange={(v) => setReconFilter(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isAr ? 'الكل' : 'All Accounts'}</SelectItem>
                        <SelectItem value="reconciled">{isAr ? 'مسوّاة' : 'Reconciled'}</SelectItem>
                        <SelectItem value="not_reconciled">{isAr ? 'غير مسوّاة' : 'Not Reconciled'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="border-t pt-3 flex items-center gap-2">
              <Button onClick={handleOK} className="px-6 h-9 text-sm font-semibold">
                {isAr ? 'موافق' : 'OK'}
              </Button>
              <Button variant="outline" onClick={() => { if (reportGenerated) setShowCriteria(false); }} className="px-6 h-9 text-sm">
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => { selectAllAccounts(); selectAllBPs(); }} className="px-4 h-9 text-sm">
                {isAr ? 'تحديد الكل' : 'Select All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {reportGenerated && !showCriteria && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{isAr ? 'عدد الحسابات' : 'Accounts'}</p>
                <p className="text-lg font-bold">{glData.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{isAr ? 'إجمالي مدين' : 'Total Debit'}</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.debit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{isAr ? 'إجمالي دائن' : 'Total Credit'}</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.credit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{isAr ? 'صافي الرصيد' : 'Net Balance'}</p>
                <p className={cn("text-lg font-bold", totals.balance < 0 ? 'text-destructive' : '')}>{formatCurrency(totals.balance)}</p>
              </CardContent>
            </Card>
          </div>

          {/* GL Table */}
          <Card>
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{isAr ? 'حركات دفتر الأستاذ' : 'General Ledger Entries'}</span>
                <Badge variant="outline" className="text-[10px]">{glData.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedAccounts(new Set(glData.map(a => a.acct_code)))}>
                  {isAr ? 'توسيع' : 'Expand All'}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedAccounts(new Set())}>
                  {isAr ? 'طي' : 'Collapse All'}
                </Button>
              </div>
            </div>
            <CardContent className="p-0">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : glData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{isAr ? 'لا توجد حركات في الفترة المحددة' : 'No entries found for the selected criteria'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-xs">
                        <TableHead className="w-7"></TableHead>
                        <TableHead className="cursor-pointer" onClick={() => { setSortField('acct_code'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                          <div className="flex items-center gap-1 text-xs">{isAr ? 'رمز الحساب' : 'Acct Code'}<ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="text-xs">{isAr ? 'اسم الحساب' : 'Account Name'}</TableHead>
                        <TableHead className="text-xs">{isAr ? 'النوع' : 'Type'}</TableHead>
                        <TableHead className="text-right text-xs">{isAr ? 'رصيد افتتاحي' : 'Opening Bal.'}</TableHead>
                        <TableHead className="text-right text-xs">{isAr ? 'مدين' : 'Debit'}</TableHead>
                        <TableHead className="text-right text-xs">{isAr ? 'دائن' : 'Credit'}</TableHead>
                        <TableHead className="text-right cursor-pointer text-xs" onClick={() => { setSortField('closing_balance'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                          <div className="flex items-center gap-1 justify-end">{isAr ? 'رصيد ختامي' : 'Closing Bal.'}<ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {glData.map(account => (
                        <> 
                          <TableRow
                            key={account.acct_code}
                            className="cursor-pointer hover:bg-accent/50 text-xs"
                            onClick={() => toggleExpand(account.acct_code)}
                          >
                            <TableCell className="w-7 px-2">
                              {account.entries.length > 0 ? (
                                expandedAccounts.has(account.acct_code) ?
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> :
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : null}
                            </TableCell>
                            <TableCell className="font-mono font-medium">{account.acct_code}</TableCell>
                            <TableCell className="font-semibold">{account.acct_name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] capitalize">{account.acct_type}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(account.opening_balance)}</TableCell>
                            <TableCell className="text-right font-mono text-blue-600">{account.total_debit > 0 ? formatCurrency(account.total_debit) : '—'}</TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">{account.total_credit > 0 ? formatCurrency(account.total_credit) : '—'}</TableCell>
                            <TableCell className={cn("text-right font-mono font-bold", account.closing_balance < 0 && 'text-destructive')}>
                              {formatCurrency(account.closing_balance)}
                            </TableCell>
                          </TableRow>

                          {expandedAccounts.has(account.acct_code) && account.entries.map(entry => (
                            <TableRow key={entry.id} className="bg-muted/20 text-[11px]">
                              <TableCell></TableCell>
                              <TableCell className="font-mono text-muted-foreground pl-6">
                                {entry.posting_date ? format(new Date(entry.posting_date), 'dd/MM/yyyy') : '—'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[9px] px-1">{entry.doc_type}</Badge>
                                  <span className="font-mono">{entry.doc_num}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{entry.bp_name}</TableCell>
                              <TableCell className="text-right text-muted-foreground italic text-[10px]">{entry.remarks}</TableCell>
                              <TableCell className="text-right font-mono text-blue-600">{entry.debit > 0 ? formatCurrency(entry.debit) : ''}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-600">{entry.credit > 0 ? formatCurrency(entry.credit) : ''}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}

                      <TableRow className="bg-muted font-bold border-t-2 border-foreground/20 text-xs">
                        <TableCell></TableCell>
                        <TableCell colSpan={3}>{isAr ? 'الإجمالي' : 'Grand Total'}</TableCell>
                        <TableCell className="text-right"></TableCell>
                        <TableCell className="text-right font-mono text-blue-600">{formatCurrency(totals.debit)}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(totals.credit)}</TableCell>
                        <TableCell className={cn("text-right font-mono", totals.balance < 0 && 'text-destructive')}>{formatCurrency(totals.balance)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Initial state */}
      {!reportGenerated && !showCriteria && (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-sm font-semibold text-muted-foreground mb-1">{isAr ? 'لم يتم إنشاء تقرير بعد' : 'No Report Generated Yet'}</h2>
            <p className="text-xs text-muted-foreground mb-4">{isAr ? 'اضغط على معايير الاختيار لإنشاء التقرير' : 'Click Selection Criteria to generate the report'}</p>
            <Button onClick={() => setShowCriteria(true)}>
              <Search className="h-4 w-4 mr-2" />
              {isAr ? 'معايير الاختيار' : 'Selection Criteria'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
