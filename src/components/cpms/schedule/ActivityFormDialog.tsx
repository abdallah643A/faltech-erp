import { useState, useEffect } from 'react';
import { ScheduleActivity } from '@/hooks/useProjectSchedule';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';

const LEVEL_TYPES = ['stage', 'wbs', 'task', 'milestone'];
const STATUSES = ['not_started', 'in_progress', 'delayed', 'completed', 'on_hold', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const DEP_TYPES = ['FS', 'SS', 'FF', 'SF'];
const CONSTRAINT_TYPES = ['as_soon_as_possible', 'as_late_as_possible', 'must_start_on', 'must_finish_on', 'start_no_earlier_than', 'start_no_later_than', 'finish_no_earlier_than', 'finish_no_later_than'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ScheduleActivity | null;
  parentId: string | null;
  defaultLevelType: string;
  allActivities: ScheduleActivity[];
  onSave: (data: Partial<ScheduleActivity>) => void;
}

export default function ActivityFormDialog({ open, onOpenChange, activity, parentId, defaultLevelType, allActivities, onSave }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (activity) {
      setForm({ ...activity });
    } else {
      const siblings = allActivities.filter(a => a.parent_activity_id === parentId);
      const parentCode = parentId ? allActivities.find(a => a.id === parentId)?.code || '' : '';
      const nextNum = siblings.length + 1;
      const code = parentCode ? `${parentCode}.${nextNum}` : `${nextNum}`;
      setForm({
        code,
        name: '',
        description: '',
        level_type: defaultLevelType,
        status: 'not_started',
        priority: 'medium',
        start_date: '',
        end_date: '',
        duration: '',
        actual_start: '',
        actual_end: '',
        progress_pct: 0,
        resource_names: '',
        department: '',
        dependency_type: 'FS',
        constraint_type: '',
        budget_value: 0,
        weight_pct: 0,
        notes: '',
        predecessors: [],
        parent_activity_id: parentId,
      });
    }
  }, [activity, parentId, defaultLevelType, open]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...form, [key]: value };
    // Auto-calc
    if (key === 'start_date' && updated.end_date) {
      updated.duration = differenceInDays(parseISO(updated.end_date), parseISO(updated.start_date)) + 1;
    } else if (key === 'end_date' && updated.start_date) {
      updated.duration = differenceInDays(parseISO(updated.end_date), parseISO(updated.start_date)) + 1;
    } else if (key === 'duration' && updated.start_date && value > 0) {
      updated.end_date = format(addDays(parseISO(updated.start_date), value - 1), 'yyyy-MM-dd');
    }
    if (updated.level_type === 'milestone') {
      updated.duration = 0;
    }
    setForm(updated);
  };

  const handleSave = () => {
    if (!form.name || !form.code) return;
    onSave(form);
    onOpenChange(false);
  };

  const possiblePredecessors = allActivities.filter(a => a.id !== activity?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? 'Edit Activity' : `Add ${defaultLevelType.charAt(0).toUpperCase() + defaultLevelType.slice(1)}`}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Code / ID *</Label>
            <Input value={form.code || ''} onChange={e => handleChange('code', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Name / Title *</Label>
            <Input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="col-span-3">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description || ''} onChange={e => handleChange('description', e.target.value)} rows={2} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Level Type</Label>
            <Select value={form.level_type || 'task'} onValueChange={v => handleChange('level_type', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVEL_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status || 'not_started'} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={form.priority || 'medium'} onValueChange={v => handleChange('priority', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Planned Start</Label>
            <Input type="date" value={form.start_date || ''} onChange={e => handleChange('start_date', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Planned End</Label>
            <Input type="date" value={form.end_date || ''} onChange={e => handleChange('end_date', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Duration (days)</Label>
            <Input type="number" value={form.duration || ''} onChange={e => handleChange('duration', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Actual Start</Label>
            <Input type="date" value={form.actual_start || ''} onChange={e => handleChange('actual_start', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Actual End</Label>
            <Input type="date" value={form.actual_end || ''} onChange={e => handleChange('actual_end', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Progress %</Label>
            <Input type="number" min={0} max={100} value={form.progress_pct ?? 0} onChange={e => handleChange('progress_pct', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Responsible Person</Label>
            <Input value={form.resource_names || ''} onChange={e => handleChange('resource_names', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Input value={form.department || ''} onChange={e => handleChange('department', e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Weight %</Label>
            <Input type="number" min={0} max={100} value={form.weight_pct ?? 0} onChange={e => handleChange('weight_pct', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Dependency Type</Label>
            <Select value={form.dependency_type || 'FS'} onValueChange={v => handleChange('dependency_type', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEP_TYPES.map(d => <SelectItem key={d} value={d}>{d} ({d === 'FS' ? 'Finish→Start' : d === 'SS' ? 'Start→Start' : d === 'FF' ? 'Finish→Finish' : 'Start→Finish'})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Predecessor</Label>
            <Select value={form.predecessors?.[0]?.id || form.predecessors?.[0] || ''} onValueChange={v => handleChange('predecessors', v ? [{ id: v, type: form.dependency_type || 'FS' }] : [])}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {possiblePredecessors.map(a => <SelectItem key={a.id} value={a.id}>{a.code} – {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Constraint Type</Label>
            <Select value={form.constraint_type || ''} onValueChange={v => handleChange('constraint_type', v || null)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {CONSTRAINT_TYPES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Budget Value</Label>
            <Input type="number" value={form.budget_value ?? 0} onChange={e => handleChange('budget_value', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Baseline Start</Label>
            <Input type="date" value={form.baseline_start || ''} onChange={e => handleChange('baseline_start', e.target.value)} className="h-8 text-sm" disabled />
          </div>
          <div>
            <Label className="text-xs">Baseline End</Label>
            <Input type="date" value={form.baseline_end || ''} onChange={e => handleChange('baseline_end', e.target.value)} className="h-8 text-sm" disabled />
          </div>

          <div className="col-span-3">
            <Label className="text-xs">Notes / Remarks</Label>
            <Textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.code}>
            {activity ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
