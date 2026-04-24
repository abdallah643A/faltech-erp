import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, DollarSign, TrendingUp, ShoppingCart, Package, Landmark,
  Users, Building2, Wrench, Headphones, Factory, Layers, BarChart3, Shield,
  Inbox, Brain, Calculator, Truck, GraduationCap, FileText,
} from 'lucide-react';

interface Props {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard & Analytics', labelAr: 'لوحة التحكم والتحليلات', icon: LayoutDashboard, core: true },
  { key: 'finance', label: 'Finance & Accounting', labelAr: 'المالية والمحاسبة', icon: DollarSign, core: true },
  { key: 'sales', label: 'Sales & AR', labelAr: 'المبيعات والذمم المدينة', icon: TrendingUp, core: false },
  { key: 'purchasing', label: 'Purchasing & AP', labelAr: 'المشتريات والذمم الدائنة', icon: ShoppingCart, core: false },
  { key: 'inventory', label: 'Inventory & Warehousing', labelAr: 'المخزون والتخزين', icon: Package, core: false },
  { key: 'banking', label: 'Banking & Payments', labelAr: 'البنوك والمدفوعات', icon: Landmark, core: false },
  { key: 'crm', label: 'CRM & Opportunities', labelAr: 'إدارة علاقات العملاء', icon: Users, core: false },
  { key: 'hr', label: 'Human Resources', labelAr: 'الموارد البشرية', icon: GraduationCap, core: false },
  { key: 'projects', label: 'Project Management', labelAr: 'إدارة المشاريع', icon: Layers, core: false },
  { key: 'cpms', label: 'Construction (CPMS)', labelAr: 'إدارة مشاريع البناء', icon: Building2, core: false },
  { key: 'production', label: 'Production & MRP', labelAr: 'الإنتاج وتخطيط المواد', icon: Factory, core: false },
  { key: 'service', label: 'Service & Support', labelAr: 'الخدمة والدعم', icon: Headphones, core: false },
  { key: 'fixed-assets', label: 'Fixed Assets', labelAr: 'الأصول الثابتة', icon: Calculator, core: false },
  { key: 'fleet', label: 'Fleet Management', labelAr: 'إدارة الأسطول', icon: Truck, core: false },
  { key: 'reports', label: 'Reports & BI', labelAr: 'التقارير وذكاء الأعمال', icon: BarChart3, core: true },
  { key: 'social-inbox', label: 'Social Inbox & Messaging', labelAr: 'صندوق الرسائل الاجتماعية', icon: Inbox, core: false },
  { key: 'ai', label: 'AI & Automation', labelAr: 'الذكاء الاصطناعي والأتمتة', icon: Brain, core: false },
  { key: 'administration', label: 'Administration', labelAr: 'الإدارة والإعدادات', icon: Shield, core: true },
  { key: 'ecm', label: 'Document Management (ECM)', labelAr: 'إدارة المستندات', icon: FileText, core: false },
];

export function StepModuleSelection({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const enabledModules: string[] = data.enabled_modules || MODULES.filter(m => m.core || ['sales', 'purchasing', 'inventory', 'banking'].includes(m.key)).map(m => m.key);

  const toggleModule = (key: string) => {
    const mod = MODULES.find(m => m.key === key);
    if (mod?.core) return;
    const updated = enabledModules.includes(key)
      ? enabledModules.filter(m => m !== key)
      : [...enabledModules, key];
    onChange('enabled_modules', updated);
  };

  const enableAll = () => onChange('enabled_modules', MODULES.map(m => m.key));
  const enableCore = () => onChange('enabled_modules', MODULES.filter(m => m.core || ['sales', 'purchasing', 'inventory', 'banking'].includes(m.key)).map(m => m.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isAr ? 'اختر الوحدات التي تريد تفعيلها لهذه الشركة. يمكنك تغيير هذا لاحقاً.' : 'Select which modules to enable for this company. You can change this later.'}
        </p>
        <div className="flex gap-2">
          <button onClick={enableCore} className="text-xs text-primary hover:underline">{isAr ? 'أساسي فقط' : 'Core Only'}</button>
          <span className="text-muted-foreground">|</span>
          <button onClick={enableAll} className="text-xs text-primary hover:underline">{isAr ? 'تفعيل الكل' : 'Enable All'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODULES.map(mod => {
          const enabled = enabledModules.includes(mod.key);
          const Icon = mod.icon;
          return (
            <Card key={mod.key} className={`transition-all ${enabled ? 'border-primary/40 bg-primary/5' : 'opacity-60'}`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium cursor-pointer">{isAr ? mod.labelAr : mod.label}</Label>
                      {mod.core && <Badge variant="secondary" className="text-[9px] px-1 py-0">{isAr ? 'أساسي' : 'Core'}</Badge>}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => toggleModule(mod.key)}
                  disabled={mod.core}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {isAr ? `${enabledModules.length} وحدة مفعلة من ${MODULES.length}` : `${enabledModules.length} of ${MODULES.length} modules enabled`}
      </p>
    </div>
  );
}
