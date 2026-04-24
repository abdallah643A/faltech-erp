import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileSpreadsheet, Users, Calendar, Download, BookOpen, Search, ArrowRight, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';

// Hook to fetch all chart of accounts (optionally filtered by companies)
function useChartOfAccounts(companyIds?: string[]) {
  return useQuery({
    queryKey: ['financial-reports-coa', companyIds],
    queryFn: async () => {
      let q = supabase.from('chart_of_accounts').select('acct_code, acct_name, acct_level, acct_type, father_acct_code, is_active, balance, company_id').eq('is_active', true).order('acct_code');
      if (companyIds && companyIds.length > 0) q = q.in('company_id', companyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// Tree node for COA hierarchy
interface COANode {
  acct_code: string;
  acct_name: string;
  children: COANode[];
}

function buildCOATree(accounts: any[]): COANode[] {
  const map = new Map<string, COANode>();
  const roots: COANode[] = [];
  for (const a of accounts) {
    map.set(a.acct_code, { acct_code: a.acct_code, acct_name: a.acct_name, children: [] });
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

function filterCOATree(nodes: COANode[], query: string): COANode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();
  function matches(node: COANode): boolean {
    if (node.acct_code.toLowerCase().includes(q) || node.acct_name.toLowerCase().includes(q)) return true;
    return node.children.some(matches);
  }
  return nodes.filter(matches).map(n => ({ ...n, children: filterCOATree(n.children, query) }));
}

// Reusable hierarchical account selector
function COASelectionTree({ accounts, searchValue, onSearchChange, selectedAccounts, onToggle, onSelectAll, label = 'G/L Accounts', checkboxId = 'gl-check', useAccounts = true, onUseAccountsChange }: {
  accounts: any[];
  searchValue: string;
  onSearchChange: (v: string) => void;
  selectedAccounts: Set<string>;
  onToggle: (code: string) => void;
  onSelectAll: () => void;
  label?: string;
  checkboxId?: string;
  useAccounts?: boolean;
  onUseAccountsChange?: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildCOATree(accounts), [accounts]);
  const filtered = useMemo(() => filterCOATree(tree, searchValue), [tree, searchValue]);

  const toggleExpand = useCallback((code: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(accounts.map((a: any) => a.acct_code)));
  }, [accounts]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {onUseAccountsChange ? (
          <>
            <Checkbox id={checkboxId} checked={useAccounts} onCheckedChange={(v) => onUseAccountsChange(v as boolean)} />
            <Label htmlFor={checkboxId} className="text-sm font-semibold">{label}</Label>
          </>
        ) : (
          <Label className="text-sm font-semibold">{label}</Label>
        )}
        <div className="flex-1" />
        <Input className="h-7 w-32 text-xs" value={searchValue} onChange={e => onSearchChange(e.target.value)} placeholder={t('common.searchPlaceholder')} />
      </div>
      <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto bg-card">
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/50">
          <span className="text-[10px] text-muted-foreground font-medium w-16">#</span>
          <span className="text-[10px] text-muted-foreground font-medium w-6">x</span>
          <span className="text-[10px] text-muted-foreground font-medium flex-1">Account</span>
          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={expandAll}>Expand</Button>
        </div>
        {filtered.map(node => (
          <COASelectionNode key={node.acct_code} node={node} depth={0} expanded={expanded} toggleExpand={toggleExpand} selectedAccounts={selectedAccounts} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function COASelectionNode({ node, depth, expanded, toggleExpand, selectedAccounts, onToggle }: {
  node: COANode; depth: number; expanded: Set<string>; toggleExpand: (code: string) => void; selectedAccounts: Set<string>; onToggle: (code: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.acct_code);
  const isSelected = selectedAccounts.has(node.acct_code);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-[3px] pr-2 cursor-pointer transition-colors text-[12px] leading-tight select-none',
          isSelected ? 'bg-primary/15 text-primary' : 'hover:bg-accent/40',
          hasChildren && 'font-semibold'
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={() => {
          onToggle(node.acct_code);
          if (hasChildren) toggleExpand(node.acct_code);
        }}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-14">{node.acct_code}</span>
        <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
        <span className="truncate ml-1">{node.acct_name}</span>
      </div>
      {isExpanded && hasChildren && node.children.map(child => (
        <COASelectionNode key={child.acct_code} node={child} depth={depth + 1} expanded={expanded} toggleExpand={toggleExpand} selectedAccounts={selectedAccounts} onToggle={onToggle} />
      ))}
    </div>
  );
}

const AGING_BUCKETS = [
  { label: '0-30 Days', min: 0, max: 30 },
  { label: '31-60 Days', min: 31, max: 60 },
  { label: '61-90 Days', min: 61, max: 90 },
  { label: '90+ Days', min: 91, max: 9999 },
];

function calcDaysOverdue(dueDate: string) {
  if (!dueDate) return 0;
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

function SAPCriteriaHeader({ title }: { title: string }) {
  return (
    <div className="bg-primary px-4 py-2 rounded-t-lg">
      <h2 className="text-sm font-semibold text-primary-foreground">{title}</h2>
    </div>
  );
}

function SAPFooterBar({ onOK, onCancel, extra }: { onOK: () => void; onCancel: () => void; extra?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border mt-4">
      <Button size="sm" onClick={onOK} className="min-w-[80px]">OK</Button>
      <Button size="sm" variant="secondary" onClick={onCancel} className="min-w-[80px]">{t('common.cancel')}</Button>
      <div className="flex-1" />
      {extra}
    </div>
  );
}

// Helper to apply company filter to a Supabase query
function applyCompanyFilter(query: any, companyIds: string[]) {
  if (companyIds.length > 0) {
    return query.in('company_id', companyIds);
  }
  return query;
}

export default function FinancialReports() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('gl-bp');

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-foreground">Financial Reports</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="gl-bp"><Users className="h-4 w-4 mr-1" />G/L Accounts & BP</TabsTrigger>
          <TabsTrigger value="general-ledger"><BookOpen className="h-4 w-4 mr-1" />General Ledger</TabsTrigger>
          <TabsTrigger value="cust-aging"><Calendar className="h-4 w-4 mr-1" />Customer Aging</TabsTrigger>
          <TabsTrigger value="vend-aging"><Calendar className="h-4 w-4 mr-1" />Vendor Aging</TabsTrigger>
          <TabsTrigger value="journal"><BookOpen className="h-4 w-4 mr-1" />Transaction Journal</TabsTrigger>
          <TabsTrigger value="by-project"><FileSpreadsheet className="h-4 w-4 mr-1" />By Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="gl-bp"><GLAccountsBPTab /></TabsContent>
        <TabsContent value="general-ledger"><GeneralLedgerTab /></TabsContent>
        <TabsContent value="cust-aging"><CustomerAgingTab /></TabsContent>
        <TabsContent value="vend-aging"><VendorAgingTab /></TabsContent>
        <TabsContent value="journal"><TransactionJournalTab /></TabsContent>
        <TabsContent value="by-project"><ProjectTransactionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* =============================================
   G/L ACCOUNTS & BP — SAP Style
   ============================================= */
function GLAccountsBPTab() {
  const { t } = useLanguage();
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const [useBP, setUseBP] = useState(true);
  const [displayLeads, setDisplayLeads] = useState(false);
  const [useGLAccounts, setUseGLAccounts] = useState(true);
  const [codeFrom, setCodeFrom] = useState('');
  const [codeTo, setCodeTo] = useState('');
  const [bpSearch, setBpSearch] = useState('');
  const [customerGroup, setCustomerGroup] = useState('all');
  const [vendorGroup, setVendorGroup] = useState('all');
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [findValue, setFindValue] = useState('');
  const { data: allAccounts = [] } = useChartOfAccounts(selectedCompanyIds.length > 0 ? selectedCompanyIds : undefined);
  const { data: businessPartners = [] } = useQuery({
    queryKey: ['fr-business-partners', selectedCompanyIds],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name, card_type, company_id').order('card_code');
      if (selectedCompanyIds.length > 0) q = q.in('company_id', selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  const filteredBPs = useMemo(() => {
    if (!bpSearch) return businessPartners;
    const q = bpSearch.toLowerCase();
    return businessPartners.filter((bp: any) => bp.card_code?.toLowerCase().includes(q) || bp.card_name?.toLowerCase().includes(q));
  }, [businessPartners, bpSearch]);

  const today = new Date().toISOString().split('T')[0];
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(startOfYear);
  const [dateTo, setDateTo] = useState(today);

  const arInvoices = useQuery({
    queryKey: ['fr-ar-invoices', dateFrom, dateTo, selectedCompanyIds],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const apInvoices = useQuery({
    queryKey: ['fr-ap-invoices', dateFrom, dateTo, selectedCompanyIds],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const payments = useQuery({
    queryKey: ['fr-payments', dateFrom, dateTo, selectedCompanyIds],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const glBpData = useMemo(() => {
    if (!reportGenerated) return [];
    const bpMap: Record<string, { name: string; debit: number; credit: number; balance: number }> = {};
    arInvoices.data?.forEach((inv: any) => {
      const key = inv.customer_code || inv.customer_name;
      if (!bpMap[key]) bpMap[key] = { name: inv.customer_name, debit: 0, credit: 0, balance: 0 };
      bpMap[key].debit += Number(inv.total || 0);
    });
    apInvoices.data?.forEach((inv: any) => {
      const key = inv.vendor_code || inv.vendor_name;
      if (!bpMap[key]) bpMap[key] = { name: inv.vendor_name, debit: 0, credit: 0, balance: 0 };
      bpMap[key].credit += Number(inv.total || 0);
    });
    payments.data?.forEach((p: any) => {
      const key = p.customer_code || p.customer_name;
      if (bpMap[key]) bpMap[key].credit += Number(p.total_amount || 0);
    });
    return Object.entries(bpMap).map(([code, val]) => ({ code, ...val, balance: val.debit - val.credit }));
  }, [reportGenerated, arInvoices.data, apInvoices.data, payments.data]);

  const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const toggleAccount = (code: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedAccounts(new Set(allAccounts.map((a: any) => a.acct_code)));
  };

  return (
    <div className="space-y-4">
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <SAPCriteriaHeader title="G/L Accounts and Business Partners - Selection Criteria" />
          <CardContent className="p-4 space-y-4">
            {/* Company Selection */}
            <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side: BP + filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox id="bp-check" checked={useBP} onCheckedChange={(v) => setUseBP(v as boolean)} />
                    <Label htmlFor="bp-check" className="text-sm font-semibold">BP</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="leads-check" checked={displayLeads} onCheckedChange={(v) => setDisplayLeads(v as boolean)} />
                    <Label htmlFor="leads-check" className="text-sm">Display Leads</Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm w-16">Code</Label>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input className="h-7 w-28 text-xs" value={codeFrom} onChange={e => setCodeFrom(e.target.value)} disabled={!useBP} />
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input className="h-7 w-28 text-xs" value={codeTo} onChange={e => setCodeTo(e.target.value)} disabled={!useBP} />
                </div>

                {useBP && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={bpSearch} onChange={e => setBpSearch(e.target.value)} placeholder="Search by code or name..." className="h-7 text-xs flex-1" />
                    </div>
                    <div className="border rounded-md max-h-36 overflow-y-auto bg-card">
                      {filteredBPs.length === 0 ? (
                        <p className="text-center py-3 text-xs text-muted-foreground">No partners found</p>
                      ) : filteredBPs.slice(0, 100).map((bp: any) => (
                        <div key={bp.id} className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent/50 text-xs border-b last:border-b-0"
                          onClick={() => { setCodeFrom(bp.card_code); setCodeTo(bp.card_code); }}>
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">{bp.card_code}</span>
                          <span className="text-muted-foreground/40">-</span>
                          <span className="truncate">{bp.card_name}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{bp.card_type === 'S' ? 'Vendor' : 'Customer'}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-sm w-28">Customer Group</Label>
                  <Select value={customerGroup} onValueChange={setCustomerGroup} disabled={!useBP}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm w-28">Vendor Group</Label>
                  <Select value={vendorGroup} onValueChange={setVendorGroup} disabled={!useBP}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="text-xs h-7">Properties</Button>
                  <Badge variant="secondary" className="text-xs">Ignore</Badge>
                </div>
              </div>

              {/* Right side: G/L Accounts tree */}
              <div className="space-y-2">
                <COASelectionTree
                  accounts={allAccounts}
                  searchValue={findValue}
                  onSearchChange={setFindValue}
                  selectedAccounts={selectedAccounts}
                  onToggle={toggleAccount}
                  onSelectAll={selectAll}
                  label="G/L Accounts"
                  checkboxId="gl-check"
                  useAccounts={useGLAccounts}
                  onUseAccountsChange={setUseGLAccounts}
                />
              </div>
            </div>

            <SAPFooterBar
              onOK={() => { setReportGenerated(true); setShowCriteria(false); }}
              onCancel={() => setShowCriteria(false)}
              extra={<Button variant="outline" size="sm" className="text-xs" onClick={selectAll}>Select All</Button>}
            />
          </CardContent>
        </Card>
      )}

      {reportGenerated && !showCriteria && (
        <Card>
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">G/L Accounts and Business Partners</span>
              {selectedCompanyIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCriteria(true)}>
                <Search className="h-3.5 w-3.5 mr-1" />Selection Criteria
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                const csv = ['BP Code,Name,Debit,Credit,Balance', ...glBpData.map(r => `${r.code},${r.name},${r.debit},${r.credit},${r.balance}`)].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gl-bp-report.csv'; a.click();
              }}>
                <Download className="h-3.5 w-3.5 mr-1" />Export
              </Button>
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">BP Code</TableHead>
                  <TableHead className="text-xs">{t('common.name')}</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glBpData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs py-1.5">{row.code}</TableCell>
                    <TableCell className="text-xs py-1.5">{row.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(row.debit)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(row.credit)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs py-1.5 font-bold", row.balance > 0 ? 'text-primary' : row.balance < 0 ? 'text-destructive' : '')}>{fmt(row.balance)}</TableCell>
                  </TableRow>
                ))}
                {glBpData.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-xs py-1.5">{t('common.total')}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(glBpData.reduce((s, r) => s + r.debit, 0))}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(glBpData.reduce((s, r) => s + r.credit, 0))}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(glBpData.reduce((s, r) => s + r.balance, 0))}</TableCell>
                  </TableRow>
                )}
                {glBpData.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">No data found. Adjust selection criteria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =============================================
   GENERAL LEDGER — SAP Style
   ============================================= */
function GeneralLedgerTab() {
  const { t } = useLanguage();
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [criteriaName, setCriteriaName] = useState('');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const [useBP, setUseBP] = useState(false);
  const [bpCodeFrom, setBpCodeFrom] = useState('');
  const [bpCodeTo, setBpCodeTo] = useState('');
  const [glBpSearch, setGlBpSearch] = useState('');
  const [selectedBPs, setSelectedBPs] = useState<Set<string>>(new Set());
  const [useAccounts, setUseAccounts] = useState(true);
  const [customerGroup, setCustomerGroup] = useState('all');
  const [vendorGroup, setVendorGroup] = useState('all');
  const [useControlAccts, setUseControlAccts] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [glFindValue, setGlFindValue] = useState('');
  const [reconciliationFilter, setReconciliationFilter] = useState<'all' | 'reconciled' | 'not_reconciled'>('all');
  const { data: glAllAccounts = [] } = useChartOfAccounts(selectedCompanyIds.length > 0 ? selectedCompanyIds : undefined);
  const { data: glBusinessPartners = [] } = useQuery({
    queryKey: ['gl-tab-business-partners', selectedCompanyIds],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name, card_type, group_code, company_id').order('card_code');
      if (selectedCompanyIds.length > 0) q = q.in('company_id', selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  // Derive unique groups for customers and vendors
  const customerGroups = useMemo(() => {
    const groups = new Set<string>();
    glBusinessPartners.filter((bp: any) => bp.card_type !== 'S').forEach((bp: any) => { if (bp.group_code) groups.add(bp.group_code); });
    return Array.from(groups).sort();
  }, [glBusinessPartners]);
  const vendorGroups = useMemo(() => {
    const groups = new Set<string>();
    glBusinessPartners.filter((bp: any) => bp.card_type === 'S').forEach((bp: any) => { if (bp.group_code) groups.add(bp.group_code); });
    return Array.from(groups).sort();
  }, [glBusinessPartners]);

  const glFilteredBPs = useMemo(() => {
    let list = glBusinessPartners;
    if (customerGroup !== 'all') list = list.filter((bp: any) => bp.card_type !== 'S' ? bp.group_code === customerGroup : true);
    if (vendorGroup !== 'all') list = list.filter((bp: any) => bp.card_type === 'S' ? bp.group_code === vendorGroup : true);
    if (glBpSearch) {
      const q = glBpSearch.toLowerCase();
      list = list.filter((bp: any) => bp.card_code?.toLowerCase().includes(q) || bp.card_name?.toLowerCase().includes(q));
    }
    return list;
  }, [glBusinessPartners, glBpSearch, customerGroup, vendorGroup]);

  const toggleBP = (code: string) => {
    setSelectedBPs(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  const currentYear = new Date().getFullYear();
  const [usePostingDate, setUsePostingDate] = useState(true);
  const [useDueDate, setUseDueDate] = useState(false);
  const [useDocDate, setUseDocDate] = useState(false);
  const [postingDateFrom, setPostingDateFrom] = useState(`${currentYear}-01-01`);
  const [postingDateTo, setPostingDateTo] = useState(`${currentYear}-12-31`);
  const [dueDateFrom, setDueDateFrom] = useState(`${currentYear}-01-01`);
  const [dueDateTo, setDueDateTo] = useState(`${currentYear}-12-31`);
  const [docDateFrom, setDocDateFrom] = useState(`${currentYear}-01-01`);
  const [docDateTo, setDocDateTo] = useState(`${currentYear}-12-31`);

  const [printSepPage, setPrintSepPage] = useState(false);
  const [printDirect, setPrintDirect] = useState(false);
  const [orderByCOA, setOrderByCOA] = useState(false);
  const [ignoreAdjustments, setIgnoreAdjustments] = useState(false);
  const [foreignNames, setForeignNames] = useState(false);
  const [summarizeControl, setSummarizeControl] = useState(false);
  const [hideZeroLC, setHideZeroLC] = useState(false);
  const [addJournalVouchers, setAddJournalVouchers] = useState(false);
  const [displayPostingsSummary, setDisplayPostingsSummary] = useState(false);
  const [showOpeningBalance, setShowOpeningBalance] = useState(true);
  const [obMode, setObMode] = useState<'company' | 'fiscal'>('company');
  const [displayPostings, setDisplayPostings] = useState('all');
  const [considerReconciliation, setConsiderReconciliation] = useState(false);
  const [hideZeroBalanced, setHideZeroBalanced] = useState(false);
  const [hideNoPostings, setHideNoPostings] = useState(true);
  const [sortAndSummarize, setSortAndSummarize] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);

  const dateFrom = usePostingDate ? postingDateFrom : (useDocDate ? docDateFrom : postingDateFrom);
  const dateTo = usePostingDate ? postingDateTo : (useDocDate ? docDateTo : postingDateTo);

  const { data: accounts = [] } = useQuery({
    queryKey: ['gl-report-accounts', selectedCompanyIds],
    queryFn: async () => {
      let q = supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('acct_code');
      if (selectedCompanyIds.length > 0) q = q.in('company_id', selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: arInvoices = [] } = useQuery({
    queryKey: ['gl-report-ar', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('doc_num, customer_name, customer_code, doc_date, total, subtotal, status').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date');
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });
  const { data: apInvoices = [] } = useQuery({
    queryKey: ['gl-report-ap', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('invoice_number, vendor_name, vendor_code, doc_date, total, subtotal, status').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date');
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ['gl-report-pay', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('payment_number, doc_date, total_amount, payment_method, customer_name, status').gte('doc_date', dateFrom).lte('doc_date', dateTo).order('doc_date');
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const glData = useMemo(() => {
    if (!reportGenerated) return [];
    const accountMap = new Map<string, { acct_code: string; acct_name: string; opening: number; debit: number; credit: number; closing: number }>();
    accounts.forEach((acc: any) => {
      accountMap.set(acc.acct_code, { acct_code: acc.acct_code, acct_name: acc.acct_name, opening: showOpeningBalance ? (acc.balance || 0) : 0, debit: 0, credit: 0, closing: acc.balance || 0 });
    });
    arInvoices.forEach((inv: any) => {
      const ra = accounts.find((a: any) => a.acct_name?.toLowerCase().includes('receivable'));
      if (ra && accountMap.has(ra.acct_code)) {
        const s = accountMap.get(ra.acct_code)!;
        s.debit += inv.total || 0;
        s.closing = s.opening + s.debit - s.credit;
      }
    });
    apInvoices.forEach((inv: any) => {
      const pa = accounts.find((a: any) => a.acct_name?.toLowerCase().includes('payable'));
      if (pa && accountMap.has(pa.acct_code)) {
        const s = accountMap.get(pa.acct_code)!;
        s.credit += inv.total || 0;
        s.closing = s.opening + s.debit - s.credit;
      }
    });
    payments.forEach((pmt: any) => {
      const ca = accounts.find((a: any) => a.acct_name?.toLowerCase().includes('cash') || a.acct_name?.toLowerCase().includes('bank'));
      if (ca && accountMap.has(ca.acct_code)) {
        const s = accountMap.get(ca.acct_code)!;
        s.debit += pmt.total_amount || 0;
        s.closing = s.opening + s.debit - s.credit;
      }
    });
    let result = Array.from(accountMap.values());
    if (hideNoPostings) result = result.filter(a => a.debit > 0 || a.credit > 0 || a.opening !== 0);
    if (hideZeroBalanced) result = result.filter(a => a.closing !== 0);
    if (reconciliationFilter === 'reconciled') result = result.filter(a => Math.abs(a.closing) < 0.01);
    if (reconciliationFilter === 'not_reconciled') result = result.filter(a => Math.abs(a.closing) >= 0.01);
    return result;
  }, [reportGenerated, accounts, arInvoices, apInvoices, payments, showOpeningBalance, hideNoPostings, hideZeroBalanced]);

  const totals = useMemo(() => ({
    debit: glData.reduce((s, a) => s + a.debit, 0),
    credit: glData.reduce((s, a) => s + a.credit, 0),
    closing: glData.reduce((s, a) => s + a.closing, 0),
  }), [glData]);

  const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const toggleAccount = (code: string) => {
    setSelectedAccounts(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  return (
    <div className="space-y-4">
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <SAPCriteriaHeader title="General Ledger - Selection Criteria" />
          <CardContent className="p-4 space-y-4">
            {/* Company Selection */}
            <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />

            <div className="flex items-center gap-2">
              <Label className="text-sm w-40 shrink-0">Selection Criteria Name</Label>
              <Input className="h-7 text-xs flex-1" value={criteriaName} onChange={e => setCriteriaName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="gl-bp" checked={useBP} onCheckedChange={(v) => setUseBP(v as boolean)} />
                  <Label htmlFor="gl-bp" className="text-sm font-semibold">Business Partner</Label>
                  {selectedBPs.size > 0 && <Badge variant="secondary" className="text-[10px]">{selectedBPs.size} selected</Badge>}
                </div>
                {useBP && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={glBpSearch} onChange={e => setGlBpSearch(e.target.value)} placeholder="Search by code or name..." className="h-7 text-xs flex-1" />
                      <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setSelectedBPs(new Set(glFilteredBPs.map((bp: any) => bp.card_code)))}>Select All</Button>
                      <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setSelectedBPs(new Set())}>Clear</Button>
                    </div>
                    <div className="border rounded-md max-h-40 overflow-y-auto bg-card">
                      {glFilteredBPs.length === 0 ? (
                        <p className="text-center py-3 text-xs text-muted-foreground">No partners found</p>
                      ) : glFilteredBPs.slice(0, 200).map((bp: any) => (
                        <div key={bp.id} className={cn(
                          "flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent/50 text-xs border-b last:border-b-0",
                          selectedBPs.has(bp.card_code) && "bg-primary/10"
                        )} onClick={() => toggleBP(bp.card_code)}>
                          <Checkbox checked={selectedBPs.has(bp.card_code)} className="h-3.5 w-3.5" onCheckedChange={() => toggleBP(bp.card_code)} />
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">{bp.card_code}</span>
                          <span className="text-muted-foreground/40">-</span>
                          <span className="truncate">{bp.card_name}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{bp.card_type === 'S' ? 'Vendor' : bp.card_type === 'L' ? 'Lead' : 'Customer'}</Badge>
                          {bp.group_code && <Badge variant="secondary" className="text-[9px] shrink-0">{bp.group_code}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-sm w-28">Customer Group</Label>
                  <Select value={customerGroup} onValueChange={setCustomerGroup} disabled={!useBP}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customer Groups</SelectItem>
                      {customerGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm w-28">Vendor Group</Label>
                  <Select value={vendorGroup} onValueChange={setVendorGroup} disabled={!useBP}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendor Groups</SelectItem>
                      {vendorGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="text-xs h-7">Properties</Button>
                  <Badge variant="secondary" className="text-xs">Ignore</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="gl-ctrl" checked={useControlAccts} onCheckedChange={(v) => setUseControlAccts(v as boolean)} />
                  <Label htmlFor="gl-ctrl" className="text-sm">Control Accts</Label>
                  <Button variant="outline" size="sm" className="h-7 w-8 text-xs">...</Button>
                </div>
              </div>

              <div className="space-y-2">
                <COASelectionTree
                  accounts={glAllAccounts}
                  searchValue={glFindValue}
                  onSearchChange={setGlFindValue}
                  selectedAccounts={selectedAccounts}
                  onToggle={toggleAccount}
                  onSelectAll={() => setSelectedAccounts(new Set(glAllAccounts.map((a: any) => a.acct_code)))}
                  label="Accounts"
                  checkboxId="gl-accts"
                  useAccounts={useAccounts}
                  onUseAccountsChange={setUseAccounts}
                />
              </div>
            </div>

            {/* Date Ranges */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-sm font-semibold">Selection</Label>
              <div className="space-y-1.5">
                {[
                  { label: 'Posting Date', checked: usePostingDate, setChecked: setUsePostingDate, from: postingDateFrom, setFrom: setPostingDateFrom, to: postingDateTo, setTo: setPostingDateTo },
                  { label: 'Due Date', checked: useDueDate, setChecked: setUseDueDate, from: dueDateFrom, setFrom: setDueDateFrom, to: dueDateTo, setTo: setDueDateTo },
                  { label: 'Document Date', checked: useDocDate, setChecked: setUseDocDate, from: docDateFrom, setFrom: setDocDateFrom, to: docDateTo, setTo: setDocDateTo },
                ].map(({ label, checked, setChecked, from, setFrom, to, setTo }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v as boolean)} />
                    <Label className="text-sm w-28">{label}</Label>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input type="date" className="h-7 w-36 text-xs" value={from} onChange={e => setFrom(e.target.value)} disabled={!checked} />
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input type="date" className="h-7 w-36 text-xs" value={to} onChange={e => setTo(e.target.value)} disabled={!checked} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant={showExpanded ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setShowExpanded(!showExpanded)}>Expanded</Button>
              </div>
            </div>

            {showExpanded && (
              <div className="border-t pt-3 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1.5">
                <div className="space-y-1.5">
                  {[
                    { label: 'Print Each Account on Sep. Page', checked: printSepPage, set: setPrintSepPage },
                    { label: 'Print Directly to Printer', checked: printDirect, set: setPrintDirect },
                    { label: 'Order Acct by Chart of Accounts', checked: orderByCOA, set: setOrderByCOA },
                    { label: 'Ignore Adjustments', checked: ignoreAdjustments, set: setIgnoreAdjustments },
                    { label: 'Foreign Names', checked: foreignNames, set: setForeignNames },
                    { label: 'Summarize Control Accounts', checked: summarizeControl, set: setSummarizeControl },
                    { label: 'Hide Zero Value LC Rows', checked: hideZeroLC, set: setHideZeroLC },
                    { label: 'Add Journal Vouchers', checked: addJournalVouchers, set: setAddJournalVouchers },
                  ].map(({ label, checked, set }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Checkbox checked={checked} onCheckedChange={(v) => set(v as boolean)} />
                      <Label className="text-xs">{label}</Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={displayPostingsSummary} onCheckedChange={(v) => setDisplayPostingsSummary(v as boolean)} />
                    <Label className="text-xs">Display Postings Summary</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={showOpeningBalance} onCheckedChange={(v) => setShowOpeningBalance(v as boolean)} />
                    <Label className="text-xs font-semibold">Opening Balance for Period</Label>
                  </div>
                  <RadioGroup value={obMode} onValueChange={(v) => setObMode(v as 'company' | 'fiscal')} className="ml-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="company" id="ob-company" />
                      <Label htmlFor="ob-company" className="text-xs">OB from Start of Company Activity</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="fiscal" id="ob-fiscal" />
                      <Label htmlFor="ob-fiscal" className="text-xs">OB from Start of Fiscal Year</Label>
                    </div>
                  </RadioGroup>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-16">Display</Label>
                    <Select value={displayPostings} onValueChange={setDisplayPostings}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Postings</SelectItem>
                        <SelectItem value="debit">Debit Only</SelectItem>
                        <SelectItem value="credit">Credit Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={considerReconciliation} onCheckedChange={(v) => setConsiderReconciliation(v as boolean)} />
                    <Label className="text-xs">Consider Reconciliation Date</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-28">Reconciliation</Label>
                    <Select value={reconciliationFilter} onValueChange={(v) => setReconciliationFilter(v as any)}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        <SelectItem value="reconciled">Reconciled Only</SelectItem>
                        <SelectItem value="not_reconciled">Not Reconciled Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={hideZeroBalanced} onCheckedChange={(v) => setHideZeroBalanced(v as boolean)} />
                    <Label className="text-xs">Hide Zero Balanced Acct</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={hideNoPostings} onCheckedChange={(v) => setHideNoPostings(v as boolean)} />
                    <Label className="text-xs">Hide Acct with no Postings</Label>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={sortAndSummarize} onCheckedChange={(v) => setSortAndSummarize(v as boolean)} />
                <Label className="text-sm">Sort and Summarize</Label>
              </div>
            </div>

            <SAPFooterBar
              onOK={() => { setReportGenerated(true); setShowCriteria(false); }}
              onCancel={() => setShowCriteria(false)}
              extra={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs">{t('common.save')}</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedAccounts(new Set(glAllAccounts.map((a: any) => a.acct_code)))}>Select All</Button>
                  <Button variant="outline" size="sm" className="text-xs">Revaluation</Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      )}

      {reportGenerated && !showCriteria && (
        <Card>
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">General Ledger</span>
              {selectedCompanyIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCriteria(true)}>
                <Search className="h-3.5 w-3.5 mr-1" />Selection Criteria
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />Export
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" />Print
              </Button>
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Acct Code</TableHead>
                  <TableHead className="text-xs">Account Name</TableHead>
                  <TableHead className="text-xs text-right">Opening Balance</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs text-right">Closing Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {glData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs py-1.5">{row.acct_code}</TableCell>
                    <TableCell className="text-xs py-1.5">{row.acct_name}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(row.opening)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(row.debit)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(row.credit)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs py-1.5 font-bold", row.closing > 0 ? 'text-primary' : row.closing < 0 ? 'text-destructive' : '')}>{fmt(row.closing)}</TableCell>
                  </TableRow>
                ))}
                {glData.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3} className="text-xs py-1.5">{t('common.total')}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(totals.debit)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(totals.credit)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(totals.closing)}</TableCell>
                  </TableRow>
                )}
                {glData.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">No data found. Adjust selection criteria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =============================================
   CUSTOMER AGING — SAP Style
   ============================================= */
function CustomerAgingTab() {
  const { t } = useLanguage();
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [customerGroup, setCustomerGroup] = useState('all');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const { companies } = useSAPCompanies();

  const arInvoices = useQuery({
    queryKey: ['aging-ar-invoices', selectedCompanyIds],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('*').order('doc_date', { ascending: false });
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const customerAging = useMemo(() => {
    if (!reportGenerated) return [];
    const openInvoices = arInvoices.data?.filter((i: any) => i.status !== 'closed' && (i.balance_due || 0) > 0) || [];
    const custMap: Record<string, { name: string; buckets: number[]; total: number; companyId?: string }> = {};
    openInvoices.forEach((inv: any) => {
      const key = inv.customer_code || inv.customer_name;
      if (!custMap[key]) custMap[key] = { name: inv.customer_name, buckets: [0, 0, 0, 0], total: 0, companyId: inv.company_id };
      const days = calcDaysOverdue(inv.doc_due_date || inv.doc_date);
      const amt = Number(inv.balance_due || inv.total || 0);
      const bucketIdx = AGING_BUCKETS.findIndex(b => days >= b.min && days <= b.max);
      if (bucketIdx >= 0) custMap[key].buckets[bucketIdx] += amt;
      custMap[key].total += amt;
    });
    return Object.entries(custMap).map(([code, val]) => ({ code, ...val }));
  }, [reportGenerated, arInvoices.data]);

  const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <SAPCriteriaHeader title="Customer Receivables Aging - Selection Criteria" />
          <CardContent className="p-4 space-y-3">
            <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />
            <div className="flex items-center gap-2">
              <Label className="text-sm w-28">Customer Group</Label>
              <Select value={customerGroup} onValueChange={setCustomerGroup}>
                <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
              </Select>
            </div>
            <SAPFooterBar onOK={() => { setReportGenerated(true); setShowCriteria(false); }} onCancel={() => setShowCriteria(false)} />
          </CardContent>
        </Card>
      )}

      {reportGenerated && !showCriteria && (
        <Card>
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Customer Receivables Aging</span>
              {selectedCompanyIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCriteria(true)}>
              <Search className="h-3.5 w-3.5 mr-1" />Selection Criteria
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Customer Code</TableHead>
                  <TableHead className="text-xs">{t('common.name')}</TableHead>
                  {AGING_BUCKETS.map(b => <TableHead key={b.label} className="text-xs text-right">{b.label}</TableHead>)}
                  <TableHead className="text-xs text-right font-bold">{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerAging.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs py-1.5">{row.code}</TableCell>
                    <TableCell className="text-xs py-1.5">{row.name}</TableCell>
                    {row.buckets.map((v, bi) => <TableCell key={bi} className={cn("text-right font-mono text-xs py-1.5", bi >= 2 && v > 0 && 'text-destructive font-bold')}>{fmt(v)}</TableCell>)}
                    <TableCell className="text-right font-mono text-xs py-1.5 font-bold">{fmt(row.total)}</TableCell>
                  </TableRow>
                ))}
                {customerAging.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No open receivables</TableCell></TableRow>}
                {customerAging.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-xs py-1.5">{t('common.total')}</TableCell>
                    {[0, 1, 2, 3].map(bi => <TableCell key={bi} className="text-right font-mono text-xs py-1.5">{fmt(customerAging.reduce((s, r) => s + r.buckets[bi], 0))}</TableCell>)}
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(customerAging.reduce((s, r) => s + r.total, 0))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =============================================
   VENDOR AGING — SAP Style
   ============================================= */
function VendorAgingTab() {
  const { t } = useLanguage();
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [vendorGroup, setVendorGroup] = useState('all');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const apInvoices = useQuery({
    queryKey: ['aging-ap-invoices', selectedCompanyIds],
    enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('*').order('doc_date', { ascending: false });
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const vendorAging = useMemo(() => {
    if (!reportGenerated) return [];
    const openInvoices = apInvoices.data?.filter((i: any) => i.status !== 'closed') || [];
    const vendMap: Record<string, { name: string; buckets: number[]; total: number }> = {};
    openInvoices.forEach((inv: any) => {
      const key = inv.vendor_code || inv.vendor_name;
      if (!vendMap[key]) vendMap[key] = { name: inv.vendor_name, buckets: [0, 0, 0, 0], total: 0 };
      const days = calcDaysOverdue(inv.doc_due_date || inv.doc_date);
      const amt = Number(inv.total || 0);
      const bucketIdx = AGING_BUCKETS.findIndex(b => days >= b.min && days <= b.max);
      if (bucketIdx >= 0) vendMap[key].buckets[bucketIdx] += amt;
      vendMap[key].total += amt;
    });
    return Object.entries(vendMap).map(([code, val]) => ({ code, ...val }));
  }, [reportGenerated, apInvoices.data]);

  const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <SAPCriteriaHeader title="Vendor Liabilities Aging - Selection Criteria" />
          <CardContent className="p-4 space-y-3">
            <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />
            <div className="flex items-center gap-2">
              <Label className="text-sm w-28">Vendor Group</Label>
              <Select value={vendorGroup} onValueChange={setVendorGroup}>
                <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem></SelectContent>
              </Select>
            </div>
            <SAPFooterBar onOK={() => { setReportGenerated(true); setShowCriteria(false); }} onCancel={() => setShowCriteria(false)} />
          </CardContent>
        </Card>
      )}

      {reportGenerated && !showCriteria && (
        <Card>
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Vendor Liabilities Aging</span>
              {selectedCompanyIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCriteria(true)}>
              <Search className="h-3.5 w-3.5 mr-1" />Selection Criteria
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Vendor Code</TableHead>
                  <TableHead className="text-xs">{t('common.name')}</TableHead>
                  {AGING_BUCKETS.map(b => <TableHead key={b.label} className="text-xs text-right">{b.label}</TableHead>)}
                  <TableHead className="text-xs text-right font-bold">{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorAging.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs py-1.5">{row.code}</TableCell>
                    <TableCell className="text-xs py-1.5">{row.name}</TableCell>
                    {row.buckets.map((v, bi) => <TableCell key={bi} className={cn("text-right font-mono text-xs py-1.5", bi >= 2 && v > 0 && 'text-destructive font-bold')}>{fmt(v)}</TableCell>)}
                    <TableCell className="text-right font-mono text-xs py-1.5 font-bold">{fmt(row.total)}</TableCell>
                  </TableRow>
                ))}
                {vendorAging.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">No open liabilities</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =============================================
   TRANSACTION JOURNAL — SAP Style
   ============================================= */
function TransactionJournalTab() {
  const { t } = useLanguage();
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(startOfYear);
  const [dateTo, setDateTo] = useState(today);
  const [docType, setDocType] = useState('all');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const arInvoices = useQuery({
    queryKey: ['tj-ar', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
  });
  const apInvoices = useQuery({
    queryKey: ['tj-ap', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
  });
  const payments = useQuery({
    queryKey: ['tj-pay', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
  });

  const journalEntries = useMemo(() => {
    if (!reportGenerated) return [];
    const entries: any[] = [];
    if (docType === 'all' || docType === 'ar') arInvoices.data?.forEach((inv: any) => entries.push({ date: inv.doc_date, type: 'AR Invoice', docNum: inv.doc_num, bp: inv.customer_name, debit: inv.total, credit: 0, ref: inv.sap_doc_entry }));
    if (docType === 'all' || docType === 'ap') apInvoices.data?.forEach((inv: any) => entries.push({ date: inv.doc_date, type: 'AP Invoice', docNum: inv.invoice_number, bp: inv.vendor_name, debit: 0, credit: inv.total, ref: inv.sap_doc_entry }));
    if (docType === 'all' || docType === 'payment') payments.data?.forEach((p: any) => entries.push({ date: p.doc_date, type: 'Payment', docNum: p.doc_num, bp: p.customer_name, debit: 0, credit: p.total_amount, ref: p.sap_doc_entry }));
    return entries.sort((a, b) => b.date?.localeCompare(a.date));
  }, [reportGenerated, arInvoices.data, apInvoices.data, payments.data, docType]);

  const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <SAPCriteriaHeader title="Transaction Journal - Selection Criteria" />
          <CardContent className="p-4 space-y-3">
            <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />
            <div className="flex items-center gap-2">
              <Checkbox defaultChecked />
              <Label className="text-sm w-28">Posting Date</Label>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="h-7 w-36 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" className="h-7 w-36 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm w-28">Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ar">AR Invoices</SelectItem>
                  <SelectItem value="ap">AP Invoices</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SAPFooterBar onOK={() => { setReportGenerated(true); setShowCriteria(false); }} onCancel={() => setShowCriteria(false)} />
          </CardContent>
        </Card>
      )}

      {reportGenerated && !showCriteria && (
        <Card>
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Transaction Journal Report</span>
              {selectedCompanyIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCriteria(true)}>
              <Search className="h-3.5 w-3.5 mr-1" />Selection Criteria
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">{t('common.date')}</TableHead>
                  <TableHead className="text-xs">{t('common.type')}</TableHead>
                  <TableHead className="text-xs">Doc #</TableHead>
                  <TableHead className="text-xs">Business Partner</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs">SAP Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.slice(0, 200).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{e.date}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs py-1.5">{e.docNum}</TableCell>
                    <TableCell className="text-xs py-1.5">{e.bp}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{e.debit ? fmt(e.debit) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{e.credit ? fmt(e.credit) : '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground py-1.5">{e.ref || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {journalEntries.length > 200 && <p className="text-xs text-muted-foreground p-2">Showing first 200 of {journalEntries.length} entries</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =============================================
   BY PROJECTS — SAP Style
   ============================================= */
function ProjectTransactionsTab() {
  const { t } = useLanguage();
  const [showCriteria, setShowCriteria] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const [dateFrom, setDateFrom] = useState(startOfYear);
  const [dateTo, setDateTo] = useState(today);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  const { data: projects } = useQuery({
    queryKey: ['projects-list', selectedCompanyIds],
    queryFn: async () => {
      let q = supabase.from('projects').select('id, name, company_id');
      if (selectedCompanyIds.length > 0) q = q.in('company_id', selectedCompanyIds);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
  });

  const apInvoices = useQuery({
    queryKey: ['proj-ap', dateFrom, dateTo, selectedCompanyIds], enabled: reportGenerated,
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('*').order('doc_date', { ascending: false });
      if (dateFrom) q = q.gte('doc_date', dateFrom);
      if (dateTo) q = q.lte('doc_date', dateTo);
      q = applyCompanyFilter(q, selectedCompanyIds);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
  });

  const projectTransactions = useMemo(() => {
    if (!reportGenerated) return [];
    const pMap: Record<string, { name: string; arTotal: number; apTotal: number; payTotal: number }> = {};
    apInvoices.data?.filter((i: any) => i.project_id).forEach((inv: any) => {
      const p = projects?.find((pr: any) => pr.id === inv.project_id);
      const key = inv.project_id;
      if (!pMap[key]) pMap[key] = { name: p?.name || inv.project_id, arTotal: 0, apTotal: 0, payTotal: 0 };
      pMap[key].apTotal += Number(inv.total || 0);
    });
    return Object.entries(pMap).map(([id, val]) => ({ id, ...val, net: val.arTotal - val.apTotal + val.payTotal }));
  }, [reportGenerated, apInvoices.data, projects]);

  const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {showCriteria && (
        <Card className="border-2 border-primary/30">
          <SAPCriteriaHeader title="Transaction Report by Projects - Selection Criteria" />
          <CardContent className="p-4 space-y-3">
            <CompanyMultiSelect selectedIds={selectedCompanyIds} onChange={setSelectedCompanyIds} />
            <div className="flex items-center gap-2">
              <Checkbox defaultChecked />
              <Label className="text-sm w-28">Posting Date</Label>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="h-7 w-36 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" className="h-7 w-36 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <SAPFooterBar onOK={() => { setReportGenerated(true); setShowCriteria(false); }} onCancel={() => setShowCriteria(false)} />
          </CardContent>
        </Card>
      )}

      {reportGenerated && !showCriteria && (
        <Card>
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Transaction Report by Projects</span>
              {selectedCompanyIds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCriteria(true)}>
              <Search className="h-3.5 w-3.5 mr-1" />Selection Criteria
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs text-right">AR Total</TableHead>
                  <TableHead className="text-xs text-right">AP Total</TableHead>
                  <TableHead className="text-xs text-right">Payments</TableHead>
                  <TableHead className="text-xs text-right font-bold">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTransactions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{p.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(p.arTotal)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(p.apTotal)}</TableCell>
                    <TableCell className="text-right font-mono text-xs py-1.5">{fmt(p.payTotal)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs py-1.5 font-bold", p.net >= 0 ? 'text-primary' : 'text-destructive')}>{fmt(p.net)}</TableCell>
                  </TableRow>
                ))}
                {projectTransactions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">No project transactions found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
