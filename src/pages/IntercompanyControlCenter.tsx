import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Building2, LayoutDashboard, AlertTriangle, Scale, CheckSquare, Eraser, DollarSign, MessageSquare, Search, Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';

const MISMATCH_TYPES = ['missing_mirror', 'amount_diff', 'unmatched_balance', 'timing_diff'];
const DISPUTE_TYPES = ['pricing', 'quantity', 'timing', 'missing_document'];
const ELIMINATION_TYPES = ['revenue_expense', 'profit_inventory', 'balance', 'dividend'];

export default function IntercompanyControlCenter() {
  const { t, language } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch companies for dropdowns
  const { data: companies = [] } = useQuery({
    queryKey: ['sap-companies-ic'],
    queryFn: async () => { const { data } = await supabase.from('sap_companies').select('id, company_name').eq('is_active', true); return data || []; },
  });

  // Fetch IC transactions
  const { data: icTransactions = [] } = useQuery({
    queryKey: ['ic-transactions-ctrl', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ic_transactions' as any).select('*').order('created_at', { ascending: false }).limit(200);
      const { data } = await (q as any);
      return (data || []) as any[];
    },
  });

  // Fetch mismatches
  const { data: mismatches = [] } = useQuery({
    queryKey: ['ic-mismatches', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('ic_mismatches' as any).select('*') as any).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // Fetch reconciliation items
  const { data: reconItems = [] } = useQuery({
    queryKey: ['ic-reconciliation', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('ic_reconciliation_items' as any).select('*') as any).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // Fetch disputes
  const { data: disputes = [] } = useQuery({
    queryKey: ['ic-disputes', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('ic_disputes' as any).select('*') as any).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // Fetch elimination entries
  const { data: eliminations = [] } = useQuery({
    queryKey: ['ic-eliminations', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('ic_elimination_entries' as any).select('*') as any).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  // Fetch IC transfer pricing rules
  const { data: pricingRules = [] } = useQuery({
    queryKey: ['ic-pricing-rules'],
    queryFn: async () => {
      const { data } = await (supabase.from('ic_transfer_pricing_rules' as any).select('*') as any).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const getCompanyName = (id: string) => companies.find((c: any) => c.id === id)?.company_name || id?.slice(0, 8);

  // States
  const [mismatchDialog, setMismatchDialog] = useState(false);
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [eliminationDialog, setEliminationDialog] = useState(false);
  const [mForm, setMForm] = useState({ source_company_id: '', target_company_id: '', mismatch_type: '', source_document_number: '', source_amount: 0, target_amount: 0, severity: 'medium' });
  const [dForm, setDForm] = useState({ source_company_id: '', target_company_id: '', dispute_type: '', title: '', description: '', amount_in_dispute: 0, priority: 'medium' });
  const [eForm, setEForm] = useState({ source_company_id: '', target_company_id: '', elimination_type: '', debit_account: '', credit_account: '', amount: 0, period: '', notes: '' });

  // Mutations
  const createMismatch = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('ic_mismatches' as any).insert({ ...data, company_id: activeCompanyId, difference: Math.abs(data.source_amount - data.target_amount) }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ic-mismatches'] }); setMismatchDialog(false); toast({ title: 'Mismatch Logged' }); },
  });

  const resolveMismatch = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      await (supabase.from('ic_mismatches' as any).update({ status: 'resolved', resolution_notes: notes, resolved_by: user?.id, resolved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ic-mismatches'] }); toast({ title: 'Mismatch Resolved' }); },
  });

  const createDispute = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('ic_disputes' as any).insert({ ...data, company_id: activeCompanyId, raised_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ic-disputes'] }); setDisputeDialog(false); toast({ title: 'Dispute Created' }); },
  });

  const resolveDispute = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      await (supabase.from('ic_disputes' as any).update({ status: 'resolved', resolution, resolved_by: user?.id, resolved_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ic-disputes'] }); toast({ title: 'Dispute Resolved' }); },
  });

  const createElimination = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('ic_elimination_entries' as any).insert({ ...data, company_id: activeCompanyId, created_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ic-eliminations'] }); setEliminationDialog(false); toast({ title: 'Elimination Entry Created' }); },
  });

  const postElimination = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('ic_elimination_entries' as any).update({ status: 'posted', posted_by: user?.id, posted_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ic-eliminations'] }); toast({ title: 'Entry Posted' }); },
  });

  // Stats
  const stats = useMemo(() => ({
    openMismatches: mismatches.filter((m: any) => m.status === 'open').length,
    totalDifference: mismatches.filter((m: any) => m.status === 'open').reduce((s: number, m: any) => s + Number(m.difference || 0), 0),
    openDisputes: disputes.filter((d: any) => d.status === 'open' || d.status === 'under_review').length,
    disputeAmount: disputes.filter((d: any) => d.status !== 'resolved' && d.status !== 'closed').reduce((s: number, d: any) => s + Number(d.amount_in_dispute || 0), 0),
    unmatchedRecon: reconItems.filter((r: any) => r.status === 'unmatched').length,
    pendingEliminations: eliminations.filter((e: any) => e.status === 'draft' || e.status === 'reviewed').length,
    totalTransactions: icTransactions.length,
  }), [mismatches, disputes, reconItems, eliminations, icTransactions]);

  const sevColor = (s: string) => s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : 'secondary';

  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [disputeResolveId, setDisputeResolveId] = useState<string | null>(null);
  const [disputeResolution, setDisputeResolution] = useState('');

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building2 className="h-6 w-6" /> Intercompany Control Center</h1>
          <p className="text-muted-foreground text-sm">Monitor, reconcile, and resolve intercompany issues across entities</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="mismatches" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Mismatches</TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5"><Scale className="h-3.5 w-3.5" /> Reconciliation</TabsTrigger>
          <TabsTrigger value="approval" className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Transaction Approval</TabsTrigger>
          <TabsTrigger value="elimination" className="gap-1.5"><Eraser className="h-3.5 w-3.5" /> Elimination Review</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Transfer Pricing</TabsTrigger>
          <TabsTrigger value="disputes" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Disputes</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-destructive"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Open Mismatches</div><div className="text-2xl font-bold text-destructive">{stats.openMismatches}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Mismatch Amount</div><div className="text-2xl font-bold">{stats.totalDifference.toLocaleString()} SAR</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Open Disputes</div><div className="text-2xl font-bold text-orange-600">{stats.openDisputes}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Pending Eliminations</div><div className="text-2xl font-bold">{stats.pendingEliminations}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Mismatches by Type</CardTitle></CardHeader><CardContent>
              {MISMATCH_TYPES.map(type => {
                const cnt = mismatches.filter((m: any) => m.mismatch_type === type && m.status === 'open').length;
                return (
                  <div key={type} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                    <Badge variant={cnt > 0 ? 'destructive' : 'outline'}>{cnt}</Badge>
                  </div>
                );
              })}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Recent IC Transactions</CardTitle></CardHeader><CardContent>
              {icTransactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><p className="text-sm font-medium">{tx.transaction_number}</p><p className="text-xs text-muted-foreground">{tx.document_type} · {tx.status}</p></div>
                  <span className="text-sm font-bold">{Number(tx.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              {icTransactions.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No transactions</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* ── Mismatches ── */}
        <TabsContent value="mismatches" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setMismatchDialog(true)}><Plus className="h-4 w-4 mr-2" /> Log Mismatch</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Source Entity</TableHead><TableHead>Target Entity</TableHead><TableHead>Source Doc</TableHead><TableHead>Source Amt</TableHead><TableHead>Target Amt</TableHead><TableHead>Difference</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {mismatches.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{m.mismatch_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{getCompanyName(m.source_company_id)}</TableCell>
                    <TableCell className="text-xs">{getCompanyName(m.target_company_id)}</TableCell>
                    <TableCell className="text-xs">{m.source_document_number || '-'}</TableCell>
                    <TableCell className="text-xs">{Number(m.source_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{Number(m.target_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-bold text-destructive">{Number(m.difference).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={sevColor(m.severity) as any}>{m.severity}</Badge></TableCell>
                    <TableCell><Badge variant={m.status === 'open' ? 'destructive' : 'default'}>{m.status}</Badge></TableCell>
                    <TableCell>{m.status === 'open' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResolveId(m.id); setResolveNotes(''); }}>Resolve</Button>}</TableCell>
                  </TableRow>
                ))}
                {mismatches.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No mismatches detected</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Reconciliation ── */}
        <TabsContent value="reconciliation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-destructive"><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Unmatched</div><div className="text-2xl font-bold text-destructive">{stats.unmatchedRecon}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Matched</div><div className="text-2xl font-bold text-green-600">{reconItems.filter((r: any) => r.status === 'matched').length}</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Disputed</div><div className="text-2xl font-bold text-orange-600">{reconItems.filter((r: any) => r.status === 'disputed').length}</div></CardContent></Card>
          </div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Entity A</TableHead><TableHead>Entity B</TableHead><TableHead>Type</TableHead><TableHead>Entity A Balance</TableHead><TableHead>Entity B Balance</TableHead><TableHead>Difference</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {reconItems.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.period}</TableCell>
                    <TableCell className="text-xs">{getCompanyName(r.entity_a_id)}</TableCell>
                    <TableCell className="text-xs">{getCompanyName(r.entity_b_id)}</TableCell>
                    <TableCell><Badge variant="outline">{r.account_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{Number(r.entity_a_balance).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{Number(r.entity_b_balance).toLocaleString()}</TableCell>
                    <TableCell className={`text-xs font-bold ${Number(r.difference) !== 0 ? 'text-destructive' : 'text-green-600'}`}>{Number(r.difference).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={r.status === 'unmatched' ? 'destructive' : r.status === 'matched' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {reconItems.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No reconciliation items</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Transaction Approval ── */}
        <TabsContent value="approval" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Pending IC Transaction Approvals</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Transaction #</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Target</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {icTransactions.filter((tx: any) => tx.status === 'pending' || tx.status === 'draft').map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm font-medium">{tx.transaction_number}</TableCell>
                    <TableCell><Badge variant="outline">{tx.document_type}</Badge></TableCell>
                    <TableCell className="text-xs">{getCompanyName(tx.source_company_id)}</TableCell>
                    <TableCell className="text-xs">{getCompanyName(tx.target_company_id)}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(tx.amount || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary">{tx.status}</Badge></TableCell>
                    <TableCell className="text-xs">{tx.created_at ? format(new Date(tx.created_at), 'MMM dd') : ''}</TableCell>
                  </TableRow>
                ))}
                {icTransactions.filter((tx: any) => tx.status === 'pending' || tx.status === 'draft').length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending approvals</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Elimination Review ── */}
        <TabsContent value="elimination" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setEliminationDialog(true)}><Plus className="h-4 w-4 mr-2" /> Create Elimination</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Target</TableHead><TableHead>Debit Acct</TableHead><TableHead>Credit Acct</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {eliminations.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-medium">{e.period}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{e.elimination_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{getCompanyName(e.source_company_id)}</TableCell>
                    <TableCell className="text-xs">{getCompanyName(e.target_company_id)}</TableCell>
                    <TableCell className="text-xs">{e.debit_account}</TableCell>
                    <TableCell className="text-xs">{e.credit_account}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={e.status === 'posted' ? 'default' : e.status === 'reviewed' ? 'secondary' : 'outline'}>{e.status}</Badge></TableCell>
                    <TableCell>{(e.status === 'draft' || e.status === 'reviewed') && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => postElimination.mutate(e.id)}>Post</Button>}</TableCell>
                  </TableRow>
                ))}
                {eliminations.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No elimination entries</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Transfer Pricing Review ── */}
        <TabsContent value="pricing" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Transfer Pricing Rules</CardTitle></CardHeader><CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Rule Name</TableHead><TableHead>Pricing Method</TableHead><TableHead>Markup %</TableHead><TableHead>Fixed Price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {pricingRules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.pricing_method}</Badge></TableCell>
                    <TableCell>{r.markup_percentage ? `${r.markup_percentage}%` : '-'}</TableCell>
                    <TableCell>{r.fixed_price ? Number(r.fixed_price).toLocaleString() : '-'}</TableCell>
                    <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
                {pricingRules.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pricing rules configured. Use the Intercompany Transactions module to set up rules.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── Disputes ── */}
        <TabsContent value="disputes" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setDisputeDialog(true)}><Plus className="h-4 w-4 mr-2" /> Raise Dispute</Button></div>
          <Card><CardContent className="pt-4 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead><TableHead>Target</TableHead><TableHead>Amount</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {disputes.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell><p className="text-sm font-medium truncate max-w-[200px]">{d.title}</p></TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{d.dispute_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{getCompanyName(d.source_company_id)}</TableCell>
                    <TableCell className="text-xs">{getCompanyName(d.target_company_id)}</TableCell>
                    <TableCell className="text-sm font-bold">{Number(d.amount_in_dispute).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={d.priority === 'high' ? 'destructive' : 'secondary'}>{d.priority}</Badge></TableCell>
                    <TableCell><Badge variant={d.status === 'open' ? 'destructive' : d.status === 'resolved' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                    <TableCell>{(d.status === 'open' || d.status === 'under_review') && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setDisputeResolveId(d.id); setDisputeResolution(''); }}>Resolve</Button>}</TableCell>
                  </TableRow>
                ))}
                {disputes.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No disputes</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* ── Log Mismatch Dialog ── */}
      <Dialog open={mismatchDialog} onOpenChange={setMismatchDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Intercompany Mismatch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Source Entity *</Label><Select value={mForm.source_company_id} onValueChange={v => setMForm({ ...mForm, source_company_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Entity *</Label><Select value={mForm.target_company_id} onValueChange={v => setMForm({ ...mForm, target_company_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Mismatch Type *</Label><Select value={mForm.mismatch_type} onValueChange={v => setMForm({ ...mForm, mismatch_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{MISMATCH_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Source Document #</Label><Input value={mForm.source_document_number} onChange={e => setMForm({ ...mForm, source_document_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Source Amount</Label><Input type="number" value={mForm.source_amount} onChange={e => setMForm({ ...mForm, source_amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Target Amount</Label><Input type="number" value={mForm.target_amount} onChange={e => setMForm({ ...mForm, target_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMismatchDialog(false)}>Cancel</Button><Button onClick={() => createMismatch.mutate(mForm)} disabled={!mForm.source_company_id || !mForm.target_company_id || !mForm.mismatch_type}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Resolve Mismatch Dialog ── */}
      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Mismatch</DialogTitle></DialogHeader>
          <div><Label>Resolution Notes</Label><Textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Describe how this was resolved" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button><Button onClick={() => { resolveMismatch.mutate({ id: resolveId!, notes: resolveNotes }); setResolveId(null); }}>Resolve</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Raise Dispute Dialog ── */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Raise Intercompany Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={dForm.title} onChange={e => setDForm({ ...dForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Source Entity</Label><Select value={dForm.source_company_id} onValueChange={v => setDForm({ ...dForm, source_company_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Entity</Label><Select value={dForm.target_company_id} onValueChange={v => setDForm({ ...dForm, target_company_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Dispute Type</Label><Select value={dForm.dispute_type} onValueChange={v => setDForm({ ...dForm, dispute_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{DISPUTE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount in Dispute</Label><Input type="number" value={dForm.amount_in_dispute} onChange={e => setDForm({ ...dForm, amount_in_dispute: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Description</Label><Textarea value={dForm.description} onChange={e => setDForm({ ...dForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDisputeDialog(false)}>Cancel</Button><Button onClick={() => createDispute.mutate(dForm)} disabled={!dForm.title}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Resolve Dispute Dialog ── */}
      <Dialog open={!!disputeResolveId} onOpenChange={() => setDisputeResolveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
          <div><Label>Resolution</Label><Textarea value={disputeResolution} onChange={e => setDisputeResolution(e.target.value)} placeholder="Describe the resolution" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setDisputeResolveId(null)}>Cancel</Button><Button onClick={() => { resolveDispute.mutate({ id: disputeResolveId!, resolution: disputeResolution }); setDisputeResolveId(null); }}>Resolve</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Elimination Dialog ── */}
      <Dialog open={eliminationDialog} onOpenChange={setEliminationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Elimination Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Period *</Label><Input value={eForm.period} onChange={e => setEForm({ ...eForm, period: e.target.value })} placeholder="e.g. 2026-03" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Source Entity</Label><Select value={eForm.source_company_id} onValueChange={v => setEForm({ ...eForm, source_company_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Entity</Label><Select value={eForm.target_company_id} onValueChange={v => setEForm({ ...eForm, target_company_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Elimination Type *</Label><Select value={eForm.elimination_type} onValueChange={v => setEForm({ ...eForm, elimination_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ELIMINATION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Debit Account</Label><Input value={eForm.debit_account} onChange={e => setEForm({ ...eForm, debit_account: e.target.value })} /></div>
              <div><Label>Credit Account</Label><Input value={eForm.credit_account} onChange={e => setEForm({ ...eForm, credit_account: e.target.value })} /></div>
            </div>
            <div><Label>Amount *</Label><Input type="number" value={eForm.amount} onChange={e => setEForm({ ...eForm, amount: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Notes</Label><Textarea value={eForm.notes} onChange={e => setEForm({ ...eForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEliminationDialog(false)}>Cancel</Button><Button onClick={() => createElimination.mutate(eForm)} disabled={!eForm.period || !eForm.elimination_type || !eForm.amount}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
