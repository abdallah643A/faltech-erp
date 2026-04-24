import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { Plus, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { subcontractor: SubPortalSubcontractor; }

export default function SubPortalClaims({ subcontractor }: Props) {
  const [claims, setClaims] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subcontract_order_id: '', claim_period_from: '', claim_period_to: '', description: '', claimed_amount: '', progress_percentage: '' });

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const [claimsRes, ordersRes] = await Promise.all([
      supabase.from('sub_progress_claims').select('*').eq('subcontractor_id', subcontractor.id).order('created_at', { ascending: false }) as any,
      supabase.from('cpms_subcontract_orders').select('*').eq('subcontractor_id', subcontractor.id) as any,
    ]);
    setClaims(claimsRes.data || []);
    setOrders(ordersRes.data || []);
  };

  const handleCreate = async () => {
    if (!form.subcontract_order_id || !form.claimed_amount || !form.claim_period_from || !form.claim_period_to) {
      toast.error('Please fill all required fields');
      return;
    }
    const order = orders.find((o: any) => o.id === form.subcontract_order_id);
    const claimNum = `CLM-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from('sub_progress_claims').insert({
      subcontractor_id: subcontractor.id,
      subcontract_order_id: form.subcontract_order_id,
      project_id: order?.project_id,
      company_id: subcontractor.company_id,
      claim_number: claimNum,
      claim_period_from: form.claim_period_from,
      claim_period_to: form.claim_period_to,
      description: form.description,
      claimed_amount: parseFloat(form.claimed_amount),
      progress_percentage: form.progress_percentage ? parseFloat(form.progress_percentage) : 0,
      status: 'draft',
    } as any);
    if (error) { toast.error('Failed to create claim'); return; }
    toast.success('Claim created');
    setCreateOpen(false);
    setForm({ subcontract_order_id: '', claim_period_from: '', claim_period_to: '', description: '', claimed_amount: '', progress_percentage: '' });
    load();
  };

  const handleSubmit = async (id: string) => {
    await supabase.from('sub_progress_claims').update({ status: 'submitted', submitted_at: new Date().toISOString() } as any).eq('id', id);
    toast.success('Claim submitted for review');
    load();
  };

  const statusColor = (s: string) => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary', submitted: 'default', under_review: 'default', certified: 'outline', rejected: 'destructive', paid: 'outline'
    };
    return map[s] || 'secondary';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Progress Claims</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> New Claim</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="text-right">Certified</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No claims yet</TableCell></TableRow>
              ) : claims.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.claim_number}</TableCell>
                  <TableCell className="text-xs">{orders.find((o: any) => o.id === c.subcontract_order_id)?.order_number || '—'}</TableCell>
                  <TableCell className="text-xs">{c.claim_period_from} — {c.claim_period_to}</TableCell>
                  <TableCell className="text-right text-sm">{(c.claimed_amount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm">{(c.certified_amount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{c.progress_percentage || 0}%</TableCell>
                  <TableCell><Badge variant={statusColor(c.status)} className="text-[10px] capitalize">{c.status?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    {c.status === 'draft' && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleSubmit(c.id)}>
                        <Send className="h-3 w-3" /> Submit
                      </Button>
                    )}
                    {c.rejection_reason && (
                      <span className="text-[10px] text-destructive">{c.rejection_reason}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Progress Claim</DialogTitle>
            <DialogDescription>Submit a progress claim against a contract</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Contract *</Label>
              <Select value={form.subcontract_order_id} onValueChange={v => setForm(f => ({ ...f, subcontract_order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                <SelectContent>
                  {orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.order_number} — {(o.contract_value || 0).toLocaleString()} SAR</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Period From *</Label><Input type="date" value={form.claim_period_from} onChange={e => setForm(f => ({ ...f, claim_period_from: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Period To *</Label><Input type="date" value={form.claim_period_to} onChange={e => setForm(f => ({ ...f, claim_period_to: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Claimed Amount *</Label><Input type="number" value={form.claimed_amount} onChange={e => setForm(f => ({ ...f, claimed_amount: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Progress %</Label><Input type="number" max={100} value={form.progress_percentage} onChange={e => setForm(f => ({ ...f, progress_percentage: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}