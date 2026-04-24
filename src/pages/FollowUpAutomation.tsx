import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock, Zap, Plus, Trash2, ToggleLeft, ToggleRight, Play, Loader2, History, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { PageHelpTooltip } from '@/components/shared/PageHelpTooltip';
import { useNavigate } from 'react-router-dom';

export default function FollowUpAutomation() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState<{ processed: number; rules: Array<{ rule: string; status: string }> } | null>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_type: 'no_activity',
    trigger_days: 7,
    action_type: 'create_task',
    entity_type: 'lead',
    action_config: {
      priority: 'medium',
      type: 'call',
      subject_template: 'Follow up with {name}',
    },
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['follow-up-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('follow_up_rules').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['follow-up-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_up_logs')
        .select('*, business_partners:business_partner_id(card_name), follow_up_rules:rule_id(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Overdue activities count
  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['overdue-activities-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString());
      if (error) throw error;
      return count || 0;
    },
  });

  // Upcoming reminders (tasks due in next 3 days)
  const { data: upcomingTasks = [] } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: async () => {
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('activities')
        .select('*, business_partners:business_partner_id(card_name)')
        .eq('status', 'pending')
        .gte('due_date', now.toISOString())
        .lte('due_date', threeDays)
        .order('due_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('follow_up_rules').insert({
        name: newRule.name,
        description: newRule.description,
        trigger_type: newRule.trigger_type,
        trigger_days: newRule.trigger_days,
        action_type: newRule.action_type,
        entity_type: newRule.entity_type,
        action_config: newRule.action_config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-rules'] });
      setIsAddOpen(false);
      toast({ title: 'Rule Created' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('follow_up_rules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-up-rules'] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('follow_up_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-rules'] });
      toast({ title: 'Rule Deleted' });
    },
  });

  const runNow = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-followup');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['follow-up-logs'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
      setRunResults(data);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  const triggerLabels: Record<string, string> = {
    no_activity: 'No Activity For',
    after_creation: 'After Creation',
    overdue_activity: 'Activity Overdue By',
  };

  const actionLabels: Record<string, string> = {
    create_task: 'Create Task',
    create_notification: 'Send Notification',
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'ar' ? 'المتابعات والتذكيرات التلقائية' : 'Automated Follow-ups & Reminders'}
            </h1>
            <PageHelpTooltip content="This screen lets you create rules that automatically generate follow-up tasks or notifications when leads/opportunities have no activity for a set number of days. 'Run Now' checks all active rules and creates activities in the Activities screen for any matching leads. Check the 'History' tab to see what was created." />
          </div>
          <p className="text-muted-foreground">Smart task automation, overdue alerts, and scheduled reminders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runNow} disabled={isRunning} className="gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run Now
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Active Rules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Overdue Activities</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingTasks.length}</p>
              <p className="text-xs text-muted-foreground">Due in 3 Days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Actions This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" className="gap-1"><Zap className="h-3.5 w-3.5" /> Rules</TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1"><Clock className="h-3.5 w-3.5" /> Upcoming</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="h-3.5 w-3.5" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3 mt-4">
          {rulesLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No rules configured. Create one to get started.</CardContent></Card>
          ) : (
            rules.map(rule => (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{rule.name}</h3>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{rule.entity_type}</Badge>
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Bell className="h-2.5 w-2.5" />
                          {triggerLabels[rule.trigger_type] || rule.trigger_type}: {rule.trigger_days} days
                        </Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Zap className="h-2.5 w-2.5" />
                          {actionLabels[rule.action_type] || rule.action_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-2 mt-4">
          {upcomingTasks.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming tasks in the next 3 days.</CardContent></Card>
          ) : (
            upcomingTasks.map((task: any) => (
              <Card key={task.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    task.priority === 'high' ? 'bg-destructive/10' : 'bg-amber-500/10'
                  }`}>
                    <Clock className={`h-4 w-4 ${task.priority === 'high' ? 'text-destructive' : 'text-amber-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.business_partners?.card_name || '-'}</span>
                      <span>•</span>
                      <span>Due {task.due_date ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true }) : '-'}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{task.type}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-4">
          {logsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No automation history yet.</CardContent></Card>
          ) : (
            logs.map((log: any) => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.details}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{log.business_partners?.card_name || '-'}</span>
                      <span>•</span>
                      <span>{log.follow_up_rules?.name || 'Manual'}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{log.action_taken}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add Rule Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Follow-up Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Rule Name</Label>
              <Input value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} placeholder="e.g. Weekly Lead Follow-up" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Trigger</Label>
                <Select value={newRule.trigger_type} onValueChange={v => setNewRule({ ...newRule, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_activity">No Activity For</SelectItem>
                    <SelectItem value="after_creation">After Creation</SelectItem>
                    <SelectItem value="overdue_activity">Activity Overdue By</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Days</Label>
                <Input type="number" min={1} value={newRule.trigger_days} onChange={e => setNewRule({ ...newRule, trigger_days: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Entity</Label>
                <Select value={newRule.entity_type} onValueChange={v => setNewRule({ ...newRule, entity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Action</Label>
                <Select value={newRule.action_type} onValueChange={v => setNewRule({ ...newRule, action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_task">Create Task</SelectItem>
                    <SelectItem value="create_notification">Send Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newRule.action_type === 'create_task' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Task Type</Label>
                  <Select value={newRule.action_config.type} onValueChange={v => setNewRule({ ...newRule, action_config: { ...newRule.action_config, type: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={newRule.action_config.priority} onValueChange={v => setNewRule({ ...newRule, action_config: { ...newRule.action_config, priority: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Subject Template</Label>
              <Input
                value={newRule.action_config.subject_template}
                onChange={e => setNewRule({ ...newRule, action_config: { ...newRule.action_config, subject_template: e.target.value } })}
                placeholder="Use {name} for lead/opp name, {days} for trigger days"
              />
              <p className="text-[10px] text-muted-foreground">Variables: {'{name}'}, {'{days}'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createRule.mutate()} disabled={!newRule.name.trim()}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Results Dialog */}
      <Dialog open={!!runResults} onOpenChange={(open) => { if (!open) setRunResults(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Automation Completed
            </DialogTitle>
            <DialogDescription>
              {runResults?.processed || 0} actions were created and added to your Activities list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">What happened:</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                <li>Each active rule was checked against your leads/opportunities</li>
                <li>For leads with no recent activity, follow-up <strong>tasks</strong> or <strong>notifications</strong> were auto-created</li>
                <li>These tasks now appear in your <strong>Activities</strong> screen</li>
              </ul>
            </div>
            {runResults?.rules && runResults.rules.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Rules processed:</p>
                {runResults.rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Badge variant={r.status === 'processed' ? 'default' : 'destructive'} className="text-[10px]">
                      {r.status}
                    </Badge>
                    <span>{r.rule}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setRunResults(null)}>Close</Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setRunResults(null); navigate('/activities'); }}>
              <ExternalLink className="h-3.5 w-3.5" />
              View in Activities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
