import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Clock, CheckCircle, AlertTriangle, XCircle, Search, BarChart3,
  TrendingUp, ArrowUpRight, Timer, Shield,
} from 'lucide-react';
import { PHASE_CONFIG, type ProjectPhase } from '@/hooks/useIndustrialProjects';
import { BranchHierarchyFilter, getFilteredBranchIds } from '@/components/filters/BranchHierarchyFilter';

interface SlaConfig {
  phase: string;
  phase_label: string;
  max_days: number;
  escalation_1_days: number;
  escalation_2_days: number;
  escalation_3_days: number;
}

interface PhaseRecord {
  id: string;
  project_id: string;
  phase: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  escalation_level: number;
}

interface ProjectRow {
  id: string;
  name: string;
  current_phase: string;
  contract_value: number | null;
  status: string;
  created_at: string;
  project_phases: PhaseRecord[];
  sales_orders: Array<{
    id: string;
    doc_num: number;
    customer_name: string;
    contract_number: string | null;
    contract_value: number | null;
    branch_id: string | null;
  }>;
}

export default function ContractProgress() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contracts');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Branch hierarchy filters
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  // Fetch hierarchy for filtering
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['filter-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name, name_ar, region_id').eq('is_active', true);
      return data || [];
    },
  });
  const { data: allBranches = [] } = useQuery({
    queryKey: ['filter-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, name_ar, company_id').eq('is_active', true);
      return data || [];
    },
  });

  const { data: slaConfigs } = useQuery({
    queryKey: ['phase-sla-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('phase_sla_config').select('*').eq('is_active', true);
      if (error) throw error;
      return data as SlaConfig[];
    },
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['contract-progress-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`id, name, current_phase, contract_value, status, created_at,
          project_phases (id, project_id, phase, status, started_at, completed_at, escalation_level)`)
        .eq('project_type', 'industrial')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const projectIds = (data || []).map((p: any) => p.id);
      const { data: salesOrders } = await supabase
        .from('sales_orders')
        .select('id, doc_num, customer_name, contract_number, contract_value, project_id, branch_id')
        .in('project_id', projectIds.length ? projectIds : ['none']);

      return (data || []).map((p: any) => ({
        ...p,
        sales_orders: (salesOrders || []).filter((so: any) => so.project_id === p.id),
      })) as ProjectRow[];
    },
  });

  const slaMap = useMemo(() => {
    const map = new Map<string, SlaConfig>();
    slaConfigs?.forEach(c => map.set(c.phase, c));
    return map;
  }, [slaConfigs]);

  const getPhaseSlaSatus = (phase: PhaseRecord): {
    status: 'on_time' | 'warning' | 'overdue' | 'completed' | 'pending';
    daysElapsed: number;
    maxDays: number;
    daysOverdue: number;
  } => {
    const sla = slaMap.get(phase.phase);
    const maxDays = sla?.max_days || 7;

    if (phase.status === 'completed' || phase.status === 'approved' || phase.status === 'skipped') {
      const start = phase.started_at ? new Date(phase.started_at) : null;
      const end = phase.completed_at ? new Date(phase.completed_at) : new Date();
      const daysElapsed = start ? Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return { status: daysElapsed > maxDays ? 'overdue' : 'completed', daysElapsed, maxDays, daysOverdue: Math.max(0, daysElapsed - maxDays) };
    }

    if (phase.status === 'pending') return { status: 'pending', daysElapsed: 0, maxDays, daysOverdue: 0 };
    if (!phase.started_at) return { status: 'pending', daysElapsed: 0, maxDays, daysOverdue: 0 };

    const start = new Date(phase.started_at);
    const daysElapsed = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    const warningThreshold = Math.floor(maxDays * 0.8);
    let status: 'on_time' | 'warning' | 'overdue' = 'on_time';
    if (daysElapsed >= maxDays) status = 'overdue';
    else if (daysElapsed >= warningThreshold) status = 'warning';
    return { status, daysElapsed, maxDays, daysOverdue: Math.max(0, daysElapsed - maxDays) };
  };

  const getContractSlaStatus = (project: ProjectRow): 'on_time' | 'warning' | 'overdue' => {
    const activePhases = project.project_phases.filter(p => p.status === 'in_progress' || p.status === 'awaiting_approval');
    for (const phase of activePhases) {
      const sla = getPhaseSlaSatus(phase);
      if (sla.status === 'overdue') return 'overdue';
      if (sla.status === 'warning') return 'warning';
    }
    const completedOverdue = project.project_phases.some(p => {
      const sla = getPhaseSlaSatus(p);
      return sla.status === 'overdue' && (p.status === 'completed' || p.status === 'approved');
    });
    if (completedOverdue) return 'warning';
    return 'on_time';
  };

  // Branch filter logic
  const branchFilterIds = useMemo(() =>
    getFilteredBranchIds(selectedRegions, selectedCompanies, selectedBranches, allCompanies, allBranches),
    [selectedRegions, selectedCompanies, selectedBranches, allCompanies, allBranches],
  );

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => {
      const so = p.sales_orders[0];

      // Branch filter
      if (branchFilterIds.length > 0) {
        const soBranch = so?.branch_id;
        if (!soBranch || !branchFilterIds.includes(soBranch)) return false;
      }

      const matchSearch = searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        so?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        so?.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `SO-${so?.doc_num}`.toLowerCase().includes(searchTerm.toLowerCase());

      const contractStatus = getContractSlaStatus(p);
      const matchFilter = statusFilter === 'all' || contractStatus === statusFilter;

      return matchSearch && matchFilter;
    });
  }, [projects, searchTerm, statusFilter, slaMap, branchFilterIds]);

  const stats = useMemo(() => {
    if (!filteredProjects) return { total: 0, onTime: 0, warning: 0, overdue: 0, completed: 0 };
    const total = filteredProjects.length;
    const completed = filteredProjects.filter(p => p.status === 'completed').length;
    const active = filteredProjects.filter(p => p.status !== 'completed');
    const onTime = active.filter(p => getContractSlaStatus(p) === 'on_time').length;
    const warning = active.filter(p => getContractSlaStatus(p) === 'warning').length;
    const overdue = active.filter(p => getContractSlaStatus(p) === 'overdue').length;
    return { total, onTime, warning, overdue, completed };
  }, [filteredProjects, slaMap]);

  const stageStats = useMemo(() => {
    if (!filteredProjects || !slaConfigs) return [];
    const phaseOrder = [
      'sales_initiation', 'finance_verification', 'operations_verification',
      'design_costing', 'finance_gate_2', 'procurement', 'production',
      'final_payment', 'logistics', 'completed',
    ];
    return phaseOrder.map(phase => {
      const config = PHASE_CONFIG[phase as ProjectPhase];
      const sla = slaMap.get(phase);
      const allPhasesForThis = filteredProjects.flatMap(p => p.project_phases.filter(pp => pp.phase === phase));
      const active = allPhasesForThis.filter(pp => pp.status === 'in_progress' || pp.status === 'awaiting_approval');
      const completed = allPhasesForThis.filter(pp => pp.status === 'completed' || pp.status === 'approved');
      const onTimeActive = active.filter(pp => getPhaseSlaSatus(pp).status === 'on_time').length;
      const warningActive = active.filter(pp => getPhaseSlaSatus(pp).status === 'warning').length;
      const overdueActive = active.filter(pp => getPhaseSlaSatus(pp).status === 'overdue').length;
      const completedOnTime = completed.filter(pp => getPhaseSlaSatus(pp).status === 'completed').length;
      const completedOverdue = completed.filter(pp => getPhaseSlaSatus(pp).status === 'overdue').length;

      return {
        phase, label: config?.label || phase, department: config?.department || '',
        maxDays: sla?.max_days || 7,
        active: active.length, onTimeActive, warningActive, overdueActive,
        completed: completed.length, completedOnTime, completedOverdue,
      };
    });
  }, [filteredProjects, slaConfigs, slaMap]);

  const getStatusBadge = (status: 'on_time' | 'warning' | 'overdue' | 'completed' | 'pending') => {
    switch (status) {
      case 'on_time': return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />On Time</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getEscalationBadge = (level: number) => {
    if (level === 0) return null;
    const labels: Record<number, { label: string; color: string }> = {
      1: { label: 'L1: Region Mgr', color: 'bg-yellow-100 text-yellow-800' },
      2: { label: 'L2: General Mgr', color: 'bg-orange-100 text-orange-800' },
      3: { label: 'L3: CEO', color: 'bg-red-100 text-red-800' },
    };
    const info = labels[level];
    return info ? <Badge className={info.color}><Shield className="h-3 w-3 mr-1" />{info.label}</Badge> : null;
  };

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'ar' ? 'تقرير تقدم العقود' : 'Contract Progress Report'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'مراقبة التزام المراحل بالمواعيد المحددة' : 'Monitor phase SLA compliance and escalation status'}
        </p>
      </div>

      {/* Region / Company / Branch Filters */}
      <BranchHierarchyFilter
        selectedRegions={selectedRegions}
        selectedCompanies={selectedCompanies}
        selectedBranches={selectedBranches}
        onRegionsChange={setSelectedRegions}
        onCompaniesChange={setSelectedCompanies}
        onBranchesChange={setSelectedBranches}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي العقود' : 'Total Contracts'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-green-200" onClick={() => setStatusFilter('on_time')}>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.onTime}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'في الموعد' : 'On Time'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-yellow-200" onClick={() => setStatusFilter('warning')}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'تحذير' : 'Warning'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-red-200" onClick={() => setStatusFilter('overdue')}>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'متأخر' : 'Overdue'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-blue-200" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مكتمل' : 'Completed'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contracts">{language === 'ar' ? 'تقدم العقود' : 'Contract Progress'}</TabsTrigger>
          <TabsTrigger value="stages">{language === 'ar' ? 'تقرير المراحل' : 'Stage Report'}</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث بالعقد أو العميل...' : 'Search by contract, customer...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="on_time">{language === 'ar' ? 'في الموعد' : 'On Time'}</SelectItem>
                <SelectItem value="warning">{language === 'ar' ? 'تحذير' : 'Warning'}</SelectItem>
                <SelectItem value="overdue">{language === 'ar' ? 'متأخر' : 'Overdue'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : filteredProjects.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No contracts found</CardContent></Card>
            ) : (
              filteredProjects.map(project => {
                const so = project.sales_orders[0];
                const contractStatus = getContractSlaStatus(project);
                const completedPhases = project.project_phases.filter(
                  p => p.status === 'completed' || p.status === 'approved' || p.status === 'skipped'
                ).length;
                const totalPhases = project.project_phases.length;
                const progressPct = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
                const currentPhaseRecord = project.project_phases.find(p => p.phase === project.current_phase);
                const currentSla = currentPhaseRecord ? getPhaseSlaSatus(currentPhaseRecord) : null;

                return (
                  <Card
                    key={project.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/pm/projects/${project.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {so ? `SO-${so.doc_num}` : project.name}
                            </h3>
                            {getStatusBadge(project.status === 'completed' ? 'completed' : contractStatus)}
                            {currentPhaseRecord && getEscalationBadge(currentPhaseRecord.escalation_level || 0)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {so?.customer_name || project.name}
                            {so?.contract_number && ` • ${so.contract_number}`}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {language === 'ar' ? 'المرحلة الحالية:' : 'Current:'}{' '}
                              {PHASE_CONFIG[project.current_phase as ProjectPhase]?.label || project.current_phase}
                            </span>
                            {currentSla && currentSla.status !== 'pending' && (
                              <span>{currentSla.daysElapsed}/{currentSla.maxDays} {language === 'ar' ? 'يوم' : 'days'}</span>
                            )}
                          </div>
                        </div>

                        <div className="w-full md:w-48">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                            <span className="font-medium">{progressPct}%</span>
                          </div>
                          <Progress value={progressPct} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {completedPhases}/{totalPhases} {language === 'ar' ? 'مرحلة' : 'phases'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {(so?.contract_value || project.contract_value || 0).toLocaleString()} SAR
                          </p>
                          <Button variant="ghost" size="sm" className="mt-1">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-1 mt-3 overflow-x-auto">
                        {project.project_phases
                          .sort((a, b) => {
                            const order = ['sales_initiation', 'finance_verification', 'operations_verification',
                              'design_costing', 'finance_gate_2', 'procurement', 'production',
                              'final_payment', 'logistics', 'completed'];
                            return order.indexOf(a.phase) - order.indexOf(b.phase);
                          })
                          .map(pp => {
                            const sla = getPhaseSlaSatus(pp);
                            const bgColor =
                              sla.status === 'completed' ? 'bg-green-500' :
                              sla.status === 'on_time' ? 'bg-blue-500' :
                              sla.status === 'warning' ? 'bg-yellow-500' :
                              sla.status === 'overdue' ? 'bg-red-500' :
                              'bg-muted';
                            return (
                              <div
                                key={pp.id}
                                className={`h-2 flex-1 rounded-full min-w-[20px] ${bgColor}`}
                                title={`${PHASE_CONFIG[pp.phase as ProjectPhase]?.label || pp.phase}: ${sla.status} (${sla.daysElapsed}/${sla.maxDays} days)`}
                              />
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'تقرير المراحل' : 'Stage Performance Report'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'أداء كل مرحلة عبر جميع العقود' : 'Phase performance across all contracts'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المرحلة' : 'Stage'}</TableHead>
                    <TableHead>{language === 'ar' ? 'القسم' : 'Dept'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'SLA (أيام)' : 'SLA (days)'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'نشط' : 'Active'}</TableHead>
                    <TableHead className="text-center text-green-600">{language === 'ar' ? 'في الموعد' : 'On Time'}</TableHead>
                    <TableHead className="text-center text-yellow-600">{language === 'ar' ? 'تحذير' : 'Warning'}</TableHead>
                    <TableHead className="text-center text-red-600">{language === 'ar' ? 'متأخر' : 'Overdue'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'مكتمل' : 'Done'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'مكتمل متأخر' : 'Done Late'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageStats.map(stage => (
                    <TableRow
                      key={stage.phase}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setActiveTab('contracts')}
                    >
                      <TableCell className="font-medium text-sm">{stage.label}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{stage.department}</Badge></TableCell>
                      <TableCell className="text-center">{stage.maxDays}</TableCell>
                      <TableCell className="text-center font-medium">{stage.active}</TableCell>
                      <TableCell className="text-center">
                        {stage.onTimeActive > 0 && <Badge className="bg-green-100 text-green-700">{stage.onTimeActive}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {stage.warningActive > 0 && <Badge className="bg-yellow-100 text-yellow-700">{stage.warningActive}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        {stage.overdueActive > 0 && <Badge className="bg-red-100 text-red-700">{stage.overdueActive}</Badge>}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{stage.completed}</TableCell>
                      <TableCell className="text-center">
                        {stage.completedOverdue > 0 && <Badge variant="outline" className="text-red-600 border-red-300">{stage.completedOverdue}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
