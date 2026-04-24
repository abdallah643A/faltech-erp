import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Link2, Map, DollarSign, Copy, Activity, AlertTriangle, Handshake } from 'lucide-react';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import ICDashboard from '@/components/intercompany/ICDashboard';
import ICRelationshipSetup from '@/components/intercompany/ICRelationshipSetup';
import ICMappingCenter from '@/components/intercompany/ICMappingCenter';
import ICTransferPricing from '@/components/intercompany/ICTransferPricing';
import ICMirrorRules from '@/components/intercompany/ICMirrorRules';
import ICMonitor from '@/components/intercompany/ICMonitor';
import ICExceptionWorkbench from '@/components/intercompany/ICExceptionWorkbench';
import ICSettlementWorkbench from '@/components/intercompany/ICSettlementWorkbench';

export default function IntercompanyTransactions() {
  const { t, language } = useLanguage();
  const { activeCompany } = useActiveCompany();
  const helpModule = getModuleById('intercompany');

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {t('ic.title')}
            {activeCompany && <Badge variant="outline" className="text-xs font-normal">{activeCompany.company_name}</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('ic.subtitle')}</p>
        </div>
        {helpModule && <ModuleHelpDrawer module={helpModule} />}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />{t('ic.tabs.dashboard')}</TabsTrigger>
          <TabsTrigger value="relationships" className="gap-1.5"><Link2 className="h-3.5 w-3.5" />{t('ic.tabs.relationships')}</TabsTrigger>
          <TabsTrigger value="mappings" className="gap-1.5"><Map className="h-3.5 w-3.5" />{t('ic.tabs.mappings')}</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />{t('ic.tabs.pricing')}</TabsTrigger>
          <TabsTrigger value="mirror" className="gap-1.5"><Copy className="h-3.5 w-3.5" />{t('ic.tabs.mirrorRules')}</TabsTrigger>
          <TabsTrigger value="monitor" className="gap-1.5"><Activity className="h-3.5 w-3.5" />{t('ic.tabs.monitor')}</TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />{t('ic.tabs.exceptions')}</TabsTrigger>
          <TabsTrigger value="settlements" className="gap-1.5"><Handshake className="h-3.5 w-3.5" />{t('ic.tabs.settlements')}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><ICDashboard /></TabsContent>
        <TabsContent value="relationships"><ICRelationshipSetup /></TabsContent>
        <TabsContent value="mappings"><ICMappingCenter /></TabsContent>
        <TabsContent value="pricing"><ICTransferPricing /></TabsContent>
        <TabsContent value="mirror"><ICMirrorRules /></TabsContent>
        <TabsContent value="monitor"><ICMonitor /></TabsContent>
        <TabsContent value="exceptions"><ICExceptionWorkbench /></TabsContent>
        <TabsContent value="settlements"><ICSettlementWorkbench /></TabsContent>
      </Tabs>
    </div>
  );
}
