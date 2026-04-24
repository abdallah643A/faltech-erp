import { useState, useEffect, useRef } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useSearchParams } from 'react-router-dom';
import { useCPMS, CPMSProject } from '@/hooks/useCPMS';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import {
  Building2, HardHat, DollarSign, TrendingUp, BarChart3, FileText,
  AlertTriangle, ClipboardList, Plus, RefreshCw, Shield, Calendar,
  MapPin, Users, Layers, PackagePlus, Eye, Pencil, Trash2,
  Activity, CheckCircle2, Clock, PauseCircle, XCircle, ArrowUpRight, Camera,
  GitCompare, BellRing, Leaf, CloudSun, Ruler, Smartphone,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import CPMSQuickSteps, { DASHBOARD_STEPS } from '@/components/cpms/CPMSQuickSteps';
import CPMSProjectHealth from '@/components/cpms/CPMSProjectHealth';
import ModuleWorkflowDiagram, { CPMS_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import type { ColumnDef } from '@/utils/exportImportUtils';

const cpmsColumns: ColumnDef[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status' },
  { key: 'contract_value', header: 'Contract Value' },
  { key: 'city', header: 'City' },
];
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const typeIcons: Record<string, string> = {
  building: '🏗️', civil: '🛣️', mep: '⚡', infrastructure: '🌉', mixed: '🏢',
};

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(217, 91%, 60%)'];

export default function CPMSDashboard() {
  const { activeCompanyId } = useActiveCompany();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    projects, loading, createProject, updateProject, deleteProject, fetchDashboardStats, fetchProjects, fetchTable,
  } = useCPMS();

  const [stats, setStats] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [evmData, setEvmData] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<CPMSProject | null>(null);
  const projectsTableRef = useRef<HTMLDivElement>(null);

  // Handle query params: ?action=create or ?tab=projects
  useEffect(() => {
    const action = searchParams.get('action');
    const tab = searchParams.get('tab');

    if (action === 'create') {
      setShowForm(true);
      setEditProject(null);
      setForm({ code: '', name: '', type: 'building', status: 'planning', contract_value: 0, city: '', description: '' });
    }

    if (tab === 'projects') {
      setTimeout(() => {
        projectsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }

    if (action || tab) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);
  const [form, setForm] = useState<Partial<CPMSProject>>({
    code: '', name: '', type: 'building', status: 'planning', contract_value: 0,
    city: '', description: '',
  });

  useEffect(() => {
    fetchDashboardStats().then(setStats);
    fetchTable('cpms_daily_reports', {}, 'report_date').then(d => setRecentReports((d || []).slice(0, 8)));
    fetchTable('cpms_evm_snapshots', {}, 'snapshot_date').then(setEvmData);
  }, [projects]);

  const handleSave = async () => {
    if (!form.code || !form.name) return;
    if (editProject?.id) {
      await updateProject(editProject.id, form);
    } else {
      await createProject(form);
    }
    setShowForm(false);
    setEditProject(null);
    setForm({ code: '', name: '', type: 'building', status: 'planning', contract_value: 0 });
  };

  const handleEdit = (p: CPMSProject) => { setEditProject(p); setForm(p); setShowForm(true); };
  const handleDelete = async (id: string) => {
    if (confirm('Delete this project?')) await deleteProject(id);
  };

  // Derived chart data
  const statusDistribution = projects.reduce((acc: any[], p) => {
    const existing = acc.find(a => a.name === p.status);
    if (existing) existing.value++;
    else acc.push({ name: p.status, value: 1 });
    return acc;
  }, []);

  const typeDistribution = projects.reduce((acc: any[], p) => {
    const existing = acc.find(a => a.name === p.type);
    if (existing) existing.value += (p.contract_value || 0);
    else acc.push({ name: p.type, value: p.contract_value || 0 });
    return acc;
  }, []);

  const projectProgressData = projects
    .filter(p => p.status === 'active')
    .map(p => {
      const start = p.start_date ? new Date(p.start_date).getTime() : Date.now();
      const end = p.end_date ? new Date(p.end_date).getTime() : Date.now();
      const now = Date.now();
      const timeProgress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
      return { name: p.code, timeProgress: Math.round(timeProgress), contractValue: p.contract_value };
    });

  const evmChartData = evmData
    .filter((e: any) => e.project_id === projects.find(p => p.status === 'active')?.id)
    .map((e: any) => ({
      date: e.snapshot_date,
      PV: (e.bcws / 1000000).toFixed(1),
      EV: (e.bcwp / 1000000).toFixed(1),
      AC: (e.acwp / 1000000).toFixed(1),
    }));

  const moduleCards = [
    { icon: Layers, label: 'Schedule & WBS Planning', desc: 'Full project schedule, WBS, Gantt', href: '/cpms/schedule-planning', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: BarChart3, label: 'Gantt Chart', desc: 'CPM, dependencies', href: '/cpms/gantt', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { icon: DollarSign, label: 'Cost Management', desc: 'Budgets, EVM', href: '/cpms/costs', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Ruler, label: 'Drawing Measurement', desc: 'Digital takeoffs & scale measurements', href: '/cpms/drawing-measurement', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: BarChart3, label: 'Measurement Reporting', desc: 'Export, scheduling, audit trail', href: '/cpms/measurement-reporting', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
    { icon: ClipboardList, label: 'Daily Reports', desc: 'Field reports', href: '/cpms/daily-reports', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: FileText, label: 'Document Control', desc: 'RFIs, submittals, NCRs', href: '/cpms/documents', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Shield, label: 'Quality & Compliance', desc: 'Defects, inspections', href: '/cpms/quality', color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: Activity, label: 'Change Orders', desc: 'Impact & approvals', href: '/cpms/change-orders', color: 'text-rose-600', bg: 'bg-rose-50' },
    { icon: PackagePlus, label: 'Procurement', desc: 'RFQs, subcontracts', href: '/cpms/procurement', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { icon: BarChart3, label: 'Billing & Revenue', desc: 'IPAs, retention', href: '/cpms/billing', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: AlertTriangle, label: 'HSE', desc: 'Safety incidents', href: '/cpms/hse', color: 'text-red-600', bg: 'bg-red-50' },
    { icon: TrendingUp, label: 'Analytics', desc: 'S-Curve, dashboards', href: '/cpms/analytics', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { icon: Camera, label: 'Site Progress', desc: 'Photos, reports, timeline', href: '/cpms/site-progress', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: TrendingUp, label: 'Predictive Analytics', desc: 'Forecasting, what-if', href: '/cpms/predictive', color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: HardHat, label: 'Equipment', desc: 'Fleet, utilization, maintenance', href: '/cpms/equipment', color: 'text-sky-600', bg: 'bg-sky-50' },
    { icon: GitCompare, label: 'Compare Projects', desc: 'Side-by-side analysis', href: '/cpms/compare', color: 'text-pink-600', bg: 'bg-pink-50' },
    { icon: FileText, label: 'Report Templates', desc: 'Daily/Weekly/Monthly', href: '/cpms/report-templates', color: 'text-slate-600', bg: 'bg-slate-50' },
    { icon: BellRing, label: 'Notifications', desc: 'Alerts & updates', href: '/cpms/notifications', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { icon: Leaf, label: 'Sustainability', desc: 'ESG, carbon, waste', href: '/cpms/sustainability', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: CloudSun, label: 'Weather & IoT', desc: 'Environmental monitoring', href: '/cpms/weather-iot', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { icon: Smartphone, label: 'Mobile Field App', desc: 'Time clock, photos, field reports', href: '/cpms/mobile', color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const statusIcons: Record<string, React.ElementType> = {
    active: CheckCircle2, planning: Clock, on_hold: PauseCircle, completed: CheckCircle2, cancelled: XCircle,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  const totalContractValue = stats?.totalContractValue || 0;
  const totalCommitted = stats?.totalCommitted || 0;
  const commitmentRate = totalContractValue > 0 ? ((totalCommitted / totalContractValue) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6 page-enter">
      <ModuleWorkflowDiagram
        moduleName="Construction (CPMS)"
        moduleNameAr="إدارة المشاريع الإنشائية"
        steps={CPMS_WORKFLOW}
        tips={[
          'Start with project code and classification before WBS breakdown.',
          'Link SAP cost centers to each project for integrated reporting.',
          'Define milestones early to enable EVM tracking.',
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Construction Project Management
          </h1>
          <p className="text-sm text-muted-foreground">إدارة المشاريع الإنشائية – CPMS</p>
        </div>
        <div className="flex gap-2">
          {(() => { const m = getModuleById('cpms'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <ExportImportButtons data={projects} columns={cpmsColumns} filename="cpms-projects" title="CPMS Projects" />
          <Button onClick={() => { setEditProject(null); setForm({ code: '', name: '', type: 'building', status: 'planning', contract_value: 0 }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
          <Button variant="outline" onClick={fetchProjects}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cpms/projects')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Projects</p>
                      <p className="text-2xl font-bold mt-1">{stats?.totalProjects || 0}</p>
                      <p className="text-xs text-muted-foreground">{stats?.activeProjects || 0} active</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">Total number of construction projects across all statuses</p></TooltipContent>
          </UITooltip>
        </TooltipProvider>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cpms/billing')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Portfolio Value</p>
                      <p className="text-2xl font-bold mt-1">{(totalContractValue / 1000000).toFixed(1)}M</p>
                      <p className="text-xs text-muted-foreground">SAR</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">Combined contract value of all active projects in SAR</p></TooltipContent>
          </UITooltip>
        </TooltipProvider>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cpms/hse')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Committed</p>
                      <p className="text-2xl font-bold mt-1">{(totalCommitted / 1000000).toFixed(1)}M</p>
                      <p className="text-xs text-muted-foreground">{commitmentRate}% of portfolio</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                  <Progress value={parseFloat(commitmentRate)} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">Total committed amount via POs and subcontracts as percentage of portfolio</p></TooltipContent>
          </UITooltip>
        </TooltipProvider>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cpms/costs')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Open Issues</p>
                      <p className="text-2xl font-bold mt-1">{(stats?.openRFIs || 0) + (stats?.openIncidents || 0)}</p>
                      <p className="text-xs text-muted-foreground">{stats?.openRFIs || 0} RFIs · {stats?.openIncidents || 0} HSE</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">Combined count of open RFIs and HSE incidents requiring attention</p></TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project Status Distribution */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
            <CardDescription className="text-xs">Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                      {statusDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {statusDistribution.map((s, i) => {
                    const Icon = statusIcons[s.name] || Activity;
                    return (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="capitalize">{s.name.replace('_', ' ')}</span>
                        </div>
                        <span className="font-semibold">{s.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No projects</p>
            )}
          </CardContent>
        </Card>

        {/* Contract Value by Type */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Value by Type</CardTitle>
            <CardDescription className="text-xs">Contract value distribution (SAR M)</CardDescription>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={typeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                  <Tooltip formatter={(v: number) => `${(v / 1000000).toFixed(1)}M SAR`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No data</p>
            )}
          </CardContent>
        </Card>

        {/* EVM S-Curve */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">EVM S-Curve</CardTitle>
            <CardDescription className="text-xs">PV vs EV vs AC (SAR M)</CardDescription>
          </CardHeader>
          <CardContent>
            {evmChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={evmChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={9} tickFormatter={d => d?.slice(5)} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="PV" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} strokeWidth={2} name="Planned (PV)" />
                  <Area type="monotone" dataKey="EV" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} strokeWidth={2} name="Earned (EV)" />
                  <Area type="monotone" dataKey="AC" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.1} strokeWidth={2} name="Actual (AC)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No EVM data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Health Monitor */}
      <CPMSProjectHealth />

      {/* Active Projects Progress */}
      {projectProgressData.length > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Active Projects Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.filter(p => p.status === 'active').map(p => {
              const start = p.start_date ? new Date(p.start_date).getTime() : Date.now();
              const end = p.end_date ? new Date(p.end_date).getTime() : Date.now();
              const now = Date.now();
              const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              return (
                <div key={p.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/cpms/project/${p.id}`)}>
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-mono font-semibold">{p.code}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.name}</p>
                  </div>
                  <div className="flex-1">
                    <Progress value={progress} className="h-2.5" />
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <p className="text-xs font-semibold">{progress.toFixed(0)}%</p>
                    <p className="text-[10px] text-muted-foreground">{p.end_date ? format(new Date(p.end_date), 'MMM yy') : '-'}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Module Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {moduleCards.map((mod, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group" onClick={() => navigate(mod.href)}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-lg ${mod.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <mod.icon className={`h-5 w-5 ${mod.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{mod.label}</p>
                <p className="text-xs text-muted-foreground truncate">{mod.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects Table + Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" ref={projectsTableRef}>
        <div className="lg:col-span-2">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Projects ({projects.length})</CardTitle>
                <CardDescription className="text-xs">All construction projects</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Client</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="hidden md:table-cell">City</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <HardHat className="h-12 w-12 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No construction projects yet</p>
                          <p className="text-sm">Create your first project to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : projects.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/cpms/project/${p.id}`)}>
                        <TableCell className="font-mono font-medium text-xs">{p.code}</TableCell>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs">{typeIcons[p.type] || ''} {p.type}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${statusColors[p.status] || ''}`}>{p.status}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{p.client_name || '-'}</TableCell>
                        <TableCell className="font-medium text-sm">{((p.contract_value || 0) / 1000000).toFixed(1)}M</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{p.city || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/cpms/project/${p.id}`)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(p)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id!)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Recent Daily Reports */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-orange-500" />
              Recent Site Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {recentReports.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No reports yet</p>
                ) : recentReports.map((r: any) => {
                  const proj = projects.find(p => p.id === r.project_id);
                  return (
                    <div key={r.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{proj?.code || 'Unknown'}</span>
                        <Badge variant={r.status === 'approved' ? 'default' : 'secondary'} className="text-[10px] h-5">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5">{format(new Date(r.report_date), 'dd MMM yyyy')}</p>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.manpower_count}</span>
                        <span className="flex items-center gap-1">🔧{r.equipment_count}</span>
                        {r.incidents_count > 0 && (
                          <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-3 w-3" />{r.incidents_count}</span>
                        )}
                        <span className="capitalize">{r.weather}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Project Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editProject ? 'Edit Project' : 'New Construction Project'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Code *</Label>
              <Input value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PRJ-001" />
            </div>
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Al Rajhi Tower" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type || 'building'} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">🏗️ Building</SelectItem>
                  <SelectItem value="civil">🛣️ Civil</SelectItem>
                  <SelectItem value="mep">⚡ MEP</SelectItem>
                  <SelectItem value="infrastructure">🌉 Infrastructure</SelectItem>
                  <SelectItem value="mixed">🏢 Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status || 'planning'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contract Value (SAR)</Label>
              <Input type="number" value={form.contract_value || 0} onChange={e => setForm(f => ({ ...f, contract_value: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={form.client_name || ''} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Riyadh" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.code || !form.name}>
              {editProject ? 'Update' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
