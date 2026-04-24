import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Save, Shield, AlertTriangle } from 'lucide-react';
import { BudgetControlRule, useBudgetControlRules } from '@/hooks/useBudgetMasters';

const TIMINGS = [
  { value: 'requisition', label: 'Requisition' },
  { value: 'purchase_request', label: 'Purchase Request' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'contract', label: 'Contract' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'journal_entry', label: 'Journal Entry' },
];

const CONTROL_BY = [
  { value: 'account', label: 'Account' },
  { value: 'cost_center', label: 'Cost Center' },
  { value: 'department', label: 'Department' },
  { value: 'project', label: 'Project' },
  { value: 'work_package', label: 'Work Package' },
  { value: 'combination', label: 'Combination' },
];

export function BudgetControlsTab() {
  const { data: rules = [], upsert, remove, isLoading } = useBudgetControlRules();
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    rule_name: '',
    control_level: 'warning',
    check_against: 'available',
    control_timing: ['purchase_order'] as string[],
    tolerance_percent: 0,
    tolerance_amount: 0,
    override_allowed: false,
    control_by: ['account'] as string[],
    is_active: true,
  });

  const openNew = () => {
    setForm({ rule_name: '', control_level: 'warning', check_against: 'available', control_timing: ['purchase_order'], tolerance_percent: 0, tolerance_amount: 0, override_allowed: false, control_by: ['account'], is_active: true });
    setEditId(null);
    setDialog(true);
  };

  const openEdit = (r: BudgetControlRule) => {
    setForm({
      rule_name: r.rule_name,
      control_level: r.control_level,
      check_against: r.check_against,
      control_timing: r.control_timing || [],
      tolerance_percent: r.tolerance_percent,
      tolerance_amount: r.tolerance_amount,
      override_allowed: r.override_allowed,
      control_by: r.control_by || [],
      is_active: r.is_active,
    });
    setEditId(r.id);
    setDialog(true);
  };

  const handleSave = () => {
    const payload: any = { ...form };
    if (editId) payload.id = editId;
    upsert.mutate(payload);
    setDialog(false);
  };

  const toggleTiming = (val: string) => {
    setForm(f => ({
      ...f,
      control_timing: f.control_timing.includes(val)
        ? f.control_timing.filter(t => t !== val)
        : [...f.control_timing, val],
    }));
  };

  const toggleControlBy = (val: string) => {
    setForm(f => ({
      ...f,
      control_by: f.control_by.includes(val)
        ? f.control_by.filter(t => t !== val)
        : [...f.control_by, val],
    }));
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />Budget Control Rules
          </CardTitle>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Rule</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Check Against</TableHead>
              <TableHead>Control Timing</TableHead>
              <TableHead>Tolerance</TableHead>
              <TableHead>Override</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.rule_name}</TableCell>
                <TableCell>
                  <Badge className={r.control_level === 'hard_stop' ? 'bg-destructive text-white' : 'bg-amber-100 text-amber-700'}>
                    {r.control_level === 'hard_stop' ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" />Hard Stop</>
                    ) : 'Warning'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs capitalize">{r.check_against}</TableCell>
                <TableCell className="text-xs">{(r.control_timing || []).join(', ')}</TableCell>
                <TableCell className="text-xs font-mono">
                  {r.tolerance_percent > 0 && `${r.tolerance_percent}%`}
                  {r.tolerance_percent > 0 && r.tolerance_amount > 0 && ' / '}
                  {r.tolerance_amount > 0 && `${r.tolerance_amount}`}
                  {!r.tolerance_percent && !r.tolerance_amount && '0'}
                </TableCell>
                <TableCell><Badge variant={r.override_allowed ? 'secondary' : 'outline'}>{r.override_allowed ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No control rules defined</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'New'} Control Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name *</Label>
              <Input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Control Level</Label>
                <Select value={form.control_level} onValueChange={v => setForm(f => ({ ...f, control_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Warning Only</SelectItem>
                    <SelectItem value="hard_stop">Hard Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Check Against</Label>
                <Select value={form.check_against} onValueChange={v => setForm(f => ({ ...f, check_against: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original Budget</SelectItem>
                    <SelectItem value="revised">Revised Budget</SelectItem>
                    <SelectItem value="available">Available Budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Control Timing</Label>
              <div className="flex flex-wrap gap-3">
                {TIMINGS.map(t => (
                  <label key={t.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.control_timing.includes(t.value)} onCheckedChange={() => toggleTiming(t.value)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Control By</Label>
              <div className="flex flex-wrap gap-3">
                {CONTROL_BY.map(c => (
                  <label key={c.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.control_by.includes(c.value)} onCheckedChange={() => toggleControlBy(c.value)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tolerance %</Label>
                <Input type="number" value={form.tolerance_percent || ''} onChange={e => setForm(f => ({ ...f, tolerance_percent: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Tolerance Amount</Label>
                <Input type="number" value={form.tolerance_amount || ''} onChange={e => setForm(f => ({ ...f, tolerance_amount: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2"><Switch checked={form.override_allowed} onCheckedChange={v => setForm(f => ({ ...f, override_allowed: v }))} />Override Allowed</label>
              <label className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.rule_name}><Save className="h-4 w-4 mr-1" />Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
