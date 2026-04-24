import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, Building2, GitBranch, BarChart3, TreePine, RefreshCw, Brain, Calculator, FileText, DollarSign, TrendingUp, Target, Package, Layers, Percent, Scale, Users, Activity, Cog, Beaker, Award, FolderOpen, Lightbulb, Bell, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { type ColumnDef } from '@/utils/exportImportUtils';
import { AICostEstimation } from '@/components/cost/AICostEstimation';
import { MarkupMarginCalculator } from '@/components/cost/MarkupMarginCalculator';
import { RateCardManager } from '@/components/cost/RateCardManager';
import { ProfitabilityWaterfall } from '@/components/cost/ProfitabilityWaterfall';
import { CostBenchmarking } from '@/components/cost/CostBenchmarking';
import { EscalationFormulas } from '@/components/cost/EscalationFormulas';
import { BudgetVarianceDashboard } from '@/components/cost/BudgetVarianceDashboard';
import { CostAllocationWorkPackages } from '@/components/cost/CostAllocationWorkPackages';
import { MarginAnalysisDashboard } from '@/components/cost/MarginAnalysisDashboard';
import { MaterialCostTracker } from '@/components/cost/MaterialCostTracker';
import { EquipmentRentBuyAnalysis } from '@/components/cost/EquipmentRentBuyAnalysis';
import { SubcontractorRateCards } from '@/components/cost/SubcontractorRateCards';
import { CPIMonitoringDashboard } from '@/components/cost/CPIMonitoringDashboard';
import { RevenueRecognitionTracker } from '@/components/cost/RevenueRecognitionTracker';
import { ProfitabilityForecasting } from '@/components/cost/ProfitabilityForecasting';
import { WhatIfScenarioAnalysis } from '@/components/cost/WhatIfScenarioAnalysis';
import { SupplierPerformanceScoring } from '@/components/cost/SupplierPerformanceScoring';
import { CostAllocationAutomation } from '@/components/cost/CostAllocationAutomation';
import { CostExecutiveDashboard } from '@/components/cost/CostExecutiveDashboard';
import { CostDrillDownReports } from '@/components/cost/CostDrillDownReports';
import { ResourceCostOptimizer } from '@/components/cost/ResourceCostOptimizer';
import { ValueEngineeringWorkflow } from '@/components/cost/ValueEngineeringWorkflow';
import { CostAlertsNotifications } from '@/components/cost/CostAlertsNotifications';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

function useCostCenters() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const qc = useQueryClient(); const { toast } = useToast();
  const query = useQuery({ queryKey: ['cost-centers', activeCompanyId], queryFn: async () => {
    let q = supabase.from('cost_centers' as any).select('*').order('code') as any;
    if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
    const { data, error } = await q;
    if (error) throw error; return data as any[];
  }});
  const upsert = useMutation({ mutationFn: async (c: any) => {
    const payload = { ...c, company_id: c.company_id || activeCompanyId };
    const { data, error } = await (supabase.from('cost_centers' as any).upsert(payload).select().single() as any);
    if (error) throw error; return data;
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-centers'] }); toast({ title: 'Cost center saved' }); }});
  const remove = useMutation({ mutationFn: async (id: string) => {
    const { error } = await (supabase.from('cost_centers' as any).delete().eq('id', id) as any);
    if (error) throw error;
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-centers'] }); toast({ title: 'Deleted' }); }});
  return { ...query, upsert, remove };
}

function useDistRules() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const qc = useQueryClient(); const { toast } = useToast();
  const query = useQuery({ queryKey: ['dist-rules', activeCompanyId], queryFn: async () => {
    let q = supabase.from('distribution_rules' as any).select('*').order('code') as any;
    if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
    const { data, error } = await q;
    if (error) throw error; return data as any[];
  }});
  const upsert = useMutation({ mutationFn: async (r: any) => {
    const payload = { ...r, company_id: r.company_id || activeCompanyId };
    const { data, error } = await (supabase.from('distribution_rules' as any).upsert(payload).select().single() as any);
    if (error) throw error; return data;
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['dist-rules'] }); toast({ title: 'Distribution rule saved' }); }});
  const remove = useMutation({ mutationFn: async (id: string) => {
    const { error } = await (supabase.from('distribution_rules' as any).delete().eq('id', id) as any);
    if (error) throw error;
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['dist-rules'] }); toast({ title: 'Deleted' }); }});
  return { ...query, upsert, remove };
}

function useDistRuleLines(ruleId?: string) {
  const { t } = useLanguage();

  const qc = useQueryClient(); const { toast } = useToast();
  const query = useQuery({ queryKey: ['dist-rule-lines', ruleId], enabled: !!ruleId, queryFn: async () => {
    const { data, error } = await (supabase.from('distribution_rule_lines' as any).select('*').eq('rule_id', ruleId).order('created_at') as any);
    if (error) throw error; return data as any[];
  }});
  const upsert = useMutation({ mutationFn: async (l: any) => {
    const { data, error } = await (supabase.from('distribution_rule_lines' as any).upsert(l).select().single() as any);
    if (error) throw error; return data;
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['dist-rule-lines'] }); toast({ title: 'Line saved' }); }});
  return { ...query, upsert };
}

const costAccountingTabs = [
  { id: 'cost-centers', path: '/cost-accounting' },
  { id: 'dist-rules', path: '/cost-accounting/distribution-rules' },
  { id: 'hierarchy', path: '/cost-accounting/hierarchy' },
  { id: 'table', path: '/cost-accounting/cc-dr' },
  { id: 'ai-estimate', path: '/cost-accounting/ai-estimation' },
  { id: 'budget-variance', path: '/cost-accounting/budget-vs-actual' },
  { id: 'work-packages', path: '/cost-accounting/work-packages' },
  { id: 'markup', path: '/cost-accounting/markup-margin' },
  { id: 'margin-analysis', path: '/cost-accounting/margin-analysis' },
  { id: 'rate-cards', path: '/cost-accounting/rate-cards' },
  { id: 'materials', path: '/cost-accounting/materials' },
  { id: 'equipment', path: '/cost-accounting/equipment' },
  { id: 'subcontractors', path: '/cost-accounting/subcontractors' },
  { id: 'profitability', path: '/cost-accounting/profitability' },
  { id: 'benchmarking', path: '/cost-accounting/benchmarking' },
  { id: 'escalation', path: '/cost-accounting/escalation' },
  { id: 'cpi-monitor', path: '/cost-accounting/cpi-monitor' },
  { id: 'revenue-recognition', path: '/cost-accounting/revenue-recognition' },
  { id: 'profit-forecast', path: '/cost-accounting/profit-forecast' },
  { id: 'what-if', path: '/cost-accounting/what-if' },
  { id: 'supplier-scores', path: '/cost-accounting/supplier-scores' },
  { id: 'auto-allocation', path: '/cost-accounting/auto-allocation' },
  { id: 'exec-dashboard', path: '/cost-accounting/executive' },
  { id: 'drill-down', path: '/cost-accounting/drill-down' },
  { id: 'resource-optimizer', path: '/cost-accounting/resource-optimizer' },
  { id: 'value-engineering', path: '/cost-accounting/value-engineering' },
  { id: 'cost-alerts', path: '/cost-accounting/alerts' },
];

export default function CostAccounting() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = costAccountingTabs.find(t => t.path === location.pathname)?.id || 'cost-centers';
  const handleTabChange = (tabId: string) => {
    const tab = costAccountingTabs.find(t => t.id === tabId);
    if (tab) navigate(tab.path);
  };
  const costCenters = useCostCenters();
  const distRules = useDistRules();
  const { projects = [] } = useProjects();

  const ccColumns: ColumnDef[] = [
    { key: 'code', header: 'Code', width: 15 },
    { key: 'name', header: 'Name', width: 25 },
    { key: 'name_ar', header: 'Name (AR)', width: 25 },
    { key: 'dimension_type', header: 'Dimension', width: 15 },
    { key: 'is_active', header: 'Active', width: 10 },
    { key: 'parent_id', header: 'Parent ID', width: 20 },
  ];

  const drColumns: ColumnDef[] = [
    { key: 'code', header: 'Code', width: 15 },
    { key: 'name', header: 'Name', width: 25 },
    { key: 'name_ar', header: 'Name (AR)', width: 25 },
    { key: 'dimension_type', header: 'Dimension', width: 15 },
    { key: 'factor', header: 'Factor', width: 10 },
    { key: 'description', header: 'Description', width: 30 },
  ];

  const handleImportCostCenters = async (rows: any[]) => {
    for (const row of rows) {
      await costCenters.upsert.mutateAsync({
        code: row['Code'] || row['code'],
        name: row['Name'] || row['name'],
        name_ar: row['Name (AR)'] || row['name_ar'] || '',
        dimension_type: row['Dimension'] || row['dimension_type'] || '',
        is_active: row['Active'] !== false && row['Active'] !== 'false',
      });
    }
  };

  const handleImportDistRules = async (rows: any[]) => {
    for (const row of rows) {
      await distRules.upsert.mutateAsync({
        code: row['Code'] || row['code'],
        name: row['Name'] || row['name'],
        name_ar: row['Name (AR)'] || row['name_ar'] || '',
        dimension_type: row['Dimension'] || row['dimension_type'] || '',
        factor: row['Factor'] || row['factor'] || '',
        description: row['Description'] || row['description'] || '',
      });
    }
  };
  const [ccDialog, setCcDialog] = useState(false);
  const [ccForm, setCcForm] = useState({ code: '', name: '', name_ar: '', dimension_type: '', parent_id: '', is_active: true });
  const [editCcId, setEditCcId] = useState<string|null>(null);

  const [drDialog, setDrDialog] = useState(false);
  const [drForm, setDrForm] = useState({ code: '', name: '', name_ar: '', dimension_type: '', factor: '', description: '' });
  const [editDrId, setEditDrId] = useState<string|null>(null);

  const [selRule, setSelRule] = useState<string>('');
  const ruleLines = useDistRuleLines(selRule);

  const handleSaveCc = () => {
    const payload: any = { ...ccForm, parent_id: ccForm.parent_id || null };
    if (editCcId) payload.id = editCcId;
    costCenters.upsert.mutate(payload);
    setCcDialog(false);
  };

  const handleSaveDr = () => {
    const payload: any = { ...drForm };
    if (editDrId) payload.id = editDrId;
    distRules.upsert.mutate(payload);
    setDrDialog(false);
  };

  // Build hierarchy for cost center tree view
  const buildTree = (items: any[], parentId: string | null = null): any[] => {
    return items.filter(i => (i.parent_id || null) === parentId).map(i => ({
      ...i,
      children: buildTree(items, i.id),
    }));
  };

  const flattenTree = (nodes: any[], depth = 0): any[] => {
    return nodes.flatMap((node) => [
      { ...node, treeDepth: depth },
      ...flattenTree(node.children || [], depth + 1),
    ]);
  };

  const tree = costCenters.data ? buildTree(costCenters.data) : [];
  const flatTree = flattenTree(tree);
  const costCentersPagination = usePagination(costCenters.data || [], 25);
  const distRulesPagination = usePagination(distRules.data || [], 25);
  const hierarchyPagination = usePagination(flatTree, 25);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cost Accounting</h1>
        {(() => { const m = getModuleById('costPricing'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="cost-centers"><Building2 className="h-4 w-4 mr-1" />Cost Centers</TabsTrigger>
          <TabsTrigger value="dist-rules"><GitBranch className="h-4 w-4 mr-1" />Distribution Rules</TabsTrigger>
          <TabsTrigger value="hierarchy"><TreePine className="h-4 w-4 mr-1" />Hierarchy</TabsTrigger>
          <TabsTrigger value="table"><BarChart3 className="h-4 w-4 mr-1" />CC & DR</TabsTrigger>
          <TabsTrigger value="ai-estimate"><Brain className="h-4 w-4 mr-1" />AI Estimation</TabsTrigger>
          <TabsTrigger value="budget-variance"><BarChart3 className="h-4 w-4 mr-1" />Budget vs Actual</TabsTrigger>
          <TabsTrigger value="work-packages"><Layers className="h-4 w-4 mr-1" />Work Packages</TabsTrigger>
          <TabsTrigger value="markup"><Calculator className="h-4 w-4 mr-1" />Markup/Margin</TabsTrigger>
          <TabsTrigger value="margin-analysis"><Percent className="h-4 w-4 mr-1" />Margin Analysis</TabsTrigger>
          <TabsTrigger value="rate-cards"><FileText className="h-4 w-4 mr-1" />Rate Cards</TabsTrigger>
          <TabsTrigger value="materials"><Package className="h-4 w-4 mr-1" />Materials</TabsTrigger>
          <TabsTrigger value="equipment"><Scale className="h-4 w-4 mr-1" />Equipment</TabsTrigger>
          <TabsTrigger value="subcontractors"><Users className="h-4 w-4 mr-1" />Subcontractors</TabsTrigger>
          <TabsTrigger value="profitability"><DollarSign className="h-4 w-4 mr-1" />Profitability</TabsTrigger>
          <TabsTrigger value="benchmarking"><Target className="h-4 w-4 mr-1" />Benchmarking</TabsTrigger>
          <TabsTrigger value="escalation"><TrendingUp className="h-4 w-4 mr-1" />Escalation</TabsTrigger>
          <TabsTrigger value="cpi-monitor"><Activity className="h-4 w-4 mr-1" />CPI Monitor</TabsTrigger>
          <TabsTrigger value="revenue-recognition"><FileText className="h-4 w-4 mr-1" />Revenue Recog.</TabsTrigger>
          <TabsTrigger value="profit-forecast"><Target className="h-4 w-4 mr-1" />Profit Forecast</TabsTrigger>
          <TabsTrigger value="what-if"><Beaker className="h-4 w-4 mr-1" />What-If</TabsTrigger>
          <TabsTrigger value="supplier-scores"><Award className="h-4 w-4 mr-1" />Supplier Scores</TabsTrigger>
          <TabsTrigger value="auto-allocation"><Cog className="h-4 w-4 mr-1" />Auto Allocation</TabsTrigger>
          <TabsTrigger value="exec-dashboard"><BarChart3 className="h-4 w-4 mr-1" />Executive</TabsTrigger>
          <TabsTrigger value="drill-down"><FolderOpen className="h-4 w-4 mr-1" />Drill-Down</TabsTrigger>
          <TabsTrigger value="resource-optimizer"><Zap className="h-4 w-4 mr-1" />Resource Opt.</TabsTrigger>
          <TabsTrigger value="value-engineering"><Lightbulb className="h-4 w-4 mr-1" />Value Eng.</TabsTrigger>
          <TabsTrigger value="cost-alerts"><Bell className="h-4 w-4 mr-1" />Alerts</TabsTrigger>
        </TabsList>

        {/* COST CENTERS */}
        <TabsContent value="cost-centers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
              <CardTitle className="text-base">Cost Centers</CardTitle>
              <div className="flex items-center gap-1">
                <SAPSyncButton entity="cost_center" size="sm" showLabel={false} />
                <ExportImportButtons data={costCenters.data || []} columns={ccColumns} filename="CostCenters" title="Cost Centers" onImport={handleImportCostCenters} />
                <Button size="sm" onClick={() => { setCcForm({ code: '', name: '', name_ar: '', dimension_type: '', parent_id: '', is_active: true }); setEditCcId(null); setCcDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Name (AR)</TableHead><TableHead>Dimension</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-20">{t('common.actions')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {costCentersPagination.paginatedItems.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.name_ar}</TableCell>
                      <TableCell><Badge variant="outline">{c.dimension_type || '-'}</Badge></TableCell>
                      <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setCcForm({ code: c.code, name: c.name, name_ar: c.name_ar || '', dimension_type: c.dimension_type || '', parent_id: c.parent_id || '', is_active: c.is_active });
                            setEditCcId(c.id); setCcDialog(true);
                          }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => costCenters.remove.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {costCentersPagination.paginatedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No cost centers found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="border-t px-4">
                <PaginationControls
                  currentPage={costCentersPagination.currentPage}
                  totalItems={costCentersPagination.totalItems}
                  pageSize={costCentersPagination.pageSize}
                  onPageChange={costCentersPagination.handlePageChange}
                  onPageSizeChange={costCentersPagination.handlePageSizeChange}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISTRIBUTION RULES */}
        <TabsContent value="dist-rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
              <CardTitle className="text-base">Distribution Rules</CardTitle>
              <div className="flex items-center gap-1">
                <SAPSyncButton entity="distribution_rule" size="sm" showLabel={false} />
                <ExportImportButtons data={distRules.data || []} columns={drColumns} filename="DistributionRules" title="Distribution Rules" onImport={handleImportDistRules} />
                <Button size="sm" onClick={() => { setDrForm({ code: '', name: '', name_ar: '', dimension_type: '', factor: '', description: '' }); setEditDrId(null); setDrDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Name (AR)</TableHead><TableHead>Dimension</TableHead><TableHead>Factor</TableHead><TableHead className="w-20">{t('common.actions')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {distRulesPagination.paginatedItems.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.name_ar}</TableCell>
                      <TableCell><Badge variant="outline">{r.dimension_type || '-'}</Badge></TableCell>
                      <TableCell>{r.factor || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setDrForm({ code: r.code, name: r.name, name_ar: r.name_ar || '', dimension_type: r.dimension_type || '', factor: r.factor || '', description: r.description || '' });
                            setEditDrId(r.id); setDrDialog(true);
                          }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => distRules.remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {distRulesPagination.paginatedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No distribution rules found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="border-t px-4">
                <PaginationControls
                  currentPage={distRulesPagination.currentPage}
                  totalItems={distRulesPagination.totalItems}
                  pageSize={distRulesPagination.pageSize}
                  onPageChange={distRulesPagination.handlePageChange}
                  onPageSizeChange={distRulesPagination.handlePageSizeChange}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HIERARCHY */}
        <TabsContent value="hierarchy">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
              <CardTitle className="text-base">Cost Center Hierarchy</CardTitle>
              <ExportImportButtons data={costCenters.data || []} columns={ccColumns} filename="CostCenterHierarchy" title="Cost Center Hierarchy" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Name (AR)</TableHead><TableHead>Dimension</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-20">{t('common.actions')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {hierarchyPagination.paginatedItems.map((node: any) => (
                    <TableRow key={node.id}>
                      <TableCell style={{ paddingLeft: `${node.treeDepth * 24 + 16}px` }} className="font-mono text-xs">
                        {node.children?.length > 0 ? '📁 ' : '📄 '}{node.code}
                      </TableCell>
                      <TableCell>{node.name}</TableCell>
                      <TableCell className="text-muted-foreground">{node.name_ar}</TableCell>
                      <TableCell><Badge variant="outline">{node.dimension_type || '-'}</Badge></TableCell>
                      <TableCell><Badge variant={node.is_active ? 'default' : 'secondary'}>{node.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setCcForm({ code: node.code, name: node.name, name_ar: node.name_ar || '', dimension_type: node.dimension_type || '', parent_id: node.parent_id || '', is_active: node.is_active });
                            setEditCcId(node.id); setCcDialog(true);
                          }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => costCenters.remove.mutate(node.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hierarchyPagination.paginatedItems.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No cost centers with hierarchy defined</TableCell></TableRow>}
                </TableBody>
              </Table>
              <div className="border-t px-4">
                <PaginationControls
                  currentPage={hierarchyPagination.currentPage}
                  totalItems={hierarchyPagination.totalItems}
                  pageSize={hierarchyPagination.pageSize}
                  onPageChange={hierarchyPagination.handlePageChange}
                  onPageSizeChange={hierarchyPagination.handlePageSizeChange}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TABLE OF CC & DR */}
        <TabsContent value="table">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-base">Cost Centers ({costCenters.data?.length || 0})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Dimension</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {costCentersPagination.paginatedItems.map((c: any) => (
                      <TableRow key={c.id}><TableCell className="font-mono text-xs">{c.code}</TableCell><TableCell>{c.name}</TableCell><TableCell>{c.dimension_type || '-'}</TableCell></TableRow>
                    ))}
                    {costCentersPagination.paginatedItems.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No cost centers found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="border-t px-4">
                  <PaginationControls
                    currentPage={costCentersPagination.currentPage}
                    totalItems={costCentersPagination.totalItems}
                    pageSize={costCentersPagination.pageSize}
                    onPageChange={costCentersPagination.handlePageChange}
                    onPageSizeChange={costCentersPagination.handlePageSizeChange}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-base">Distribution Rules ({distRules.data?.length || 0})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Factor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {distRulesPagination.paginatedItems.map((r: any) => (
                      <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell>{r.factor || '-'}</TableCell></TableRow>
                    ))}
                    {distRulesPagination.paginatedItems.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No distribution rules found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="border-t px-4">
                  <PaginationControls
                    currentPage={distRulesPagination.currentPage}
                    totalItems={distRulesPagination.totalItems}
                    pageSize={distRulesPagination.pageSize}
                    onPageChange={distRulesPagination.handlePageChange}
                    onPageSizeChange={distRulesPagination.handlePageSizeChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COST CENTER REPORT */}
        <TabsContent value="cc-report">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
              <CardTitle className="text-base">Cost Center Report</CardTitle>
              <ExportImportButtons data={costCenters.data || []} columns={[...ccColumns, { key: 'created_at', header: 'Created', width: 15 }]} filename="CostCenterReport" title="Cost Center Report" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card className="p-4"><div className="text-sm text-muted-foreground">Total Cost Centers</div><div className="text-2xl font-bold text-foreground">{costCenters.data?.length || 0}</div></Card>
                <Card className="p-4"><div className="text-sm text-muted-foreground">{t('common.active')}</div><div className="text-2xl font-bold text-primary">{costCenters.data?.filter((c: any) => c.is_active).length || 0}</div></Card>
                <Card className="p-4"><div className="text-sm text-muted-foreground">{t('common.inactive')}</div><div className="text-2xl font-bold text-destructive">{costCenters.data?.filter((c: any) => !c.is_active).length || 0}</div></Card>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Dimension</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {costCenters.data?.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.code}</TableCell><TableCell>{c.name}</TableCell>
                      <TableCell>{c.dimension_type || '-'}</TableCell>
                      <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.created_at?.split('T')[0]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISTRIBUTION REPORT */}
        <TabsContent value="dr-report">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
              <CardTitle className="text-base">Distribution Report</CardTitle>
              <ExportImportButtons data={distRules.data || []} columns={drColumns} filename="DistributionReport" title="Distribution Report" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Card className="p-4"><div className="text-sm text-muted-foreground">Total Rules</div><div className="text-2xl font-bold text-foreground">{distRules.data?.length || 0}</div></Card>
                <Card className="p-4"><div className="text-sm text-muted-foreground">Active Rules</div><div className="text-2xl font-bold text-primary">{distRules.data?.filter((r: any) => r.is_active).length || 0}</div></Card>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>Dimension</TableHead><TableHead>Factor</TableHead><TableHead>{t('common.status')}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {distRules.data?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell><TableCell>{r.name}</TableCell>
                      <TableCell>{r.dimension_type || '-'}</TableCell><TableCell>{r.factor || '-'}</TableCell>
                      <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-estimate"><AICostEstimation /></TabsContent>
        <TabsContent value="budget-variance"><BudgetVarianceDashboard projects={projects} /></TabsContent>
        <TabsContent value="work-packages"><CostAllocationWorkPackages projects={projects} /></TabsContent>
        <TabsContent value="markup"><MarkupMarginCalculator /></TabsContent>
        <TabsContent value="margin-analysis"><MarginAnalysisDashboard projects={projects} /></TabsContent>
        <TabsContent value="rate-cards"><RateCardManager /></TabsContent>
        <TabsContent value="materials"><MaterialCostTracker /></TabsContent>
        <TabsContent value="equipment"><EquipmentRentBuyAnalysis /></TabsContent>
        <TabsContent value="subcontractors"><SubcontractorRateCards /></TabsContent>
        <TabsContent value="profitability"><ProfitabilityWaterfall projects={projects} /></TabsContent>
        <TabsContent value="benchmarking"><CostBenchmarking projects={projects} /></TabsContent>
        <TabsContent value="escalation"><EscalationFormulas /></TabsContent>
        <TabsContent value="cpi-monitor"><CPIMonitoringDashboard projects={projects} /></TabsContent>
        <TabsContent value="revenue-recognition"><RevenueRecognitionTracker projects={projects} /></TabsContent>
        <TabsContent value="profit-forecast"><ProfitabilityForecasting projects={projects} /></TabsContent>
        <TabsContent value="what-if"><WhatIfScenarioAnalysis projects={projects} /></TabsContent>
        <TabsContent value="supplier-scores"><SupplierPerformanceScoring /></TabsContent>
        <TabsContent value="auto-allocation"><CostAllocationAutomation projects={projects} /></TabsContent>
        <TabsContent value="exec-dashboard"><CostExecutiveDashboard projects={projects} /></TabsContent>
        <TabsContent value="drill-down"><CostDrillDownReports projects={projects} /></TabsContent>
        <TabsContent value="resource-optimizer"><ResourceCostOptimizer projects={projects} /></TabsContent>
        <TabsContent value="value-engineering"><ValueEngineeringWorkflow /></TabsContent>
        <TabsContent value="cost-alerts"><CostAlertsNotifications projects={projects} /></TabsContent>
      </Tabs>

      {/* CC Dialog */}
      <Dialog open={ccDialog} onOpenChange={setCcDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editCcId ? 'Edit' : 'New'} Cost Center</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code</Label><Input value={ccForm.code} onChange={e => setCcForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label>{t('common.name')}</Label><Input value={ccForm.name} onChange={e => setCcForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Name (Arabic)</Label><Input value={ccForm.name_ar} onChange={e => setCcForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
            <div><Label>Dimension Type</Label>
              <Select value={ccForm.dimension_type} onValueChange={v => setCcForm(p => ({ ...p, dimension_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employees">Employees (Dim 1)</SelectItem>
                  <SelectItem value="branches">Branches (Dim 2)</SelectItem>
                  <SelectItem value="business_line">Business Line (Dim 3)</SelectItem>
                  <SelectItem value="factory">Factory (Dim 4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Parent Cost Center</Label>
              <Select value={ccForm.parent_id} onValueChange={v => setCcForm(p => ({ ...p, parent_id: v }))}>
                <SelectTrigger><SelectValue placeholder="None (Root)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Root)</SelectItem>
                  {costCenters.data?.filter((c: any) => c.id !== editCcId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Checkbox checked={ccForm.is_active} onCheckedChange={v => setCcForm(p => ({ ...p, is_active: !!v }))} /><Label>{t('common.active')}</Label></div>
          </div>
          <DialogFooter><Button onClick={handleSaveCc}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DR Dialog */}
      <Dialog open={drDialog} onOpenChange={setDrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editDrId ? 'Edit' : 'New'} Distribution Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code</Label><Input value={drForm.code} onChange={e => setDrForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label>{t('common.name')}</Label><Input value={drForm.name} onChange={e => setDrForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Name (Arabic)</Label><Input value={drForm.name_ar} onChange={e => setDrForm(p => ({ ...p, name_ar: e.target.value }))} dir="rtl" /></div>
            <div><Label>Dimension Type</Label>
              <Select value={drForm.dimension_type} onValueChange={v => setDrForm(p => ({ ...p, dimension_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employees">Employees (Dim 1)</SelectItem>
                  <SelectItem value="branches">Branches (Dim 2)</SelectItem>
                  <SelectItem value="business_line">Business Line (Dim 3)</SelectItem>
                  <SelectItem value="factory">Factory (Dim 4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Factor</Label><Input value={drForm.factor} onChange={e => setDrForm(p => ({ ...p, factor: e.target.value }))} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={drForm.description} onChange={e => setDrForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveDr}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
