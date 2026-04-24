import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Plus, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const METRIC_PRESETS = [
  { metric: 'Overdue Invoices Amount', module: 'finance', default_threshold: 100000, operator: 'greater_than' },
  { metric: 'Project Margin Below', module: 'projects', default_threshold: 15, operator: 'less_than' },
  { metric: 'Procurement Delays (days)', module: 'procurement', default_threshold: 7, operator: 'greater_than' },
  { metric: 'Attendance Anomalies', module: 'hr', default_threshold: 5, operator: 'greater_than' },
  { metric: 'Production Delays', module: 'manufacturing', default_threshold: 3, operator: 'greater_than' },
  { metric: 'Open Safety Incidents', module: 'safety', default_threshold: 1, operator: 'greater_than' },
  { metric: 'Cash Flow Below Threshold', module: 'finance', default_threshold: 500000, operator: 'less_than' },
  { metric: 'Vendor Score Drop', module: 'procurement', default_threshold: 50, operator: 'less_than' },
];

export default function KPISubscriptions() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ metric_name: '', module: 'finance', threshold_value: 0, operator: 'greater_than', description: '', notify_in_app: true, notify_email: false });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['kpi-subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('kpi_subscriptions' as any).select('*').eq('user_id', user?.id).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const createSub = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('kpi_subscriptions' as any).insert({
        ...data, user_id: user?.id, is_active: true,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-subscriptions'] });
      toast({ title: 'KPI subscription created' });
      setShowNew(false);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleSub = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('kpi_subscriptions' as any).update({ is_active }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-subscriptions'] }),
  });

  const deleteSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('kpi_subscriptions' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-subscriptions'] });
      toast({ title: 'Subscription removed' });
    },
  });

  const activeCount = subscriptions.filter((s: any) => s.is_active).length;

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> KPI Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Subscribe to metrics and get notified when thresholds are crossed</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Subscription</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Subscribe to KPI</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Metric Preset</Label>
                <Select onValueChange={v => {
                  const preset = METRIC_PRESETS.find(p => p.metric === v);
                  if (preset) setForm(f => ({ ...f, metric_name: preset.metric, module: preset.module, threshold_value: preset.default_threshold, operator: preset.operator }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Choose a preset..." /></SelectTrigger>
                  <SelectContent>
                    {METRIC_PRESETS.map(p => <SelectItem key={p.metric} value={p.metric}>{p.metric} ({p.module})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Metric Name *</Label><Input value={form.metric_name} onChange={e => setForm(f => ({ ...f, metric_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Module</Label>
                  <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['finance', 'procurement', 'hr', 'projects', 'manufacturing', 'safety', 'sales'].map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Condition</Label>
                  <Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater_than">Greater than</SelectItem>
                      <SelectItem value="less_than">Less than</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Threshold Value</Label><Input type="number" value={form.threshold_value} onChange={e => setForm(f => ({ ...f, threshold_value: +e.target.value }))} /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify_in_app} onCheckedChange={v => setForm(f => ({ ...f, notify_in_app: v }))} /> In-App</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify_email} onCheckedChange={v => setForm(f => ({ ...f, notify_email: v }))} /> Email</label>
              </div>
              <Button className="w-full" onClick={() => createSub.mutate(form)} disabled={!form.metric_name}>Subscribe</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Subscriptions</p><p className="text-2xl font-bold">{subscriptions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t('common.active')}</p><p className="text-2xl font-bold text-primary">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Triggered Recently</p><p className="text-2xl font-bold">{subscriptions.filter((s: any) => s.last_triggered_at).length}</p></CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Metric</TableHead><TableHead>Module</TableHead><TableHead>Condition</TableHead><TableHead>Threshold</TableHead><TableHead>Notifications</TableHead><TableHead>Last Value</TableHead><TableHead>{t('common.active')}</TableHead><TableHead>{t('common.actions')}</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {subscriptions.map((s: any) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium text-sm">{s.metric_name}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs capitalize">{s.module}</Badge></TableCell>
              <TableCell className="text-xs">{s.operator?.replace('_', ' ')}</TableCell>
              <TableCell className="text-sm font-mono">{s.threshold_value}</TableCell>
              <TableCell className="text-xs">{[s.notify_in_app && 'App', s.notify_email && 'Email'].filter(Boolean).join(', ')}</TableCell>
              <TableCell className="text-sm">{s.last_value != null ? s.last_value : '—'}</TableCell>
              <TableCell><Switch checked={s.is_active} onCheckedChange={v => toggleSub.mutate({ id: s.id, is_active: v })} /></TableCell>
              <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSub.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}
          {subscriptions.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No subscriptions yet. Click "New Subscription" to get started.</TableCell></TableRow>
          )}
        </TableBody></Table>
      </div>
    </div>
  );
}
