import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface GLRole {
  key: string;
  label: string;
  labelAr: string;
  category: string;
  description: string;
  sampleAcct: string;
}

const GL_ROLES: GLRole[] = [
  // Sales
  { key: 'revenue', label: 'Sales Revenue', labelAr: 'إيرادات المبيعات', category: 'Sales', description: 'Revenue recognized from sales transactions', sampleAcct: '410001' },
  { key: 'sales_returns', label: 'Sales Returns', labelAr: 'مرتجعات المبيعات', category: 'Sales', description: 'Returns and allowances from customers', sampleAcct: '410050' },
  { key: 'sales_discount', label: 'Sales Discounts', labelAr: 'خصومات المبيعات', category: 'Sales', description: 'Discounts allowed on sales', sampleAcct: '410060' },
  { key: 'ar_control', label: 'A/R Control', labelAr: 'ذمم مدينة', category: 'Sales', description: 'Accounts Receivable control account', sampleAcct: '120001' },
  { key: 'deferred_revenue', label: 'Deferred Revenue', labelAr: 'إيرادات مؤجلة', category: 'Sales', description: 'Contract liability / deferred revenue', sampleAcct: '220050' },
  { key: 'advance_from_customer', label: 'Advance from Customer', labelAr: 'دفعة مقدمة من عميل', category: 'Sales', description: 'Customer advance payment clearing', sampleAcct: '220040' },
  // Purchasing
  { key: 'purchase', label: 'Purchase Account', labelAr: 'حساب المشتريات', category: 'Purchasing', description: 'Expense or clearing for non-inventory purchases', sampleAcct: '510001' },
  { key: 'ap_control', label: 'A/P Control', labelAr: 'ذمم دائنة', category: 'Purchasing', description: 'Accounts Payable control account', sampleAcct: '210001' },
  { key: 'gr_clearing', label: 'GR/IR Clearing', labelAr: 'تسوية استلام', category: 'Purchasing', description: 'Goods Received / Invoice Received clearing', sampleAcct: '210050' },
  { key: 'price_difference', label: 'Price Difference', labelAr: 'فروقات الأسعار', category: 'Purchasing', description: 'Variance between PO price and invoice price', sampleAcct: '510060' },
  { key: 'advance_to_supplier', label: 'Advance to Supplier', labelAr: 'دفعة مقدمة لمورد', category: 'Purchasing', description: 'Supplier advance payment clearing', sampleAcct: '120050' },
  { key: 'freight_expense', label: 'Freight Expense', labelAr: 'مصاريف شحن', category: 'Purchasing', description: 'Freight and shipping charges', sampleAcct: '510070' },
  // Inventory
  { key: 'inventory', label: 'Inventory Account', labelAr: 'حساب المخزون', category: 'Inventory', description: 'Current inventory valuation', sampleAcct: '130001' },
  { key: 'cogs', label: 'Cost of Goods Sold', labelAr: 'تكلفة المبيعات', category: 'Inventory', description: 'Cost recognized when inventory is sold', sampleAcct: '510001' },
  { key: 'goods_received_not_invoiced', label: 'Goods Rcvd Not Invoiced', labelAr: 'بضائع مستلمة غير مفوترة', category: 'Inventory', description: 'Accrual for received goods pending invoice', sampleAcct: '210060' },
  { key: 'wip', label: 'Work in Progress', labelAr: 'أعمال تحت التنفيذ', category: 'Inventory', description: 'WIP for manufacturing or production', sampleAcct: '130050' },
  { key: 'variance', label: 'Production Variance', labelAr: 'فروقات الإنتاج', category: 'Inventory', description: 'Standard vs actual cost variance', sampleAcct: '510080' },
  { key: 'landed_cost', label: 'Landed Cost Absorption', labelAr: 'استيعاب التكلفة المحملة', category: 'Inventory', description: 'Landed cost allocated to inventory', sampleAcct: '210070' },
  // Fixed Assets
  { key: 'asset_account', label: 'Fixed Asset Account', labelAr: 'الأصول الثابتة', category: 'Fixed Assets', description: 'Asset at cost', sampleAcct: '150001' },
  { key: 'accumulated_depreciation', label: 'Accumulated Depreciation', labelAr: 'الاستهلاك المتراكم', category: 'Fixed Assets', description: 'Contra asset for depreciation', sampleAcct: '150050' },
  { key: 'depreciation_expense', label: 'Depreciation Expense', labelAr: 'مصروف الاستهلاك', category: 'Fixed Assets', description: 'Period depreciation charge', sampleAcct: '610001' },
  { key: 'cip_account', label: 'CIP / Assets Under Construction', labelAr: 'أصول تحت الإنشاء', category: 'Fixed Assets', description: 'Capital work in progress', sampleAcct: '150060' },
  { key: 'asset_disposal', label: 'Asset Disposal', labelAr: 'استبعاد أصول', category: 'Fixed Assets', description: 'Gain/loss on asset disposal', sampleAcct: '720001' },
  // Banking
  { key: 'cash', label: 'Cash Account', labelAr: 'حساب نقدي', category: 'Banking', description: 'Cash on hand', sampleAcct: '110001' },
  { key: 'bank', label: 'Bank Account', labelAr: 'حساب بنكي', category: 'Banking', description: 'Main bank account', sampleAcct: '110050' },
  { key: 'bank_charges', label: 'Bank Charges', labelAr: 'عمولات بنكية', category: 'Banking', description: 'Fees and charges from bank', sampleAcct: '620001' },
  { key: 'interest_income', label: 'Interest Income', labelAr: 'إيرادات فوائد', category: 'Banking', description: 'Interest earned on deposits', sampleAcct: '420001' },
  { key: 'interest_expense', label: 'Interest Expense', labelAr: 'مصروف فوائد', category: 'Banking', description: 'Interest on loans/overdrafts', sampleAcct: '620010' },
  // Tax
  { key: 'output_vat', label: 'Output VAT', labelAr: 'ضريبة مخرجات', category: 'Tax', description: 'VAT collected on sales', sampleAcct: '220001' },
  { key: 'input_vat', label: 'Input VAT', labelAr: 'ضريبة مدخلات', category: 'Tax', description: 'Recoverable VAT on purchases', sampleAcct: '120060' },
  { key: 'withholding_tax', label: 'Withholding Tax', labelAr: 'ضريبة مستقطعة', category: 'Tax', description: 'Tax withheld at source', sampleAcct: '220010' },
  { key: 'non_recoverable_vat', label: 'Non-Recoverable VAT', labelAr: 'ضريبة غير قابلة للاسترداد', category: 'Tax', description: 'VAT that cannot be claimed back', sampleAcct: '510090' },
  // FX
  { key: 'exchange_gain', label: 'Realized Exchange Gain', labelAr: 'أرباح صرف محققة', category: 'Foreign Exchange', description: 'Realized gain on FX settlement', sampleAcct: '420010' },
  { key: 'exchange_loss', label: 'Realized Exchange Loss', labelAr: 'خسائر صرف محققة', category: 'Foreign Exchange', description: 'Realized loss on FX settlement', sampleAcct: '620020' },
  { key: 'unrealized_exchange_gain', label: 'Unrealized FX Gain', labelAr: 'أرباح صرف غير محققة', category: 'Foreign Exchange', description: 'Period-end revaluation gain', sampleAcct: '420011' },
  { key: 'unrealized_exchange_loss', label: 'Unrealized FX Loss', labelAr: 'خسائر صرف غير محققة', category: 'Foreign Exchange', description: 'Period-end revaluation loss', sampleAcct: '620021' },
  // Projects
  { key: 'project_cost', label: 'Project Cost Account', labelAr: 'حساب تكلفة المشروع', category: 'Projects', description: 'Direct costs charged to projects', sampleAcct: '510100' },
  { key: 'retention_receivable', label: 'Retention Receivable', labelAr: 'محتجزات مدينة', category: 'Projects', description: 'Amount retained by client', sampleAcct: '120070' },
  { key: 'retention_payable', label: 'Retention Payable', labelAr: 'محتجزات دائنة', category: 'Projects', description: 'Amount retained from subcontractors', sampleAcct: '210080' },
  { key: 'contract_revenue', label: 'Contract Revenue', labelAr: 'إيرادات عقود', category: 'Projects', description: 'Revenue from project contracts', sampleAcct: '410010' },
  { key: 'wip_project', label: 'Project WIP', labelAr: 'أعمال تحت التنفيذ - مشاريع', category: 'Projects', description: 'Work in progress for projects', sampleAcct: '130060' },
  // Payroll
  { key: 'salary_expense', label: 'Salary Expense', labelAr: 'مصروف رواتب', category: 'Payroll', description: 'Basic salary charges', sampleAcct: '610010' },
  { key: 'payroll_payable', label: 'Payroll Payable', labelAr: 'رواتب مستحقة', category: 'Payroll', description: 'Net payroll liability', sampleAcct: '220020' },
  { key: 'social_insurance', label: 'Social Insurance Payable', labelAr: 'تأمينات اجتماعية', category: 'Payroll', description: 'GOSI / social security liability', sampleAcct: '220030' },
  { key: 'eos_provision', label: 'End of Service Provision', labelAr: 'مخصص نهاية خدمة', category: 'Payroll', description: 'Employee end-of-service provision', sampleAcct: '220060' },
  // Intercompany
  { key: 'intercompany_ar', label: 'Intercompany Due From', labelAr: 'مستحقات من شركات شقيقة', category: 'Intercompany', description: 'Due from related companies', sampleAcct: '120080' },
  { key: 'intercompany_ap', label: 'Intercompany Due To', labelAr: 'مستحقات لشركات شقيقة', category: 'Intercompany', description: 'Due to related companies', sampleAcct: '210090' },
  // General
  { key: 'rounding', label: 'Rounding Difference', labelAr: 'فروقات التقريب', category: 'General', description: 'Minor rounding differences', sampleAcct: '710001' },
  { key: 'clearing', label: 'General Clearing', labelAr: 'حساب تسوية عام', category: 'General', description: 'Temporary clearing account', sampleAcct: '290001' },
  { key: 'accrual', label: 'Accrual Account', labelAr: 'حساب مستحقات', category: 'General', description: 'Period-end accruals', sampleAcct: '220070' },
  { key: 'prepaid_expense', label: 'Prepaid Expense', labelAr: 'مصاريف مدفوعة مقدماً', category: 'General', description: 'Expenses paid in advance', sampleAcct: '120090' },
];

const CATEGORIES = [...new Set(GL_ROLES.map(r => r.category))];

export default function GLRoleDefinitions() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    return GL_ROLES.filter(r => {
      if (category !== 'all' && r.category !== category) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.key.includes(s) || r.label.toLowerCase().includes(s) || r.labelAr.includes(s) || r.description.toLowerCase().includes(s) || r.sampleAcct.includes(s);
      }
      return true;
    });
  }, [search, category]);

  const grouped = useMemo(() => {
    const map: Record<string, GLRole[]> = {};
    filtered.forEach(r => {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r);
    });
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {isAr ? 'أدوار الحسابات (GL Roles)' : 'GL Role Definitions'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'جميع الأدوار المحاسبية المعرّفة في النظام ومراجع الحسابات' : 'All accounting roles used by the posting engine with sample account references'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search roles...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'الكل' : 'All Categories'}</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {Object.entries(grouped).map(([cat, roles]) => (
            <div key={cat} className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{cat}</Badge>
                <span className="text-xs">({roles.length})</span>
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold w-[180px]">{isAr ? 'المفتاح' : 'Role Key'}</th>
                      <th className="text-left px-3 py-2 font-semibold w-[220px]">{isAr ? 'الاسم' : 'Role Name'}</th>
                      <th className="text-left px-3 py-2 font-semibold">{isAr ? 'الوصف' : 'Description'}</th>
                      <th className="text-left px-3 py-2 font-semibold w-[120px]">{isAr ? 'حساب مرجعي' : 'Sample Acct'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r, i) => (
                      <tr key={r.key} className={cn('border-b border-border/50 hover:bg-accent/30', i % 2 === 0 ? 'bg-card' : 'bg-muted/20')}>
                        <td className="px-3 py-1.5 font-mono text-primary">{r.key}</td>
                        <td className="px-3 py-1.5 font-medium">{isAr ? r.labelAr : r.label}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.description}</td>
                        <td className="px-3 py-1.5 font-mono">{r.sampleAcct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground mt-4">
            {isAr ? `${GL_ROLES.length} دور محاسبي معرّف عبر ${CATEGORIES.length} فئة` : `${GL_ROLES.length} GL roles defined across ${CATEGORIES.length} categories`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
