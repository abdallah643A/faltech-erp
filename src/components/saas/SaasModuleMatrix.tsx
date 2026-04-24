import { useSaasModules, useTenantModules, useToggleTenantModule } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColor: Record<string, string> = {
  enabled: 'bg-green-100 text-green-800',
  disabled: 'bg-gray-100 text-gray-800',
  trial: 'bg-blue-100 text-blue-800',
  suspended: 'bg-red-100 text-red-800',
};

export function SaasModuleMatrix({ tenantId }: { tenantId: string }) {
  const { data: allModules = [] } = useSaasModules();
  const { data: tenantModules = [] } = useTenantModules(tenantId);
  const toggle = useToggleTenantModule();

  const moduleStatusMap = new Map(tenantModules.map((m: any) => [m.module_id, m.status]));

  const grouped = allModules.reduce((acc: Record<string, any[]>, m: any) => {
    const cat = m.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const handleToggle = (moduleId: string, currentlyEnabled: boolean) => {
    toggle.mutate({ tenantId, moduleId, status: currentlyEnabled ? 'disabled' : 'enabled' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Access Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.entries(grouped).map(([category, modules]) => (
          <div key={category} className="mb-6">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">{category}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(modules as any[]).map((m: any) => {
                  const status = moduleStatusMap.get(m.id) || 'disabled';
                  const isEnabled = status === 'enabled' || status === 'trial';
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{m.module_name}</p>
                          <p className="text-xs text-muted-foreground">{m.module_key}</p>
                        </div>
                      </TableCell>
                      <TableCell>{m.is_premium && <Badge className="bg-amber-100 text-amber-800">Premium</Badge>}</TableCell>
                      <TableCell><Badge className={statusColor[status] || statusColor.disabled}>{status}</Badge></TableCell>
                      <TableCell>
                        <Switch checked={isEnabled} onCheckedChange={() => handleToggle(m.id, isEnabled)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
