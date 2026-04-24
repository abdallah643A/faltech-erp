import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Users, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Substitution {
  id: string;
  originalApprover: string;
  substituteApprover: string;
  scope: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
  status: 'scheduled' | 'active' | 'expired';
  decisionsCount: number;
}

const MOCK_SUBS: Substitution[] = [
  { id: '1', originalApprover: 'Sara Finance', substituteApprover: 'Mohammad CFO', scope: 'All Templates', startDate: '2026-04-15', endDate: '2026-04-22', reason: 'Annual leave', isActive: true, status: 'scheduled', decisionsCount: 0 },
  { id: '2', originalApprover: 'Nora Manager', substituteApprover: 'VP Operations', scope: 'Purchase Orders Only', startDate: '2026-04-10', endDate: '2026-04-14', reason: 'Business travel', isActive: true, status: 'active', decisionsCount: 3 },
  { id: '3', originalApprover: 'CEO Office', substituteApprover: 'Sara Finance', scope: 'Below 100K', startDate: '2026-03-01', endDate: '2026-03-05', reason: 'Conference', isActive: false, status: 'expired', decisionsCount: 2 },
];

export default function SubstituteAuthorizer() {
  const [subs, setSubs] = useState(MOCK_SUBS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ originalApprover: '', substituteApprover: '', scope: 'All Templates', startDate: '', endDate: '', reason: '' });

  const handleSave = () => {
    if (!form.originalApprover || !form.substituteApprover || !form.startDate || !form.endDate) {
      toast.error('All fields are required');
      return;
    }
    if (form.originalApprover === form.substituteApprover) {
      toast.error('Original and substitute cannot be the same person');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    // Check overlap
    const overlap = subs.find(s => s.originalApprover === form.originalApprover && s.status !== 'expired' && new Date(s.startDate) <= new Date(form.endDate) && new Date(s.endDate) >= new Date(form.startDate));
    if (overlap) {
      toast.error(`Overlapping substitution exists for ${form.originalApprover}`);
      return;
    }
    setSubs(prev => [...prev, { id: crypto.randomUUID(), ...form, isActive: true, status: 'scheduled', decisionsCount: 0 }]);
    toast.success('Substitution created. Both parties will be notified.');
    setDialogOpen(false);
    setForm({ originalApprover: '', substituteApprover: '', scope: 'All Templates', startDate: '', endDate: '', reason: '' });
  };

  const deactivate = (id: string) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, isActive: false, status: 'expired' } : s));
    toast.success('Substitution deactivated');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Substitute Authorizer</h1>
          <p className="text-sm text-muted-foreground">Delegate approval authority temporarily during absence or leave</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />New Substitution</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{subs.length}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{subs.filter(s => s.status === 'active').length}</div><div className="text-xs text-muted-foreground">Currently Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-600">{subs.filter(s => s.status === 'scheduled').length}</div><div className="text-xs text-muted-foreground">Scheduled</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{subs.reduce((s, x) => s + x.decisionsCount, 0)}</div><div className="text-xs text-muted-foreground">Decisions by Subs</div></CardContent></Card>
      </div>

      {subs.filter(s => s.status === 'active').length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-blue-500" />Active Substitutions</h3>
            {subs.filter(s => s.status === 'active').map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="text-sm font-medium">{s.substituteApprover}</span>
                  <span className="text-xs text-muted-foreground"> acting for </span>
                  <span className="text-sm font-medium">{s.originalApprover}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{s.startDate} → {s.endDate}</span>
                  <Badge variant="secondary" className="text-xs">{s.decisionsCount} decisions</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original Approver</TableHead>
                <TableHead>Substitute</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Decisions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.originalApprover}</TableCell>
                  <TableCell className="text-sm">{s.substituteApprover}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.scope}</Badge></TableCell>
                  <TableCell className="text-sm">{s.startDate}</TableCell>
                  <TableCell className="text-sm">{s.endDate}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.reason}</TableCell>
                  <TableCell className="text-sm">{s.decisionsCount}</TableCell>
                  <TableCell>
                    {s.status === 'active' && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>}
                    {s.status === 'scheduled' && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</Badge>}
                    {s.status === 'expired' && <Badge variant="secondary">Expired</Badge>}
                  </TableCell>
                  <TableCell>
                    {s.status !== 'expired' && <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deactivate(s.id)}>Deactivate</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Approval Substitution</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Original Approver *</Label><Input value={form.originalApprover} onChange={e => setForm(p => ({ ...p, originalApprover: e.target.value }))} placeholder="Select approver..." /></div>
            <div><Label>Substitute Approver *</Label><Input value={form.substituteApprover} onChange={e => setForm(p => ({ ...p, substituteApprover: e.target.value }))} placeholder="Select substitute..." /></div>
            <div><Label>Scope</Label>
              <Select value={form.scope} onValueChange={v => setForm(p => ({ ...p, scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Templates">All Templates</SelectItem>
                  <SelectItem value="Purchase Orders Only">Purchase Orders Only</SelectItem>
                  <SelectItem value="Sales Orders Only">Sales Orders Only</SelectItem>
                  <SelectItem value="Below 100K">Below 100K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Annual leave" /></div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Important:</strong> The substitute will receive approval authority equal to the original approver's level. Both parties will be notified via email. All decisions made by the substitute will be logged with audit trail.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Substitution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
