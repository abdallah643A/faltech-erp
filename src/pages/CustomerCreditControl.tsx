import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CreditCard, AlertTriangle, ShieldCheck, ShieldAlert, Plus, Edit, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerCreditControl() {
  const { t } = useLanguage();

  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['credit-settings', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('customer_credit_settings' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['credit-overrides', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('credit_override_requests' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Fetch customers for exposure calculation
  const { data: customers = [] } = useQuery({
    queryKey: ['bp-customers-credit'],
    queryFn: async () => {
      const { data } = await (supabase.from('business_partners').select('id, card_name, card_code, current_balance') as any).eq('bp_type', 'customer').limit(500);
      return (data || []) as any[];
    },
  });

  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: '', credit_limit: 0, warning_threshold_pct: 80, block_threshold_pct: 100, risk_rating: 'medium', auto_block_on_overdue: false, notes: '' });

  const saveSetting = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, company_id: activeCompanyId, created_by: user?.id };
      if (editId) {
        await (supabase.from('customer_credit_settings' as any).update(payload) as any).eq('id', editId);
      } else {
        await (supabase.from('customer_credit_settings' as any).insert(payload) as any);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-settings'] }); setDialog(false); toast({ title: 'Saved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const approveOverride = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('credit_override_requests' as any).update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-overrides'] }); toast({ title: 'Approved' }); },
  });

  const riskColors: Record<string, string> = { low: 'default', medium: 'secondary', high: 'destructive', critical: 'destructive' };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><CreditCard className="h-6 w-6" /> Customer Credit Control</h1>
          <p className="text-muted-foreground text-sm">Manage credit limits, exposure tracking, and override approvals</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ customer_id: '', credit_limit: 0, warning_threshold_pct: 80, block_threshold_pct: 100, risk_rating: 'medium', auto_block_on_overdue: false, notes: '' }); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Set Credit Limit
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Customers</div><div className="text-2xl font-bold">{settings.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">High Risk</div><div className="text-2xl font-bold text-destructive">{settings.filter((s: any) => s.risk_rating === 'high' || s.risk_rating === 'critical').length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Pending Overrides</div><div className="text-2xl font-bold">{overrides.filter((o: any) => o.status === 'pending').length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Credit Limit</div><div className="text-2xl font-bold">{settings.reduce((s: number, r: any) => s + Number(r.credit_limit || 0), 0).toLocaleString()} SAR</div></CardContent></Card>
      </div>

      {/* Credit Settings Table */}
      <Card>
        <CardHeader><CardTitle>Credit Limits</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Credit Limit</TableHead><TableHead>Warning %</TableHead><TableHead>Block %</TableHead><TableHead>Risk</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {settings.map((s: any) => {
                const cust = customers.find((c: any) => c.id === s.customer_id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{cust?.card_name || s.customer_id}</TableCell>
                    <TableCell className="font-mono">{Number(s.credit_limit).toLocaleString()}</TableCell>
                    <TableCell>{s.warning_threshold_pct}%</TableCell>
                    <TableCell>{s.block_threshold_pct}%</TableCell>
                    <TableCell><Badge variant={riskColors[s.risk_rating] as any || 'secondary'}>{s.risk_rating}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => { setEditId(s.id); setForm(s); setDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                );
              })}
              {settings.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No credit limits configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Override Requests */}
      {overrides.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Override Requests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Requested By</TableHead><TableHead>Reason</TableHead><TableHead>New Limit</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {overrides.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.requested_by_name || 'Unknown'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{o.reason}</TableCell>
                    <TableCell className="font-mono">{Number(o.requested_limit).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={o.status === 'pending' ? 'secondary' : o.status === 'approved' ? 'default' : 'destructive'}>{o.status}</Badge></TableCell>
                    <TableCell>
                      {o.status === 'pending' && <Button size="sm" onClick={() => approveOverride.mutate(o.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Set'} Credit Limit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Customer</Label>
              <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.card_name} ({c.card_code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Credit Limit (SAR)</Label><Input type="number" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Warning Threshold %</Label><Input type="number" value={form.warning_threshold_pct} onChange={e => setForm({ ...form, warning_threshold_pct: parseFloat(e.target.value) || 80 })} /></div>
              <div><Label>Block Threshold %</Label><Input type="number" value={form.block_threshold_pct} onChange={e => setForm({ ...form, block_threshold_pct: parseFloat(e.target.value) || 100 })} /></div>
            </div>
            <div><Label>Risk Rating</Label>
              <Select value={form.risk_rating} onValueChange={v => setForm({ ...form, risk_rating: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={() => saveSetting.mutate(form)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
