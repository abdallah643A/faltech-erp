import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSDrawings } from '@/hooks/useCPMSDrawings';
import { useCPMSReporting } from '@/hooks/useCPMSReporting';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import ReportingOverview from '@/components/cpms/reporting/ReportingOverview';
import ExportPanel from '@/components/cpms/reporting/ExportPanel';
import AuditLogViewer from '@/components/cpms/reporting/AuditLogViewer';
import ScheduleManager from '@/components/cpms/reporting/ScheduleManager';
import TemplateManager from '@/components/cpms/reporting/TemplateManager';
import VersionHistory from '@/components/cpms/reporting/VersionHistory';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSMeasurementReporting() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const { drawings } = useCPMSDrawings();
  const reporting = useCPMSReporting();

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms/drawing-measurement')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Measurement Reporting & Export
          </h1>
          <p className="text-sm text-muted-foreground">
            تقارير القياسات – Multi-format export, scheduling, audit trail & templates
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="export">{t('common.export')}</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ReportingOverview reporting={reporting} />
        </TabsContent>

        <TabsContent value="export">
          <ExportPanel
            projects={projects || []}
            drawings={drawings.data || []}
            reporting={reporting}
          />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager reporting={reporting} />
        </TabsContent>

        <TabsContent value="schedules">
          <ScheduleManager
            projects={projects || []}
            reporting={reporting}
          />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer reporting={reporting} />
        </TabsContent>

        <TabsContent value="versions">
          <VersionHistory reporting={reporting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
