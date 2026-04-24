import { useState } from 'react';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function IssueLog() {
  const { issues, risks, createIssue } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ project_id: '', risk_id: '', title: '', description: '', severity: 'medium', owner_name: '', due_date: '' });

  const handleSubmit = () => {
    if (!form.project_id || !form.title) return;
    createIssue.mutate({ ...form, risk_id: form.risk_id || null, due_date: form.due_date || null, created_by: user?.id });
    setIsOpen(false);
    setForm({ project_id: '', risk_id: '', title: '', description: '', severity: 'medium', owner_name: '', due_date: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-500" /> Issue Log</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Log Issue</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No issues logged</TableCell></TableRow>
              ) : issues.map(issue => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{issue.title}</TableCell>
                  <TableCell className="text-sm">{projects.find(p => p.id === issue.project_id)?.name || '—'}</TableCell>
                  <TableCell><Badge className={severityColors[issue.severity]}>{issue.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{issue.status}</Badge></TableCell>
                  <TableCell className="text-sm">{issue.owner_name || '—'}</TableCell>
                  <TableCell>{issue.escalation_level > 0 ? <Badge variant="destructive">L{issue.escalation_level}</Badge> : '—'}</TableCell>
                  <TableCell className="text-sm">{issue.due_date || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Issue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project *</Label>
              <Select value={form.project_id} onValueChange={v => setForm({...form, project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>From Risk (optional)</Label>
              <Select value={form.risk_id} onValueChange={v => setForm({...form, risk_id: v})}>
                <SelectTrigger><SelectValue placeholder="Link to risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {risks.filter(r => r.project_id === form.project_id).map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            </div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.project_id || !form.title}>Log Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
