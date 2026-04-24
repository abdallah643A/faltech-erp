import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe } from 'lucide-react';
import { useRegionalLeavePolicies } from '@/hooks/useHREnhanced';

export default function RegionalLeavePoliciesPage() {
  const { data: policies = [] } = useRegionalLeavePolicies();
  const grouped = policies.reduce((acc: any, p: any) => { (acc[p.country_code] ||= []).push(p); return acc; }, {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6 text-primary" />Regional Leave Policies</h1>
        <p className="text-muted-foreground">Country-specific leave entitlements aligned to local labor laws</p>
      </div>
      {Object.entries(grouped).map(([cc, rows]: any) => (
        <Card key={cc}>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Badge>{cc}</Badge>{rows.length} policies</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Policy</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Days</TableHead>
                <TableHead>Accrual</TableHead><TableHead>After (mo)</TableHead><TableHead>Pay %</TableHead>
                <TableHead>Doc Required</TableHead><TableHead>Legal Ref</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell><div className="font-medium">{p.policy_name}</div><div className="text-xs text-muted-foreground" dir="rtl">{p.policy_name_ar}</div></TableCell>
                    <TableCell><Badge variant="outline">{p.leave_type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{p.entitlement_days}</TableCell>
                    <TableCell className="text-xs">{p.accrual_method}</TableCell>
                    <TableCell>{p.applies_after_months}</TableCell>
                    <TableCell><Badge variant={p.pay_percentage === 100 ? 'default' : p.pay_percentage > 0 ? 'secondary' : 'destructive'}>{p.pay_percentage}%</Badge></TableCell>
                    <TableCell>{p.requires_documentation ? '✓' : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.legal_reference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
