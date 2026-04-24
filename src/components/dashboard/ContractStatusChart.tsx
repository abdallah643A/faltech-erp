import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PHASE_CONFIG, type ProjectPhase } from '@/hooks/useIndustrialProjects';
import { BranchHierarchyFilter, getFilteredBranchIds } from '@/components/filters/BranchHierarchyFilter';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

interface SlaConfig { phase: string; max_days: number; }
interface PhaseRecord { phase: string; status: string; started_at: string | null; completed_at: string | null; }
interface ProjectRow {
  id: string; name: string; current_phase: string; status: string;
  project_phases: PhaseRecord[];
  sales_orders: Array<{ branch_id: string | null; customer_name: string; doc_num: number }>;
}

export function ContractStatusChart() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['filter-companies'],
    queryFn: async () => { const { data } = await supabase.from('companies').select('id, name, name_ar, region_id').eq('is_active', true); return data || []; },
  });
  const { data: allBranchList = [] } = useQuery({
    queryKey: ['filter-branches'],
    queryFn: async () => { const { data } = await supabase.from('branches').select('id, name, name_ar, company_id').eq('is_active', true); return data || []; },
  });

  const { data: slaConfigs } = useQuery({
    queryKey: ['phase-sla-config'],
    queryFn: async () => {
      const { data } = await supabase.from('phase_sla_config').select('phase, max_days').eq('is_active', true);
      return (data || []) as SlaConfig[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['dashboard-contract-progress'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select(`id, name, current_phase, status, project_phases (phase, status, started_at, completed_at)`)
        .eq('project_type', 'industrial');
      const projectIds = (data || []).map((p: any) => p.id);
      const { data: sos } = await supabase
        .from('sales_orders')
        .select('project_id, branch_id, customer_name, doc_num')
        .in('project_id', projectIds.length ? projectIds : ['none']);
      return (data || []).map((p: any) => ({
        ...p,
        sales_orders: (sos || []).filter((s: any) => s.project_id === p.id),
      })) as ProjectRow[];
    },
    refetchOnMount: 'always' as const,
  });

  const slaMap = useMemo(() => {
    const m = new Map<string, number>();
    slaConfigs?.forEach(c => m.set(c.phase, c.max_days));
    return m;
  }, [slaConfigs]);

  const branchFilterIds = useMemo(() =>
    getFilteredBranchIds(selectedRegions, selectedCompanies, selectedBranches, allCompanies, allBranchList),
    [selectedRegions, selectedCompanies, selectedBranches, allCompanies, allBranchList],
  );

  const filtered = useMemo(() => {
    if (branchFilterIds.length === 0) return projects;
    return projects.filter(p => {
      const br = p.sales_orders[0]?.branch_id;
      return br && branchFilterIds.includes(br);
    });
  }, [projects, branchFilterIds]);

  const getPhaseStatus = (phase: PhaseRecord) => {
    const maxDays = slaMap.get(phase.phase) || 7;
    if (phase.status === 'completed' || phase.status === 'approved' || phase.status === 'skipped') {
      const start = phase.started_at ? new Date(phase.started_at) : null;
      const end = phase.completed_at ? new Date(phase.completed_at) : new Date();
      const d = start ? Math.floor((end.getTime() - start.getTime()) / 86400000) : 0;
      return d > maxDays ? 'overdue' : 'on_time';
    }
    if (phase.status === 'pending') return 'pending';
    if (!phase.started_at) return 'pending';
    const d = Math.floor((Date.now() - new Date(phase.started_at).getTime()) / 86400000);
    if (d >= maxDays) return 'overdue';
    if (d >= maxDays * 0.8) return 'warning';
    return 'on_time';
  };

  // Contract status pie data
  const contractPieData = useMemo(() => {
    let onTime = 0, warning = 0, overdue = 0, completed = 0;
    filtered.forEach(p => {
      if (p.status === 'completed') { completed++; return; }
      const activePhases = p.project_phases.filter(pp => pp.status === 'in_progress' || pp.status === 'awaiting_approval');
      let worst: 'on_time' | 'warning' | 'overdue' = 'on_time';
      for (const pp of activePhases) {
        const s = getPhaseStatus(pp);
        if (s === 'overdue') { worst = 'overdue'; break; }
        if (s === 'warning') worst = 'warning';
      }
      if (worst === 'overdue') overdue++;
      else if (worst === 'warning') warning++;
      else onTime++;
    });
    return [
      { name: language === 'ar' ? 'في الموعد' : 'On Time', value: onTime, color: 'hsl(142, 71%, 45%)' },
      { name: language === 'ar' ? 'تحذير' : 'Warning', value: warning, color: 'hsl(38, 92%, 50%)' },
      { name: language === 'ar' ? 'متأخر' : 'Overdue', value: overdue, color: 'hsl(0, 84%, 60%)' },
      { name: language === 'ar' ? 'مكتمل' : 'Completed', value: completed, color: 'hsl(199, 89%, 48%)' },
    ].filter(d => d.value > 0);
  }, [filtered, slaMap, language]);

  // Stage bar data
  const stageBarData = useMemo(() => {
    const phaseOrder = [
      'sales_initiation', 'finance_verification', 'operations_verification',
      'design_costing', 'finance_gate_2', 'procurement', 'production',
      'final_payment', 'logistics', 'completed',
    ];
    return phaseOrder.map(phase => {
      const config = PHASE_CONFIG[phase as ProjectPhase];
      const allPhases = filtered.flatMap(p => p.project_phases.filter(pp => pp.phase === phase));
      const active = allPhases.filter(pp => pp.status === 'in_progress' || pp.status === 'awaiting_approval');
      const onTime = active.filter(pp => getPhaseStatus(pp) === 'on_time').length;
      const warning = active.filter(pp => getPhaseStatus(pp) === 'warning').length;
      const overdue = active.filter(pp => getPhaseStatus(pp) === 'overdue').length;
      const done = allPhases.filter(pp => pp.status === 'completed' || pp.status === 'approved').length;
      return {
        name: config?.label?.split(' ')[0] || phase.substring(0, 8),
        fullName: config?.label || phase,
        phase,
        onTime, warning, overdue, done,
      };
    });
  }, [filtered, slaMap]);

  const handleBarClick = (data: any, barKey: string) => {
    if (data?.phase) {
      // Navigate to contract progress with stage filter
      navigate('/contract-progress');
    }
  };

  const handlePieClick = (entry: any) => {
    const statusMap: Record<string, string> = {
      'On Time': 'on_time', 'في الموعد': 'on_time',
      'Warning': 'warning', 'تحذير': 'warning',
      'Overdue': 'overdue', 'متأخر': 'overdue',
    };
    const status = statusMap[entry.name];
    if (status) navigate('/contract-progress');
  };

  return (
    <div className="space-y-4">
      <BranchHierarchyFilter
        selectedRegions={selectedRegions}
        selectedCompanies={selectedCompanies}
        selectedBranches={selectedBranches}
        onRegionsChange={setSelectedRegions}
        onCompaniesChange={setSelectedCompanies}
        onBranchesChange={setSelectedBranches}
        compact
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'ar' ? 'حالة العقود' : 'Contract Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={handlePieClick}
                    className="cursor-pointer"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {contractPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stage Completion Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {language === 'ar' ? 'حالة المراحل' : 'Stage Completion Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const fullName = payload[0]?.payload?.fullName || label;
                      return (
                        <div className="rounded-lg border bg-background p-2 text-xs shadow-md">
                          <p className="font-medium mb-1">{fullName}</p>
                          {payload.map((p: any) => (
                            <div key={p.dataKey} className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
                              <span>{p.name}: {p.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="onTime"
                    name={language === 'ar' ? 'في الموعد' : 'On Time'}
                    fill="hsl(142, 71%, 45%)"
                    stackId="a"
                    className="cursor-pointer"
                    onClick={(d) => handleBarClick(d, 'onTime')}
                  />
                  <Bar
                    dataKey="warning"
                    name={language === 'ar' ? 'تحذير' : 'Warning'}
                    fill="hsl(38, 92%, 50%)"
                    stackId="a"
                    className="cursor-pointer"
                    onClick={(d) => handleBarClick(d, 'warning')}
                  />
                  <Bar
                    dataKey="overdue"
                    name={language === 'ar' ? 'متأخر' : 'Overdue'}
                    fill="hsl(0, 84%, 60%)"
                    stackId="a"
                    className="cursor-pointer"
                    onClick={(d) => handleBarClick(d, 'overdue')}
                  />
                  <Bar
                    dataKey="done"
                    name={language === 'ar' ? 'مكتمل' : 'Done'}
                    fill="hsl(199, 89%, 48%)"
                    stackId="a"
                    className="cursor-pointer"
                    onClick={(d) => handleBarClick(d, 'done')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
