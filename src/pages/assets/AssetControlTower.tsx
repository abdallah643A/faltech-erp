import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Activity, AlertTriangle, DollarSign, Wrench, Clock, Shield, TrendingUp, Truck } from 'lucide-react';

const COLORS = ['#0066cc', '#1a7a4a', '#e8a000', '#cc0000', '#6b7280', '#8b5cf6'];

const AssetControlTower = () => {
  const { activeCompanyId } = useActiveCompany();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [overhauls, setOverhauls] = useState<any[]>([]);
  const [downtime, setDowntime] = useState<any[]>([]);
  const [budgetPlans, setBudgetPlans] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [eq, inc, oh, dt, bp, mt, ls] = await Promise.all([
        supabase.from('cpms_equipment' as any).select('*'),
        supabase.from('asset_incidents' as any).select('*'),
        supabase.from('asset_overhauls' as any).select('*'),
        supabase.from('asset_downtime_events' as any).select('*'),
        supabase.from('asset_budget_plans' as any).select('*'),
        supabase.from('cpms_equipment_maintenance' as any).select('*'),
        supabase.from('asset_leases' as any).select('*'),
      ]);
      setEquipment((eq.data || []) as any[]);
      setIncidents((inc.data || []) as any[]);
      setOverhauls((oh.data || []) as any[]);
      setDowntime((dt.data || []) as any[]);
      setBudgetPlans((bp.data || []) as any[]);
      setMaintenance((mt.data || []) as any[]);
      setLeases((ls.data || []) as any[]);
    };
    fetch();
  }, [activeCompanyId]);

  const totalAssets = equipment.length;
  const totalValue = equipment.reduce((s, e) => s + (e.purchase_cost || 0), 0);
  const inUse = equipment.filter(e => e.status === 'in_use').length;
  const available = equipment.filter(e => e.status === 'available').length;
  const underMaint = equipment.filter(e => e.status === 'maintenance').length;
  const utilizationRate = totalAssets > 0 ? Math.round((inUse / totalAssets) * 100) : 0;
  const totalDowntimeHrs = downtime.reduce((s, d) => s + (d.duration_hours || 0), 0);
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating').length;
  const maintBacklog = maintenance.filter(m => m.status === 'scheduled' && m.scheduled_date && new Date(m.scheduled_date) < new Date()).length;
  const activeLeases = leases.filter(l => l.status === 'active').length;
  const monthlyLeaseCost = leases.filter(l => l.status === 'active').reduce((s, l) => s + (l.monthly_charge || 0), 0);

  const statusPie = [
    { name: 'In Use', value: inUse }, { name: 'Available', value: available },
    { name: 'Maintenance', value: underMaint },
    { name: 'Other', value: totalAssets - inUse - available - underMaint },
  ].filter(d => d.value > 0);

  const categoryBar = Object.entries(equipment.reduce((acc: any, e: any) => { acc[e.category || 'Uncategorized'] = (acc[e.category || 'Uncategorized'] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, count: value as number }));

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Executive Control Tower</h1><p className="text-sm text-muted-foreground">Complete organizational asset oversight</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card><CardContent className="pt-3 pb-3"><Activity className="h-4 w-4 text-blue-600 mb-1" /><div className="text-xl font-bold">{totalAssets}</div><div className="text-xs text-muted-foreground">Total Assets</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><DollarSign className="h-4 w-4 text-green-600 mb-1" /><div className="text-xl font-bold">{(totalValue / 1000).toFixed(0)}K</div><div className="text-xs text-muted-foreground">Portfolio Value</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><TrendingUp className="h-4 w-4 text-blue-600 mb-1" /><div className="text-xl font-bold">{utilizationRate}%</div><div className="text-xs text-muted-foreground">Utilization</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><Clock className="h-4 w-4 text-red-600 mb-1" /><div className="text-xl font-bold">{totalDowntimeHrs.toFixed(0)}</div><div className="text-xs text-muted-foreground">Downtime (hrs)</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><AlertTriangle className="h-4 w-4 text-amber-600 mb-1" /><div className="text-xl font-bold">{openIncidents}</div><div className="text-xs text-muted-foreground">Open Incidents</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><Wrench className="h-4 w-4 text-orange-600 mb-1" /><div className="text-xl font-bold">{maintBacklog}</div><div className="text-xs text-muted-foreground">Maint Backlog</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><Shield className="h-4 w-4 text-purple-600 mb-1" /><div className="text-xl font-bold">{overhauls.filter(o => o.status === 'in_progress').length}</div><div className="text-xs text-muted-foreground">Active Overhauls</div></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><Truck className="h-4 w-4 text-teal-600 mb-1" /><div className="text-xl font-bold">{activeLeases}</div><div className="text-xs text-muted-foreground">Active Leases</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Fleet Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">By Category</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}><BarChart data={categoryBar}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#0066cc" /></BarChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="flex justify-between text-sm"><span>Monthly Lease Cost</span><span className="font-bold">{monthlyLeaseCost.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm"><span>Budget Plans</span><span className="font-bold">{budgetPlans.length}</span></div>
          <div className="flex justify-between text-sm"><span>Total Incidents YTD</span><span className="font-bold">{incidents.length}</span></div>
          <div className="flex justify-between text-sm"><span>Avg Downtime/Incident</span><span className="font-bold">{incidents.length > 0 ? (totalDowntimeHrs / incidents.length).toFixed(1) : 0}h</span></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Asset Aging</CardTitle></CardHeader><CardContent className="space-y-2">
          {[{ label: '< 2 years', count: equipment.filter(e => e.purchase_date && (Date.now() - new Date(e.purchase_date).getTime()) / (365.25 * 86400000) < 2).length },
            { label: '2-5 years', count: equipment.filter(e => { const y = e.purchase_date ? (Date.now() - new Date(e.purchase_date).getTime()) / (365.25 * 86400000) : 0; return y >= 2 && y < 5; }).length },
            { label: '5-10 years', count: equipment.filter(e => { const y = e.purchase_date ? (Date.now() - new Date(e.purchase_date).getTime()) / (365.25 * 86400000) : 0; return y >= 5 && y < 10; }).length },
            { label: '> 10 years', count: equipment.filter(e => e.purchase_date && (Date.now() - new Date(e.purchase_date).getTime()) / (365.25 * 86400000) >= 10).length },
          ].map(a => (
            <div key={a.label} className="flex justify-between items-center text-sm">
              <span>{a.label}</span>
              <div className="flex items-center gap-2"><Progress value={totalAssets > 0 ? (a.count / totalAssets) * 100 : 0} className="w-20 h-2" /><span className="font-bold w-6 text-right">{a.count}</span></div>
            </div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Replacement Pipeline</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Pending Overhauls</span><span className="font-bold text-amber-600">{overhauls.filter(o => o.status === 'pending_approval').length}</span></div>
          <div className="flex justify-between"><span>Approved Overhauls</span><span className="font-bold text-blue-600">{overhauls.filter(o => o.status === 'approved').length}</span></div>
          <div className="flex justify-between"><span>Active Overhauls</span><span className="font-bold text-green-600">{overhauls.filter(o => o.status === 'in_progress').length}</span></div>
          <div className="flex justify-between"><span>Budget (Total)</span><span className="font-bold">{overhauls.reduce((s, o) => s + (o.estimated_budget || 0), 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Actual Cost (Total)</span><span className="font-bold">{overhauls.reduce((s, o) => s + (o.actual_cost || 0), 0).toLocaleString()}</span></div>
        </CardContent></Card>
      </div>
    </div>
  );
};

export default AssetControlTower;
