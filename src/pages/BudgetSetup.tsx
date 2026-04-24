import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BarChart3, FileText, Grid3X3, GitBranch, CheckCircle2, Shield, History, Calendar, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { useBudgetMasters, useBudgetVersions, useBudgetVersionLines, BudgetMaster, BudgetVersion } from '@/hooks/useBudgetMasters';
import { BudgetDashboard } from '@/components/budget/BudgetDashboard';
import { BudgetMasterList } from '@/components/budget/BudgetMasterList';
import { BudgetMasterForm } from '@/components/budget/BudgetMasterForm';
import { BudgetLineItems } from '@/components/budget/BudgetLineItems';
import { BudgetPeriodDistribution } from '@/components/budget/BudgetPeriodDistribution';
import { BudgetVersionsTab } from '@/components/budget/BudgetVersionsTab';
import { BudgetApprovalsTab } from '@/components/budget/BudgetApprovalsTab';
import { BudgetControlsTab } from '@/components/budget/BudgetControlsTab';
import { BudgetAuditTrailTab } from '@/components/budget/BudgetAuditTrailTab';
import { format } from 'date-fns';
import { formatSAR } from '@/lib/currency';

const BUDGET_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Budget',
  project: 'Project Budget',
  department: 'Department Budget',
  cost_center: 'Cost Center Budget',
  branch: 'Branch Budget',
  capex: 'CAPEX Budget',
  opex: 'OPEX Budget',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-green-600 text-white',
  rejected: 'bg-destructive/10 text-destructive',
  superseded: 'bg-muted text-muted-foreground',
  closed: 'bg-muted text-muted-foreground',
  frozen: 'bg-blue-200 text-blue-800',
};

export default function BudgetSetup() {
  const { t } = useLanguage();
  const [selectedBudget, setSelectedBudget] = useState<BudgetMaster | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<BudgetVersion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetMaster | null>(null);
  const [tab, setTab] = useState('overview');

  const budgetMasters = useBudgetMasters();
  const versions = useBudgetVersions(selectedBudget?.id);
  const lines = useBudgetVersionLines(selectedVersion?.id);

  // Auto-select latest version when budget is selected
  useEffect(() => {
    if (versions.data?.length && !selectedVersion) {
      const latestDraftOrActive = versions.data.find(v => v.status === 'active') ||
        versions.data.find(v => v.status === 'draft') ||
        versions.data[versions.data.length - 1];
      setSelectedVersion(latestDraftOrActive || null);
    }
  }, [versions.data, selectedVersion]);

  const handleSelectBudget = (b: BudgetMaster) => {
    setSelectedBudget(b);
    setSelectedVersion(null);
    setTab('lines');
  };

  const handleNewBudget = () => {
    setEditBudget(null);
    setFormOpen(true);
  };

  const handleSaveBudget = (data: Partial<BudgetMaster>) => {
    if (data.id) {
      budgetMasters.update.mutate(data as any);
    } else {
      budgetMasters.create.mutate(data);
    }
  };

  const handleBack = () => {
    setSelectedBudget(null);
    setSelectedVersion(null);
    setTab('overview');
  };

  const isEditable = selectedVersion?.status === 'draft';
  const startYear = selectedBudget?.is_multi_year ? (selectedBudget.start_year || selectedBudget.fiscal_year) : selectedBudget?.fiscal_year || new Date().getFullYear();
  const endYear = selectedBudget?.is_multi_year ? (selectedBudget.end_year || selectedBudget.fiscal_year) : selectedBudget?.fiscal_year || new Date().getFullYear();

  // Master list view
  if (!selectedBudget) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Budget Setup</h1>
          <SAPSyncButton entity={'budget' as any} size="sm" />
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="register"><FileText className="h-4 w-4 mr-1" />Budget Register</TabsTrigger>
            <TabsTrigger value="controls"><Shield className="h-4 w-4 mr-1" />Controls</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <BudgetDashboard budgets={budgetMasters.data || []} />
          </TabsContent>
          <TabsContent value="register">
            <BudgetMasterList
              budgets={budgetMasters.data || []}
              isLoading={budgetMasters.isLoading}
              onSelect={handleSelectBudget}
              onNew={handleNewBudget}
              onDelete={id => budgetMasters.remove.mutate(id)}
            />
          </TabsContent>
          <TabsContent value="controls">
            <BudgetControlsTab />
          </TabsContent>
        </Tabs>

        <BudgetMasterForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveBudget} editData={editBudget} />
      </div>
    );
  }

  // Detail view for selected budget
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground truncate">{selectedBudget.budget_name}</h1>
            <Badge variant="outline" className="text-xs font-mono">{selectedBudget.budget_code}</Badge>
            <Badge className={`text-xs ${STATUS_COLORS[selectedBudget.approval_status] || ''}`}>
              {selectedBudget.approval_status?.replace('_', ' ')}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {BUDGET_TYPE_LABELS[selectedBudget.budget_type] || selectedBudget.budget_type}
            </Badge>
            {selectedBudget.is_multi_year && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />{selectedBudget.start_year}–{selectedBudget.end_year}
              </Badge>
            )}
            {selectedVersion && (
              <Badge variant="secondary" className="text-xs">
                <GitBranch className="h-3 w-3 mr-1" />v{selectedVersion.version_number}
                <span className="ml-1 capitalize">({selectedVersion.status.replace('_', ' ')})</span>
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span>FY {selectedBudget.fiscal_year}</span>
            <span>{format(new Date(selectedBudget.start_date), 'dd/MM/yyyy')} – {format(new Date(selectedBudget.end_date), 'dd/MM/yyyy')}</span>
            <span>Basis: {selectedBudget.budget_basis?.replace('_', '-')}</span>
            <span>Currency: {selectedBudget.currency}</span>
            {selectedBudget.budget_owner_name && <span>Owner: {selectedBudget.budget_owner_name}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setEditBudget(selectedBudget); setFormOpen(true); }}>
          Edit Header
        </Button>
      </div>

      {/* Version totals bar */}
      {selectedVersion && (
        <Card className="bg-muted/30">
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-6 text-xs font-medium overflow-auto">
              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-primary" />Original: <span className="font-mono">{formatSAR(selectedVersion.total_original)}</span></span>
              <span>Revised: <span className="font-mono">{formatSAR(selectedVersion.total_revised)}</span></span>
              <span>Committed: <span className="font-mono">{formatSAR(selectedVersion.total_committed)}</span></span>
              <span>Actual: <span className="font-mono">{formatSAR(selectedVersion.total_actual)}</span></span>
              <span>Forecast: <span className="font-mono">{formatSAR(selectedVersion.total_forecast)}</span></span>
              <span className={Number(selectedVersion.total_available) < 0 ? 'text-destructive' : 'text-green-600'}>
                Available: <span className="font-mono">{formatSAR(selectedVersion.total_available)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="lines"><Grid3X3 className="h-4 w-4 mr-1" />Budget Lines</TabsTrigger>
          <TabsTrigger value="distribution"><Calendar className="h-4 w-4 mr-1" />Period Distribution</TabsTrigger>
          <TabsTrigger value="versions"><GitBranch className="h-4 w-4 mr-1" />Revisions</TabsTrigger>
          <TabsTrigger value="approvals"><CheckCircle2 className="h-4 w-4 mr-1" />Approvals</TabsTrigger>
          <TabsTrigger value="controls"><Shield className="h-4 w-4 mr-1" />Controls</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" />Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          {selectedVersion ? (
            <BudgetLineItems versionId={selectedVersion.id} isEditable={isEditable} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">Loading version...</div>
          )}
        </TabsContent>

        <TabsContent value="distribution">
          <BudgetPeriodDistribution
            lines={lines.data || []}
            startYear={startYear}
            endYear={endYear}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="versions">
          <BudgetVersionsTab
            budgetId={selectedBudget.id}
            activeVersionId={selectedVersion?.id || null}
            onVersionSelect={v => setSelectedVersion(v)}
          />
        </TabsContent>

        <TabsContent value="approvals">
          {selectedVersion ? (
            <BudgetApprovalsTab versionId={selectedVersion.id} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">Select a version to view approvals</div>
          )}
        </TabsContent>

        <TabsContent value="controls">
          <BudgetControlsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <BudgetDashboard budgets={[selectedBudget]} />
        </TabsContent>

        <TabsContent value="audit">
          <BudgetAuditTrailTab budget={selectedBudget} versions={versions.data || []} />
        </TabsContent>
      </Tabs>

      <BudgetMasterForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSaveBudget} editData={editBudget} />
    </div>
  );
}
