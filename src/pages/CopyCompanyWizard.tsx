import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizardShell, type WizardStep } from '@/components/onboarding/OnboardingWizardShell';
import { StepBasicInfo } from '@/components/onboarding/steps/StepBasicInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Search, Check, Copy, Settings, Database, BookOpen, Users as UsersIcon, Package, Truck, Briefcase, Factory, ShieldCheck, FileText, CheckCircle, Loader2, ChevronDown, ChevronRight, AlertTriangle, LayoutDashboard, UserPlus, Layers } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const STEPS: WizardStep[] = [
  { id: 'source', title: 'Select Source Company', titleAr: 'اختر الشركة المصدر', icon: <Building2 className="h-5 w-5" /> },
  { id: 'basic', title: 'New Company Info', titleAr: 'معلومات الشركة الجديدة', icon: <Copy className="h-5 w-5" /> },
  { id: 'select', title: 'Select What to Copy', titleAr: 'اختر ما تريد نسخه', icon: <CheckCircle className="h-5 w-5" /> },
  { id: 'rules', title: 'Copy Rules', titleAr: 'قواعد النسخ', icon: <Settings className="h-5 w-5" /> },
  { id: 'review', title: 'Review & Confirm', titleAr: 'مراجعة وتأكيد', icon: <Check className="h-5 w-5" /> },
];

const COPY_CATEGORIES = [
  {
    id: 'company_settings', label: 'Company Settings', labelAr: 'إعدادات الشركة', icon: <Building2 className="h-4 w-4" />,
    items: [
      { id: 'company_profile', label: 'Company Profile', labelAr: 'ملف الشركة' },
      { id: 'localization', label: 'Localization Settings', labelAr: 'إعدادات التوطين' },
      { id: 'fiscal_year', label: 'Fiscal Year Settings', labelAr: 'إعدادات السنة المالية' },
      { id: 'currency_setup', label: 'Currency Setup', labelAr: 'إعدادات العملة' },
      { id: 'exchange_rates', label: 'Exchange Rate Settings', labelAr: 'أسعار الصرف' },
    ]
  },
  {
    id: 'general_settings', label: 'General Settings', labelAr: 'الإعدادات العامة', icon: <Settings className="h-4 w-4" />,
    items: [
      { id: 'numbering_series', label: 'Numbering Series', labelAr: 'سلاسل الترقيم' },
      { id: 'payment_terms_default', label: 'Default Payment Terms', labelAr: 'شروط الدفع الافتراضية' },
      { id: 'document_settings', label: 'Document Settings', labelAr: 'إعدادات المستندات' },
      { id: 'approval_settings', label: 'Approval Settings', labelAr: 'إعدادات الموافقة' },
      { id: 'notification_settings', label: 'Notification Settings', labelAr: 'إعدادات الإشعارات' },
    ]
  },
  {
    id: 'system_init', label: 'System Initialization', labelAr: 'تهيئة النظام', icon: <Database className="h-4 w-4" />,
    items: [
      { id: 'posting_periods', label: 'Posting Periods', labelAr: 'فترات الترحيل' },
      { id: 'tax_config', label: 'Tax Configuration', labelAr: 'إعدادات الضريبة' },
      { id: 'inventory_setup', label: 'Inventory Setup', labelAr: 'إعدادات المخزون' },
      { id: 'cost_center_setup', label: 'Cost Center Setup', labelAr: 'مراكز التكلفة' },
      { id: 'project_setup', label: 'Project Setup', labelAr: 'المشاريع' },
      { id: 'branch_setup', label: 'Branch Setup', labelAr: 'الفروع' },
    ]
  },
  {
    id: 'financial', label: 'Financial Data Structure', labelAr: 'هيكل البيانات المالية', icon: <BookOpen className="h-4 w-4" />,
    items: [
      { id: 'chart_of_accounts', label: 'Chart of Accounts', labelAr: 'دليل الحسابات' },
      { id: 'acct_determination', label: 'Account Determination Rules', labelAr: 'قواعد تحديد الحسابات' },
      { id: 'cost_centers', label: 'Cost Centers', labelAr: 'مراكز التكلفة' },
      { id: 'distribution_rules', label: 'Distribution Rules', labelAr: 'قواعد التوزيع' },
      { id: 'financial_dimensions', label: 'Financial Dimensions', labelAr: 'الأبعاد المالية' },
    ]
  },
  {
    id: 'master_data', label: 'Master Data', labelAr: 'البيانات الرئيسية', icon: <Package className="h-4 w-4" />,
    items: [
      { id: 'customers', label: 'Customers', labelAr: 'العملاء' },
      { id: 'vendors', label: 'Vendors', labelAr: 'الموردون' },
      { id: 'leads', label: 'Leads', labelAr: 'العملاء المحتملون' },
      { id: 'items_master', label: 'Item Master Data', labelAr: 'بيانات الأصناف' },
      { id: 'item_groups', label: 'Item Groups', labelAr: 'مجموعات الأصناف' },
      { id: 'price_lists', label: 'Price Lists', labelAr: 'قوائم الأسعار' },
      { id: 'warehouses_md', label: 'Warehouses', labelAr: 'المستودعات' },
      { id: 'uom', label: 'Units of Measure', labelAr: 'وحدات القياس' },
      { id: 'employees_md', label: 'Employees', labelAr: 'الموظفون' },
      { id: 'departments_md', label: 'Departments', labelAr: 'الأقسام' },
      { id: 'banks', label: 'Banks', labelAr: 'البنوك' },
      { id: 'payment_methods', label: 'Payment Methods', labelAr: 'طرق الدفع' },
      { id: 'payment_terms_md', label: 'Payment Terms', labelAr: 'شروط الدفع' },
      { id: 'tax_codes', label: 'Tax Codes', labelAr: 'رموز الضريبة' },
    ]
  },
  {
    id: 'inventory_logistics', label: 'Inventory & Logistics', labelAr: 'المخزون واللوجستيات', icon: <Truck className="h-4 w-4" />,
    items: [
      { id: 'warehouses_il', label: 'Warehouses', labelAr: 'المستودعات' },
      { id: 'bin_locations', label: 'Bin Locations', labelAr: 'مواقع التخزين' },
      { id: 'item_groups_il', label: 'Item Groups', labelAr: 'مجموعات الأصناف' },
      { id: 'uom_groups', label: 'UOM Groups', labelAr: 'مجموعات وحدات القياس' },
      { id: 'inventory_settings', label: 'Inventory Settings', labelAr: 'إعدادات المخزون' },
    ]
  },
  {
    id: 'sales_purchasing', label: 'Sales & Purchasing', labelAr: 'المبيعات والمشتريات', icon: <Briefcase className="h-4 w-4" />,
    items: [
      { id: 'sales_employees', label: 'Sales Employees', labelAr: 'موظفو المبيعات' },
      { id: 'pricing_rules', label: 'Pricing Rules', labelAr: 'قواعد التسعير' },
      { id: 'discount_groups', label: 'Discount Groups', labelAr: 'مجموعات الخصم' },
      { id: 'bp_groups', label: 'BP Groups', labelAr: 'مجموعات شركاء الأعمال' },
      { id: 'shipping_types', label: 'Shipping Types', labelAr: 'أنواع الشحن' },
    ]
  },
  {
    id: 'hr_org', label: 'HR & Organization', labelAr: 'الموارد البشرية والتنظيم', icon: <UsersIcon className="h-4 w-4" />,
    items: [
      { id: 'departments_hr', label: 'Departments', labelAr: 'الأقسام' },
      { id: 'positions', label: 'Positions', labelAr: 'المناصب' },
      { id: 'employees_hr', label: 'Employees', labelAr: 'الموظفون' },
      { id: 'attendance_settings', label: 'Attendance Settings', labelAr: 'إعدادات الحضور' },
      { id: 'leave_settings', label: 'Leave Settings', labelAr: 'إعدادات الإجازات' },
    ]
  },
  {
    id: 'projects_cost', label: 'Projects & Cost Accounting', labelAr: 'المشاريع ومحاسبة التكاليف', icon: <Factory className="h-4 w-4" />,
    items: [
      { id: 'projects_pc', label: 'Projects', labelAr: 'المشاريع' },
      { id: 'cost_centers_pc', label: 'Cost Centers', labelAr: 'مراكز التكلفة' },
      { id: 'budget_structure', label: 'Budget Structure', labelAr: 'هيكل الميزانية' },
    ]
  },
  {
    id: 'user_auth', label: 'User & Authorization', labelAr: 'المستخدمون والصلاحيات', icon: <ShieldCheck className="h-4 w-4" />,
    items: [
      { id: 'roles', label: 'Roles', labelAr: 'الأدوار' },
      { id: 'permission_templates', label: 'Permission Templates', labelAr: 'قوالب الصلاحيات' },
      { id: 'approval_templates', label: 'Approval Templates', labelAr: 'قوالب الموافقة' },
      { id: 'user_groups', label: 'User Groups', labelAr: 'مجموعات المستخدمين' },
    ]
  },
  {
    id: 'opening_data', label: 'Opening Data (Advanced)', labelAr: 'بيانات الافتتاح (متقدم)', icon: <FileText className="h-4 w-4" />,
    items: [
      { id: 'opening_balances', label: 'Opening Balances', labelAr: 'أرصدة افتتاحية' },
      { id: 'open_ar', label: 'Open AR Invoices', labelAr: 'فواتير مدينة مفتوحة' },
      { id: 'open_ap', label: 'Open AP Invoices', labelAr: 'فواتير دائنة مفتوحة' },
      { id: 'inventory_opening', label: 'Inventory Opening Quantities', labelAr: 'كميات المخزون الافتتاحية' },
      { id: 'fixed_asset_opening', label: 'Fixed Asset Opening Balances', labelAr: 'أرصدة الأصول الثابتة الافتتاحية' },
    ]
  },
];

export default function CopyCompanyWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({ currency: 'SAR' });
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [searchSource, setSearchSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { allCompanies, isLoadingAll } = useSAPCompanies();

  const handleChange = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const filteredCompanies = useMemo(() => {
    if (!searchSource) return allCompanies;
    const s = searchSource.toLowerCase();
    return allCompanies.filter(c => c.company_name.toLowerCase().includes(s) || c.database_name.toLowerCase().includes(s));
  }, [allCompanies, searchSource]);

  const toggleCategory = (catId: string) => {
    const cat = COPY_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    const allChecked = cat.items.every(i => selectedItems[i.id]);
    const updated = { ...selectedItems };
    cat.items.forEach(i => { updated[i.id] = !allChecked; });
    setSelectedItems(updated);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    COPY_CATEGORIES.forEach(cat => cat.items.forEach(i => { all[i.id] = true; }));
    setSelectedItems(all);
  };

  const unselectAll = () => setSelectedItems({});

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const totalItems = COPY_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);

  const sourceCompany = allCompanies.find(c => c.id === selectedSource);

  const validateStep = (stepIdx: number): boolean | string => {
    switch (stepIdx) {
      case 0:
        if (!selectedSource) return isAr ? 'اختر شركة مصدر' : 'Select a source company';
        return true;
      case 1:
        if (!data.company_name) return isAr ? 'اسم الشركة مطلوب' : 'Company name is required';
        if (!data.company_code) return isAr ? 'رمز الشركة مطلوب' : 'Company code is required';
        return true;
      case 2:
        if (selectedCount === 0) return isAr ? 'اختر عنصراً واحداً على الأقل' : 'Select at least one item to copy';
        return true;
      default:
        return true;
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('sap_companies').insert({
        company_name: data.company_name,
        database_name: data.company_code,
        service_layer_url: sourceCompany?.service_layer_url || '',
        username: '',
        password: '',
        default_currency: data.currency || 'SAR',
        is_active: true,
        is_default: false,
        localization: data.country || sourceCompany?.localization,
        version: '1.0',
      } as any);
      if (error) throw error;
      setSuccess(true);
      toast({ title: isAr ? 'تم إنشاء الشركة بنجاح' : 'Company created successfully from copy!' });
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir={isAr ? 'rtl' : 'ltr'}>
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{isAr ? 'تم نسخ الشركة بنجاح!' : 'Company Copied Successfully!'}</h1>
              <p className="text-sm text-muted-foreground">
                {isAr ? `تم نسخ ${selectedCount} عنصر من` : `${selectedCount} items copied from`}{' '}
                <span className="font-medium text-foreground">{sourceCompany?.company_name}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => navigate('/')} className="gap-2"><LayoutDashboard className="h-4 w-4" />{isAr ? 'لوحة التحكم' : 'Dashboard'}</Button>
              <Button variant="outline" onClick={() => navigate('/users')} className="gap-2"><UserPlus className="h-4 w-4" />{isAr ? 'المستخدمون' : 'Users'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0: // Select source
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={searchSource} onChange={e => setSearchSource(e.target.value)} placeholder={isAr ? 'بحث بالاسم أو الرمز...' : 'Search by name or code...'} className="pl-9 h-9" />
            </div>
            {isLoadingAll ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedSource(company.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedSource === company.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-sm text-foreground">{company.company_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{company.database_name}</p>
                      </div>
                      {selectedSource === company.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary" className="text-[10px]">{company.default_currency}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{company.localization || 'N/A'}</Badge>
                      <Badge variant={company.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {company.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 1: // New company basic info
        return <StepBasicInfo data={data} onChange={handleChange} />;

      case 2: // Select what to copy
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isAr ? `${selectedCount} من ${totalItems} عنصر محدد` : `${selectedCount} of ${totalItems} items selected`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>{isAr ? 'تحديد الكل' : 'Select All'}</Button>
                <Button variant="outline" size="sm" onClick={unselectAll}>{isAr ? 'إلغاء الكل' : 'Clear All'}</Button>
              </div>
            </div>
            <div className="space-y-2">
              {COPY_CATEGORIES.map(cat => {
                const catSelected = cat.items.filter(i => selectedItems[i.id]).length;
                const isExpanded = expandedCats[cat.id] !== false;
                const isAdvanced = cat.id === 'opening_data';
                return (
                  <Collapsible key={cat.id} open={isExpanded} onOpenChange={v => setExpandedCats(p => ({ ...p, [cat.id]: v }))}>
                    <Card className={isAdvanced ? 'border-amber-200 bg-amber-50/30' : ''}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 rounded-t-lg">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={catSelected === cat.items.length}
                              onCheckedChange={() => toggleCategory(cat.id)}
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-2">
                              {cat.icon}
                              <span className="text-sm font-medium">{isAr ? cat.labelAr : cat.label}</span>
                            </div>
                            {isAdvanced && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">{isAr ? 'متقدم' : 'Advanced'}</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{catSelected}/{cat.items.length}</Badge>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-3 space-y-1 border-t">
                          {cat.items.map(item => (
                            <label key={item.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer">
                              <Checkbox checked={!!selectedItems[item.id]} onCheckedChange={() => toggleItem(item.id)} />
                              <span className="text-xs">{isAr ? item.labelAr : item.label}</span>
                            </label>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        );

      case 3: // Copy rules
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{isAr ? 'قواعد النسخ' : 'Copy Rules & Data Handling'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{isAr ? 'نوع النسخ' : 'Copy Type'}</Label>
                  <Select value={data.copy_type || 'structure_data'} onValueChange={v => handleChange('copy_type', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structure_only">{isAr ? 'الهيكل فقط' : 'Structure Only'}</SelectItem>
                      <SelectItem value="structure_data">{isAr ? 'الهيكل والبيانات الرئيسية' : 'Structure & Master Data'}</SelectItem>
                      <SelectItem value="selected_modules">{isAr ? 'الوحدات المحددة فقط' : 'Selected Modules Only'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 divide-y">
                  {[
                    { field: 'include_inactive', label: 'Include Inactive Master Data', labelAr: 'تضمين البيانات غير النشطة' },
                    { field: 'exclude_confidential', label: 'Exclude Confidential Fields', labelAr: 'استبعاد الحقول السرية' },
                    { field: 'reset_balances', label: 'Reset Balances & History', labelAr: 'إعادة تعيين الأرصدة والسجل' },
                    { field: 'preserve_codes', label: 'Preserve Source Codes', labelAr: 'الحفاظ على الرموز المصدر' },
                    { field: 'remap_warehouses', label: 'Remap Warehouses/Branches', labelAr: 'إعادة تعيين المستودعات/الفروع' },
                  ].map(item => (
                    <div key={item.field} className="flex items-center justify-between py-2.5">
                      <Label className="text-sm">{isAr ? item.labelAr : item.label}</Label>
                      <Switch checked={!!data[item.field]} onCheckedChange={v => handleChange(item.field, v)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedItems['price_lists'] && !selectedItems['items_master'] && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {isAr ? 'تحذير: تم تحديد قوائم الأسعار بدون الأصناف. قد لا تعمل بشكل صحيح.' : 'Warning: Price lists selected without items. They may not function correctly.'}
              </div>
            )}
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">{isAr ? 'ملخص النسخ' : 'Copy Summary'}</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">{isAr ? 'من:' : 'From:'}</span> <span className="font-medium">{sourceCompany?.company_name}</span></div>
                <div><span className="text-muted-foreground">{isAr ? 'إلى:' : 'To:'}</span> <span className="font-medium">{data.company_name}</span></div>
                <div><span className="text-muted-foreground">{isAr ? 'العناصر:' : 'Items:'}</span> <span className="font-medium">{selectedCount}</span></div>
                <div><span className="text-muted-foreground">{isAr ? 'نوع النسخ:' : 'Copy Type:'}</span> <span className="font-medium">{data.copy_type || 'Structure & Data'}</span></div>
              </div>
            </div>
            {COPY_CATEGORIES.map(cat => {
              const catItems = cat.items.filter(i => selectedItems[i.id]);
              if (catItems.length === 0) return null;
              return (
                <Card key={cat.id}>
                  <CardHeader className="pb-2 px-4 pt-3">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <CardTitle className="text-sm">{isAr ? cat.labelAr : cat.label}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{catItems.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1">
                      {catItems.map(i => (
                        <Badge key={i.id} variant="outline" className="text-[10px]">{isAr ? i.labelAr : i.label}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
    }
  };

  return (
    <OnboardingWizardShell
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      onFinish={handleFinish}
      onCancel={() => navigate('/login')}
      title="Copy From Existing Company"
      titleAr="نسخ من شركة موجودة"
      loading={loading}
      validateStep={validateStep}
      finishLabel="Create Company From Copy"
      finishLabelAr="إنشاء شركة من النسخ"
      confirmTitle={isAr ? 'تأكيد نسخ الشركة' : 'Confirm Company Copy'}
      confirmDescription={isAr ? 'سيتم إنشاء شركة جديدة بناءً على البيانات المحددة من الشركة المصدر.' : 'A new company will be created based on selected data from the source company. This operation cannot be undone.'}
    >
      {renderStep()}
    </OnboardingWizardShell>
  );
}
