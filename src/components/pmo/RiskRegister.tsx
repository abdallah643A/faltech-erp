import { useState } from 'react';
import { usePMOPortfolio, PMORisk } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const riskScoreColor = (score: number) => {
  if (score >= 20) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (score >= 12) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  if (score >= 6) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
};

export function RiskRegister() {
  const { risks, createRisk, updateRisk } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    project_id: '', title: '', description: '', category: 'general',
    probability: 3, impact: 3, owner_name: '', mitigation_plan: '', contingency_plan: '',
  });

  const handleSubmit = () => {
    if (!form.project_id || !form.title) return;
    createRisk.mutate({
      ...form,
      probability: Number(form.probability),
      impact: Number(form.impact),
      created_by: user?.id,
    });
    setIsOpen(false);
    setForm({ project_id: '', title: '', description: '', category: 'general', probability: 3, impact: 3, owner_name: '', mitigation_plan: '', contingency_plan: '' });
  };

  // Build 5x5 heat map summary
  const heatMap: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.forEach(r => { if (r.status !== 'closed' && r.status !== 'resolved') heatMap[r.probability - 1][r.impact - 1]++; });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" /> Risk Register
        </h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Register Risk</Button>
      </div>

      {/* Mini Heat Map */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Heat Map (Probability × Impact)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-0.5 max-w-xs">
            <div />
            {[1,2,3,4,5].map(i => <div key={i} className="text-[10px] text-center text-muted-foreground">I{i}</div>)}
            {[5,4,3,2,1].map(p => (
              <>
                <div key={`l${p}`} className="text-[10px] text-muted-foreground flex items-center">P{p}</div>
                {[1,2,3,4,5].map(i => {
                  const count = heatMap[p-1][i-1];
                  const score = p * i;
                  return (
                    <div key={`${p}-${i}`} className={`h-8 w-full rounded text-[10px] flex items-center justify-center font-medium ${riskScoreColor(score)}`}>
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>P</TableHead>
                <TableHead>I</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No risks registered</TableCell></TableRow>
              ) : risks.map(risk => (
                <TableRow key={risk.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{risk.title}</TableCell>
                  <TableCell className="text-sm">{projects.find(p => p.id === risk.project_id)?.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{risk.category}</Badge></TableCell>
                  <TableCell>{risk.probability}</TableCell>
                  <TableCell>{risk.impact}</TableCell>
                  <TableCell><Badge className={riskScoreColor(risk.risk_score)}>{risk.risk_score}</Badge></TableCell>
                  <TableCell className="text-sm">{risk.owner_name || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{risk.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Register New Risk</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Project *</Label>
              <Select value={form.project_id} onValueChange={v => setForm({...form, project_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['general','technical','financial','resource','schedule','external','regulatory'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Probability (1-5)</Label>
                <Select value={String(form.probability)} onValueChange={v => setForm({...form, probability: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact (1-5)</Label>
                <Select value={String(form.impact)} onValueChange={v => setForm({...form, impact: Number(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} /></div>
            <div><Label>Mitigation Plan</Label><Textarea value={form.mitigation_plan} onChange={e => setForm({...form, mitigation_plan: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createRisk.isPending}>Register Risk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
