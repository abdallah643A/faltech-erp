import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LayoutDashboard, FolderKanban, AlertTriangle, Users, 
  Shield, TrendingUp, Plus, BarChart3, Activity
} from 'lucide-react';
import { PortfolioHeatMap } from '@/components/pmo/PortfolioHeatMap';
import { RiskRegister } from '@/components/pmo/RiskRegister';
import { ResourceCapacity } from '@/components/pmo/ResourceCapacity';
import { StageGatePanel } from '@/components/pmo/StageGatePanel';
import { ProgramManager } from '@/components/pmo/ProgramManager';
import { DependencyMap } from '@/components/pmo/DependencyMap';
import { IssueLog } from '@/components/pmo/IssueLog';
import { AutoRAGStatus } from '@/components/pmo/AutoRAGStatus';
import { BenefitsRealizationTracker } from '@/components/pmo/BenefitsRealizationTracker';
import { MilestoneTrendAnalysis } from '@/components/pmo/MilestoneTrendAnalysis';
import { StakeholderMatrix } from '@/components/pmo/StakeholderMatrix';
import { PortfolioPrioritization } from '@/components/pmo/PortfolioPrioritization';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';



const healthColors: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

export default function PortfolioDashboard() {
  const { t } = useLanguage();
  const { portfolioItems, portfolioLoading, risks, issues, resources, allocations, programs, stageGates } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState('overview');

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
  const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating').length;
  const criticalRisks = risks.filter(r => r.risk_score >= 20).length;
  const openIssues = issues.filter(i => i.status !== 'closed' && i.status !== 'resolved').length;
  const avgProgress = totalProjects > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / totalProjects) : 0;

  const healthDistribution = {
    green: portfolioItems.filter(p => p.health_status === 'green').length,
    yellow: portfolioItems.filter(p => p.health_status === 'yellow').length,
    red: portfolioItems.filter(p => p.health_status === 'red').length,
  };

  const pmoHelp = getModuleById('pmo');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PMO Portfolio Dashboard</h1>
          <p className="text-muted-foreground text-sm">Enterprise project portfolio governance & oversight</p>
        </div>
        {pmoHelp && <ModuleHelpDrawer module={pmoHelp} />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Projects</span>
            </div>
            <p className="text-2xl font-bold">{totalProjects}</p>
            <p className="text-xs text-muted-foreground">{activeProjects} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Progress</span>
            </div>
            <p className="text-2xl font-bold">{avgProgress}%</p>
            <Progress value={avgProgress} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Budget</span>
            </div>
            <p className="text-2xl font-bold">{(totalBudget / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">{(totalSpent / 1000).toFixed(0)}K spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Programs</span>
            </div>
            <p className="text-2xl font-bold">{programs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Open Risks</span>
            </div>
            <p className="text-2xl font-bold">{openRisks}</p>
            <p className="text-xs text-destructive">{criticalRisks} critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Open Issues</span>
            </div>
            <p className="text-2xl font-bold">{openIssues}</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Summary Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Portfolio Health:</span>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${healthColors.green}`} />
              <span className="text-sm">{healthDistribution.green} Green</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${healthColors.yellow}`} />
              <span className="text-sm">{healthDistribution.yellow} Yellow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${healthColors.red}`} />
              <span className="text-sm">{healthDistribution.red} Red</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
          <TabsTrigger value="overview">Heat Map</TabsTrigger>
          <TabsTrigger value="rag">RAG Status</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="prioritization">Prioritization</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="gates">Stage Gates</TabsTrigger>
          <TabsTrigger value="milestones">MTA</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PortfolioHeatMap portfolioItems={portfolioItems} projects={projects} />
        </TabsContent>

        <TabsContent value="rag">
          <AutoRAGStatus projects={projects} />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramManager />
        </TabsContent>

        <TabsContent value="prioritization">
          <PortfolioPrioritization projects={projects} portfolioItems={portfolioItems} />
        </TabsContent>

        <TabsContent value="dependencies">
          <DependencyMap />
        </TabsContent>

        <TabsContent value="risks">
          <RiskRegister />
        </TabsContent>

        <TabsContent value="issues">
          <IssueLog />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceCapacity />
        </TabsContent>

        <TabsContent value="gates">
          <StageGatePanel />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestoneTrendAnalysis projects={projects} />
        </TabsContent>

        <TabsContent value="stakeholders">
          <StakeholderMatrix projects={projects} />
        </TabsContent>

        <TabsContent value="benefits">
          <BenefitsRealizationTracker projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
