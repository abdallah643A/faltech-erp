import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccountingDetermination } from '@/hooks/useAccountingDetermination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Play, FileText, AlertTriangle, History, BarChart3, BookOpen, Layers, Clock, Shield } from 'lucide-react';

const acctDetTabs = [
  { id: 'dashboard', path: '/accounting-determination' },
  { id: 'rules', path: '/accounting-determination/rules' },
  { id: 'templates', path: '/accounting-determination/templates' },
  { id: 'gl_roles', path: '/accounting-determination/gl-roles' },
  { id: 'controls', path: '/accounting-determination/controls' },
  { id: 'simulator', path: '/accounting-determination/simulator' },
  { id: 'errors', path: '/accounting-determination/errors' },
  { id: 'logs', path: '/accounting-determination/logs' },
  { id: 'reports', path: '/accounting-determination/reports' },
];
import SAPAccountDetermination from '@/components/accounting/SAPAccountDetermination';
import PostingSimulator from '@/components/accounting/PostingSimulator';
import PostingLogViewer from '@/components/accounting/PostingLogViewer';
import AccountingDashboard from '@/components/accounting/AccountingDashboard';
import GLRoleDefinitions from '@/components/accounting/GLRoleDefinitions';
import TransactionTemplates from '@/components/accounting/TransactionTemplates';
import ErrorQueuePanel from '@/components/accounting/ErrorQueuePanel';
import PostingControlsPanel from '@/components/accounting/PostingControlsPanel';
import AccountingReports from '@/components/accounting/AccountingReports';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export default function AccountingDetermination() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { exceptions } = useAccountingDetermination();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = acctDetTabs.find(t => t.path === location.pathname)?.id || 'dashboard';
  const handleTabChange = (tabId: string) => {
    const tab = acctDetTabs.find(t => t.id === tabId);
    if (tab) navigate(tab.path);
  };
  const { activeCompany } = useActiveCompany();
  const helpModule = getModuleById('accounting-determination');

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {isAr ? 'محرك تحديد الحسابات والقيود التلقائية' : 'Account Determination & Auto Journal Engine'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAr ? 'المحرك المركزي للقواعد المحاسبية وإنشاء القيود عبر جميع الوحدات' : 'Central accounting rules engine for GL determination and JE generation across all modules'}
          </p>
          {activeCompany && (
            <Badge variant="outline" className="mt-1 text-xs">
              {activeCompany.company_name}
            </Badge>
          )}
        </div>
        {helpModule && <ModuleHelpDrawer module={helpModule} />}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> {isAr ? 'لوحة المتابعة' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" /> {isAr ? 'القواعد' : 'Rules'}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> {isAr ? 'القوالب' : 'Templates'}
          </TabsTrigger>
          <TabsTrigger value="gl_roles" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> {isAr ? 'أدوار الحسابات' : 'GL Roles'}
          </TabsTrigger>
          <TabsTrigger value="controls" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> {isAr ? 'ضوابط الترحيل' : 'Posting Controls'}
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" /> {isAr ? 'المحاكاة' : 'Simulation'}
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> {isAr ? 'الأخطاء' : 'Error Queue'}
            {exceptions.filter((e: any) => e.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{exceptions.filter((e: any) => e.status === 'open').length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> {isAr ? 'سجل الترحيل' : 'Posting Logs'}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> {isAr ? 'التقارير والتدقيق' : 'Reports & Audit'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><AccountingDashboard /></TabsContent>
        <TabsContent value="rules"><SAPAccountDetermination /></TabsContent>
        <TabsContent value="templates"><TransactionTemplates /></TabsContent>
        <TabsContent value="gl_roles"><GLRoleDefinitions /></TabsContent>
        <TabsContent value="controls"><PostingControlsPanel /></TabsContent>
        <TabsContent value="simulator"><PostingSimulator /></TabsContent>
        <TabsContent value="errors"><ErrorQueuePanel /></TabsContent>
        <TabsContent value="logs"><PostingLogViewer /></TabsContent>
        <TabsContent value="reports"><AccountingReports /></TabsContent>
      </Tabs>
    </div>
  );
}
