import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Save, Filter, Layers, AlertCircle, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

const OPERATORS = [
  { value: 'equals', label: '= Equals' },
  { value: 'not_equals', label: '≠ Not Equals' },
  { value: 'greater_than', label: '> Greater Than' },
  { value: 'less_than', label: '< Less Than' },
  { value: 'greater_equal', label: '≥ Greater or Equal' },
  { value: 'less_equal', label: '≤ Less or Equal' },
  { value: 'contains', label: '∋ Contains' },
  { value: 'not_contains', label: '∌ Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'in_list', label: '∈ In List' },
  { value: 'not_in_list', label: '∉ Not In List' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'between', label: 'Between' },
];

const FIELD_PATHS = [
  { value: 'amount', label: 'Document Amount', group: 'Financial' },
  { value: 'total', label: 'Total', group: 'Financial' },
  { value: 'discount_percent', label: 'Discount %', group: 'Financial' },
  { value: 'currency', label: 'Currency', group: 'Financial' },
  { value: 'status', label: 'Status', group: 'Document' },
  { value: 'document_type', label: 'Document Type', group: 'Document' },
  { value: 'priority', label: 'Priority', group: 'Document' },
  { value: 'branch_id', label: 'Branch', group: 'Organization' },
  { value: 'company_id', label: 'Company', group: 'Organization' },
  { value: 'department', label: 'Department', group: 'Organization' },
  { value: 'project_id', label: 'Project', group: 'Organization' },
  { value: 'customer_code', label: 'Customer Code', group: 'Partner' },
  { value: 'vendor_code', label: 'Vendor Code', group: 'Partner' },
  { value: 'requester_id', label: 'Requester', group: 'People' },
  { value: 'created_by', label: 'Created By', group: 'People' },
  { value: 'custom_field_*', label: 'Custom Field (specify)', group: 'Custom' },
];

interface ConditionRule {
  id: string;
  template_id: string | null;
  stage_id: string | null;
  field_path: string;
  operator: string;
  compare_value: string | null;
  compare_values: string[] | null;
  logic_group: string;
  group_order: number;
  is_active: boolean;
  description: string | null;
}

interface WorkflowConditionEngineProps {
  templateId?: string;
  stageId?: string;
}

export function WorkflowConditionEngine({ templateId, stageId }: WorkflowConditionEngineProps) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<ConditionRule>>({});

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ['workflow-conditions', templateId, stageId],
    queryFn: async () => {
      let q = supabase.from('workflow_condition_rules' as any).select('*').order('group_order');
      if (templateId) q = q.eq('template_id', templateId);
      if (stageId) q = q.eq('stage_id', stageId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ConditionRule[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rule: Partial<ConditionRule>) => {
      if (rule.id) {
        const { error } = await supabase.from('workflow_condition_rules' as any).update(rule as any).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workflow_condition_rules' as any).insert({
          ...rule,
          template_id: templateId || null,
          stage_id: stageId || null,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-conditions'] });
      setShowDialog(false);
      setEditing({});
      toast.success('Condition saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflow_condition_rules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-conditions'] });
      toast.success('Condition removed');
    },
  });

  const groups = conditions.reduce<Record<string, ConditionRule[]>>((acc, c) => {
    const g = c.logic_group || 'AND';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  const openNew = () => {
    setEditing({ field_path: 'amount', operator: 'greater_than', logic_group: 'AND', group_order: conditions.length, is_active: true });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Workflow Conditions</h3>
          <Badge variant="outline">{conditions.length} rules</Badge>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Condition</Button>
      </div>

      {Object.entries(groups).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No conditions configured. This workflow will apply to all matching documents.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={openNew}>Add First Condition</Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groups).map(([group, rules]) => (
          <Card key={group}>
            <CardHeader className="py-2 px-4">
              <div className="flex items-center gap-2">
                <Badge variant={group === 'AND' ? 'default' : 'secondary'}>{group}</Badge>
                <span className="text-xs text-muted-foreground">All conditions in this group must {group === 'AND' ? 'all match' : 'any match'}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Field</TableHead>
                    <TableHead className="text-xs">Operator</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="text-xs w-16">Active</TableHead>
                    <TableHead className="text-xs w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-xs font-mono">{rule.field_path}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {OPERATORS.find(o => o.value === rule.operator)?.label || rule.operator}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{rule.compare_value || rule.compare_values?.join(', ') || '—'}</TableCell>
                      <TableCell><Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-[10px]">{rule.is_active ? 'On' : 'Off'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(rule); setShowDialog(true); }}>
                            <Filter className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(rule.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit' : 'Add'} Condition Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Field Path</Label>
              <Select value={editing.field_path || ''} onValueChange={v => setEditing(p => ({ ...p, field_path: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_PATHS.map(f => <SelectItem key={f.value} value={f.value}>{f.label} <span className="text-muted-foreground">({f.group})</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Operator</Label>
              <Select value={editing.operator || 'equals'} onValueChange={v => setEditing(p => ({ ...p, operator: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!['is_empty', 'is_not_empty'].includes(editing.operator || '') && (
              <div>
                <Label className="text-xs">Compare Value</Label>
                <Input value={editing.compare_value || ''} onChange={e => setEditing(p => ({ ...p, compare_value: e.target.value }))} placeholder="Value to compare against" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Logic Group</Label>
                <Select value={editing.logic_group || 'AND'} onValueChange={v => setEditing(p => ({ ...p, logic_group: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND (all must match)</SelectItem>
                    <SelectItem value="OR">OR (any must match)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Order</Label>
                <Input type="number" value={editing.group_order ?? 0} onChange={e => setEditing(p => ({ ...p, group_order: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Skip approval for amounts below 1000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(editing)} disabled={!editing.field_path}>
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
