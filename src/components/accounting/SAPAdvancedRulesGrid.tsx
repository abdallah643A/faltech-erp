import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { useGLAccountDefaults } from '@/hooks/useGLAccountDefaults';
import { ACCOUNT_TYPE_LABELS } from '@/services/sapPostingEngine';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Save, Search, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MARKETING_DOC_TYPES = [
  { value: 'sales_order', label: 'Sales Order', labelAr: 'أمر بيع' },
  { value: 'sales_delivery', label: 'Delivery', labelAr: 'تسليم' },
  { value: 'sales_return', label: 'Sales Return', labelAr: 'مرتجع مبيعات' },
  { value: 'ar_invoice', label: 'A/R Invoice', labelAr: 'فاتورة مبيعات' },
  { value: 'ar_credit_memo', label: 'A/R Credit Memo', labelAr: 'إشعار دائن مبيعات' },
  { value: 'purchase_order', label: 'Purchase Order', labelAr: 'أمر شراء' },
  { value: 'goods_receipt', label: 'Goods Receipt PO', labelAr: 'استلام بضاعة' },
  { value: 'purchase_return', label: 'Goods Return', labelAr: 'مرتجع مشتريات' },
  { value: 'ap_invoice', label: 'A/P Invoice', labelAr: 'فاتورة مشتريات' },
  { value: 'ap_credit_memo', label: 'A/P Credit Memo', labelAr: 'إشعار دائن مشتريات' },
  { value: 'inventory_transfer', label: 'Inventory Transfer', labelAr: 'تحويل مخزون' },
];

const INVENTORY_POSTING_TYPES = [
  { value: 'goods_issue', label: 'Goods Issue', labelAr: 'صرف بضاعة' },
  { value: 'goods_receipt', label: 'Goods Receipt', labelAr: 'استلام بضاعة' },
  { value: 'inventory_counting', label: 'Inventory Counting', labelAr: 'جرد المخزون' },
  { value: 'inventory_revaluation', label: 'Inventory Revaluation', labelAr: 'إعادة تقييم المخزون' },
  { value: 'inventory_transfer', label: 'Inventory Transfer', labelAr: 'تحويل مخزون' },
  { value: 'opening_balance', label: 'Opening Balance', labelAr: 'رصيد افتتاحي' },
];

// Account columns displayed in the grid (like SAP advanced rules spreadsheet)
const ACCOUNT_COLUMNS = [
  { key: 'inventory', label: 'Inventory Account', labelAr: 'حساب المخزون' },
  { key: 'cogs', label: 'Cost of Goods Sold', labelAr: 'تكلفة البضاعة المباعة' },
  { key: 'allocation', label: 'Allocation Account', labelAr: 'حساب التخصيص' },
  { key: 'price_difference', label: 'Price Difference', labelAr: 'فرق السعر' },
  { key: 'revenue', label: 'Revenue Account', labelAr: 'حساب الإيرادات' },
  { key: 'expense_clearing', label: 'Expense Account', labelAr: 'حساب المصروفات' },
  { key: 'variance', label: 'Variance Account', labelAr: 'حساب الفروقات' },
  { key: 'inventory_offset', label: 'Inventory Offset - Decrease', labelAr: 'تعويض المخزون - نقص' },
  { key: 'goods_received_not_invoiced', label: 'Inventory Offset - Incr.', labelAr: 'تعويض المخزون - زيادة' },
  { key: 'sales_returns', label: 'Sales Returns Account', labelAr: 'حساب مرتجعات المبيعات' },
  { key: 'purchase_returns', label: 'Revenue Account - Foreign', labelAr: 'حساب الإيرادات - أجنبي' },
  { key: 'exchange_gain', label: 'Expense Account - EU', labelAr: 'حساب المصروفات - أوروبي' },
  { key: 'exchange_loss', label: 'Revenue Account - Foreign', labelAr: 'حساب الإيرادات - أجنبي' },
];

interface Props {
  area: string;
  accountType: string;
  onBack: () => void;
}

export default function SAPAdvancedRulesGrid({ area, accountType, onBack }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompany } = useActiveCompany();
  const { rules, rulesLoading, createRule, updateRule, deleteRule, getRuleAccounts } = useGLAdvancedRules();
  const { accounts } = useGLAccountDefaults();

  const [searchFilter, setSearchFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editingCell, setEditingCell] = useState<{ ruleId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingField, setEditingField] = useState<{ ruleId: string; field: string } | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [acctSearch, setAcctSearch] = useState('');

  // Lookup data for dropdowns
  const { data: warehouses = [] } = useQuery({
    queryKey: ['adv-rules-warehouses'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('warehouse_code, warehouse_name').eq('is_active', true).order('warehouse_code');
      return data || [];
    },
  });

  // Load rule accounts for display
  const [ruleAccountsMap, setRuleAccountsMap] = useState<Record<string, any[]>>({});

  // Filter rules relevant to this area
  const filteredRules = useMemo(() => {
    let result = rules;
    if (accountType) {
      result = result.filter(r => {
        const cv = r.criteria_values || {};
        return cv.account_type === accountType || cv.functional_area === area;
      });
    }
    if (searchFilter && !showAll) {
      result = result.filter(r =>
        r.rule_code?.includes(searchFilter) || r.rule_name?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    return result.sort((a, b) => a.priority - b.priority);
  }, [rules, area, accountType, searchFilter, showAll]);

  // Load accounts for each rule
  const loadRuleAccounts = async (ruleId: string) => {
    if (ruleAccountsMap[ruleId]) return;
    const accts = await getRuleAccounts(ruleId);
    setRuleAccountsMap(prev => ({ ...prev, [ruleId]: accts }));
  };

  // Load all on mount
  useMemo(() => {
    filteredRules.forEach(r => loadRuleAccounts(r.id));
  }, [filteredRules.map(r => r.id).join(',')]);

  const getAccountCode = (ruleId: string, accountType: string): string => {
    const accts = ruleAccountsMap[ruleId] || [];
    const found = accts.find((a: any) => a.account_type === accountType);
    return found?.acct_code || '';
  };

  const filteredAccounts = useMemo(() => {
    if (!acctSearch) return accounts.slice(0, 60);
    return accounts.filter((a: any) =>
      a.acct_code?.includes(acctSearch) || a.acct_name?.toLowerCase().includes(acctSearch.toLowerCase())
    ).slice(0, 60);
  }, [accounts, acctSearch]);

  const areaLabel = isAr
    ? { sales: 'المبيعات', purchasing: 'المشتريات', general: 'عام', inventory: 'المخزون', resources: 'الموارد', wip_mapping: 'WIP' }[area] || area
    : area.charAt(0).toUpperCase() + area.slice(1);

  const title = accountType
    ? `${isAr ? 'القواعد المتقدمة لتحديد حسابات دفتر الأستاذ' : 'Advanced G/L Account Determination Rules'} - ${areaLabel}`
    : `${isAr ? 'جميع القواعد المتقدمة' : 'All Advanced Rules'} - ${areaLabel}`;

  return (
    <div className="space-y-0 border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="bg-primary/10 px-4 py-2.5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{isAr ? 'الفترة' : 'Period'}</span>
          <Select defaultValue="2026">
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          {activeCompany && (
            <Badge variant="outline" className="text-xs">{activeCompany.company_name}</Badge>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Input
          placeholder={isAr ? 'بحث...' : 'Search...'}
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="h-7 text-xs w-[200px]"
        />
        <Button size="sm" variant="default" className="h-7 text-xs">
          <Search className="h-3 w-3 mr-1" /> {isAr ? 'بحث' : 'Find'}
        </Button>
        <Button size="sm" variant={showAll ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setShowAll(!showAll)}>
          {isAr ? 'عرض الكل' : 'Show All'}
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
          createRule.mutate({
            rule: {
              rule_code: `ADV-${Date.now().toString(36).toUpperCase()}`,
              rule_name: 'New Rule',
              priority: (filteredRules.length + 1) * 10,
              status: 'active',
              match_type: 'exact',
              criteria_values: accountType ? { account_type: accountType, functional_area: area } : { functional_area: area },
            },
            accounts: [],
          } as any);
        }}>
          <Plus className="h-3 w-3 mr-1" /> {isAr ? 'إضافة' : 'Add Row'}
        </Button>
      </div>

      {/* Spreadsheet Grid */}
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/70 border-b border-border">
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[50px] sticky left-0 bg-muted/70">
                {isAr ? 'الأولوية' : 'Priority'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[60px]">
                {isAr ? 'الكود' : 'Code'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[100px]">
                {isAr ? 'كود المستودع' : 'Warehouse Code'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[120px]">
                {isAr ? 'مستندات التسويق' : 'Marketing documents - IssueType'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[120px]">
                {isAr ? 'ترحيل المخزون - عد' : 'Inventory Posting - Counting'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[120px]">
                {isAr ? 'الوصف' : 'Description'}
              </th>
              <th className="px-2 py-1.5 text-center font-semibold text-muted-foreground border-r border-border/50 w-[50px]">
                {isAr ? 'نشط' : 'Active'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[90px]">
                {isAr ? 'من تاريخ' : 'From Date'}
              </th>
              <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 w-[90px]">
                {isAr ? 'إلى تاريخ' : 'To Date'}
              </th>
              {/* Account columns */}
              {ACCOUNT_COLUMNS.map(col => (
                <th key={col.key} className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 min-w-[120px]">
                  {isAr ? col.labelAr : col.label}
                </th>
              ))}
              <th className="px-2 py-1.5 w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {filteredRules.length === 0 && (
              <tr>
                <td colSpan={9 + ACCOUNT_COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">
                  {isAr ? 'لا توجد قواعد متقدمة' : 'No advanced rules found. Click "Add Row" to create one.'}
                </td>
              </tr>
            )}
            {filteredRules.map((rule, idx) => {
              const cv = rule.criteria_values || {};
              return (
                <tr
                  key={rule.id}
                  className={cn(
                    "border-b border-border/30 hover:bg-accent/20 transition-colors",
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                  )}
                >
                  {/* Priority */}
                  <td className="px-2 py-1 border-r border-border/30 sticky left-0 bg-inherit font-mono">
                    {editingField?.ruleId === rule.id && editingField?.field === 'priority' ? (
                      <Input type="number" value={fieldValue} autoFocus className="h-5 text-[11px] w-full" onChange={e => setFieldValue(e.target.value)}
                        onBlur={() => { updateRule.mutate({ id: rule.id, rule: { ...rule, priority: Number(fieldValue) }, accounts: ruleAccountsMap[rule.id] || [] }); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingField(null); }} />
                    ) : (
                      <span className="cursor-pointer hover:text-primary" onClick={() => { setEditingField({ ruleId: rule.id, field: 'priority' }); setFieldValue(String(rule.priority)); }}>{rule.priority}</span>
                    )}
                  </td>
                  {/* Code */}
                  <td className="px-2 py-1 border-r border-border/30 font-mono">
                    {editingField?.ruleId === rule.id && editingField?.field === 'code' ? (
                      <Input value={fieldValue} autoFocus className="h-5 text-[11px] w-full" onChange={e => setFieldValue(e.target.value)}
                        onBlur={() => { updateRule.mutate({ id: rule.id, rule: { ...rule, rule_code: fieldValue }, accounts: ruleAccountsMap[rule.id] || [] }); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingField(null); }} />
                    ) : (
                      <span className="cursor-pointer hover:text-primary" onClick={() => { setEditingField({ ruleId: rule.id, field: 'code' }); setFieldValue(rule.rule_code || ''); }}>{rule.rule_code}</span>
                    )}
                  </td>
                  {/* Warehouse Code - Dropdown from warehouses */}
                  <td className="px-2 py-1 border-r border-border/30">
                    <Select
                      value={cv.warehouse_code || cv.warehouse || '__all__'}
                      onValueChange={v => {
                        const val = v === '__all__' ? undefined : v;
                        updateRule.mutate({ id: rule.id, rule: { ...rule, criteria_values: { ...cv, warehouse_code: val } }, accounts: ruleAccountsMap[rule.id] || [] });
                      }}
                    >
                      <SelectTrigger className="h-6 text-[11px] w-full border-0 shadow-none bg-transparent px-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__" className="text-[11px]">▼ All</SelectItem>
                        {warehouses.map((w: any) => (
                          <SelectItem key={w.warehouse_code} value={w.warehouse_code} className="text-[11px]">
                            {w.warehouse_code} - {w.warehouse_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {/* Marketing documents - Dropdown */}
                  <td className="px-2 py-1 border-r border-border/30">
                    <Select
                      value={cv.marketing_doc || '__all__'}
                      onValueChange={v => {
                        const val = v === '__all__' ? undefined : v;
                        updateRule.mutate({ id: rule.id, rule: { ...rule, criteria_values: { ...cv, marketing_doc: val } }, accounts: ruleAccountsMap[rule.id] || [] });
                      }}
                    >
                      <SelectTrigger className="h-6 text-[11px] w-full border-0 shadow-none bg-transparent px-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__" className="text-[11px]">▼ All</SelectItem>
                        {MARKETING_DOC_TYPES.map(dt => (
                          <SelectItem key={dt.value} value={dt.value} className="text-[11px]">
                            {isAr ? dt.labelAr : dt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {/* Inventory Posting - Dropdown */}
                  <td className="px-2 py-1 border-r border-border/30">
                    <Select
                      value={cv.inventory_posting || '__all__'}
                      onValueChange={v => {
                        const val = v === '__all__' ? undefined : v;
                        updateRule.mutate({ id: rule.id, rule: { ...rule, criteria_values: { ...cv, inventory_posting: val } }, accounts: ruleAccountsMap[rule.id] || [] });
                      }}
                    >
                      <SelectTrigger className="h-6 text-[11px] w-full border-0 shadow-none bg-transparent px-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__" className="text-[11px]">▼ All</SelectItem>
                        {INVENTORY_POSTING_TYPES.map(ip => (
                          <SelectItem key={ip.value} value={ip.value} className="text-[11px]">
                            {isAr ? ip.labelAr : ip.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {/* Description */}
                  <td className="px-2 py-1 border-r border-border/30 max-w-[120px]">
                    {editingField?.ruleId === rule.id && editingField?.field === 'description' ? (
                      <Input value={fieldValue} autoFocus className="h-5 text-[11px] w-full" onChange={e => setFieldValue(e.target.value)}
                        onBlur={() => { updateRule.mutate({ id: rule.id, rule: { ...rule, description: fieldValue }, accounts: ruleAccountsMap[rule.id] || [] }); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingField(null); }} />
                    ) : (
                      <span className="cursor-pointer hover:text-primary truncate block" onClick={() => { setEditingField({ ruleId: rule.id, field: 'description' }); setFieldValue(rule.description || rule.rule_name || ''); }}>
                        {rule.description || rule.rule_name}
                      </span>
                    )}
                  </td>
                  {/* Active */}
                  <td className="px-2 py-1 border-r border-border/30 text-center">
                    <input
                      type="checkbox"
                      checked={rule.status === 'active'}
                      className="h-3.5 w-3.5 accent-primary"
                      onChange={() => {
                        updateRule.mutate({
                          id: rule.id,
                          rule: { ...rule, status: rule.status === 'active' ? 'inactive' : 'active' },
                          accounts: ruleAccountsMap[rule.id] || [],
                        });
                      }}
                    />
                  </td>
                  {/* From Date */}
                  <td className="px-2 py-1 border-r border-border/30">
                    {editingField?.ruleId === rule.id && editingField?.field === 'from_date' ? (
                      <Input type="date" value={fieldValue} autoFocus className="h-5 text-[11px] w-full" onChange={e => setFieldValue(e.target.value)}
                        onBlur={() => { updateRule.mutate({ id: rule.id, rule: { ...rule, effective_from: fieldValue || null }, accounts: ruleAccountsMap[rule.id] || [] }); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Escape') setEditingField(null); }} />
                    ) : (
                      <span className="cursor-pointer hover:text-primary text-muted-foreground" onClick={() => { setEditingField({ ruleId: rule.id, field: 'from_date' }); setFieldValue(rule.effective_from || ''); }}>
                        {rule.effective_from || '—'}
                      </span>
                    )}
                  </td>
                  {/* To Date */}
                  <td className="px-2 py-1 border-r border-border/30">
                    {editingField?.ruleId === rule.id && editingField?.field === 'to_date' ? (
                      <Input type="date" value={fieldValue} autoFocus className="h-5 text-[11px] w-full" onChange={e => setFieldValue(e.target.value)}
                        onBlur={() => { updateRule.mutate({ id: rule.id, rule: { ...rule, effective_to: fieldValue || null }, accounts: ruleAccountsMap[rule.id] || [] }); setEditingField(null); }}
                        onKeyDown={e => { if (e.key === 'Escape') setEditingField(null); }} />
                    ) : (
                      <span className="cursor-pointer hover:text-primary text-muted-foreground" onClick={() => { setEditingField({ ruleId: rule.id, field: 'to_date' }); setFieldValue(rule.effective_to || ''); }}>
                        {rule.effective_to || '—'}
                      </span>
                    )}
                  </td>
                  {/* Account columns */}
                  {ACCOUNT_COLUMNS.map(col => {
                    const code = getAccountCode(rule.id, col.key);
                    const isEditing = editingCell?.ruleId === rule.id && editingCell?.colKey === col.key;

                    return (
                      <td key={col.key} className="px-1 py-1 border-r border-border/30">
                        {isEditing ? (
                          <div className="flex items-center gap-0.5">
                            <Select value={editValue} onValueChange={v => setEditValue(v)}>
                              <SelectTrigger className="h-5 text-[10px] w-[100px]">
                                <SelectValue placeholder="..." />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-1">
                                  <Input
                                    placeholder="Search..."
                                    value={acctSearch}
                                    onChange={e => setAcctSearch(e.target.value)}
                                    className="h-5 text-[10px] mb-1"
                                  />
                                </div>
                                {filteredAccounts.map((a: any) => (
                                  <SelectItem key={a.acct_code} value={a.acct_code} className="text-[10px]">
                                    {a.acct_code} - {a.acct_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => {
                              // Save the account
                              const existingAccts = ruleAccountsMap[rule.id] || [];
                              const newAccts = existingAccts.filter((a: any) => a.account_type !== col.key);
                              if (editValue) {
                                const acct = accounts.find((a: any) => a.acct_code === editValue);
                                newAccts.push({ account_type: col.key, acct_code: editValue, acct_name: acct?.acct_name || '' });
                              }
                              updateRule.mutate({
                                id: rule.id,
                                rule: { rule_code: rule.rule_code, rule_name: rule.rule_name, priority: rule.priority, status: rule.status, match_type: rule.match_type, criteria_values: rule.criteria_values },
                                accounts: newAccts,
                              });
                              setRuleAccountsMap(prev => ({ ...prev, [rule.id]: newAccts }));
                              setEditingCell(null);
                            }}>
                              <Save className="h-2.5 w-2.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => setEditingCell(null)}>
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ ruleId: rule.id, colKey: col.key });
                              setEditValue(code);
                              setAcctSearch('');
                            }}
                            className="flex items-center gap-1 hover:text-primary transition-colors w-full"
                          >
                            {code ? (
                              <>
                                <ArrowRight className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                                <span className="font-mono">{code}</span>
                              </>
                            ) : null}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  {/* Actions */}
                  <td className="px-1 py-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => deleteRule.mutate(rule.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
        <div className="flex gap-2">
          <Button size="sm" variant="default" className="h-7 text-xs px-4" onClick={onBack}>
            {isAr ? 'موافق' : 'OK'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs px-4" onClick={onBack}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {isAr ? 'تحديد المعايير' : 'Determination Criteria'} - {areaLabel}
        </div>
      </div>
    </div>
  );
}
