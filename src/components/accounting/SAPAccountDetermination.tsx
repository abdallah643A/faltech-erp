import { useState, useMemo, useCallback } from 'react';
import { useGLAccountDefaults } from '@/hooks/useGLAccountDefaults';
import { useGLAdvancedRules } from '@/hooks/useGLAdvancedRules';
import { ACCOUNT_TYPE_LABELS } from '@/services/sapPostingEngine';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import SAPAdvancedRulesGrid from './SAPAdvancedRulesGrid';

const AREA_TABS = [
  { key: 'sales', label: 'Sales', labelAr: 'المبيعات' },
  { key: 'purchasing', label: 'Purchasing', labelAr: 'المشتريات' },
  { key: 'general', label: 'General', labelAr: 'عام' },
  { key: 'inventory', label: 'Inventory', labelAr: 'المخزون' },
  { key: 'resources', label: 'Resources', labelAr: 'الموارد' },
  { key: 'wip_mapping', label: 'WIP Mapping', labelAr: 'تعيين WIP' },
];

const SUB_TABS = [
  { key: 'general', label: 'General', labelAr: 'عام' },
  { key: 'tax', label: 'Tax', labelAr: 'الضريبة' },
];

const TAX_ACCOUNT_TYPES = new Set([
  'output_vat', 'input_vat', 'tax_clearing', 'withholding_tax',
  'vat_payable', 'vat_receivable',
]);

/**
 * SAP B1-style account filtering rules per account_type.
 * Only contextually relevant G/L accounts appear in the picker.
 */
const ACCOUNT_TYPE_FILTERS: Record<string, (a: any) => boolean> = {
  // Receivable accounts (12xxxx)
  domestic_receivable: (a) => a.acct_code?.startsWith('12') || a.acct_name?.includes('عملاء') || /receivable|customer/i.test(a.acct_name || ''),
  foreign_receivable: (a) => a.acct_code?.startsWith('12') || a.acct_name?.includes('عملاء') || /receivable/i.test(a.acct_name || ''),
  checks_received: (a) => a.acct_code?.startsWith('11') || a.acct_code?.startsWith('12') || /check|شيك/i.test(a.acct_name || ''),
  cash_on_hand: (a) => a.acct_code?.startsWith('11') || /cash|صندوق|نقد/i.test(a.acct_name || ''),
  overpayment_ar: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('21') || /overpayment/i.test(a.acct_name || ''),
  underpayment_ar: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('21') || /underpayment/i.test(a.acct_name || ''),
  down_payment_clearing_ar: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('22') || /down payment/i.test(a.acct_name || ''),
  down_payment_interim_ar: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('22') || /interim/i.test(a.acct_name || ''),
  // Revenue accounts (41xxxx, 42xxxx)
  revenue: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42') || /revenue|مبيعات|إيراد/i.test(a.acct_name || ''),
  revenue_foreign: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42'),
  revenue_eu: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42'),
  sales_credit: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42'),
  sales_credit_foreign: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42'),
  sales_credit_eu: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42'),
  sales_returns: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('42'),
  // Exchange & discounts
  exchange_diff_gain: (a) => a.acct_code?.startsWith('41') || a.acct_code?.startsWith('72') || /exchange|فروق/i.test(a.acct_name || ''),
  exchange_diff_loss: (a) => a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61') || /exchange|فروق/i.test(a.acct_name || ''),
  cash_discount: (a) => a.acct_code?.startsWith('41') || a.acct_code?.startsWith('51') || /discount|خصم/i.test(a.acct_name || ''),
  dunning_interest: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('72'),
  dunning_fee: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41') || a.acct_code?.startsWith('72'),
  // Payable accounts (21xxxx, 22xxxx)
  domestic_payable: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /payable|vendor|موردين/i.test(a.acct_name || ''),
  foreign_payable: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /payable|موردين/i.test(a.acct_name || ''),
  checks_paid: (a) => a.acct_code?.startsWith('11') || a.acct_code?.startsWith('21') || /check/i.test(a.acct_name || ''),
  overpayment_ap: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /overpayment/i.test(a.acct_name || ''),
  underpayment_ap: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /underpayment/i.test(a.acct_name || ''),
  down_payment_clearing_ap: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /down payment/i.test(a.acct_name || ''),
  down_payment_interim_ap: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /interim/i.test(a.acct_name || ''),
  purchase_account: (a) => a.acct_type === 'at_Expenses' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61') || /مشتريات/i.test(a.acct_name || ''),
  purchase_returns_acct: (a) => a.acct_type === 'at_Expenses' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61'),
  purchase_offset: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || a.acct_code?.startsWith('12'),
  purchase_credit: (a) => a.acct_type === 'at_Expenses' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61'),
  freight_charges: (a) => a.acct_type === 'at_Expenses' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61'),
  // Inventory
  inventory_account: (a) => a.acct_code?.startsWith('12') || /inventory|stock|مخزون/i.test(a.acct_name || ''),
  cogs: (a) => a.acct_type === 'at_Expenses' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61') || /cost of goods|تكلفة/i.test(a.acct_name || ''),
  allocation_account: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('22') || /allocation/i.test(a.acct_name || ''),
  variance_account: (a) => a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61') || /variance|فروقات/i.test(a.acct_name || ''),
  price_difference: (a) => a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61') || /price diff|فرق/i.test(a.acct_name || ''),
  goods_received_not_invoiced: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /grni|accrual/i.test(a.acct_name || ''),
  inventory_offset_increase: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('21'),
  inventory_offset_decrease: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('51'),
  wip_inventory: (a) => a.acct_code?.startsWith('12') || /wip|work in progress/i.test(a.acct_name || ''),
  wip_offset: (a) => a.acct_code?.startsWith('12') || a.acct_code?.startsWith('51'),
  // Tax
  output_vat: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /tax|vat|ضريب/i.test(a.acct_name || ''),
  input_vat: (a) => a.acct_code?.startsWith('12') || /tax|vat|ضريب/i.test(a.acct_name || ''),
  tax_clearing: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /tax/i.test(a.acct_name || ''),
  withholding_tax: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /withholding/i.test(a.acct_name || ''),
  vat_payable: (a) => a.acct_code?.startsWith('21') || a.acct_code?.startsWith('22') || /ضريب/i.test(a.acct_name || ''),
  vat_receivable: (a) => a.acct_code?.startsWith('12') || /ضريب/i.test(a.acct_name || ''),
  // General
  rounding_account: (a) => a.acct_type === 'at_Expenses' || a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('41'),
  opening_balance: (a) => a.acct_code?.startsWith('31') || a.acct_code?.startsWith('32') || /opening|equity/i.test(a.acct_name || ''),
  closing_balance: (a) => a.acct_code?.startsWith('31') || a.acct_code?.startsWith('32') || /closing|retained/i.test(a.acct_name || ''),
  // Resources
  resource_warehouse: (a) => a.acct_code?.startsWith('12') || /resource/i.test(a.acct_name || ''),
  resource_cost: (a) => a.acct_type === 'at_Expenses' || a.acct_code?.startsWith('51') || a.acct_code?.startsWith('61'),
  resource_revenue: (a) => a.acct_type === 'at_Revenues' || a.acct_code?.startsWith('41'),
};

export default function SAPAccountDetermination() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompany } = useActiveCompany();
  const { defaults, isLoading, updateDefault, accounts } = useGLAccountDefaults();
  const { rules } = useGLAdvancedRules();

  const [activeArea, setActiveArea] = useState('sales');
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [showAdvanced, setShowAdvanced] = useState<{ area: string; accountType: string } | null>(null);
  
  // Account picker dialog state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRow, setPickerRow] = useState<any>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelected, setPickerSelected] = useState('');

  const advancedRuleCount = useMemo(() => {
    const counts: Record<string, number> = {};
    rules.forEach(r => {
      const cv = r.criteria_values || {};
      Object.entries(cv).forEach(([k, v]) => {
        if (k === 'account_type' && typeof v === 'string') {
          counts[v] = (counts[v] || 0) + 1;
        }
      });
    });
    return counts;
  }, [rules]);

  const areaDefaults = useMemo(() => {
    return defaults.filter(d => {
      if (d.functional_area !== activeArea) return false;
      const isTax = TAX_ACCOUNT_TYPES.has(d.account_type);
      return activeSubTab === 'tax' ? isTax : !isTax;
    });
  }, [defaults, activeArea, activeSubTab]);

  // Smart-filtered accounts for the picker dialog
  const pickerAccounts = useMemo(() => {
    if (!pickerRow) return [];
    const filterFn = ACCOUNT_TYPE_FILTERS[pickerRow.account_type];
    let filtered = filterFn ? accounts.filter(filterFn) : accounts;
    if (pickerSearch) {
      const s = pickerSearch.toLowerCase();
      filtered = filtered.filter((a: any) =>
        a.acct_code?.toLowerCase().includes(s) || a.acct_name?.toLowerCase().includes(s)
      );
    }
    return filtered.slice(0, 200);
  }, [pickerRow, accounts, pickerSearch]);

  const openPicker = useCallback((row: any) => {
    setPickerRow(row);
    setPickerSelected(row.acct_code || '');
    setPickerSearch('');
    setPickerOpen(true);
  }, []);

  const handleChoose = useCallback(() => {
    if (!pickerRow || !pickerSelected) return;
    const acct = accounts.find((a: any) => a.acct_code === pickerSelected);
    updateDefault.mutate({ id: pickerRow.id, acct_code: pickerSelected, acct_name: acct?.acct_name || '' });
    setPickerOpen(false);
    setPickerRow(null);
  }, [pickerRow, pickerSelected, accounts, updateDefault]);

  if (showAdvanced) {
    return (
      <SAPAdvancedRulesGrid
        area={showAdvanced.area}
        accountType={showAdvanced.accountType}
        onBack={() => setShowAdvanced(null)}
      />
    );
  }

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <>
      <div className="space-y-0 border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-2.5 flex items-center justify-between border-b border-border">
          <h2 className="text-sm font-bold text-foreground">
            {isAr ? 'تحديد حسابات دفتر الأستاذ' : 'G/L Account Determination'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{isAr ? 'اختيار الفترة' : 'Period Selection'}</span>
            <Select defaultValue="2026">
              <SelectTrigger className="w-[100px] h-7 text-xs">
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

        {/* Area Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          {AREA_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveArea(tab.key); setActiveSubTab('general'); }}
              className={cn(
                "px-4 py-2 text-xs font-medium border-r border-border transition-colors relative",
                activeArea === tab.key
                  ? "bg-card text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isAr ? tab.labelAr : tab.label}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-border bg-card">
          {SUB_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium border-r border-border transition-colors",
                activeSubTab === tab.key
                  ? "bg-card text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isAr ? tab.labelAr : tab.label}
            </button>
          ))}
        </div>

        {/* Account Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[40px]">#</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground min-w-[250px]">
                  {isAr ? 'نوع الحساب' : 'Type of Account'}
                </th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[160px]">
                  {isAr ? 'كود الحساب' : 'Account Code'}
                </th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground min-w-[200px]">
                  {isAr ? 'اسم الحساب' : 'Account Name'}
                </th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-[160px]">
                  {isAr ? 'القواعد المتقدمة' : 'Advanced Rules'}
                </th>
              </tr>
            </thead>
            <tbody>
              {areaDefaults.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isAr ? 'لا توجد حسابات مهيأة لهذا القسم' : 'No account types configured for this area.'}
                  </td>
                </tr>
              )}
              {areaDefaults.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/30 transition-colors",
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  )}
                >
                  <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-foreground">
                    {ACCOUNT_TYPE_LABELS[row.account_type] || row.account_type}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => openPicker(row)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                    >
                      <ArrowRight className="h-3 w-3 text-amber-500" />
                      {row.acct_code ? (
                        <span className="font-mono text-foreground group-hover:text-primary">{row.acct_code}</span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{row.acct_name || ''}</td>
                  <td className="px-3 py-1.5">
                    {(advancedRuleCount[row.account_type] || 0) > 0 ? (
                      <button
                        onClick={() => setShowAdvanced({ area: activeArea, accountType: row.account_type })}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ArrowRight className="h-3 w-3 text-amber-500" />
                        <span>{advancedRuleCount[row.account_type]} Rules</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAdvanced({ area: activeArea, accountType: row.account_type })}
                        className="text-muted-foreground hover:text-primary transition-colors text-xs"
                      >
                        {isAr ? 'إضافة قواعد' : 'Add Rules'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
          <div className="flex gap-2">
            <Button size="sm" variant="default" className="h-7 text-xs px-4">
              {isAr ? 'موافق' : 'OK'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-4">
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-4"
            onClick={() => setShowAdvanced({ area: activeArea, accountType: '' })}
          >
            {isAr ? 'متقدم' : 'Advanced'}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* SAP-style "List of Accounts" Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border bg-muted/30">
            <DialogTitle className="text-sm font-bold">
              {isAr ? 'قائمة الحسابات' : 'List of Accounts'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground">{isAr ? 'بحث' : 'Find'}</span>
              <Input
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                className="h-7 text-xs flex-1"
                autoFocus
              />
            </div>
            {pickerRow && (
              <p className="text-[10px] text-muted-foreground mb-2">
                {isAr ? 'يعرض فقط الحسابات المناسبة لـ: ' : 'Showing only accounts relevant to: '}
                <span className="font-semibold text-foreground">{ACCOUNT_TYPE_LABELS[pickerRow.account_type] || pickerRow.account_type}</span>
              </p>
            )}
            <div className="border border-border rounded overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/70 z-10">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-[30px]">#</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-[120px]">
                      {isAr ? 'رقم الحساب' : 'Account Number'}
                    </th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">
                      {isAr ? 'اسم الحساب' : 'Account Name'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pickerAccounts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-muted-foreground">
                        {isAr ? 'لا توجد حسابات' : 'No matching accounts found'}
                      </td>
                    </tr>
                  )}
                  {pickerAccounts.map((a: any, i: number) => (
                    <tr
                      key={a.acct_code}
                      onClick={() => setPickerSelected(a.acct_code)}
                      onDoubleClick={() => { setPickerSelected(a.acct_code); setTimeout(handleChoose, 0); }}
                      className={cn(
                        "cursor-pointer border-b border-border/30 transition-colors",
                        pickerSelected === a.acct_code
                          ? "bg-primary/15 text-foreground"
                          : i % 2 === 0 ? "bg-card hover:bg-accent/20" : "bg-muted/10 hover:bg-accent/20"
                      )}
                    >
                      <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1 font-mono font-medium">{a.acct_code}</td>
                      <td className="px-2 py-1">{a.acct_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="px-4 py-3 border-t border-border bg-muted/30 flex gap-2">
            <Button size="sm" variant="default" className="h-7 text-xs px-6" onClick={handleChoose} disabled={!pickerSelected}>
              {isAr ? 'اختيار' : 'Choose'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-6" onClick={() => setPickerOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
