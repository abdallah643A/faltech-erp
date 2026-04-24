import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFleetDashboardKPIs } from '@/hooks/useFleetData';
import { Truck, Wrench, AlertTriangle, Shield, Fuel, TrendingUp, BarChart3, Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatSAR } from '@/lib/currency';

export default function FleetDashboard() {
  const { data: kpi, isLoading } = useFleetDashboardKPIs();
  const navigate = useNavigate();

  const kpiCards = [
    { label: 'Total Fleet', value: kpi?.total ?? 0, icon: Truck, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Available', value: kpi?.available ?? 0, icon: Truck, color: 'text-green-600', bg: 'bg-green-500/10' },
    { label: 'Assigned', value: kpi?.assigned ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Under Maintenance', value: kpi?.maintenance ?? 0, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Breakdown', value: kpi?.breakdown ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10' },
    { label: 'Utilization Rate', value: `${(kpi?.utilizationRate ?? 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    { label: 'Availability Rate', value: `${(kpi?.availabilityRate ?? 0).toFixed(1)}%`, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Expiring Docs', value: kpi?.expiringDocs ?? 0, icon: Shield, color: 'text-orange-600', bg: 'bg-orange-500/10' },
    { label: 'Open Jobs', value: kpi?.openJobs ?? 0, icon: Wrench, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
    { label: 'Maint. Cost', value: formatSAR(kpi?.totalMaintCost ?? 0), icon: Fuel, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
          <p className="text-sm text-muted-foreground">Vehicle & equipment lifecycle, operations, and cost control</p>
        </div>
        <Button onClick={() => navigate('/fleet/assets/new')} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiCards.map((k, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded ${k.bg}`}><k.icon className={`h-4 w-4 ${k.color}`} /></div>
                <span className="text-xs text-muted-foreground truncate">{k.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{isLoading ? '—' : k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet by Status</CardTitle></CardHeader>
          <CardContent className="h-[220px]">
            {kpi?.statusBreakdown && kpi.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpi.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {kpi.statusBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ownership Mix</CardTitle></CardHeader>
          <CardContent className="h-[220px]">
            {kpi?.ownershipBreakdown && kpi.ownershipBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpi.ownershipBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {kpi.ownershipBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Fleet Register', href: '/fleet/assets', icon: Truck },
          { label: 'Drivers', href: '/fleet/drivers', icon: Users },
          { label: 'Trips', href: '/fleet/trips', icon: TrendingUp },
          { label: 'Fuel Logs', href: '/fleet/fuel', icon: Fuel },
          { label: 'Maintenance', href: '/fleet/maintenance', icon: Wrench },
          { label: 'Compliance', href: '/fleet/compliance', icon: Shield },
          { label: 'Incidents', href: '/fleet/incidents', icon: AlertTriangle },
          { label: 'Leases', href: '/fleet/leases', icon: BarChart3 },
        ].map(nav => (
          <Card key={nav.href} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(nav.href)}>
            <CardContent className="p-4 flex items-center gap-3">
              <nav.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{nav.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
