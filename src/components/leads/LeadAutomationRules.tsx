import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Bell, Clock, UserPlus, Zap, Plus, Trash2, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface LeadAutomationRulesProps {
  users: Array<{ user_id: string; full_name: string | null; email: string }>;
}

const defaultRules: AutomationRule[] = [
  {
    id: '1', name: 'Follow-up Reminder (3 Days)', trigger: 'no_activity_3_days',
    action: 'send_reminder', enabled: true, config: { days: 3 },
  },
  {
    id: '2', name: 'Auto-assign New Leads', trigger: 'new_lead_created',
    action: 'round_robin_assign', enabled: false, config: {},
  },
  {
    id: '3', name: 'Cold Lead Alert (7 Days)', trigger: 'no_activity_7_days',
    action: 'mark_cold', enabled: true, config: { days: 7 },
  },
  {
    id: '4', name: 'High Score Notification', trigger: 'score_above_80',
    action: 'notify_manager', enabled: false, config: { threshold: 80 },
  },
];

const triggerLabels: Record<string, string> = {
  no_activity_3_days: 'No activity for 3 days',
  no_activity_7_days: 'No activity for 7 days',
  new_lead_created: 'New lead created',
  score_above_80: 'Lead score above threshold',
  status_changed: 'Lead status changed',
};

const actionLabels: Record<string, string> = {
  send_reminder: 'Send follow-up reminder',
  round_robin_assign: 'Auto-assign (round robin)',
  mark_cold: 'Mark as Cold',
  notify_manager: 'Notify manager',
  create_task: 'Create follow-up task',
};

const triggerIcons: Record<string, React.ElementType> = {
  no_activity_3_days: Clock,
  no_activity_7_days: Clock,
  new_lead_created: Plus,
  score_above_80: Zap,
  status_changed: Settings,
};

export function LeadAutomationRules({ users }: LeadAutomationRulesProps) {
  const { t } = useLanguage();
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', trigger: '', action: '' });

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const rule = rules.find(r => r.id === id);
    toast({
      title: rule?.enabled ? 'Rule Disabled' : 'Rule Enabled',
      description: `"${rule?.name}" has been ${rule?.enabled ? 'disabled' : 'enabled'}`,
    });
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Rule Deleted', description: 'Automation rule removed' });
  };

  const addRule = () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) return;
    const rule: AutomationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      trigger: newRule.trigger,
      action: newRule.action,
      enabled: true,
      config: {},
    };
    setRules(prev => [...prev, rule]);
    setNewRule({ name: '', trigger: '', action: '' });
    setIsAddDialogOpen(false);
    toast({ title: 'Rule Created', description: `"${rule.name}" is now active` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automation Rules</h3>
          <p className="text-sm text-muted-foreground">Configure automated actions for lead management</p>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Rule
        </Button>
      </div>

      <div className="grid gap-3">
        {rules.map(rule => {
          const TriggerIcon = triggerIcons[rule.trigger] || Zap;
          return (
            <Card key={rule.id} className={rule.enabled ? '' : 'opacity-60'}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${rule.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <TriggerIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{rule.name}</p>
                    {rule.enabled && <Badge className="bg-success/10 text-success text-[10px] px-1.5 py-0">Active</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>When: {triggerLabels[rule.trigger] || rule.trigger}</span>
                    <span>→</span>
                    <span>Then: {actionLabels[rule.action] || rule.action}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No automation rules configured</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsAddDialogOpen(true)}>Add your first rule</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Rule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Automation Rule</DialogTitle>
            <DialogDescription>Create a new automation rule for lead management</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g., Follow-up after 5 days" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Trigger (When) *</Label>
              <Select value={newRule.trigger} onValueChange={(v) => setNewRule({ ...newRule, trigger: v })}>
                <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action (Then) *</Label>
              <Select value={newRule.action} onValueChange={(v) => setNewRule({ ...newRule, action: v })}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(actionLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={addRule} disabled={!newRule.name || !newRule.trigger || !newRule.action}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
