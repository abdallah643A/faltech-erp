import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizardShell, type WizardStep } from '@/components/onboarding/OnboardingWizardShell';
import { StepBasicInfo } from '@/components/onboarding/steps/StepBasicInfo';
import { StepGeneralSettings } from '@/components/onboarding/steps/StepGeneralSettings';
import { StepSystemInit } from '@/components/onboarding/steps/StepSystemInit';
import { StepAdminUsers } from '@/components/onboarding/steps/StepAdminUsers';
import { StepCOA } from '@/components/onboarding/steps/StepCOA';
import { StepMasterData } from '@/components/onboarding/steps/StepMasterData';
import { StepModuleSelection } from '@/components/onboarding/steps/StepModuleSelection';
import { StepReview } from '@/components/onboarding/steps/StepReview';
import { Building2, Settings, Database, Users, BookOpen, Layers, CheckCircle, Loader2, ArrowRight, LayoutDashboard, FileSpreadsheet, UserPlus, Grid3X3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

const STEPS: WizardStep[] = [
  { id: 'basic', title: 'Company Information', titleAr: 'معلومات الشركة', icon: <Building2 className="h-5 w-5" /> },
  { id: 'general', title: 'General Settings', titleAr: 'الإعدادات العامة', icon: <Settings className="h-5 w-5" /> },
  { id: 'modules', title: 'Module Selection', titleAr: 'اختيار الوحدات', icon: <Grid3X3 className="h-5 w-5" /> },
  { id: 'system', title: 'System Initialization', titleAr: 'تهيئة النظام', icon: <Database className="h-5 w-5" /> },
  { id: 'users', title: 'Admin & Users', titleAr: 'المسؤول والمستخدمون', icon: <Users className="h-5 w-5" /> },
  { id: 'coa', title: 'Chart of Accounts', titleAr: 'دليل الحسابات', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'master', title: 'Master Data', titleAr: 'البيانات الرئيسية', icon: <Layers className="h-5 w-5" />, optional: true },
  { id: 'review', title: 'Review & Confirm', titleAr: 'مراجعة وتأكيد', icon: <CheckCircle className="h-5 w-5" /> },
];

export default function CreateCompanyWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({ currency: 'SAR', timezone: 'Asia/Riyadh' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === 'ar';

  const handleChange = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepIdx: number): boolean | string => {
    switch (stepIdx) {
      case 0:
        if (!data.company_name) return isAr ? 'اسم الشركة مطلوب' : 'Company name is required';
        if (!data.company_code) return isAr ? 'رمز الشركة مطلوب' : 'Company code is required';
        if (!data.country) return isAr ? 'البلد مطلوب' : 'Country is required';
        if (!data.email) return isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required';
        return true;
      case 4: {
        const users = data.users || [];
        if (users.length === 0) return isAr ? 'يجب إضافة مستخدم واحد على الأقل' : 'At least one user is required';
        const admin = users[0];
        if (!admin.full_name || !admin.email || !admin.password) return isAr ? 'أكمل بيانات المسؤول الرئيسي' : 'Complete primary admin details';
        return true;
      }
      default:
        return true;
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Collect settings
      const settings = {
        currency: data.currency || 'SAR',
        reporting_currency: data.reporting_currency,
        decimal_places: data.decimal_places ?? 2,
        date_format: data.date_format || 'DD/MM/YYYY',
        time_format: data.time_format || '24h',
        doc_numbering: data.doc_numbering || 'automatic',
        posting_period_control: data.posting_period_control || 'monthly',
        default_tax: data.default_tax || 'vat_15',
        default_payment_terms: data.default_payment_terms || 'net_30',
        enable_cost_centers: !!data.enable_cost_centers,
        enable_projects: !!data.enable_projects,
        enable_warehouses: !!data.enable_warehouses,
        enable_multi_branch: !!data.enable_multi_branch,
        enable_approvals: !!data.enable_approvals,
        enable_budget: !!data.enable_budget,
        auto_je_numbering: !!data.auto_je_numbering,
        valuation_method: data.valuation_method || 'moving_average',
        default_warehouse: data.default_warehouse,
        item_code_method: data.item_code_method || 'manual',
        customer_series: data.customer_series,
        vendor_series: data.vendor_series,
        employee_series: data.employee_series,
        document_series: data.document_series,
        create_periods: !!data.create_periods,
        opening_balances: !!data.opening_balances,
        enable_audit: !!data.enable_audit,
        enable_notifications: !!data.enable_notifications,
      };

      // Collect master data
      const masterData: Record<string, string[]> = {};
      const mdKeys = ['bp_groups', 'customer_groups', 'vendor_groups', 'warehouses', 'item_groups', 'uom',
        'cost_centers', 'departments', 'branches', 'payment_methods', 'payment_terms', 'banks',
        'tax_codes', 'currencies', 'projects', 'sales_employees'];
      for (const key of mdKeys) {
        if (data[`md_${key}`]) {
          masterData[key] = data[`md_${key}`];
        }
      }

      // COA template
      const coaTemplate = {
        method: data.coa_method || null,
        accounts: data.coa_accounts || [],
      };

      // Enabled modules
      const enabledModules = data.enabled_modules || ['dashboard', 'finance', 'sales', 'purchasing', 'inventory', 'banking', 'reports', 'administration'];

      // Create company
      const { data: newCompany, error } = await supabase.from('sap_companies').insert({
        company_name: data.company_name,
        database_name: data.company_code,
        service_layer_url: '',
        username: '',
        password: '',
        default_currency: data.currency || 'SAR',
        is_active: true,
        is_default: false,
        localization: data.country,
        version: '1.0',
        settings: settings,
        master_data: masterData,
        coa_template: coaTemplate,
        enabled_modules: enabledModules,
        created_by: user?.id || null,
      } as any).select('id').single();

      if (error) throw error;

      // Set as active company for the current user
      if (user?.id && newCompany?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (prof) {
          await supabase
            .from('profiles')
            .update({ active_company_id: newCompany.id } as any)
            .eq('id', prof.id);
        }
      }

      setSuccess(true);
      toast({ title: isAr ? 'تم إنشاء الشركة بنجاح' : 'Company created successfully!' });
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
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isAr ? 'تم إنشاء الشركة بنجاح!' : 'Company Created Successfully!'}
              </h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{data.company_name}</span>
                {isAr ? ' جاهزة للاستخدام.' : ' is now ready to use.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => { window.location.href = '/'; }} className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                {isAr ? 'لوحة التحكم' : 'Go to Dashboard'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/finance/opening-balances')} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {isAr ? 'أرصدة افتتاحية' : 'Opening Balances'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/users')} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {isAr ? 'إدارة المستخدمين' : 'Manage Users'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/data-transfer')} className="gap-2">
                <Layers className="h-4 w-4" />
                {isAr ? 'استيراد البيانات' : 'Import Master Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <OnboardingWizardShell
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      onFinish={handleFinish}
      onCancel={() => navigate('/login')}
      title="Create New Company"
      titleAr="إنشاء شركة جديدة"
      loading={loading}
      validateStep={validateStep}
      finishLabel="Create Company"
      finishLabelAr="إنشاء الشركة"
    >
      {step === 0 && <StepBasicInfo data={data} onChange={handleChange} />}
      {step === 1 && <StepGeneralSettings data={data} onChange={handleChange} />}
      {step === 2 && <StepModuleSelection data={data} onChange={handleChange} />}
      {step === 3 && <StepSystemInit data={data} onChange={handleChange} />}
      {step === 4 && <StepAdminUsers data={data} onChange={handleChange} />}
      {step === 5 && <StepCOA data={data} onChange={handleChange} />}
      {step === 6 && <StepMasterData data={data} onChange={handleChange} />}
      {step === 7 && <StepReview data={data} onGoToStep={setStep} />}
    </OnboardingWizardShell>
  );
}
