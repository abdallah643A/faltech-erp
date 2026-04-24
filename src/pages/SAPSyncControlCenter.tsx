import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, ListOrdered, Clock, AlertTriangle, Settings, Map, Activity, RotateCcw, Upload, Calendar, Database, ArrowLeftRight, Shield } from 'lucide-react';
import { SyncControlDashboard } from '@/components/sap/sync-center/SyncControlDashboard';
import { SyncJobsList } from '@/components/sap/sync-center/SyncJobsList';
import { SyncQueueView } from '@/components/sap/sync-center/SyncQueueView';
import { SyncFailedRecords } from '@/components/sap/sync-center/SyncFailedRecords';
import { SyncConfiguration } from '@/components/sap/sync-center/SyncConfiguration';
import { SyncEntityMapping } from '@/components/sap/sync-center/SyncEntityMapping';
import { SyncPerformanceMonitor } from '@/components/sap/sync-center/SyncPerformanceMonitor';
import { ManualReSyncCenter } from '@/components/sap/sync-center/ManualReSyncCenter';
import { SyncPushEngine } from '@/components/sap/sync-center/SyncPushEngine';
import { SyncScheduler } from '@/components/sap/sync-center/SyncScheduler';
import { SyncMetadataDiscovery } from '@/components/sap/sync-center/SyncMetadataDiscovery';
import { SyncFieldMappingStudio } from '@/components/sap/sync-center/SyncFieldMappingStudio';
import { SyncAuditTrail } from '@/components/sap/sync-center/SyncAuditTrail';
import { SyncCheckpointPanel } from '@/components/sap/sync-center/SyncCheckpointPanel';

export default function SAPSyncControlCenter() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isAr ? 'مركز التحكم بمزامنة SAP B1' : 'SAP B1 Sync Control Center'}
        </h1>
        <p className="text-muted-foreground">
          {isAr ? 'مزامنة تزايدية ثنائية الاتجاه مع اكتشاف البيانات الوصفية والمراقبة الكاملة' : 'Bi-directional incremental sync with metadata discovery, scheduling & full monitoring'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {isAr ? 'لوحة المراقبة' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5 text-xs">
            <ListOrdered className="h-3.5 w-3.5" />
            {isAr ? 'المهام' : 'Jobs'}
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            {isAr ? 'قائمة السحب' : 'Pull Queue'}
          </TabsTrigger>
          <TabsTrigger value="push" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            {isAr ? 'قائمة الدفع' : 'Push Queue'}
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            {isAr ? 'الفاشلة' : 'Failed'}
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            {isAr ? 'الجدولة' : 'Scheduler'}
          </TabsTrigger>
          <TabsTrigger value="metadata" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" />
            {isAr ? 'البيانات الوصفية' : 'Metadata'}
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-1.5 text-xs">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {isAr ? 'تعيين الحقول' : 'Mappings'}
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            {isAr ? 'الإعدادات' : 'Config'}
          </TabsTrigger>
          <TabsTrigger value="mapping" className="gap-1.5 text-xs">
            <Map className="h-3.5 w-3.5" />
            {isAr ? 'خرائط الكيانات' : 'Entity Map'}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            {isAr ? 'الأداء' : 'Performance'}
          </TabsTrigger>
          <TabsTrigger value="resync" className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            {isAr ? 'إعادة المزامنة' : 'Re-Sync'}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            {isAr ? 'سجل التدقيق' : 'Audit'}
          </TabsTrigger>
          <TabsTrigger value="checkpoints" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" />
            {isAr ? 'نقاط التحقق' : 'Checkpoints'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4"><SyncControlDashboard /></TabsContent>
        <TabsContent value="jobs" className="mt-4"><SyncJobsList /></TabsContent>
        <TabsContent value="queue" className="mt-4"><SyncQueueView /></TabsContent>
        <TabsContent value="push" className="mt-4"><SyncPushEngine /></TabsContent>
        <TabsContent value="failed" className="mt-4"><SyncFailedRecords /></TabsContent>
        <TabsContent value="scheduler" className="mt-4"><SyncScheduler /></TabsContent>
        <TabsContent value="metadata" className="mt-4"><SyncMetadataDiscovery /></TabsContent>
        <TabsContent value="mappings" className="mt-4"><SyncFieldMappingStudio /></TabsContent>
        <TabsContent value="config" className="mt-4"><SyncConfiguration /></TabsContent>
        <TabsContent value="mapping" className="mt-4"><SyncEntityMapping /></TabsContent>
        <TabsContent value="performance" className="mt-4"><SyncPerformanceMonitor /></TabsContent>
        <TabsContent value="resync" className="mt-4"><ManualReSyncCenter /></TabsContent>
        <TabsContent value="audit" className="mt-4"><SyncAuditTrail /></TabsContent>
        <TabsContent value="checkpoints" className="mt-4"><SyncCheckpointPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
