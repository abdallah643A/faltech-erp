import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Shield, Plus, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { useCreditProfiles } from '@/hooks/useQuoteToCash';

export default function CreditManagementDashboard() {
  const { profiles, isLoading, stats, createProfile, toggleHold } = useCreditProfiles();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ customer_name: '', customer_code: '', credit_limit: 0, current_exposure: 0, risk_category: 'medium' });

  const handleCreate = async () => {
    const available = (form.credit_limit || 0) - (form.current_exposure || 0);
    await createProfile.mutateAsync({ ...form, available_credit: available, customer_id: crypto.randomUUID() });
    setOpen(false);
    setForm({ customer_name: '', customer_code: '', credit_limit: 0, current_exposure: 0, risk_category: 'medium' });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Credit Management</h1>
          <p className="text-sm text-muted-foreground">Customer credit limits, exposure, and risk controls</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Credit Profile</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Credit Profile</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Customer Code</Label><Input value={form.customer_code} onChange={(e) => setForm({ ...form, customer_code: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Credit Limit (SAR)</Label><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Current Exposure</Label><Input type="number" value={form.current_exposure} onChange={(e) => setForm({ ...form, current_exposure: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Customers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalCustomers}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">On Hold</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{stats.onHold}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Limit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalLimit.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Exposure</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalExposure.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Credit Profiles ({profiles.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Limit</TableHead><TableHead>Exposure</TableHead><TableHead>Utilization</TableHead><TableHead>Risk</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && profiles.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No profiles</TableCell></TableRow>}
              {profiles.map((p: any) => {
                const util = p.credit_limit ? (Number(p.current_exposure) / Number(p.credit_limit)) * 100 : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.customer_name}<div className="text-xs text-muted-foreground">{p.customer_code}</div></TableCell>
                    <TableCell>{Number(p.credit_limit).toLocaleString()}</TableCell>
                    <TableCell>{Number(p.current_exposure).toLocaleString()}</TableCell>
                    <TableCell className="w-40">
                      <Progress value={util} className="h-2" />
                      <span className={`text-xs ${util > 90 ? 'text-destructive' : 'text-muted-foreground'}`}>{util.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell><Badge variant={p.risk_category === 'high' ? 'destructive' : p.risk_category === 'low' ? 'default' : 'secondary'}>{p.risk_category}</Badge></TableCell>
                    <TableCell>{p.on_hold ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Hold</Badge> : <Badge variant="default">Active</Badge>}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => toggleHold.mutate({ id: p.id, on_hold: !p.on_hold, hold_reason: 'Manual hold' })}>
                        {p.on_hold ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
