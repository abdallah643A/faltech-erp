import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Copy, Layers, Users, Clock, AlertTriangle, CheckCircle2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalStage {
  id: string;
  name: string;
  approverType: 'user' | 'role' | 'department_head' | 'manager';
  approverValue: string;
  approvalMode: 'single' | 'all' | 'majority';
  backupApprover: string;
  escalationHours: number;
  commentsRequired: boolean;
  canReject: boolean;
  isActive: boolean;
  usedInTemplates: number;
}

const MOCK_STAGES: ApprovalStage[] = [
  { id: '1', name: 'Department Manager', approverType: 'manager', approverValue: 'Direct Manager', approvalMode: 'single', backupApprover: 'HR Director', escalationHours: 24, commentsRequired: false, canReject: true, isActive: true, usedInTemplates: 5 },
  { id: '2', name: 'Finance Controller', approverType: 'role', approverValue: 'finance_controller', approvalMode: 'single', backupApprover: 'CFO', escalationHours: 48, commentsRequired: true, canReject: true, isActive: true, usedInTemplates: 8 },
  { id: '3', name: 'Executive Committee', approverType: 'role', approverValue: 'executive', approvalMode: 'majority', backupApprover: 'CEO', escalationHours: 72, commentsRequired: true, canReject: true, isActive: true, usedInTemplates: 2 },
  { id: '4', name: 'Department Head Sign-off', approverType: 'department_head', approverValue: 'Any Department', approvalMode: 'single', backupApprover: 'VP Operations', escalationHours: 24, commentsRequired: false, canReject: false, isActive: false, usedInTemplates: 0 },
];

export default function ApprovalStages() {
  const [stages, setStages] = useState(MOCK_STAGES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ApprovalStage | null>(null);
  const [form, setForm] = useState({ name: '', approverType: 'user' as ApprovalStage['approverType'], approverValue: '', approvalMode: 'single' as ApprovalStage['approvalMode'], backupApprover: '', escalationHours: 24, commentsRequired: false, canReject: true });

  const openCreate = () => {
    setEditingStage(null);
    setForm({ name: '', approverType: 'user', approverValue: '', approvalMode: 'single', backupApprover: '', escalationHours: 24, commentsRequired: false, canReject: true });
    setDialogOpen(true);
  };

  const openEdit = (s: ApprovalStage) => {
    setEditingStage(s);
    setForm({ name: s.name, approverType: s.approverType, approverValue: s.approverValue, approvalMode: s.approvalMode, backupApprover: s.backupApprover, escalationHours: s.escalationHours, commentsRequired: s.commentsRequired, canReject: s.canReject });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.approverValue) { toast.error('Name and approver are required'); return; }
    if (editingStage) {
      setStages(prev => prev.map(s => s.id === editingStage.id ? { ...s, ...form } : s));
      toast.success('Stage updated');
    } else {
      setStages(prev => [...prev, { id: crypto.randomUUID(), ...form, isActive: true, usedInTemplates: 0 }]);
      toast.success('Stage created');
    }
    setDialogOpen(false);
  };

  const duplicate = (s: ApprovalStage) => {
    setStages(prev => [...prev, { ...s, id: crypto.randomUUID(), name: `${s.name} (Copy)`, usedInTemplates: 0 }]);
    toast.success('Stage duplicated');
  };

  const toggleActive = (id: string) => {
    const stage = stages.find(s => s.id === id);
    if (stage && stage.usedInTemplates > 0 && stage.isActive) {
      toast.error(`Cannot deactivate: used in ${stage.usedInTemplates} template(s)`);
      return;
    }
    setStages(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const modeLabel = (m: string) => m === 'single' ? 'Single Approver' : m === 'all' ? 'All Must Approve' : 'Majority';
  const typeLabel = (t: string) => t === 'user' ? 'Specific User' : t === 'role' ? 'Role-Based' : t === 'department_head' ? 'Department Head' : 'Direct Manager';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Approval Stages</h1>
          <p className="text-sm text-muted-foreground">Define reusable approval steps for workflow templates</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />New Stage</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{stages.length}</div><div className="text-xs text-muted-foreground">Total Stages</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{stages.filter(s => s.isActive).length}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{stages.filter(s => s.usedInTemplates > 0).length}</div><div className="text-xs text-muted-foreground">In Use</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-600">{stages.filter(s => s.escalationHours <= 24).length}</div><div className="text-xs text-muted-foreground">≤24h SLA</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage Name</TableHead>
                <TableHead>Approver Type</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Backup</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Used In</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{typeLabel(s.approverType)}</Badge></TableCell>
                  <TableCell className="text-sm">{s.approverValue}</TableCell>
                  <TableCell>
                    <Badge className={s.approvalMode === 'single' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : s.approvalMode === 'all' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}>
                      {modeLabel(s.approvalMode)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.backupApprover || '—'}</TableCell>
                  <TableCell><span className="text-sm">{s.escalationHours}h</span></TableCell>
                  <TableCell>{s.commentsRequired ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground text-xs">Optional</span>}</TableCell>
                  <TableCell>
                    <Switch checked={s.isActive} onCheckedChange={() => toggleActive(s.id)} />
                  </TableCell>
                  <TableCell>
                    {s.usedInTemplates > 0 ? <Badge variant="secondary" className="text-xs">{s.usedInTemplates} templates</Badge> : <span className="text-xs text-muted-foreground">None</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicate(s)}><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingStage ? 'Edit Stage' : 'New Approval Stage'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Stage Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Department Manager Approval" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Approver Type *</Label>
                <Select value={form.approverType} onValueChange={v => setForm(p => ({ ...p, approverType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Specific User</SelectItem>
                    <SelectItem value="role">Role-Based</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="manager">Direct Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Approval Mode *</Label>
                <Select value={form.approvalMode} onValueChange={v => setForm(p => ({ ...p, approvalMode: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Approver</SelectItem>
                    <SelectItem value="all">All Must Approve</SelectItem>
                    <SelectItem value="majority">Majority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Approver Value *</Label><Input value={form.approverValue} onChange={e => setForm(p => ({ ...p, approverValue: e.target.value }))} placeholder="User name, role, or department" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Backup Approver</Label><Input value={form.backupApprover} onChange={e => setForm(p => ({ ...p, backupApprover: e.target.value }))} /></div>
              <div><Label>Escalation (hours)</Label><Input type="number" value={form.escalationHours} onChange={e => setForm(p => ({ ...p, escalationHours: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.commentsRequired} onCheckedChange={v => setForm(p => ({ ...p, commentsRequired: v }))} /><Label>Comments Required</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.canReject} onCheckedChange={v => setForm(p => ({ ...p, canReject: v }))} /><Label>Can Reject</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingStage ? 'Update' : 'Create'} Stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
