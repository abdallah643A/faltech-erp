import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bell, Plus, Clock, Mail, MessageSquare, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WorkflowAutoReminders() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState('rules');
  const [form, setForm] = useState({ name: '', module: 'finance', trigger_type: 'overdue_approval', frequency_hours: 24, escalation_after_hours: 72, reminder_channels: ['in_app'] });

  const { data: rules = [] } = useQuery({
    queryKey: ['reminder-rules', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('auto_reminder_rules' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['reminder-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('auto_reminder_logs' as any).select('*').order('sent_at', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('auto_reminder_rules' as any).insert({ ...form, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reminder-rules'] }); setShowCreate(false); toast({ title: 'Reminder rule created' }); },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('auto_reminder_rules' as any).update({ is_active }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminder-rules'] }),
  });

  const MODULES = ['finance', 'sales', 'procurement', 'hr', 'projects', 'construction'];
  const TRIGGERS = ['overdue_approval', 'expiring_quotation', 'unpaid_invoice', 'delayed_task', 'missing_payroll', 'incomplete_compliance', 'overdue_delivery'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" />Workflow Auto-Reminders</h1>
          <p className="text-muted-foreground">Automated reminders and escalations for overdue actions</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Rule</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Active Rules', value: rules.filter((r: any) => r.is_active).length, icon: Bell },
          { label: 'Reminders Sent', value: logs.length, icon: Mail },
          { label: 'Escalations', value: logs.filter((l: any) => l.channel === 'escalation').length, icon: AlertTriangle },
          { label: 'Failed', value: logs.filter((l: any) => l.status === 'failed').length, icon: Clock },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="rules">Rules</TabsTrigger><TabsTrigger value="logs">Reminder Log</TabsTrigger></TabsList>
        <TabsContent value="rules">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Rule Name</TableHead><TableHead>Module</TableHead><TableHead>Trigger</TableHead><TableHead>Frequency</TableHead><TableHead>Channels</TableHead><TableHead>{t('common.active')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
                    <TableCell className="text-sm">{r.trigger_type}</TableCell>
                    <TableCell className="text-sm">Every {r.frequency_hours}h</TableCell>
                    <TableCell><div className="flex gap-1">{(r.reminder_channels || []).map((c: string) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div></TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={v => toggleRule.mutate({ id: r.id, is_active: v })} /></TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reminder rules configured</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead><TableHead>Channel</TableHead><TableHead>Recipient</TableHead><TableHead>Message</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Sent</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.entity_type} / {l.entity_id?.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{l.channel}</Badge></TableCell>
                    <TableCell className="text-sm">{l.recipient_info || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.message}</TableCell>
                    <TableCell><Badge variant={l.status === 'sent' ? 'default' : 'destructive'}>{l.status}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(l.sent_at), 'dd MMM HH:mm')}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reminders sent yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Reminder Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Rule Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Overdue Invoice Reminder" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Module</Label><Select value={form.module} onValueChange={v => setForm(p => ({ ...p, module: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Trigger Type</Label><Select value={form.trigger_type} onValueChange={v => setForm(p => ({ ...p, trigger_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRIGGERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Frequency (hours)</Label><Input type="number" value={form.frequency_hours} onChange={e => setForm(p => ({ ...p, frequency_hours: parseInt(e.target.value) || 24 }))} /></div>
              <div><Label>Escalate After (hours)</Label><Input type="number" value={form.escalation_after_hours} onChange={e => setForm(p => ({ ...p, escalation_after_hours: parseInt(e.target.value) || 72 }))} /></div>
            </div>
            <Button className="w-full" onClick={() => createRule.mutate()} disabled={!form.name}>Create Rule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
