import { useLanguage } from '@/contexts/LanguageContext';
import { SAPCompanyManager } from '@/components/sap/SAPCompanyManager';
import { SQLServerConfig } from '@/components/settings/SQLServerConfig';
import { SQLServerExplorer } from '@/components/settings/SQLServerExplorer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Server, Database, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CompanySettings() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'ar' ? 'إعداد الشركات وقواعد البيانات' : 'Company & Database Setup'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'إدارة شركات SAP B1 واتصالات قواعد البيانات' : 'Manage SAP B1 companies and database connections'}
        </p>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" />
            {language === 'ar' ? 'الشركات' : 'Companies'}
          </TabsTrigger>
          <TabsTrigger value="sql-server" className="gap-2">
            <Server className="h-4 w-4" />
            {language === 'ar' ? 'SQL Server' : 'SQL Server'}
          </TabsTrigger>
          <TabsTrigger value="explorer" className="gap-2">
            <Database className="h-4 w-4" />
            {language === 'ar' ? 'المستكشف' : 'Explorer'}
          </TabsTrigger>
          <TabsTrigger value="sap-sync" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {language === 'ar' ? 'مزامنة SAP' : 'SAP Sync'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <SAPCompanyManager />
        </TabsContent>

        <TabsContent value="sql-server">
          <SQLServerConfig />
        </TabsContent>

        <TabsContent value="explorer">
          <SQLServerExplorer />
        </TabsContent>

        <TabsContent value="sap-sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                {language === 'ar' ? 'مركز مزامنة SAP' : 'SAP Sync Control Center'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'إدارة المزامنة التزايدية مع SAP Business One' : 'Manage incremental synchronization with SAP Business One'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'استخدم مركز مزامنة SAP لإدارة عمليات السحب والدفع التزايدية مع نقاط التحقق والتتبع على مستوى السجل.'
                  : 'Use the SAP Sync Control Center to manage incremental pull/push operations with checkpoint resumability and row-level state tracking.'}
              </p>
              <Button onClick={() => navigate('/sap-sync-center')}>
                {language === 'ar' ? 'فتح مركز المزامنة' : 'Open Sync Control Center'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
