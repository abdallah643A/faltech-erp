import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useServiceContracts, useUpsertContract, useSLAPolicies } from '@/hooks/useServiceITSM';
import { Plus, FileSignature } from 'lucide-react';

export default function ITSMContractsPage() {
  const { data: contracts = [] } = useServiceContracts();
  const { data: policies = [] } = useSLAPolicies();
  const upsert = useUpsertContract();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: 'active', coverage_type: 'standard' });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6" />Service Contracts</h1></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Service Contract</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Contract #</Label><Input value={form.contract_number || ''} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} /></div>
              <div><Label>Customer name</Label><Input value={form.customer_name || ''} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End</Label><Input type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>SLA Policy</Label>
                <Select value={form.sla_policy_id || ''} onValueChange={(v) => setForm({ ...form, sla_policy_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{policies.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.policy_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Monthly value</Label><Input type="number" value={form.monthly_value || 0} onChange={(e) => setForm({ ...form, monthly_value: +e.target.value })} /></div>
              <Button onClick={() => upsert.mutate(form, { onSuccess: () => { setOpen(false); setForm({ status: 'active', coverage_type: 'standard' }); } })} disabled={!form.contract_number || !form.customer_name || !form.start_date || !form.end_date}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Contract</TableHead><TableHead>Customer</TableHead><TableHead>Coverage</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {contracts.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>
                  <TableCell>{c.customer_name}</TableCell>
                  <TableCell>{c.coverage_type}</TableCell>
                  <TableCell className="text-sm">{c.start_date} → {c.end_date}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'default' : 'outline'}>{c.status}</Badge></TableCell>
                  <TableCell>${c.monthly_value?.toLocaleString() ?? 0}/mo</TableCell>
                </TableRow>
              ))}
              {contracts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No contracts</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
