import { useState } from 'react';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, GitBranch, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const depTypeLabels: Record<string, string> = {
  finish_to_start: 'Finish → Start',
  start_to_start: 'Start → Start',
  finish_to_finish: 'Finish → Finish',
  start_to_finish: 'Start → Finish',
};

export function DependencyMap() {
  const { dependencies, createDependency } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ source_project_id: '', target_project_id: '', dependency_type: 'finish_to_start', description: '', is_critical: false });

  const handleSubmit = () => {
    if (!form.source_project_id || !form.target_project_id) return;
    createDependency.mutate({ ...form, created_by: user?.id });
    setIsOpen(false);
    setForm({ source_project_id: '', target_project_id: '', dependency_type: 'finish_to_start', description: '', is_critical: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" /> Cross-Project Dependencies</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Dependency</Button>
      </div>

      {/* Visual Dependency Graph */}
      {dependencies.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dependency Graph</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dependencies.map(dep => {
                const source = projects.find(p => p.id === dep.source_project_id);
                const target = projects.find(p => p.id === dep.target_project_id);
                return (
                  <div key={dep.id} className={`flex items-center gap-3 p-2 rounded border ${dep.is_critical ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                    <Badge variant="outline" className="shrink-0">{source?.name || 'Unknown'}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <ArrowRight className="h-3 w-3" />
                      <span>{depTypeLabels[dep.dependency_type]}</span>
                    </div>
                    <Badge variant="outline" className="shrink-0">{target?.name || 'Unknown'}</Badge>
                    {dep.is_critical && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
                    {dep.description && <span className="text-xs text-muted-foreground truncate">{dep.description}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Project</TableHead>
                <TableHead>Dependency Type</TableHead>
                <TableHead>Target Project</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dependencies.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No dependencies defined</TableCell></TableRow>
              ) : dependencies.map(dep => (
                <TableRow key={dep.id}>
                  <TableCell className="font-medium">{projects.find(p => p.id === dep.source_project_id)?.name || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{depTypeLabels[dep.dependency_type]}</Badge></TableCell>
                  <TableCell className="font-medium">{projects.find(p => p.id === dep.target_project_id)?.name || '—'}</TableCell>
                  <TableCell>{dep.is_critical ? <Badge variant="destructive" className="text-xs">Yes</Badge> : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{dep.description || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Cross-Project Dependency</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Source Project *</Label>
              <Select value={form.source_project_id} onValueChange={v => setForm({...form, source_project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Target Project *</Label>
              <Select value={form.target_project_id} onValueChange={v => setForm({...form, target_project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                <SelectContent>{projects.filter(p => p.id !== form.source_project_id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Dependency Type</Label>
              <Select value={form.dependency_type} onValueChange={v => setForm({...form, dependency_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(depTypeLabels).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_critical} onCheckedChange={c => setForm({...form, is_critical: !!c})} />
              <Label>Critical dependency</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.source_project_id || !form.target_project_id}>Add Dependency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
