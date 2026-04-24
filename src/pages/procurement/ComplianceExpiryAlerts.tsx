import { useComplianceAlertRules, useComplianceAlerts } from '@/hooks/useProcurementStrategic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, BellRing, RefreshCw, Check } from 'lucide-react';

const SEVERITY: Record<string, any> = { info: 'secondary', warning: 'default', critical: 'destructive', expired: 'destructive' };

export default function ComplianceExpiryAlerts() {
  const rules = useComplianceAlertRules();
  const alerts = useComplianceAlerts();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Compliance Expiry Alerts</h1>
          <p className="text-xs text-muted-foreground">Track supplier document expiry windows (CR, VAT, GOSI, Saudization, ZATCA, ISO, Insurance)</p>
        </div>
        <Button size="sm" onClick={() => alerts.generate.mutate()} disabled={alerts.generate.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${alerts.generate.isPending ? 'animate-spin' : ''}`} /> Scan & Generate
        </Button>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Open Alerts</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Active Alerts</CardTitle></CardHeader>
            <CardContent>
              {alerts.isLoading ? <div className="text-muted-foreground">Loading…</div> : !alerts.data?.length ? (
                <div className="text-center text-muted-foreground py-8">No active alerts. Click "Scan & Generate" to check supplier documents.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Vendor</TableHead><TableHead>Document</TableHead>
                    <TableHead>Expiry</TableHead><TableHead className="text-right">Days</TableHead>
                    <TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {alerts.data.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.vendor_name || a.vendor_id?.slice(0,8)}</TableCell>
                        <TableCell>{a.document_type}</TableCell>
                        <TableCell className="text-xs">{a.expiry_date}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.days_until_expiry}</TableCell>
                        <TableCell><Badge variant={SEVERITY[a.severity]}>{a.severity}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                        <TableCell>
                          {a.status === 'open' && (
                            <Button variant="ghost" size="sm" onClick={() => alerts.acknowledge.mutate(a.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Alert Rule Configuration</CardTitle></CardHeader>
            <CardContent>
              {rules.isLoading ? <div className="text-muted-foreground">Loading…</div> : !rules.data?.length ? (
                <div className="text-center text-muted-foreground py-8">No rules.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Document</TableHead><TableHead>Warn Days Before</TableHead>
                    <TableHead>Mandatory</TableHead><TableHead>Block PO on Expiry</TableHead><TableHead>Active</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rules.data.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.document_label}</TableCell>
                        <TableCell className="font-mono text-xs">{(r.warn_days_before || []).join(', ')}</TableCell>
                        <TableCell>{r.is_mandatory ? <Badge>Yes</Badge> : '—'}</TableCell>
                        <TableCell>{r.block_po_on_expiry ? <Badge variant="destructive">Yes</Badge> : '—'}</TableCell>
                        <TableCell>{r.is_active ? <Badge variant="default">On</Badge> : <Badge variant="outline">Off</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
