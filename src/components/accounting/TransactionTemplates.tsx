import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface TemplateLine {
  purpose: string;
  purposeLabel: string;
  side: 'debit' | 'credit';
  amountKey: string;
}

interface TransactionTemplate {
  docType: string;
  label: string;
  labelAr: string;
  category: string;
  createsJE: boolean;
  lines: TemplateLine[];
  notes?: string;
}

const TEMPLATES: TransactionTemplate[] = [
  // Sales
  { docType: 'ar_invoice', label: 'A/R Invoice (Inventory)', labelAr: 'فاتورة مبيعات (مخزون)', category: 'Sales', createsJE: true,
    lines: [
      { purpose: 'ar_control', purposeLabel: 'A/R Control', side: 'debit', amountKey: 'total' },
      { purpose: 'revenue', purposeLabel: 'Revenue', side: 'credit', amountKey: 'subtotal' },
      { purpose: 'output_vat', purposeLabel: 'Output VAT', side: 'credit', amountKey: 'tax_amount' },
      { purpose: 'cogs', purposeLabel: 'COGS', side: 'debit', amountKey: 'line_total' },
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'credit', amountKey: 'line_total' },
    ] },
  { docType: 'ar_invoice_service', label: 'A/R Invoice (Service)', labelAr: 'فاتورة مبيعات (خدمات)', category: 'Sales', createsJE: true,
    lines: [
      { purpose: 'ar_control', purposeLabel: 'A/R Control', side: 'debit', amountKey: 'total' },
      { purpose: 'revenue', purposeLabel: 'Revenue', side: 'credit', amountKey: 'subtotal' },
      { purpose: 'output_vat', purposeLabel: 'Output VAT', side: 'credit', amountKey: 'tax_amount' },
    ] },
  { docType: 'ar_credit_memo', label: 'A/R Credit Memo', labelAr: 'إشعار دائن مبيعات', category: 'Sales', createsJE: true,
    lines: [
      { purpose: 'revenue', purposeLabel: 'Revenue', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'output_vat', purposeLabel: 'Output VAT', side: 'debit', amountKey: 'tax_amount' },
      { purpose: 'ar_control', purposeLabel: 'A/R Control', side: 'credit', amountKey: 'total' },
    ] },
  { docType: 'incoming_payment', label: 'Customer Receipt', labelAr: 'تحصيل من عميل', category: 'Sales', createsJE: true,
    lines: [
      { purpose: 'cash', purposeLabel: 'Cash / Bank', side: 'debit', amountKey: 'total' },
      { purpose: 'ar_control', purposeLabel: 'A/R Control', side: 'credit', amountKey: 'total' },
    ] },
  { docType: 'delivery', label: 'Delivery Note', labelAr: 'إذن تسليم', category: 'Sales', createsJE: true,
    lines: [
      { purpose: 'cogs', purposeLabel: 'COGS', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'ar_down_payment', label: 'Down Payment from Customer', labelAr: 'دفعة مقدمة من عميل', category: 'Sales', createsJE: true,
    lines: [
      { purpose: 'ar_control', purposeLabel: 'A/R Control', side: 'debit', amountKey: 'total' },
      { purpose: 'advance_from_customer', purposeLabel: 'DP Clearing (A/R)', side: 'credit', amountKey: 'subtotal' },
      { purpose: 'output_vat', purposeLabel: 'Output VAT', side: 'credit', amountKey: 'tax_amount' },
    ] },
  // Purchasing
  { docType: 'goods_receipt_po', label: 'Goods Receipt PO', labelAr: 'استلام بضاعة', category: 'Purchasing', createsJE: true,
    lines: [
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'gr_clearing', purposeLabel: 'GR/IR Clearing', side: 'credit', amountKey: 'subtotal' },
    ], notes: 'Project material: debit Project Cost instead of Inventory' },
  { docType: 'ap_invoice', label: 'Purchase Invoice', labelAr: 'فاتورة مشتريات', category: 'Purchasing', createsJE: true,
    lines: [
      { purpose: 'gr_clearing', purposeLabel: 'GR/IR Clearing', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'input_vat', purposeLabel: 'Input VAT', side: 'debit', amountKey: 'tax_amount' },
      { purpose: 'ap_control', purposeLabel: 'A/P Control', side: 'credit', amountKey: 'total' },
    ] },
  { docType: 'goods_return', label: 'Purchase Return', labelAr: 'مرتجع مشتريات', category: 'Purchasing', createsJE: true,
    lines: [
      { purpose: 'gr_clearing', purposeLabel: 'GR/IR Clearing', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'outgoing_payment', label: 'Supplier Payment', labelAr: 'دفع لمورد', category: 'Purchasing', createsJE: true,
    lines: [
      { purpose: 'ap_control', purposeLabel: 'A/P Control', side: 'debit', amountKey: 'total' },
      { purpose: 'bank', purposeLabel: 'Bank', side: 'credit', amountKey: 'total' },
    ] },
  { docType: 'ap_down_payment', label: 'Down Payment to Supplier', labelAr: 'دفعة مقدمة لمورد', category: 'Purchasing', createsJE: true,
    lines: [
      { purpose: 'advance_to_supplier', purposeLabel: 'DP Clearing (A/P)', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'input_vat', purposeLabel: 'Input VAT', side: 'debit', amountKey: 'tax_amount' },
      { purpose: 'ap_control', purposeLabel: 'A/P Control', side: 'credit', amountKey: 'total' },
    ] },
  // Inventory
  { docType: 'goods_receipt', label: 'Goods Receipt', labelAr: 'استلام بضاعة', category: 'Inventory', createsJE: true,
    lines: [
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory_offset', purposeLabel: 'Inventory Offset', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'goods_issue', label: 'Goods Issue', labelAr: 'صرف بضاعة', category: 'Inventory', createsJE: true,
    lines: [
      { purpose: 'cogs', purposeLabel: 'Expense / COGS', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'credit', amountKey: 'subtotal' },
    ], notes: 'Issue to project: debit Project Cost. Issue to production: debit WIP' },
  { docType: 'inventory_transfer', label: 'Inventory Transfer', labelAr: 'تحويل مخزون', category: 'Inventory', createsJE: true,
    lines: [
      { purpose: 'inventory', purposeLabel: 'Inventory (Dest)', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory', purposeLabel: 'Inventory (Source)', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'inventory_revaluation', label: 'Stock Revaluation', labelAr: 'إعادة تقييم المخزون', category: 'Inventory', createsJE: true,
    lines: [
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'variance', purposeLabel: 'Revaluation Variance', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'landed_cost', label: 'Landed Cost', labelAr: 'التكلفة المحملة', category: 'Inventory', createsJE: true,
    lines: [
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'landed_cost', purposeLabel: 'LC Clearing / AP', side: 'credit', amountKey: 'subtotal' },
    ], notes: 'Non-recoverable tax capitalized into inventory' },
  // Manufacturing
  { docType: 'production_issue', label: 'Issue for Production', labelAr: 'صرف للإنتاج', category: 'Manufacturing', createsJE: true,
    lines: [
      { purpose: 'wip', purposeLabel: 'WIP', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory', purposeLabel: 'Inventory (RM)', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'production_receipt', label: 'Receipt from Production', labelAr: 'استلام من الإنتاج', category: 'Manufacturing', createsJE: true,
    lines: [
      { purpose: 'inventory', purposeLabel: 'Inventory (FG)', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'wip', purposeLabel: 'WIP', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'production_variance', label: 'Production Variance', labelAr: 'فروقات الإنتاج', category: 'Manufacturing', createsJE: true,
    lines: [
      { purpose: 'variance', purposeLabel: 'Variance Account', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'wip', purposeLabel: 'WIP', side: 'credit', amountKey: 'subtotal' },
    ] },
  // Projects
  { docType: 'project_material_issue', label: 'Material Issue to Project', labelAr: 'صرف مواد للمشروع', category: 'Projects', createsJE: true,
    lines: [
      { purpose: 'project_cost', purposeLabel: 'Project Cost', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'inventory', purposeLabel: 'Inventory', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'progress_billing', label: 'Progress Billing', labelAr: 'مستخلص', category: 'Projects', createsJE: true,
    lines: [
      { purpose: 'ar_control', purposeLabel: 'A/R Control', side: 'debit', amountKey: 'net_amount' },
      { purpose: 'retention_receivable', purposeLabel: 'Retention Receivable', side: 'debit', amountKey: 'retention' },
      { purpose: 'contract_revenue', purposeLabel: 'Contract Revenue', side: 'credit', amountKey: 'subtotal' },
      { purpose: 'output_vat', purposeLabel: 'Output VAT', side: 'credit', amountKey: 'tax_amount' },
    ] },
  { docType: 'revenue_recognition', label: 'Revenue Recognition (POC)', labelAr: 'اعتراف بالإيراد', category: 'Projects', createsJE: true,
    lines: [
      { purpose: 'wip_project', purposeLabel: 'Contract Asset / Unbilled', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'contract_revenue', purposeLabel: 'Contract Revenue', side: 'credit', amountKey: 'subtotal' },
    ] },
  // Fixed Assets
  { docType: 'asset_acquisition', label: 'Asset Acquisition', labelAr: 'اقتناء أصل', category: 'Fixed Assets', createsJE: true,
    lines: [
      { purpose: 'asset_account', purposeLabel: 'Fixed Asset', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'input_vat', purposeLabel: 'Input VAT', side: 'debit', amountKey: 'tax_amount' },
      { purpose: 'ap_control', purposeLabel: 'A/P Control', side: 'credit', amountKey: 'total' },
    ] },
  { docType: 'depreciation', label: 'Depreciation Run', labelAr: 'استهلاك الأصول', category: 'Fixed Assets', createsJE: true,
    lines: [
      { purpose: 'depreciation_expense', purposeLabel: 'Depreciation Expense', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'accumulated_depreciation', purposeLabel: 'Accum. Depreciation', side: 'credit', amountKey: 'subtotal' },
    ] },
  { docType: 'asset_disposal', label: 'Asset Disposal', labelAr: 'استبعاد أصل', category: 'Fixed Assets', createsJE: true,
    lines: [
      { purpose: 'accumulated_depreciation', purposeLabel: 'Accum. Depreciation', side: 'debit', amountKey: 'accum_depr' },
      { purpose: 'cash', purposeLabel: 'Cash / Bank', side: 'debit', amountKey: 'proceeds' },
      { purpose: 'asset_disposal', purposeLabel: 'Disposal Gain/Loss', side: 'debit', amountKey: 'loss' },
      { purpose: 'asset_account', purposeLabel: 'Fixed Asset', side: 'credit', amountKey: 'cost' },
    ] },
  // Payroll
  { docType: 'payroll_posting', label: 'Payroll Posting', labelAr: 'ترحيل الرواتب', category: 'Payroll', createsJE: true,
    lines: [
      { purpose: 'salary_expense', purposeLabel: 'Salary Expense', side: 'debit', amountKey: 'gross_salary' },
      { purpose: 'social_insurance', purposeLabel: 'GOSI (Employer)', side: 'debit', amountKey: 'employer_gosi' },
      { purpose: 'payroll_payable', purposeLabel: 'Net Salary Payable', side: 'credit', amountKey: 'net_salary' },
      { purpose: 'social_insurance', purposeLabel: 'GOSI Payable', side: 'credit', amountKey: 'total_gosi' },
    ] },
  { docType: 'payroll_payment', label: 'Payroll Payment', labelAr: 'صرف الرواتب', category: 'Payroll', createsJE: true,
    lines: [
      { purpose: 'payroll_payable', purposeLabel: 'Net Salary Payable', side: 'debit', amountKey: 'net_salary' },
      { purpose: 'bank', purposeLabel: 'Bank', side: 'credit', amountKey: 'net_salary' },
    ] },
  // Banking
  { docType: 'bank_transfer', label: 'Bank Transfer', labelAr: 'تحويل بنكي', category: 'Banking', createsJE: true,
    lines: [
      { purpose: 'bank', purposeLabel: 'Bank (Dest)', side: 'debit', amountKey: 'total' },
      { purpose: 'bank', purposeLabel: 'Bank (Source)', side: 'credit', amountKey: 'total' },
    ] },
  { docType: 'fx_revaluation', label: 'FX Revaluation', labelAr: 'إعادة تقييم العملات', category: 'Banking', createsJE: true,
    lines: [
      { purpose: 'ar_control', purposeLabel: 'A/R or A/P', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'unrealized_exchange_gain', purposeLabel: 'Unrealized FX Gain', side: 'credit', amountKey: 'subtotal' },
    ] },
  // General Finance
  { docType: 'accrual_entry', label: 'Accrual Entry', labelAr: 'قيد استحقاق', category: 'General', createsJE: true,
    lines: [
      { purpose: 'cogs', purposeLabel: 'Expense / Project Cost', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'accrual', purposeLabel: 'Accrued Liabilities', side: 'credit', amountKey: 'subtotal' },
    ], notes: 'Auto-reverse next period if configured' },
  { docType: 'intercompany_transfer', label: 'Intercompany Transfer', labelAr: 'تحويل بين الشركات', category: 'General', createsJE: true,
    lines: [
      { purpose: 'intercompany_ar', purposeLabel: 'Due From (Source)', side: 'debit', amountKey: 'subtotal' },
      { purpose: 'intercompany_ap', purposeLabel: 'Due To (Target)', side: 'credit', amountKey: 'subtotal' },
    ] },
  // Non-JE
  { docType: 'sales_quotation', label: 'Sales Quotation', labelAr: 'عرض سعر', category: 'Sales', createsJE: false, lines: [] },
  { docType: 'sales_order', label: 'Sales Order', labelAr: 'أمر بيع', category: 'Sales', createsJE: false, lines: [] },
  { docType: 'purchase_request', label: 'Purchase Request', labelAr: 'طلب شراء', category: 'Purchasing', createsJE: false, lines: [] },
  { docType: 'purchase_order', label: 'Purchase Order', labelAr: 'أمر شراء', category: 'Purchasing', createsJE: false, lines: [] },
];

const CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))];

export default function TransactionTemplates() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<TransactionTemplate | null>(null);

  const filtered = useMemo(() => {
    return TEMPLATES.filter(t => {
      if (category !== 'all' && t.category !== category) return false;
      if (search) {
        const s = search.toLowerCase();
        return t.docType.includes(s) || t.label.toLowerCase().includes(s) || t.labelAr.includes(s);
      }
      return true;
    });
  }, [search, category]);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left - Template List */}
      <div className="col-span-5 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {isAr ? 'قوالب المعاملات' : 'Transaction Templates'}
              <Badge variant="secondary" className="text-xs ml-auto">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
              {filtered.map(t => (
                <button
                  key={t.docType}
                  onClick={() => setSelected(t)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between hover:bg-accent/50 transition-colors",
                    selected?.docType === t.docType && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {t.createsJE ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className="font-medium">{isAr ? t.labelAr : t.label}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right - Template Detail */}
      <div className="col-span-7">
        {selected ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{isAr ? selected.labelAr : selected.label}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={selected.createsJE ? 'default' : 'secondary'}>{selected.createsJE ? 'Creates JE' : 'No JE'}</Badge>
                  <Badge variant="outline">{selected.category}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{selected.docType}</p>
            </CardHeader>
            <CardContent>
              {selected.createsJE && selected.lines.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>{isAr ? 'الجانب' : 'Side'}</TableHead>
                        <TableHead>{isAr ? 'الدور المحاسبي' : 'GL Role'}</TableHead>
                        <TableHead>{isAr ? 'الغرض' : 'Purpose'}</TableHead>
                        <TableHead>{isAr ? 'مصدر المبلغ' : 'Amount Source'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <Badge variant={line.side === 'debit' ? 'default' : 'secondary'} className="text-xs">
                              {line.side === 'debit' ? 'Dr' : 'Cr'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary">{line.purpose}</TableCell>
                          <TableCell className="text-sm font-medium">{line.purposeLabel}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{line.amountKey}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selected.notes && (
                    <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      {selected.notes}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{isAr ? 'هذا النوع لا ينتج قيد محاسبي' : 'This transaction type does not generate a journal entry'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-20 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{isAr ? 'اختر قالب معاملة لعرض تفاصيل القيد' : 'Select a transaction template to view JE details'}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
