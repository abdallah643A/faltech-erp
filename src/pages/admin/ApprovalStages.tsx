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
import { Layers, Plus, Edit, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const mockStages = [
  { id: '1', code: 'STG-001', name: 'Department Head Review', sequence: 1, approverType: 'Role', approver: 'Department Manager', mode: 'single', escalationHours: 24, commentsRequired: true, active: true },
  { id: '2', code: 'STG-002', name: 'Finance Review', sequence: 2, approverType: 'Role', approver: 'Finance Manager', mode: 'single', escalationHours: 48, commentsRequired: false, active: true },
  { id: '3', code: 'STG-003', name: 'Director Approval', sequence: 3, approverType: 'Role', approver: 'Director', mode: 'all', escalationHours: 72, commentsRequired: true, active: true },
  { id: '4', code: 'STG-004', name: 'CFO Sign-off', sequence: 4, approverType: 'User', approver: 'cfo@company.com', mode: 'single', escalationHours: 48, commentsRequired: true, active: false },
];

export default function ApprovalStages() {
  const [stages] = useState(mockStages);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6" /> Approval Stages</h1><p className="text-sm text-muted-foreground">Define reusable approval steps for workflow templates</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Stage</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Approval Stage</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Stage Code</Label><Input placeholder="STG-005" /></div>
                <div><Label>Stage Name</Label><Input placeholder="VP Approval" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Sequence</Label><Input type="number" defaultValue={5} /></div>
                <div><Label>Approver Type</Label><Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="role">Role</SelectItem><SelectItem value="user">Specific User</SelectItem><SelectItem value="department">Department Head</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Approver</Label><Input placeholder="Role name or user email" /></div>
                <div><Label>Approval Mode</Label><Select><SelectTrigger><SelectValue placeholder="Single" /></SelectTrigger><SelectContent><SelectItem value="single">Single Approver</SelectItem><SelectItem value="all">All Must Approve</SelectItem><SelectItem value="majority">Majority</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Escalation After (hours)</Label><Input type="number" defaultValue={24} /></div>
                <div><Label>Backup Approver</Label><Input placeholder="Optional" /></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch id="comments" /><Label htmlFor="comments">Comments Required</Label></div>
                <div className="flex items-center gap-2"><Switch id="attachment" /><Label htmlFor="attachment">Attachment Required</Label></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => { setDialogOpen(false); toast.success('Stage created'); }}><Save className="h-4 w-4 mr-1" /> Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Seq</TableHead><TableHead>Approver Type</TableHead><TableHead>Approver</TableHead><TableHead>Mode</TableHead><TableHead>Escalation</TableHead><TableHead>Comments</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>{stages.map(s => (
          <TableRow key={s.id}>
            <TableCell className="font-mono text-xs">{s.code}</TableCell>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell>{s.sequence}</TableCell>
            <TableCell><Badge variant="outline">{s.approverType}</Badge></TableCell>
            <TableCell className="text-xs">{s.approver}</TableCell>
            <TableCell className="capitalize">{s.mode}</TableCell>
            <TableCell>{s.escalationHours}h</TableCell>
            <TableCell>{s.commentsRequired ? '✓' : '—'}</TableCell>
            <TableCell><Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Active' : 'Inactive'}</Badge></TableCell>
            <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );
}
