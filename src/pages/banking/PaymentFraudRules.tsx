import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTreasFraudRules, useTreasFraudAlerts } from '@/hooks/useTreasuryEnhanced';

const SEV_COLOR: Record<string, any> = { critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline' };

export default function PaymentFraudRules() {
  const { data: rules = [], upsert } = useTreasFraudRules();
  const { data: alerts = [], resolve } = useTreasFraudAlerts();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ severity: 'medium', action: 'warn', is_active: true, parameters: {} });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" />Payment Fraud Detection</h1>
          <p className="text-muted-foreground">Rule-driven warnings: new beneficiary, round amounts, off-hours, duplicates, velocity</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Rule</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{rules.filter((r: any) => r.is_active).length}</p><p className="text-xs text-muted-foreground">Active Rules</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-orange-600">{alerts.filter((a: any) => a.status === 'open').length}</p><p className="text-xs text-muted-foreground">Open Alerts</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-red-600">{alerts.filter((a: any) => ['high', 'critical'].includes(a.severity) && a.status === 'open').length}</p><p className="text-xs text-muted-foreground">High/Critical</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{alerts.filter((a: any) => a.status === 'confirmed').length}</p><p className="text-xs text-muted-foreground">Confirmed</p></CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.filter((a: any) => a.status === 'open').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                      <TableCell><div className="font-medium">{r.rule_name}</div><div className="text-xs text-muted-foreground" dir="rtl">{r.rule_name_ar}</div></TableCell>
                      <TableCell><Badge variant="outline">{r.rule_type}</Badge></TableCell>
                      <TableCell><Badge variant={SEV_COLOR[r.severity]}>{r.severity}</Badge></TableCell>
                      <TableCell><Badge variant={r.action === 'block' ? 'destructive' : r.action === 'require_extra_approval' ? 'secondary' : 'outline'}>{r.action}</Badge></TableCell>
                      <TableCell>{r.triggered_count || 0}</TableCell>
                      <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => upsert.mutate({ ...r, is_active: v })} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{a.rule_code}</TableCell>
                      <TableCell><Badge variant={SEV_COLOR[a.severity]}>{a.severity}</Badge></TableCell>
                      <TableCell>{a.beneficiary || '—'}</TableCell>
                      <TableCell className="font-mono">{a.amount ? `${Number(a.amount).toLocaleString()} ${a.currency || ''}` : '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{a.payment_ref || '—'}</TableCell>
                      <TableCell>
                        {a.status === 'open' && <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />open</Badge>}
                        {a.status === 'confirmed' && <Badge variant="destructive">confirmed</Badge>}
                        {a.status === 'dismissed' && <Badge variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />dismissed</Badge>}
                      </TableCell>
                      <TableCell>
                        {a.status === 'open' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: a.id, status: 'dismissed', notes: 'False positive' })}>Dismiss</Button>
                            <Button size="sm" variant="destructive" onClick={() => resolve.mutate({ id: a.id, status: 'confirmed', notes: 'Confirmed fraud' })}>Confirm</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {alerts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No alerts</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Fraud Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code</Label><Input value={draft.rule_code || ''} onChange={(e) => setDraft({ ...draft, rule_code: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={draft.rule_type} onValueChange={(v) => setDraft({ ...draft, rule_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{['new_beneficiary', 'round_amount', 'off_hours', 'duplicate', 'threshold_jump', 'blacklist', 'velocity', 'geo_anomaly'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Name</Label><Input value={draft.rule_name || ''} onChange={(e) => setDraft({ ...draft, rule_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Name (AR)</Label><Input dir="rtl" value={draft.rule_name_ar || ''} onChange={(e) => setDraft({ ...draft, rule_name_ar: e.target.value })} /></div>
            <div><Label>Severity</Label>
              <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['low', 'medium', 'high', 'critical'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Action</Label>
              <Select value={draft.action} onValueChange={(v) => setDraft({ ...draft, action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['warn', 'block', 'require_extra_approval'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Parameters (JSON)</Label><Textarea rows={3} className="font-mono text-xs" value={JSON.stringify(draft.parameters, null, 2)} onChange={(e) => { try { setDraft({ ...draft, parameters: JSON.parse(e.target.value) }); } catch {} }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={upsert.isPending || !draft.rule_code || !draft.rule_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
