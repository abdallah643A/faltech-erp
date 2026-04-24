import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, BookOpen, Plus, PanelLeftClose, PanelLeft, FileText, ChevronsUpDown, ChevronsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { COATreeItem, buildTree, filterTree, type Account, type TreeNode } from '@/components/coa/COATreeItem';
import { COADetailPanel, type COADetailPanelHandle } from '@/components/coa/COADetailPanel';
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { RouteUnsavedGuard } from '@/components/shared/RouteUnsavedGuard';
import { COACategoryTabs } from '@/components/coa/COACategoryTabs';
import { COAAccountDialog } from '@/components/coa/COAAccountDialog';
import { COABalanceDrilldown } from '@/components/coa/COABalanceDrilldown';
import { COAAccountDetailsDialog } from '@/components/coa/COAAccountDetailsDialog';
import { useActiveCompany } from '@/hooks/useActiveCompany';

const coaColumns: ColumnDef[] = [
  { key: 'acct_code', header: 'Account Code' },
  { key: 'acct_name', header: 'Account Name' },
  { key: 'acct_type', header: 'Type' },
  { key: 'acct_level', header: 'Level' },
  { key: 'father_acct_code', header: 'Parent Account' },
  { key: 'balance', header: 'Balance' },
  { key: 'is_active', header: 'Active' },
];

export default function ChartOfAccounts() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const isAr = language === 'ar';
  const toolbarButtonClassName = 'h-7 text-[11px] gap-1';
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Account | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const detailPanelRef = useRef<COADetailPanelHandle>(null);
  const guard = useUnsavedChangesGuard(isDirty);

  // Guarded account selection
  const handleSelectAccount = useCallback((account: Account) => {
    guard.guardAction(() => setSelected(account));
  }, [guard]);

  // Wire save callback via useEffect to avoid calling setState during render
  const saveRef = useRef(async () => {
    if (detailPanelRef.current) await detailPanelRef.current.save();
  });
  useEffect(() => {
    guard.setSaveCallback(saveRef.current);
  }, []);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['chartOfAccounts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('chart_of_accounts').select('*').order('acct_code');
      if (activeCompanyId) {
        q = q.eq('company_id', activeCompanyId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Account[];
    },
  });

  const rootAncestorMap = useMemo(() => {
    if (!accounts) return new Map<string, string>();
    const codeToParent = new Map<string, string | null>();
    for (const a of accounts) codeToParent.set(a.acct_code, a.father_acct_code);
    const cache = new Map<string, string>();
    function findRoot(code: string): string {
      if (cache.has(code)) return cache.get(code)!;
      const parent = codeToParent.get(code);
      if (!parent) { cache.set(code, code); return code; }
      const root = findRoot(parent);
      cache.set(code, root);
      return root;
    }
    const map = new Map<string, string>();
    for (const a of accounts) map.set(a.acct_code, findRoot(a.acct_code));
    return map;
  }, [accounts]);

  const depthMap = useMemo(() => {
    if (!accounts) return new Map<string, number>();
    const codeToParent = new Map<string, string | null>();
    for (const a of accounts) codeToParent.set(a.acct_code, a.father_acct_code);
    const cache = new Map<string, number>();
    function getDepth(code: string): number {
      if (cache.has(code)) return cache.get(code)!;
      const parent = codeToParent.get(code);
      if (!parent) { cache.set(code, 1); return 1; }
      const d = getDepth(parent) + 1;
      cache.set(code, d);
      return d;
    }
    const map = new Map<string, number>();
    for (const a of accounts) map.set(a.acct_code, getDepth(a.acct_code));
    return map;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    let filtered = accounts;
    if (activeCategory) {
      filtered = filtered.filter(a => rootAncestorMap.get(a.acct_code) === activeCategory);
    }
    if (levelFilter) {
      const maxLevel = parseInt(levelFilter);
      if (!isNaN(maxLevel)) {
        filtered = filtered.filter(a => (depthMap.get(a.acct_code) ?? 1) <= maxLevel);
      }
    }
    return filtered;
  }, [accounts, activeCategory, levelFilter, rootAncestorMap, depthMap]);

  const tree = useMemo(() => {
    return filterTree(buildTree(filteredAccounts), searchQuery);
  }, [filteredAccounts, searchQuery]);

  const collectCodes = (nodes: TreeNode[], depth = 0, maxDepth = 1): string[] => {
    if (depth > maxDepth) return [];
    return nodes.flatMap(n => [n.account.acct_code, ...collectCodes(n.children, depth + 1, maxDepth)]);
  };

  const handleCategoryChange = (cat: string | null) => {
    setActiveCategory(cat);
    const catAccounts = cat
      ? (accounts || []).filter(a => rootAncestorMap.get(a.acct_code) === cat)
      : (accounts || []);
    const newTree = filterTree(buildTree(catAccounts), searchQuery);
    setExpanded(new Set(collectCodes(newTree, 0, 2)));
  };

  const toggleExpand = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const expandAllNodes = () => {
    if (!accounts) return;
    setExpanded(new Set(accounts.map(a => a.acct_code)));
  };

  const collapseAll = () => setExpanded(new Set());

  // Compute suggested code: selected account code + 1
  const suggestedNewCode = useMemo(() => {
    if (!selected) return '';
    const code = selected.acct_code;
    const match = code.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10) + 1;
      return prefix + num.toString().padStart(match[2].length, '0');
    }
    return code + '1';
  }, [selected]);

  // When adding: parent = selected account's parent, level = selected account's level
  const addParentCode = selected?.father_acct_code || '';
  const addLevel = selected ? (depthMap.get(selected.acct_code) ?? selected.acct_level ?? 1) : 1;

  const handleAddAccount = () => {
    setEditAccount(null);
    setDialogOpen(true);
  };

  const handleAccountDetails = () => {
    if (!selected) {
      toast({ title: isAr ? 'اختر حساباً أولاً' : 'Select an account first', variant: 'destructive' });
      return;
    }
    setDetailsOpen(true);
  };

  const totalAccounts = accounts?.length || 0;
  const titleAccounts = accounts?.filter(a => {
    const hasChildren = accounts.some(c => c.father_acct_code === a.acct_code);
    return hasChildren;
  }).length || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] page-enter">
      {/* SAP-style Window Title Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-background)/0.85)] text-sidebar-foreground px-4 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <h1 className="text-sm font-semibold">{isAr ? 'دليل الحسابات' : 'Chart of Accounts'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="h-7 text-[11px] gap-1" onClick={handleAddAccount}>
            <Plus className="h-3.5 w-3.5" /> {isAr ? 'إضافة' : 'Add'}
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-[11px] gap-1" onClick={handleAccountDetails}>
            <FileText className="h-3.5 w-3.5" /> {isAr ? 'تفاصيل الحساب' : 'Account Details'}
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-[11px] gap-1 px-2" onClick={expandAllNodes}>
            <ChevronsDown className="h-3.5 w-3.5" /> {isAr ? 'توسيع' : 'Expand'}
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-[11px] gap-1 px-2" onClick={collapseAll}>
            <ChevronsUpDown className="h-3.5 w-3.5" /> {isAr ? 'طي' : 'Collapse'}
          </Button>
          <SAPSyncButton entity="chart_of_accounts" size="sm" variant="secondary" className={toolbarButtonClassName} />
          <ExportImportButtons
            data={accounts || []}
            columns={coaColumns}
            filename="chart-of-accounts"
            title="Chart of Accounts"
            buttonVariant="secondary"
            buttonClassName={toolbarButtonClassName}
            onImport={async (rows) => {
              const mapped = rows.map((r: any) => ({
                acct_code: String(r['Account Code'] || r.acct_code || ''),
                acct_name: String(r['Account Name'] || r.acct_name || ''),
                acct_type: r['Type'] || r.acct_type || null,
                acct_level: r['Level'] != null ? Number(r['Level'] || r.acct_level) : null,
                father_acct_code: r['Parent Account'] || r.father_acct_code || null,
                is_active: r['Active'] != null ? String(r['Active'] || r.is_active).toLowerCase() !== 'false' : true,
                company_id: activeCompanyId || null,
              })).filter((r: any) => r.acct_code);
              if (!mapped.length) throw new Error(isAr ? 'لا توجد بيانات صالحة' : 'No valid data found');
              const { error } = await supabase.from('chart_of_accounts').upsert(mapped, { onConflict: 'acct_code,company_id' });
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] });
            }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className={`flex-1 grid border border-t-0 border-border rounded-b-md overflow-hidden bg-card`}
        style={{ gridTemplateColumns: sidebarOpen ? '280px 1fr 130px' : '0px 1fr 130px' }}
      >
        {/* LEFT: G/L Account Details - toggleable */}
        {sidebarOpen && (
          <div className="border-r border-border overflow-y-auto bg-card relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 z-10"
              onClick={() => setSidebarOpen(false)}
              title={isAr ? 'إغلاق اللوحة' : 'Close panel'}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
            <COADetailPanel
              ref={detailPanelRef}
              account={selected}
              computedLevel={selected ? depthMap.get(selected.acct_code) : undefined}
              onBalanceDrilldown={() => setDrilldownOpen(true)}
              accounts={accounts || []}
              depthMap={depthMap}
              onDirtyChange={setIsDirty}
              onAccountDeleted={() => setSelected(null)}
            />
          </div>
        )}

        {/* CENTER: Tree View */}
        <div className="flex flex-col overflow-hidden">
          {/* Tree toolbar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setSidebarOpen(true)}
                title={isAr ? 'فتح اللوحة' : 'Open panel'}
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'بحث في الحسابات...' : 'Find account...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-[12px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground">{isAr ? 'المستوى' : 'Level'}</span>
              <Input
                type="number"
                min={1}
                max={10}
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                placeholder="10"
                className="w-12 h-7 text-[12px] text-center"
              />
            </div>
          </div>

          {/* Tree content */}
          <div className="flex-1 overflow-y-auto px-1 py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-[13px]">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
              </div>
            ) : tree.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-[13px]">
                {isAr ? 'لا توجد حسابات. قم بالمزامنة أولاً.' : 'No accounts found. Sync from SAP first.'}
              </div>
            ) : (
              tree.map(node => (
                <COATreeItem
                  key={node.account.id}
                  node={node}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  selectedId={selected?.id || null}
                  onSelect={handleSelectAccount}
                  depthMap={depthMap}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Category Tabs */}
        <div className="border-l border-border overflow-y-auto p-1.5 bg-muted/20">
          <COACategoryTabs activeCategory={activeCategory} onSelect={handleCategoryChange} accounts={accounts || []} />
        </div>
      </div>

      {/* SAP-style Bottom Status Bar */}
      <div className="flex items-center justify-between bg-muted/50 border border-t-0 border-border px-4 py-1.5 rounded-b-md text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{isAr ? 'إجمالي الحسابات' : 'Total Accounts'}: <strong className="text-foreground">{totalAccounts}</strong></span>
          <span>{isAr ? 'عناوين' : 'Titles'}: <strong className="text-foreground">{titleAccounts}</strong></span>
          <span>{isAr ? 'تفصيلي' : 'Detail'}: <strong className="text-foreground">{totalAccounts - titleAccounts}</strong></span>
        </div>
        {selected && (
          <span>
            {isAr ? 'محدد' : 'Selected'}: <strong className="text-foreground">{selected.acct_code} - {selected.acct_name}</strong>
          </span>
        )}
      </div>

      {/* Dialogs */}
      <COAAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editAccount}
        parentCode={addParentCode}
        suggestedCode={!editAccount ? suggestedNewCode : undefined}
        suggestedLevel={!editAccount ? addLevel : undefined}
      />
      <COABalanceDrilldown
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        account={selected}
      />
      <COAAccountDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        account={selected}
      />
      <UnsavedChangesDialog
        open={guard.dialogOpen}
        onSave={guard.handleSave}
        onDiscard={guard.handleDiscard}
        onCancel={guard.handleCancel}
      />
      <RouteUnsavedGuard when={isDirty} onSave={async () => { if (detailPanelRef.current) await detailPanelRef.current.save(); }} />
    </div>
  );
}
