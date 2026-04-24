import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { QAQCDashboard } from '@/components/qaqc/QAQCDashboard';
import { QAQCTickets } from '@/components/qaqc/QAQCTickets';
import { QAQCInspections } from '@/components/qaqc/QAQCInspections';
import { QAQCNCRManagement } from '@/components/qaqc/QAQCNCRManagement';
import { QAQCChecklists } from '@/components/qaqc/QAQCChecklists';
import { QAQCDrawings } from '@/components/qaqc/QAQCDrawings';
import { QAQCSiteView360 } from '@/components/qaqc/QAQCSiteView360';
import { QAQCApprovals } from '@/components/qaqc/QAQCApprovals';
import { QAQCReports } from '@/components/qaqc/QAQCReports';
import { QAQCWorkflowSetup } from '@/components/qaqc/QAQCWorkflowSetup';
import { QAQCPlanViewer } from '@/components/qaqc/plan-viewer/QAQCPlanViewer';
import {
  LayoutDashboard, ShieldAlert, ClipboardCheck, AlertTriangle, ListChecks,
  Layout, Eye, CheckSquare, BarChart3, Settings2, MapPinned,
} from 'lucide-react';

const tabs = [
  { id: 'dashboard', path: '/cpms/qaqc', icon: LayoutDashboard, en: 'Dashboard', ar: 'لوحة القيادة' },
  { id: 'planviewer', path: '/cpms/qaqc/plan-viewer', icon: MapPinned, en: 'Plan Viewer', ar: 'عارض المخططات' },
  { id: 'tickets', path: '/cpms/qaqc/tickets', icon: ShieldAlert, en: 'Tickets & Defects', ar: 'التذاكر والعيوب' },
  { id: 'inspections', path: '/cpms/qaqc/inspections', icon: ClipboardCheck, en: 'Inspections', ar: 'الفحوصات' },
  { id: 'ncr', path: '/cpms/qaqc/ncr', icon: AlertTriangle, en: 'NCR', ar: 'عدم المطابقة' },
  { id: 'checklists', path: '/cpms/qaqc/checklists', icon: ListChecks, en: 'Checklists', ar: 'قوائم الفحص' },
  { id: 'drawings', path: '/cpms/qaqc/drawings', icon: Layout, en: 'Drawings', ar: 'المخططات' },
  { id: 'siteview', path: '/cpms/qaqc/siteview', icon: Eye, en: 'SiteView 360', ar: 'رؤية الموقع 360' },
  { id: 'approvals', path: '/cpms/qaqc/approvals', icon: CheckSquare, en: 'Approvals', ar: 'الموافقات' },
  { id: 'workflow', path: '/cpms/qaqc/workflow', icon: Settings2, en: 'Workflow Setup', ar: 'إعداد سير العمل' },
  { id: 'reports', path: '/cpms/qaqc/reports', icon: BarChart3, en: 'Reports', ar: 'التقارير' },
];

export default function QAQCCommandCenter() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = tabs.find(t => t.path === location.pathname)?.id || 'dashboard';
  const isFullScreen = activeTab === 'planviewer';

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) navigate(tab.path);
  };

  return (
    <div className={`${isFullScreen ? '' : 'space-y-4'} page-enter`}>
      {!isFullScreen && (
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'مركز قيادة الجودة' : 'QA/QC Command Center'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'إدارة الجودة والتفتيش ومراقبة الموقع' : 'Quality control, inspections & site monitoring'}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={`flex flex-wrap h-auto gap-1 bg-muted/50 p-1 ${isFullScreen ? 'hidden' : ''}`}>
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs">
              <tab.icon className="h-3.5 w-3.5" />
              {isAr ? tab.ar : tab.en}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><QAQCDashboard /></TabsContent>
        <TabsContent value="planviewer" className={isFullScreen ? 'mt-0' : ''}><QAQCPlanViewer /></TabsContent>
        <TabsContent value="tickets"><QAQCTickets /></TabsContent>
        <TabsContent value="inspections"><QAQCInspections /></TabsContent>
        <TabsContent value="ncr"><QAQCNCRManagement /></TabsContent>
        <TabsContent value="checklists"><QAQCChecklists /></TabsContent>
        <TabsContent value="drawings"><QAQCDrawings /></TabsContent>
        <TabsContent value="siteview"><QAQCSiteView360 /></TabsContent>
        <TabsContent value="approvals"><QAQCApprovals /></TabsContent>
        <TabsContent value="workflow"><QAQCWorkflowSetup /></TabsContent>
        <TabsContent value="reports"><QAQCReports /></TabsContent>
      </Tabs>
    </div>
  );
}
