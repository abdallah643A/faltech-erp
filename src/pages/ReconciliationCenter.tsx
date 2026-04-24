import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Search, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const MISMATCH_TYPES = [
  { value: 'quote_vs_order', label: 'Quote vs Order' },
  { value: 'order_vs_delivery', label: 'Order vs Delivery' },
  { value: 'delivery_vs_invoice', label: 'Delivery vs Invoice' },
  { value: 'po_vs_grpo', label: 'PO vs GRPO' },
  { value: 'header_vs_lines', label: 'Header vs Lines Total' },
  { value: 'payroll_vs_payslip', label: 'Payroll vs Payslips' },
  { value: 'billing_vs_invoice', label: 'Project Billing vs AR Invoice' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(0 84% 60%)', 'hsl(45 93% 47%)', 'hsl(142 76% 36%)'];

export default function ReconciliationCenter() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [scanning, setScanning] = useState(false);

  const { data: mismatches = [] } = useQuery({
    queryKey: ['reconciliation-mismatches', activeCompanyId, typeFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from('reconciliation_mismatches' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (typeFilter !== 'all') q = q.eq('mismatch_type', typeFilter);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  // Run scan: check header vs line totals for AR invoices
  const runScan = async () => {
    setScanning(true);
    try {
      let q = supabase.from('ar_invoices').select('id, doc_num, customer_name, total, subtotal') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data: invoices } = await q;
      let found = 0;
      for (const inv of (invoices || [])) {
        const { data: lines } = await supabase.from('ar_invoice_lines').select('line_total').eq('invoice_id', inv.id);
        const lineTotal = (lines || []).reduce((s: number, l: any) => s + Number(l.line_total || 0), 0);
        const diff = Math.abs(Number(inv.subtotal || inv.total || 0) - lineTotal);
        if (diff > 0.01) {
          await (supabase.from('reconciliation_mismatches' as any).insert({
            mismatch_type: 'header_vs_lines', source_table: 'ar_invoices', source_id: inv.id,
            source_ref: `INV-${inv.doc_num}`, source_amount: Number(inv.subtotal || inv.total || 0),
            target_amount: lineTotal, difference: diff, severity: diff > 1000 ? 'high' : 'medium',
            ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
          }) as any);
          found++;
        }
      }
      toast.success(`Scan complete. Found ${found} mismatches.`);
      qc.invalidateQueries({ queryKey: ['reconciliation-mismatches'] });
    } finally { setScanning(false); }
  };

  const resolve = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from('reconciliation_mismatches' as any).update({ status: 'resolved', resolved_by: user?.id, resolved_at: new Date().toISOString(), resolution_notes: notes }).eq('id', resolveId) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reconciliation-mismatches'] }); setResolveId(null); setNotes(''); toast.success('Resolved'); },
  });

  const byType = MISMATCH_TYPES.map(t => ({ name: t.label, count: mismatches.filter((m: any) => m.mismatch_type === t.value).length })).filter(t => t.count > 0);
  const bySeverity = ['high', 'medium', 'low'].map(s => ({ name: s, value: mismatches.filter((m: any) => m.severity === s).length })).filter(s => s.value > 0);
  const openCount = mismatches.filter((m: any) => m.status === 'open').length;
  const totalDiff = mismatches.reduce((s: number, m: any) => s + Math.abs(Number(m.difference || 0)), 0);

  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconciliation Center</h1>
          <p className="text-muted-foreground">Detect and resolve document mismatches across modules</p>
        </div>
        <Button onClick={runScan} disabled={scanning}><RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />Run Scan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-500" /><div><p className="text-sm text-muted-foreground">Open Mismatches</p><p className="text-2xl font-bold">{openCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-orange-500" /><div><p className="text-sm text-muted-foreground">Total Difference</p><p className="text-2xl font-bold">{fmt(totalDiff)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Search className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">Types Detected</p><p className="text-2xl font-bold">{byType.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{mismatches.filter((m: any) => m.status === 'resolved').length}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>By Type</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>By Severity</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart><Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {bySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mismatches</CardTitle>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{MISMATCH_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('common.type')}</TableHead><TableHead>Source</TableHead><TableHead>Source Amt</TableHead><TableHead>Target Amt</TableHead><TableHead>Difference</TableHead><TableHead>Severity</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {mismatches.slice(0, 50).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell><Badge variant="outline">{m.mismatch_type}</Badge></TableCell>
                  <TableCell>{m.source_ref || m.source_id?.slice(0, 8)}</TableCell>
                  <TableCell>{fmt(Number(m.source_amount || 0))}</TableCell>
                  <TableCell>{fmt(Number(m.target_amount || 0))}</TableCell>
                  <TableCell className="font-bold text-red-600">{fmt(Math.abs(Number(m.difference || 0)))}</TableCell>
                  <TableCell><Badge variant={m.severity === 'high' ? 'destructive' : 'secondary'}>{m.severity}</Badge></TableCell>
                  <TableCell><Badge variant={m.status === 'resolved' ? 'default' : 'outline'}>{m.status}</Badge></TableCell>
                  <TableCell>{m.status === 'open' && <Button size="sm" variant="outline" onClick={() => setResolveId(m.id)}>Resolve</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Resolve Mismatch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Resolution Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain how this was resolved..." /></div>
            <Button className="w-full" onClick={() => resolve.mutate()}>Mark Resolved</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
