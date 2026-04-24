import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Percent, Plus, FileText, BarChart3, Receipt, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

const REBATE_TYPES = ['volume', 'value', 'growth', 'mix', 'loyalty'];
const SETTLEMENT_METHODS = ['credit_note', 'payment', 'offset'];

export default function SupplierRebateManagement() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: agreements = [] } = useQuery({
    queryKey: ['rebate-agreements', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('rebate_agreements' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: accruals = [] } = useQuery({
    queryKey: ['rebate-accruals', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('rebate_accruals' as any).select('*') as any).order('period', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['rebate-claims', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('rebate_claims' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [agreementDialog, setAgreementDialog] = useState(false);
  const [accrualDialog, setAccrualDialog] = useState(false);
  const [claimDialog, setClaimDialog] = useState(false);

  const [agForm, setAgForm] = useState({ supplier_name: '', rebate_type: 'volume', start_date: '', end_date: '', volume_threshold: 0, rebate_percentage: 0, is_retroactive: false, notes: '' });
  const [accForm, setAccForm] = useState({ agreement_id: '', period: '', eligible_spend: 0, accrued_amount: 0 });
  const [clForm, setClForm] = useState({ agreement_id: '', period_from: '', period_to: '', eligible_spend: 0, claimed_amount: 0, notes: '' });

  const createAgreement = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('rebate_agreements' as any).insert({ ...d, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rebate-agreements'] }); setAgreementDialog(false); toast({ title: 'Agreement Created' }); },
  });

  const createAccrual = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('rebate_accruals' as any).insert({ ...d, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rebate-accruals'] }); setAccrualDialog(false); toast({ title: 'Accrual Recorded' }); },
  });

  const createClaim = useMutation({
    mutationFn: async (d: any) => {
      const num = 'RBC-' + Date.now().toString().slice(-8);
      await (supabase.from('rebate_claims' as any).insert({ ...d, company_id: activeCompanyId, claim_number: num, submitted_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rebate-claims'] }); setClaimDialog(false); toast({ title: 'Claim Created' }); },
  });

  const approveClaim = useMutation({
    mutationFn: async (id: string) => {
      const claim = claims.find((c: any) => c.id === id);
      await (supabase.from('rebate_claims' as any).update({ status: 'approved', approved_amount: claim?.claimed_amount, approved_by: user?.id, approved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rebate-claims'] }); toast({ title: 'Claim Approved' }); },
  });

  const stats = useMemo(() => ({
    activeAgreements: agreements.filter((a: any) => a.status === 'active').length,
    totalEarned: agreements.reduce((s: number, a: any) => s + Number(a.total_earned || 0), 0),
    totalClaimed: agreements.reduce((s: number, a: any) => s + Number(a.total_claimed || 0), 0),
    totalSettled: agreements.reduce((s: number, a: any) => s + Number(a.total_settled || 0), 0),
    pendingClaims: claims.filter((c: any) => c.status === 'submitted' || c.status === 'draft').length,
    totalAccrued: accruals.reduce((s: number, a: any) => s + Number(a.accrued_amount || 0), 0),
  }), [agreements, claims, accruals]);

  const getAgreementName = (id: string) => { const a = agreements.find((ag: any) => ag.id === id); return a ? `${a.supplier_name} (${a.rebate_type})` : id?.slice(0, 8); };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Percent className="h-6 w-6" /> Supplier Rebate & Incentive Management</h1>
          <p className="text-sm text-muted-foreground">Track rebate agreements, accruals, claims, and settlements</p>
        </div>
      </div>

      <Tabs defaultValue="agreements" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="agreements" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Rebate Agreements</TabsTrigger>
          <TabsTrigger value="accruals" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Accrual Dashboard</TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Claim Register</TabsTrigger>
          <TabsTrigger value="settlement" className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Settlement Review</TabsTrigger>
        </TabsList>

        {/* Agreements */}
        <TabsContent value="agreements" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active Agreements</div><div className="text-2xl font-bold">{stats.activeAgreements}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Earned</div><div className="text-xl font-bold text-green-600">{stats.totalEarned.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Claimed</div><div className="text-xl font-bold">{stats.totalClaimed.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Settled</div><div className="text-xl font-bold">{stats.totalSettled.toLocaleString()} SAR</div></CardContent></Card>
          </div>
          <div className="flex justify-end"><Button onClick={() => setAgreementDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Agreement</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Threshold</TableHead><TableHead>Rate</TableHead><TableHead>Retroactive</TableHead><TableHead>Earned</TableHead><TableHead>Claimed</TableHead><TableHead>Settled</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {agreements.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{a.supplier_name}</TableCell>
                    <TableCell><Badge variant="outline">{a.rebate_type}</Badge></TableCell>
                    <TableCell className="text-xs">{a.start_date} → {a.end_date}</TableCell>
                    <TableCell className="text-xs">{Number(a.volume_threshold || a.value_threshold || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-bold">{a.rebate_percentage}%</TableCell>
                    <TableCell>{a.is_retroactive ? <Badge variant="secondary">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                    <TableCell className="text-sm text-green-600">{Number(a.total_earned || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(a.total_claimed || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(a.total_settled || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={a.status === 'active' ? 'default' : a.status === 'expired' ? 'secondary' : 'outline'}>{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {agreements.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No rebate agreements</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Accruals */}
        <TabsContent value="accruals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Accrued</div><div className="text-2xl font-bold">{stats.totalAccrued.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Unclaimed (Earned - Claimed)</div><div className="text-2xl font-bold text-orange-600">{(stats.totalEarned - stats.totalClaimed).toLocaleString()} SAR</div></CardContent></Card>
          </div>
          <div className="flex justify-end"><Button onClick={() => setAccrualDialog(true)}><Plus className="h-4 w-4 mr-2" /> Record Accrual</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Agreement</TableHead><TableHead>Period</TableHead><TableHead>Eligible Spend</TableHead><TableHead>Accrued</TableHead><TableHead>Cumulative Spend</TableHead><TableHead>Cumulative Accrual</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {accruals.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{getAgreementName(a.agreement_id)}</TableCell>
                    <TableCell className="text-xs font-medium">{a.period}</TableCell>
                    <TableCell className="text-sm">{Number(a.eligible_spend || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold text-green-600">{Number(a.accrued_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(a.cumulative_spend || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(a.cumulative_accrual || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={a.status === 'posted' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {accruals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No accruals recorded</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Claims */}
        <TabsContent value="claims" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setClaimDialog(true)}><Plus className="h-4 w-4 mr-2" /> Create Claim</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Claim #</TableHead><TableHead>Agreement</TableHead><TableHead>Period</TableHead><TableHead>Eligible Spend</TableHead><TableHead>Claimed</TableHead><TableHead>Approved</TableHead><TableHead>Settled</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {claims.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.claim_number}</TableCell>
                    <TableCell className="text-xs">{getAgreementName(c.agreement_id)}</TableCell>
                    <TableCell className="text-xs">{c.period_from} → {c.period_to}</TableCell>
                    <TableCell className="text-sm">{Number(c.eligible_spend || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(c.claimed_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-green-600">{Number(c.approved_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(c.settled_amount || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={c.status === 'settled' ? 'default' : c.status === 'approved' ? 'secondary' : c.status === 'submitted' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell>
                    <TableCell>{(c.status === 'submitted' || c.status === 'draft') && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approveClaim.mutate(c.id)}>Approve</Button>}</TableCell>
                  </TableRow>
                ))}
                {claims.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No claims</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Settlement Review */}
        <TabsContent value="settlement" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Settlement Summary by Agreement</CardTitle></CardHeader><CardContent>
            {agreements.filter((a: any) => Number(a.total_claimed || 0) > 0).map((a: any) => {
              const earned = Number(a.total_earned || 0);
              const claimed = Number(a.total_claimed || 0);
              const settled = Number(a.total_settled || 0);
              const pct = earned > 0 ? Math.round((settled / earned) * 100) : 0;
              return (
                <div key={a.id} className="py-3 border-b last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div><p className="text-sm font-medium">{a.supplier_name}</p><p className="text-xs text-muted-foreground">{a.rebate_type} · {a.start_date} → {a.end_date}</p></div>
                    <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs mb-2">
                    <div><span className="text-muted-foreground">Earned:</span> <span className="font-bold">{earned.toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Claimed:</span> <span className="font-bold">{claimed.toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Settled:</span> <span className="font-bold text-green-600">{settled.toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-bold text-orange-600">{(earned - settled).toLocaleString()}</span></div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
            {agreements.filter((a: any) => Number(a.total_claimed || 0) > 0).length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No settlements to review</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Agreement Dialog */}
      <Dialog open={agreementDialog} onOpenChange={setAgreementDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Rebate Agreement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Supplier Name *</Label><Input value={agForm.supplier_name} onChange={e => setAgForm({ ...agForm, supplier_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Rebate Type</Label><Select value={agForm.rebate_type} onValueChange={v => setAgForm({ ...agForm, rebate_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REBATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Rebate % *</Label><Input type="number" step="0.1" value={agForm.rebate_percentage} onChange={e => setAgForm({ ...agForm, rebate_percentage: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date *</Label><Input type="date" value={agForm.start_date} onChange={e => setAgForm({ ...agForm, start_date: e.target.value })} /></div>
              <div><Label>End Date *</Label><Input type="date" value={agForm.end_date} onChange={e => setAgForm({ ...agForm, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Volume Threshold</Label><Input type="number" value={agForm.volume_threshold} onChange={e => setAgForm({ ...agForm, volume_threshold: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={agForm.is_retroactive} onChange={e => setAgForm({ ...agForm, is_retroactive: e.target.checked })} className="rounded" />
              <Label>Retroactive rebate (applies to all spend once threshold is met)</Label>
            </div>
            <div><Label>Notes</Label><Textarea value={agForm.notes} onChange={e => setAgForm({ ...agForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAgreementDialog(false)}>Cancel</Button><Button onClick={() => createAgreement.mutate(agForm)} disabled={!agForm.supplier_name || !agForm.start_date || !agForm.end_date}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accrual Dialog */}
      <Dialog open={accrualDialog} onOpenChange={setAccrualDialog}>
        <DialogContent><DialogHeader><DialogTitle>Record Rebate Accrual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Agreement *</Label><Select value={accForm.agreement_id} onValueChange={v => setAccForm({ ...accForm, agreement_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{agreements.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.supplier_name} ({a.rebate_type})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Period *</Label><Input value={accForm.period} onChange={e => setAccForm({ ...accForm, period: e.target.value })} placeholder="e.g. 2026-03" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Eligible Spend</Label><Input type="number" value={accForm.eligible_spend} onChange={e => setAccForm({ ...accForm, eligible_spend: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Accrued Amount *</Label><Input type="number" value={accForm.accrued_amount} onChange={e => setAccForm({ ...accForm, accrued_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAccrualDialog(false)}>Cancel</Button><Button onClick={() => createAccrual.mutate(accForm)} disabled={!accForm.agreement_id || !accForm.period}>Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Dialog */}
      <Dialog open={claimDialog} onOpenChange={setClaimDialog}>
        <DialogContent><DialogHeader><DialogTitle>Create Rebate Claim</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Agreement *</Label><Select value={clForm.agreement_id} onValueChange={v => setClForm({ ...clForm, agreement_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{agreements.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.supplier_name} ({a.rebate_type})</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Period From</Label><Input value={clForm.period_from} onChange={e => setClForm({ ...clForm, period_from: e.target.value })} placeholder="e.g. 2026-01" /></div>
              <div><Label>Period To</Label><Input value={clForm.period_to} onChange={e => setClForm({ ...clForm, period_to: e.target.value })} placeholder="e.g. 2026-03" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Eligible Spend</Label><Input type="number" value={clForm.eligible_spend} onChange={e => setClForm({ ...clForm, eligible_spend: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Claimed Amount *</Label><Input type="number" value={clForm.claimed_amount} onChange={e => setClForm({ ...clForm, claimed_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={clForm.notes} onChange={e => setClForm({ ...clForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setClaimDialog(false)}>Cancel</Button><Button onClick={() => createClaim.mutate(clForm)} disabled={!clForm.agreement_id || !clForm.claimed_amount}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
