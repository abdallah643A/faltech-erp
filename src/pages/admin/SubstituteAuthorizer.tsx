import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Edit, Trash2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const mockSubstitutes = [
  { id: '1', original: 'Manager A (ahmed@co.com)', substitute: 'Manager B (sara@co.com)', modules: 'All', templates: 'All', startDate: '2026-04-15', endDate: '2026-04-25', reason: 'Annual leave', active: true, branch: 'All' },
  { id: '2', original: 'CFO (cfo@co.com)', substitute: 'Finance Director (fd@co.com)', modules: 'Finance, Purchasing', templates: 'APT-001, APT-004', startDate: '2026-04-20', endDate: '2026-04-22', reason: 'Business travel', active: true, branch: 'HQ' },
  { id: '3', original: 'HR Lead (hr@co.com)', substitute: 'HR Manager (hrm@co.com)', modules: 'HR', templates: 'APT-003', startDate: '2026-03-10', endDate: '2026-03-15', reason: 'Sick leave', active: false, branch: 'All' },
];

export default function SubstituteAuthorizer() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Substitute Authorizer</h1><p className="text-sm text-muted-foreground">Temporary delegation of approval authority</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Substitution</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Substitute Assignment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Original Approver</Label><Select><SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger><SelectContent><SelectItem value="manager-a">Manager A (ahmed@co.com)</SelectItem><SelectItem value="cfo">CFO (cfo@co.com)</SelectItem></SelectContent></Select></div>
              <div><Label>Substitute Approver</Label><Select><SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger><SelectContent><SelectItem value="manager-b">Manager B (sara@co.com)</SelectItem><SelectItem value="fd">Finance Director (fd@co.com)</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" /></div>
                <div><Label>End Date</Label><Input type="date" /></div>
              </div>
              <div><Label>Applicable Modules</Label><Select><SelectTrigger><SelectValue placeholder="All Modules" /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem><SelectItem value="finance">Finance</SelectItem><SelectItem value="purchasing">Purchasing</SelectItem><SelectItem value="hr">HR</SelectItem></SelectContent></Select></div>
              <div><Label>Branch Scope</Label><Select><SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem><SelectItem value="hq">HQ</SelectItem></SelectContent></Select></div>
              <div><Label>Reason</Label><Textarea placeholder="Reason for delegation..." /></div>
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 text-amber-700 text-xs rounded"><AlertTriangle className="h-3.5 w-3.5" /> Both users will be notified of this delegation</div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => { setDialogOpen(false); toast.success('Substitution created'); }}><Save className="h-4 w-4 mr-1" /> Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>Original Approver</TableHead><TableHead>Substitute</TableHead><TableHead>Modules</TableHead><TableHead>Templates</TableHead><TableHead>Period</TableHead><TableHead>Reason</TableHead><TableHead>Branch</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{mockSubstitutes.map(s => (
          <TableRow key={s.id}>
            <TableCell className="text-xs">{s.original}</TableCell>
            <TableCell className="text-xs">{s.substitute}</TableCell>
            <TableCell className="text-xs">{s.modules}</TableCell>
            <TableCell className="text-xs">{s.templates}</TableCell>
            <TableCell className="text-xs">{s.startDate} → {s.endDate}</TableCell>
            <TableCell className="text-xs">{s.reason}</TableCell>
            <TableCell className="text-xs">{s.branch}</TableCell>
            <TableCell><Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Active' : 'Expired'}</Badge></TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );
}
