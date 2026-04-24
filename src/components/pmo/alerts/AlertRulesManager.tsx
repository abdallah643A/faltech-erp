import { useState } from 'react';
import { usePMOAlerts, PMOAlertRule } from '@/hooks/usePMOAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { Plus, Edit, Trash2, Settings2 } from 'lucide-react';

const CONDITION_TYPES = [
  { value: 'budget_threshold', label: 'Budget Utilization %', category: 'budget' },
  { value: 'budget_overspend', label: 'Budget Overspend', category: 'budget' },
  { value: 'schedule_delay_days', label: 'Schedule Delay (days)', category: 'schedule' },
  { value: 'milestone_risk', label: 'Milestone at Risk', category: 'schedule' },
  { value: 'resource_overalloc', label: 'Resource Over-allocation %', category: 'resource' },
  { value: 'risk_score', label: 'Risk Score Threshold', category: 'risk' },
  { value: 'risk_probability', label: 'Risk Probability %', category: 'risk' },
  { value: 'quality_gate_failure', label: 'Quality Gate Failure', category: 'quality' },
  { value: 'compliance_deadline', label: 'Compliance Deadline (days)', category: 'quality' },
];

const emptyRule: Partial<PMOAlertRule> = {
  rule_name: '', alert_category: 'budget', severity: 'high',
  condition_type: 'budget_threshold', threshold_value: 75,
  threshold_operator: 'gte', is_active: true, frequency: 'realtime',
  escalation_hours: 24, notification_channels: ['in_app'],
};

export function AlertRulesManager() {
  const { rules, createRule, updateRule, deleteRule } = usePMOAlerts();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<PMOAlertRule> | null>(null);

  const openCreate = () => { setEditingRule({ ...emptyRule }); setShowDialog(true); };
  const openEdit = (rule: PMOAlertRule) => { setEditingRule({ ...rule }); setShowDialog(true); };

  const handleSave = () => {
    if (!editingRule?.rule_name) return;
    // Sync category from condition_type
    const condType = CONDITION_TYPES.find(c => c.value === editingRule.condition_type);
    const ruleData = { ...editingRule, alert_category: condType?.category || editingRule.alert_category };

    if ('id' in ruleData && ruleData.id) {
      updateRule.mutate(ruleData as PMOAlertRule & { id: string });
    } else {
      createRule.mutate(ruleData);
    }
    setShowDialog(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Alert Rules
        </CardTitle>
        <Button size="sm" className="text-xs gap-1" onClick={openCreate}><Plus className="h-3 w-3" /> Add Rule</Button>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No alert rules configured. Create your first rule to start monitoring.</p>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule.mutate({ id: rule.id, is_active: v } as any)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{rule.rule_name}</span>
                      <AlertSeverityBadge severity={rule.severity} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {CONDITION_TYPES.find(c => c.value === rule.condition_type)?.label || rule.condition_type}
                      {rule.threshold_value != null && ` ${rule.threshold_operator} ${rule.threshold_value}`}
                      {' · '}{rule.frequency}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => openEdit(rule)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 px-1.5 text-destructive" onClick={() => deleteRule.mutate(rule.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule && 'id' in editingRule ? 'Edit Rule' : 'Create Alert Rule'}</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input value={editingRule.rule_name || ''} onChange={e => setEditingRule({ ...editingRule, rule_name: e.target.value })} placeholder="e.g. Budget Warning at 75%" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition Type</Label>
                  <Select value={editingRule.condition_type} onValueChange={v => setEditingRule({ ...editingRule, condition_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={editingRule.severity} onValueChange={v => setEditingRule({ ...editingRule, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select value={editingRule.threshold_operator || 'gte'} onValueChange={v => setEditingRule({ ...editingRule, threshold_operator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">Greater than</SelectItem>
                      <SelectItem value="gte">Greater or equal</SelectItem>
                      <SelectItem value="lt">Less than</SelectItem>
                      <SelectItem value="lte">Less or equal</SelectItem>
                      <SelectItem value="eq">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Threshold Value</Label>
                  <Input type="number" value={editingRule.threshold_value ?? ''} onChange={e => setEditingRule({ ...editingRule, threshold_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check Frequency</Label>
                  <Select value={editingRule.frequency || 'realtime'} onValueChange={v => setEditingRule({ ...editingRule, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Escalation (hours)</Label>
                  <Input type="number" value={editingRule.escalation_hours ?? 24} onChange={e => setEditingRule({ ...editingRule, escalation_hours: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingRule.is_active ?? true} onCheckedChange={v => setEditingRule({ ...editingRule, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
