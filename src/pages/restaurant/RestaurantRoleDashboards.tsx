import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRoleDashboards, useRoleDashboardMutations } from '@/hooks/useRestaurantEnhanced';
import { Users, Save } from 'lucide-react';

const ROLE_PRESETS: any = {
  owner: { name: 'Owner / CEO', widgets: ['revenue', 'profit', 'branches', 'food_cost', 'labor', 'benchmarking'] },
  gm: { name: 'General Manager', widgets: ['revenue', 'orders', 'staffing', 'wastage', 'reservations'] },
  chef: { name: 'Head Chef', widgets: ['kds', 'recipes', 'wastage', 'inventory', 'variance'] },
  cashier: { name: 'Cashier', widgets: ['shift', 'transactions', 'pending_orders'] },
  host: { name: 'Host', widgets: ['tables', 'reservations', 'waitlist'] },
  shift_lead: { name: 'Shift Lead', widgets: ['active_orders', 'staffing', 'kds', 'shift'] },
};

const ALL_WIDGETS = [
  'revenue', 'profit', 'orders', 'food_cost', 'labor', 'branches', 'benchmarking',
  'staffing', 'wastage', 'reservations', 'kds', 'recipes', 'inventory', 'variance',
  'shift', 'transactions', 'pending_orders', 'tables', 'waitlist', 'active_orders',
];

export default function RestaurantRoleDashboards() {
  const { data: configs } = useRoleDashboards();
  const { upsert } = useRoleDashboardMutations();
  const [selectedRole, setSelectedRole] = useState('owner');
  const [widgets, setWidgets] = useState<string[]>(ROLE_PRESETS.owner.widgets);
  const [refresh, setRefresh] = useState(60);

  const loadRole = (role: string) => {
    setSelectedRole(role);
    const cfg = (configs || []).find((c: any) => c.role_code === role);
    setWidgets(cfg?.kpi_widgets || ROLE_PRESETS[role].widgets);
    setRefresh(cfg?.refresh_interval_sec || 60);
  };

  const toggleWidget = (w: string) =>
    setWidgets(widgets.includes(w) ? widgets.filter(x => x !== w) : [...widgets, w]);

  const save = () => upsert.mutate({
    role_code: selectedRole,
    role_name: ROLE_PRESETS[selectedRole].name,
    kpi_widgets: widgets,
    refresh_interval_sec: refresh,
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Role Dashboards</h1>
        <p className="text-sm text-muted-foreground">Tailor KPIs per restaurant role</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Configure Role</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={loadRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_PRESETS).map(([k, v]: any) => (
                    <SelectItem key={k} value={k}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Refresh Interval (sec)</Label>
              <Input type="number" value={refresh} onChange={e => setRefresh(+e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">KPI Widgets ({widgets.length})</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_WIDGETS.map(w => (
                <Badge
                  key={w}
                  variant={widgets.includes(w) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleWidget(w)}
                >
                  {w.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={save} disabled={upsert.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        {Object.entries(ROLE_PRESETS).map(([k, v]: any) => {
          const cfg = (configs || []).find((c: any) => c.role_code === k);
          return (
            <Card key={k} className={selectedRole === k ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <h3 className="font-semibold">{v.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {(cfg?.kpi_widgets || v.widgets).length} widgets configured
                </p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => loadRole(k)}>Edit</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
