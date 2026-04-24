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
import { Wallet, Plus, LayoutDashboard, FileText, ShieldAlert, ArrowRightLeft, BarChart3 } from 'lucide-react';

export default function BudgetControlCenter() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['budget-lines', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('budget_lines' as any).select('*') as any).order('account_code');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: commitments = [] } = useQuery({
    queryKey: ['budget-commitments', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('budget_commitments' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['budget-overrides', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('budget_overrides' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['budget-transfers', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('budget_transfers' as any).select('*') as any).order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [budgetDialog, setBudgetDialog] = useState(false);
  const [commitDialog, setCommitDialog] = useState(false);
  const [overrideDialog, setOverrideDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);

  const [bForm, setBForm] = useState({ fiscal_year: 2026, period: '', account_code: '', account_name: '', department_name: '', project_name: '', cost_code: '', original_amount: 0, revised_amount: 0, threshold_warning: 80, threshold_block: 100 });
  const [cForm, setCForm] = useState({ budget_line_id: '', commitment_type: 'commitment', source_document_type: '', source_document_number: '', description: '', amount: 0, vendor_name: '' });
  const [oForm, setOForm] = useState({ budget_line_id: '', requested_amount: 0, justification: '', source_document_number: '' });
  const [tForm, setTForm] = useState({ from_budget_line_id: '', to_budget_line_id: '', transfer_amount: 0, reason: '' });

  const createBudgetLine = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('budget_lines' as any).insert({ ...d, revised_amount: d.revised_amount || d.original_amount, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-lines'] }); setBudgetDialog(false); toast({ title: 'Budget Line Created' }); },
  });

  const createCommitment = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('budget_commitments' as any).insert({ ...d, company_id: activeCompanyId, created_by: user?.id }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-commitments'] }); setCommitDialog(false); toast({ title: 'Commitment Created' }); },
  });

  const createOverride = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('budget_overrides' as any).insert({ ...d, company_id: activeCompanyId, requested_by: user?.id, requested_by_name: 'Current User' }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-overrides'] }); setOverrideDialog(false); toast({ title: 'Override Requested' }); },
  });

  const approveOverride = useMutation({
    mutationFn: async (id: string) => { await (supabase.from('budget_overrides' as any).update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }) as any).eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-overrides'] }); toast({ title: 'Override Approved' }); },
  });

  const createTransfer = useMutation({
    mutationFn: async (d: any) => { await (supabase.from('budget_transfers' as any).insert({ ...d, company_id: activeCompanyId, requested_by: user?.id, requested_by_name: 'Current User' }) as any); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-transfers'] }); setTransferDialog(false); toast({ title: 'Transfer Requested' }); },
  });

  const approveTransfer = useMutation({
    mutationFn: async (id: string) => { await (supabase.from('budget_transfers' as any).update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }) as any).eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-transfers'] }); toast({ title: 'Transfer Approved' }); },
  });

  const stats = useMemo(() => {
    const totalBudget = budgetLines.reduce((s: number, b: any) => s + Number(b.revised_amount || 0), 0);
    const totalCommitted = budgetLines.reduce((s: number, b: any) => s + Number(b.committed_amount || 0), 0);
    const totalActual = budgetLines.reduce((s: number, b: any) => s + Number(b.actual_amount || 0), 0);
    const totalAvailable = budgetLines.reduce((s: number, b: any) => s + Number(b.available_amount || 0), 0);
    const overBudget = budgetLines.filter((b: any) => Number(b.utilization_pct || 0) >= Number(b.threshold_block || 100)).length;
    const warning = budgetLines.filter((b: any) => Number(b.utilization_pct || 0) >= Number(b.threshold_warning || 80) && Number(b.utilization_pct || 0) < Number(b.threshold_block || 100)).length;
    return { totalBudget, totalCommitted, totalActual, totalAvailable, overBudget, warning, pendingOverrides: overrides.filter((o: any) => o.status === 'pending').length };
  }, [budgetLines, overrides]);

  const utilColor = (pct: number, warn: number, block: number) => pct >= block ? 'text-destructive' : pct >= warn ? 'text-orange-600' : 'text-green-600';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" /> Budget Control & Commitment Management</h1>
          <p className="text-sm text-muted-foreground">Pre-commitment, commitment, actual, and forecast budget tracking</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="commitments" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Commitment Register</TabsTrigger>
          <TabsTrigger value="blocked" className="gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Blocked / Over Budget</TabsTrigger>
          <TabsTrigger value="overrides" className="gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Override Approvals</TabsTrigger>
          <TabsTrigger value="variance" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Variance Drill-Down</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Budget</div><div className="text-xl font-bold">{stats.totalBudget.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Committed</div><div className="text-xl font-bold">{stats.totalCommitted.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Actual</div><div className="text-xl font-bold">{stats.totalActual.toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Available</div><div className="text-xl font-bold text-green-600">{stats.totalAvailable.toLocaleString()}</div></CardContent></Card>
            <Card className="border-destructive"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Over Budget</div><div className="text-xl font-bold text-destructive">{stats.overBudget}</div></CardContent></Card>
          </div>
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Budget Lines</h3>
            <div className="flex gap-2">
              <Button onClick={() => setBudgetDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Budget Line</Button>
              <Button variant="outline" onClick={() => setTransferDialog(true)}><ArrowRightLeft className="h-4 w-4 mr-2" /> Transfer</Button>
            </div>
          </div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Department</TableHead><TableHead>Project</TableHead><TableHead>Period</TableHead><TableHead>Budget</TableHead><TableHead>Committed</TableHead><TableHead>Actual</TableHead><TableHead>Available</TableHead><TableHead>Utilization</TableHead></TableRow></TableHeader>
              <TableBody>
                {budgetLines.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell><div><p className="text-sm font-medium">{b.account_code}</p><p className="text-xs text-muted-foreground">{b.account_name}</p></div></TableCell>
                    <TableCell className="text-xs">{b.department_name || '-'}</TableCell>
                    <TableCell className="text-xs">{b.project_name || '-'}</TableCell>
                    <TableCell className="text-xs">{b.period || 'Annual'}</TableCell>
                    <TableCell className="text-sm">{Number(b.revised_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(b.committed_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(b.actual_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className={`text-sm font-bold ${Number(b.available_amount || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>{Number(b.available_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(Number(b.utilization_pct || 0), 100)} className="w-16 h-2" />
                        <span className={`text-xs font-bold ${utilColor(Number(b.utilization_pct || 0), Number(b.threshold_warning || 80), Number(b.threshold_block || 100))}`}>{Number(b.utilization_pct || 0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {budgetLines.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No budget lines</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Commitments */}
        <TabsContent value="commitments" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setCommitDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Commitment</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Document</TableHead><TableHead>Description</TableHead><TableHead>Vendor</TableHead><TableHead>Amount</TableHead><TableHead>Released</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {commitments.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline">{c.commitment_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{c.source_document_number || '-'}</TableCell>
                    <TableCell className="text-xs">{c.description}</TableCell>
                    <TableCell className="text-xs">{c.vendor_name || '-'}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(c.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(c.released_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{Number(c.balance || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={c.status === 'active' ? 'default' : c.status === 'fully_released' ? 'secondary' : 'outline'}>{c.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  </TableRow>
                ))}
                {commitments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No commitments</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Blocked */}
        <TabsContent value="blocked" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Budget Lines at or Over Threshold</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Department</TableHead><TableHead>Budget</TableHead><TableHead>Used</TableHead><TableHead>Available</TableHead><TableHead>Utilization</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {budgetLines.filter((b: any) => Number(b.utilization_pct || 0) >= Number(b.threshold_warning || 80)).map((b: any) => {
                  const pct = Number(b.utilization_pct || 0);
                  const blocked = pct >= Number(b.threshold_block || 100);
                  return (
                    <TableRow key={b.id}>
                      <TableCell><p className="text-sm font-medium">{b.account_code} - {b.account_name}</p></TableCell>
                      <TableCell className="text-xs">{b.department_name || '-'}</TableCell>
                      <TableCell className="text-sm">{Number(b.revised_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{(Number(b.committed_amount || 0) + Number(b.actual_amount || 0)).toLocaleString()}</TableCell>
                      <TableCell className={`text-sm font-bold ${Number(b.available_amount || 0) < 0 ? 'text-destructive' : ''}`}>{Number(b.available_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className={`font-bold ${utilColor(pct, Number(b.threshold_warning), Number(b.threshold_block))}`}>{pct}%</TableCell>
                      <TableCell><Badge variant={blocked ? 'destructive' : 'secondary'}>{blocked ? 'Blocked' : 'Warning'}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {budgetLines.filter((b: any) => Number(b.utilization_pct || 0) >= Number(b.threshold_warning || 80)).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No budget lines at threshold</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
          <div className="flex justify-end"><Button variant="outline" onClick={() => setOverrideDialog(true)}><ShieldAlert className="h-4 w-4 mr-2" /> Request Override</Button></div>
        </TabsContent>

        {/* Overrides */}
        <TabsContent value="overrides" className="space-y-4">
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Amount</TableHead><TableHead>Justification</TableHead><TableHead>Requested By</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {overrides.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{o.source_document_number || '-'}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(o.requested_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{o.justification}</TableCell>
                    <TableCell className="text-xs">{o.requested_by_name || '-'}</TableCell>
                    <TableCell><Badge variant={o.status === 'pending' ? 'secondary' : o.status === 'approved' ? 'default' : 'destructive'}>{o.status}</Badge></TableCell>
                    <TableCell>{o.status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approveOverride.mutate(o.id)}>Approve</Button>}</TableCell>
                  </TableRow>
                ))}
                {overrides.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No override requests</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Variance */}
        <TabsContent value="variance" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Budget vs Actual Variance</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Department</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead><TableHead>Variance</TableHead><TableHead>Variance %</TableHead></TableRow></TableHeader>
              <TableBody>
                {budgetLines.map((b: any) => {
                  const budget = Number(b.revised_amount || 0);
                  const actual = Number(b.actual_amount || 0);
                  const variance = budget - actual;
                  const variancePct = budget > 0 ? ((variance / budget) * 100).toFixed(1) : '0';
                  return (
                    <TableRow key={b.id}>
                      <TableCell><p className="text-sm font-medium">{b.account_code} - {b.account_name}</p></TableCell>
                      <TableCell className="text-xs">{b.department_name || '-'}</TableCell>
                      <TableCell className="text-sm">{budget.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{actual.toLocaleString()}</TableCell>
                      <TableCell className={`text-sm font-bold ${variance < 0 ? 'text-destructive' : 'text-green-600'}`}>{variance.toLocaleString()}</TableCell>
                      <TableCell className={`text-xs font-bold ${variance < 0 ? 'text-destructive' : 'text-green-600'}`}>{variancePct}%</TableCell>
                    </TableRow>
                  );
                })}
                {budgetLines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No budget data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* Transfers */}
          <Card><CardHeader><CardTitle className="text-sm">Budget Transfers</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>From → To</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {transfers.map((t: any) => {
                  const fromLine = budgetLines.find((b: any) => b.id === t.from_budget_line_id);
                  const toLine = budgetLines.find((b: any) => b.id === t.to_budget_line_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{fromLine?.account_code || '?'} → {toLine?.account_code || '?'}</TableCell>
                      <TableCell className="text-sm font-bold">{Number(t.transfer_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{t.reason}</TableCell>
                      <TableCell><Badge variant={t.status === 'pending' ? 'secondary' : t.status === 'approved' ? 'default' : 'outline'}>{t.status}</Badge></TableCell>
                      <TableCell>{t.status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approveTransfer.mutate(t.id)}>Approve</Button>}</TableCell>
                    </TableRow>
                  );
                })}
                {transfers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No transfers</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Budget Line Dialog */}
      <Dialog open={budgetDialog} onOpenChange={setBudgetDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Budget Line</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fiscal Year *</Label><Input type="number" value={bForm.fiscal_year} onChange={e => setBForm({ ...bForm, fiscal_year: parseInt(e.target.value) || 2026 })} /></div>
              <div><Label>Period</Label><Input value={bForm.period} onChange={e => setBForm({ ...bForm, period: e.target.value })} placeholder="e.g. 2026-01 or annual" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Account Code *</Label><Input value={bForm.account_code} onChange={e => setBForm({ ...bForm, account_code: e.target.value })} /></div>
              <div><Label>Account Name</Label><Input value={bForm.account_name} onChange={e => setBForm({ ...bForm, account_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Department</Label><Input value={bForm.department_name} onChange={e => setBForm({ ...bForm, department_name: e.target.value })} /></div>
              <div><Label>Project</Label><Input value={bForm.project_name} onChange={e => setBForm({ ...bForm, project_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Original Amount *</Label><Input type="number" value={bForm.original_amount} onChange={e => setBForm({ ...bForm, original_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Revised Amount</Label><Input type="number" value={bForm.revised_amount} onChange={e => setBForm({ ...bForm, revised_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Warning Threshold %</Label><Input type="number" value={bForm.threshold_warning} onChange={e => setBForm({ ...bForm, threshold_warning: parseFloat(e.target.value) || 80 })} /></div>
              <div><Label>Block Threshold %</Label><Input type="number" value={bForm.threshold_block} onChange={e => setBForm({ ...bForm, threshold_block: parseFloat(e.target.value) || 100 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBudgetDialog(false)}>Cancel</Button><Button onClick={() => createBudgetLine.mutate(bForm)} disabled={!bForm.account_code || !bForm.original_amount}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commitment Dialog */}
      <Dialog open={commitDialog} onOpenChange={setCommitDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Commitment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Budget Line *</Label><Select value={cForm.budget_line_id} onValueChange={v => setCForm({ ...cForm, budget_line_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{budgetLines.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.account_code} - {b.account_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label><Select value={cForm.commitment_type} onValueChange={v => setCForm({ ...cForm, commitment_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pre_commitment">Pre-Commitment</SelectItem><SelectItem value="commitment">Commitment</SelectItem></SelectContent></Select></div>
              <div><Label>Amount *</Label><Input type="number" value={cForm.amount} onChange={e => setCForm({ ...cForm, amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Document #</Label><Input value={cForm.source_document_number} onChange={e => setCForm({ ...cForm, source_document_number: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={cForm.description} onChange={e => setCForm({ ...cForm, description: e.target.value })} /></div>
            <div><Label>Vendor</Label><Input value={cForm.vendor_name} onChange={e => setCForm({ ...cForm, vendor_name: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCommitDialog(false)}>Cancel</Button><Button onClick={() => createCommitment.mutate(cForm)} disabled={!cForm.budget_line_id || !cForm.amount}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={overrideDialog} onOpenChange={setOverrideDialog}>
        <DialogContent><DialogHeader><DialogTitle>Request Budget Override</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Budget Line *</Label><Select value={oForm.budget_line_id} onValueChange={v => setOForm({ ...oForm, budget_line_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{budgetLines.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.account_code} - {b.account_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Requested Amount *</Label><Input type="number" value={oForm.requested_amount} onChange={e => setOForm({ ...oForm, requested_amount: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Document #</Label><Input value={oForm.source_document_number} onChange={e => setOForm({ ...oForm, source_document_number: e.target.value })} /></div>
            <div><Label>Justification *</Label><Textarea value={oForm.justification} onChange={e => setOForm({ ...oForm, justification: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOverrideDialog(false)}>Cancel</Button><Button onClick={() => createOverride.mutate(oForm)} disabled={!oForm.budget_line_id || !oForm.justification}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent><DialogHeader><DialogTitle>Request Budget Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>From Budget Line *</Label><Select value={tForm.from_budget_line_id} onValueChange={v => setTForm({ ...tForm, from_budget_line_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{budgetLines.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.account_code} - {b.account_name} (Avail: {Number(b.available_amount || 0).toLocaleString()})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>To Budget Line *</Label><Select value={tForm.to_budget_line_id} onValueChange={v => setTForm({ ...tForm, to_budget_line_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{budgetLines.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.account_code} - {b.account_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Transfer Amount *</Label><Input type="number" value={tForm.transfer_amount} onChange={e => setTForm({ ...tForm, transfer_amount: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Reason *</Label><Textarea value={tForm.reason} onChange={e => setTForm({ ...tForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTransferDialog(false)}>Cancel</Button><Button onClick={() => createTransfer.mutate(tForm)} disabled={!tForm.from_budget_line_id || !tForm.to_budget_line_id || !tForm.transfer_amount}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
