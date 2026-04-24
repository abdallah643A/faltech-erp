import { useState } from 'react';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, FolderKanban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-muted text-muted-foreground',
};

export function ProgramManager() {
  const { programs, portfolioItems, createProgram } = usePMOPortfolio();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', strategic_objective: '', total_budget: 0 });

  const handleSubmit = () => {
    if (!form.name) return;
    createProgram.mutate({ ...form, created_by: user?.id, status: 'active' });
    setIsOpen(false);
    setForm({ name: '', description: '', priority: 'medium', strategic_objective: '', total_budget: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><FolderKanban className="h-5 w-5 text-primary" /> Program Management</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Program</Button>
      </div>

      <div className="grid gap-4">
        {programs.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No programs created yet. Programs group related projects for aggregate tracking.</CardContent></Card>
        ) : programs.map(program => {
          const projectsInProgram = portfolioItems.filter(p => p.program_id === program.id);
          return (
            <Card key={program.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{program.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[program.status] || ''}>{program.status}</Badge>
                    <Badge variant="outline">{program.priority}</Badge>
                  </div>
                </div>
                {program.description && <p className="text-sm text-muted-foreground">{program.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div><span className="text-muted-foreground">Strategic Objective:</span> <span className="font-medium">{program.strategic_objective || '—'}</span></div>
                  <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium">{program.total_budget?.toLocaleString()} SAR</span></div>
                  <div><span className="text-muted-foreground">Projects:</span> <span className="font-medium">{projectsInProgram.length}</span></div>
                </div>
                {projectsInProgram.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {projectsInProgram.map(p => (
                      <Badge key={p.id} variant="secondary" className="text-xs">{p.project?.name || 'Project'}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Program</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Strategic Objective</Label><Input value={form.strategic_objective} onChange={e => setForm({...form, strategic_objective: e.target.value})} /></div>
            <div><Label>Total Budget</Label><Input type="number" value={form.total_budget} onChange={e => setForm({...form, total_budget: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
