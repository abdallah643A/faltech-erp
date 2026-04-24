import { useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Presentation, Plus, Download, TrendingUp, Users, DollarSign, Building2, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BoardroomReporting() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: snapshots = [] } = useQuery({
    queryKey: ['boardroom-snapshots', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('boardroom_snapshots' as any).select('*') as any).order('snapshot_date', { ascending: false }).limit(24);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({ period_label: '', revenue: 0, gross_profit: 0, procurement_savings: 0, overdue_receivables: 0, cash_position: 0, project_margin_avg: 0, production_efficiency: 0, headcount: 0, compliance_score: 0 });

  const createSnapshot = useMutation({
    mutationFn: async (data: any) => {
      await (supabase.from('boardroom_snapshots' as any).insert({ ...data, company_id: activeCompanyId, created_by: user?.id }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boardroom-snapshots'] }); setCreateDialog(false); toast({ title: 'Snapshot Created' }); },
  });

  const latest = snapshots[0];
  const chartData = [...snapshots].reverse().map((s: any) => ({
    period: s.period_label,
    revenue: Number(s.revenue || 0),
    profit: Number(s.gross_profit || 0),
    receivables: Number(s.overdue_receivables || 0),
  }));

  const kpiCards = latest ? [
    { label: 'Revenue', value: `${(Number(latest.revenue) / 1000000).toFixed(1)}M`, icon: DollarSign, trend: 'up' },
    { label: 'Gross Profit', value: `${(Number(latest.gross_profit) / 1000000).toFixed(1)}M`, icon: TrendingUp, trend: Number(latest.gross_profit) > 0 ? 'up' : 'down' },
    { label: 'Headcount', value: latest.headcount, icon: Users, trend: 'neutral' },
    { label: 'Overdue AR', value: `${(Number(latest.overdue_receivables) / 1000).toFixed(0)}K`, icon: Building2, trend: Number(latest.overdue_receivables) > 0 ? 'down' : 'up' },
    { label: 'Cash Position', value: `${(Number(latest.cash_position) / 1000000).toFixed(1)}M`, icon: DollarSign, trend: 'up' },
    { label: 'Project Margin', value: `${Number(latest.project_margin_avg).toFixed(1)}%`, icon: TrendingUp, trend: 'up' },
    { label: 'Production Eff.', value: `${Number(latest.production_efficiency).toFixed(1)}%`, icon: ShieldCheck, trend: 'up' },
    { label: 'Compliance', value: `${Number(latest.compliance_score).toFixed(0)}%`, icon: ShieldCheck, trend: 'up' },
  ] : [];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Presentation className="h-6 w-6" /> Boardroom Reporting Pack</h1>
          <p className="text-muted-foreground text-sm">Executive dashboards and monthly snapshots for leadership</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => { setForm({ period_label: format(new Date(), 'MMM yyyy'), revenue: 0, gross_profit: 0, procurement_savings: 0, overdue_receivables: 0, cash_position: 0, project_margin_avg: 0, production_efficiency: 0, headcount: 0, compliance_score: 0 }); setCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Snapshot
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((kpi, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                  <kpi.icon className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue & Profit Trend */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue & Profit Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => v.toLocaleString() + ' SAR'} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" opacity={0.4} name="Revenue" />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Overdue Receivables</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => v.toLocaleString() + ' SAR'} />
                  <Line type="monotone" dataKey="receivables" stroke="hsl(var(--destructive))" strokeWidth={2} name="Overdue AR" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Snapshots History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Snapshot History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Revenue</TableHead><TableHead>Profit</TableHead><TableHead>Cash</TableHead><TableHead>Overdue AR</TableHead><TableHead>Headcount</TableHead><TableHead>Margin</TableHead><TableHead>{t('common.date')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {snapshots.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.period_label}</TableCell>
                  <TableCell className="font-mono">{Number(s.revenue).toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{Number(s.gross_profit).toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{Number(s.cash_position).toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{Number(s.overdue_receivables).toLocaleString()}</TableCell>
                  <TableCell>{s.headcount}</TableCell>
                  <TableCell>{Number(s.project_margin_avg).toFixed(1)}%</TableCell>
                  <TableCell className="text-xs">{s.snapshot_date}</TableCell>
                </TableRow>
              ))}
              {snapshots.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No snapshots yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Monthly Snapshot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Period Label</Label><Input value={form.period_label} onChange={e => setForm({ ...form, period_label: e.target.value })} placeholder="e.g. Apr 2026" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Revenue (SAR)</Label><Input type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Gross Profit (SAR)</Label><Input type="number" value={form.gross_profit} onChange={e => setForm({ ...form, gross_profit: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Procurement Savings</Label><Input type="number" value={form.procurement_savings} onChange={e => setForm({ ...form, procurement_savings: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Overdue Receivables</Label><Input type="number" value={form.overdue_receivables} onChange={e => setForm({ ...form, overdue_receivables: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Cash Position</Label><Input type="number" value={form.cash_position} onChange={e => setForm({ ...form, cash_position: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Avg Project Margin %</Label><Input type="number" value={form.project_margin_avg} onChange={e => setForm({ ...form, project_margin_avg: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Production Efficiency %</Label><Input type="number" value={form.production_efficiency} onChange={e => setForm({ ...form, production_efficiency: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Headcount</Label><Input type="number" value={form.headcount} onChange={e => setForm({ ...form, headcount: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Compliance Score %</Label><Input type="number" value={form.compliance_score} onChange={e => setForm({ ...form, compliance_score: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialog(false)}>{t('common.cancel')}</Button><Button onClick={() => createSnapshot.mutate(form)} disabled={!form.period_label}>Save Snapshot</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
