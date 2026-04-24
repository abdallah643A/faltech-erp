import { useState } from 'react';
import { useSaasTenants, useSaasModules } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaasModuleMatrix } from '@/components/saas/SaasModuleMatrix';

export default function SaasModuleMatrixPage() {
  const { data: tenants = [] } = useSaasTenants();
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Module Access Matrix</h1>
        <p className="text-muted-foreground">Enable or disable modules per client</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Choose a client..." /></SelectTrigger>
            <SelectContent>
              {tenants.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTenant && <SaasModuleMatrix tenantId={selectedTenant} />}
    </div>
  );
}
