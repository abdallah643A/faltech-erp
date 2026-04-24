import { useLanguage } from '@/contexts/LanguageContext';
import { SAPSyncDashboard } from '@/components/sap/SAPSyncDashboard';
import { SAPCompanyManager } from '@/components/sap/SAPCompanyManager';
import { SAPUDOManager } from '@/components/sap/SAPUDOManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Database } from 'lucide-react';

export default function SAPIntegration() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SAP B1 Integration</h1>
          <p className="text-muted-foreground">
            {isAr ? 'مزامنة البيانات بين النظام و SAP Business One' : 'Synchronize data between CRM and SAP Business One'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="sync" className="w-full">
        <TabsList>
          <TabsTrigger value="sync" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {isAr ? 'المزامنة' : 'Sync & Settings'}
          </TabsTrigger>
          <TabsTrigger value="udo" className="gap-1.5">
            <Database className="h-3.5 w-3.5" />
            {isAr ? 'إنشاء UDOs/UDFs' : 'Create UDOs/UDFs'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-6 mt-4">
          <SAPCompanyManager />
          <SAPSyncDashboard />
        </TabsContent>

        <TabsContent value="udo" className="mt-4">
          <SAPUDOManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
