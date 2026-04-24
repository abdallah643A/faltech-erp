import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Zap, Play, Pause, Trash2, Edit2, ListOrdered, Mail, BarChart3, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Lead Created', description: 'Send email X days after lead creation' },
  { value: 'lead_inactive', label: 'Lead Inactive', description: 'Send when lead hasn\'t been contacted in X days' },
  { value: 'deal_stage_change', label: 'Deal Stage Change', description: 'Send when a deal moves to a specific stage' },
  { value: 'activity_due', label: 'Activity Due', description: 'Send reminder before activity is due' },
];

export default function EmailAutomation() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({ name: '', description: '', trigger_type: 'lead_created', trigger_config: '{"delay_days": 3}', template_id: '' });
  const [seqForm, setSeqForm] = useState({ name: '', description: '' });

  const { data: rules = [] } = useQuery({
    queryKey: ['email-automation-rules', activeCompanyId],
    queryFn: async () => {
      const q = supabase.from('email_automation_rules').select('*, email_templates(name)').order('created_at', { ascending: false });
      if (activeCompanyId) q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['email-sequences', activeCompanyId],
    queryFn: async () => {
      const q = supabase.from('email_sequences').select('*, email_sequence_steps(count), email_sequence_enrollments(count)').order('created_at', { ascending: false });
      if (activeCompanyId) q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_templates').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: automationLogs = [] } = useQuery({
    queryKey: ['email-automation-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_automation_log').select('*, email_automation_rules(name)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      let config = {};
      try { config = JSON.parse(ruleForm.trigger_config); } catch {}
      const payload = {
        name: ruleForm.name,
        description: ruleForm.description,
        trigger_type: ruleForm.trigger_type,
        trigger_config: config,
        template_id: ruleForm.template_id || null,
        company_id: activeCompanyId,
        created_by: user?.id,
      };
      if (editingRule) {
        const { error } = await supabase.from('email_automation_rules').update(payload).eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_automation_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-automation-rules'] });
      setShowRuleDialog(false);
      setEditingRule(null);
      toast({ title: editingRule ? 'Rule updated' : 'Automation rule created' });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('email_automation_rules').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-automation-rules'] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_automation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-automation-rules'] });
      toast({ title: 'Rule deleted' });
    },
  });

  const saveSequence = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('email_sequences').insert({
        ...seqForm,
        company_id: activeCompanyId,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-sequences'] });
      setShowSequenceDialog(false);
      toast({ title: 'Sequence created' });
    },
  });

  const openEditRule = (rule: any) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      trigger_config: JSON.stringify(rule.trigger_config || {}),
      template_id: rule.template_id || '',
    });
    setShowRuleDialog(true);
  };

  const stats = {
    activeRules: rules.filter((r: any) => r.is_active).length,
    totalSent: automationLogs.filter((l: any) => l.status === 'sent').length,
    activeSequences: sequences.filter((s: any) => s.is_active).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Automation</h1>
          <p className="text-muted-foreground">Automate email workflows, sequences, and follow-ups</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Zap className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-sm text-muted-foreground">Active Rules</p><p className="text-2xl font-bold">{stats.activeRules}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Mail className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-sm text-muted-foreground">Emails Sent</p><p className="text-2xl font-bold">{stats.totalSent}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><ListOrdered className="h-5 w-5 text-purple-500" /></div>
            <div><p className="text-sm text-muted-foreground">Active Sequences</p><p className="text-2xl font-bold">{stats.activeSequences}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="logs">Execution Log</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingRule(null); setRuleForm({ name: '', description: '', trigger_type: 'lead_created', trigger_config: '{"delay_days": 3}', template_id: '' }); setShowRuleDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Rule
            </Button>
          </div>
          <div className="grid gap-4">
            {rules.map((rule: any) => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                        <Zap className={`h-5 w-5 ${rule.is_active ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}</Badge>
                          {rule.email_templates && <Badge variant="secondary">Template: {rule.email_templates.name}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={(v) => toggleRule.mutate({ id: rule.id, active: v })} />
                      <Button variant="ghost" size="icon" onClick={() => openEditRule(rule)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rules.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No automation rules yet. Create your first rule to get started.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSeqForm({ name: '', description: '' }); setShowSequenceDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Sequence
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {sequences.map((seq: any) => (
              <Card key={seq.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{seq.name}</CardTitle>
                      <CardDescription>{seq.description}</CardDescription>
                    </div>
                    <Badge variant={seq.is_active ? 'default' : 'secondary'}>{seq.is_active ? 'Active' : 'Paused'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><ListOrdered className="h-3 w-3" />{seq.email_sequence_steps?.[0]?.count || 0} steps</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{seq.email_sequence_enrollments?.[0]?.count || 0} enrolled</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sequences.length === 0 && (
              <Card className="col-span-2"><CardContent className="py-12 text-center text-muted-foreground">No sequences yet. Create email sequences for lead nurturing.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automationLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.email_automation_rules?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{log.recipient_name || log.recipient_email}</p>
                        {log.recipient_name && <p className="text-xs text-muted-foreground">{log.recipient_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'sent' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
                {automationLogs.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No automation logs yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingRule ? 'Edit Rule' : 'New Automation Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Follow-up after 3 days" />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input value={ruleForm.description} onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={ruleForm.trigger_type} onValueChange={v => setRuleForm(p => ({ ...p, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label} — {t.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger Configuration (JSON)</Label>
              <Textarea value={ruleForm.trigger_config} onChange={e => setRuleForm(p => ({ ...p, trigger_config: e.target.value }))} rows={3} className="font-mono text-sm" placeholder='{"delay_days": 3}' />
            </div>
            <div className="space-y-2">
              <Label>Email Template</Label>
              <Select value={ruleForm.template_id} onValueChange={v => setRuleForm(p => ({ ...p, template_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => saveRule.mutate()} disabled={!ruleForm.name}>{editingRule ? 'Update' : 'Create'} Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sequence Dialog */}
      <Dialog open={showSequenceDialog} onOpenChange={setShowSequenceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Email Sequence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sequence Name</Label>
              <Input value={seqForm.name} onChange={e => setSeqForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., New Lead Nurturing" />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea value={seqForm.description} onChange={e => setSeqForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the sequence..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSequenceDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => saveSequence.mutate()} disabled={!seqForm.name}>Create Sequence</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
