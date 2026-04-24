import { useState } from 'react';
import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Cpu, Map, BookOpen, Shield, Users, Bug, Radar, Key, Lock, Zap } from 'lucide-react';
import { TechAssetRegistry } from '@/components/tmo/TechAssetRegistry';
import { TechRoadmap } from '@/components/tmo/TechRoadmap';
import { ArchitectureGovernance } from '@/components/tmo/ArchitectureGovernance';
import { TMOVendorManager } from '@/components/tmo/TMOVendorManager';
import { TMOStandardsRegister } from '@/components/tmo/TMOStandardsRegister';
import { TechDebtBacklog } from '@/components/tmo/TechDebtBacklog';
import { TechnologyRadar } from '@/components/tmo/TechnologyRadar';
import { LicenseOptimizer } from '@/components/tmo/LicenseOptimizer';
import { VendorLockInScore } from '@/components/tmo/VendorLockInScore';
import { ChangeImpactAnalysis } from '@/components/tmo/ChangeImpactAnalysis';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TMODashboard() {
  const { t } = useLanguage();
  const { techAssets, roadmapItems, decisions, standards, vendors } = useTMOPortfolio();
  const [activeTab, setActiveTab] = useState('assets');

  const activeAssets = techAssets.filter(a => a.lifecycle_status === 'active').length;
  const eolAssets = techAssets.filter(a => a.lifecycle_status === 'end_of_life').length;
  const avgHealth = techAssets.length > 0 ? (techAssets.reduce((s, a) => s + (a.health_score || 0), 0) / techAssets.length).toFixed(1) : '0';
  const totalTCO = techAssets.reduce((s, a) => s + (a.total_cost_of_ownership || 0), 0);
  const strategicVendors = vendors.filter(v => v.tier === 'strategic').length;

  const tmoHelp = getModuleById('tmo');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TMO — Technology Management Office</h1>
          <p className="text-muted-foreground text-sm">Technology portfolio governance, roadmaps & architecture standards</p>
        </div>
        {tmoHelp && <ModuleHelpDrawer module={tmoHelp} />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Tech Assets</p>
          <p className="text-2xl font-bold">{techAssets.length}</p>
          <p className="text-xs text-muted-foreground">{activeAssets} active · {eolAssets} EOL</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Health Score</p>
          <p className="text-2xl font-bold">{avgHealth}<span className="text-sm text-muted-foreground">/5</span></p>
          <Progress value={Number(avgHealth) * 20} className="h-1.5 mt-1" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total TCO (3yr)</p>
          <p className="text-2xl font-bold">{(totalTCO / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Roadmap Items</p>
          <p className="text-2xl font-bold">{roadmapItems.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Vendors</p>
          <p className="text-2xl font-bold">{vendors.length}</p>
          <p className="text-xs text-muted-foreground">{strategicVendors} strategic</p>
        </CardContent></Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
          <TabsTrigger value="assets" className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Assets</TabsTrigger>
          <TabsTrigger value="roadmap" className="flex items-center gap-1"><Map className="h-3.5 w-3.5" /> Roadmap</TabsTrigger>
          <TabsTrigger value="architecture" className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Architecture</TabsTrigger>
          <TabsTrigger value="standards" className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Standards</TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Vendors</TabsTrigger>
          <TabsTrigger value="tech-debt" className="flex items-center gap-1"><Bug className="h-3.5 w-3.5" /> Tech Debt</TabsTrigger>
          <TabsTrigger value="radar" className="flex items-center gap-1"><Radar className="h-3.5 w-3.5" /> Radar</TabsTrigger>
          <TabsTrigger value="licenses" className="flex items-center gap-1"><Key className="h-3.5 w-3.5" /> Licenses</TabsTrigger>
          <TabsTrigger value="lock-in" className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Lock-in</TabsTrigger>
          <TabsTrigger value="impact" className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="assets"><TechAssetRegistry /></TabsContent>
        <TabsContent value="roadmap"><TechRoadmap /></TabsContent>
        <TabsContent value="architecture"><ArchitectureGovernance /></TabsContent>
        <TabsContent value="standards"><TMOStandardsRegister /></TabsContent>
        <TabsContent value="vendors"><TMOVendorManager /></TabsContent>
        <TabsContent value="tech-debt"><TechDebtBacklog techAssets={techAssets} /></TabsContent>
        <TabsContent value="radar"><TechnologyRadar techAssets={techAssets} /></TabsContent>
        <TabsContent value="licenses"><LicenseOptimizer techAssets={techAssets} /></TabsContent>
        <TabsContent value="lock-in"><VendorLockInScore techAssets={techAssets} vendors={vendors} /></TabsContent>
        <TabsContent value="impact"><ChangeImpactAnalysis techAssets={techAssets} vendors={vendors} /></TabsContent>
      </Tabs>
    </div>
  );
}
