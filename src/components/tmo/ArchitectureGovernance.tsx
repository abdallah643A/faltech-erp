import { useState } from 'react';
import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: Record<string, string> = {
  proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deprecated: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  superseded: 'bg-muted text-muted-foreground',
};

export function ArchitectureGovernance() {
  const { decisions, techAssets, createDecision } = useTMOPortfolio();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    adr_number: '', title: '', context: '', decision: '', consequences: '',
    category: 'general', decided_by: '', related_tech_asset_id: '', compliance_score: 80,
  });

  const nextADR = `ADR-${String(decisions.length + 1).padStart(3, '0')}`;

  const handleSubmit = () => {
    if (!form.title) return;
    createDecision.mutate({
      ...form,
      adr_number: form.adr_number || nextADR,
      related_tech_asset_id: form.related_tech_asset_id || null,
      status: 'proposed',
      created_by: user?.id,
    } as any);
    setIsOpen(false);
    setForm({ adr_number: '', title: '', context: '', decision: '', consequences: '', category: 'general', decided_by: '', related_tech_asset_id: '', compliance_score: 80 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Architecture Decision Records</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> New ADR</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ADR #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Decided By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No architecture decisions recorded</TableCell></TableRow>
              ) : decisions.map(adr => (
                <TableRow key={adr.id}>
                  <TableCell className="font-mono text-sm">{adr.adr_number || '—'}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{adr.title}</p>
                      {adr.context && <p className="text-xs text-muted-foreground line-clamp-1">{adr.context}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{adr.category}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[adr.status] || ''}>{adr.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${adr.compliance_score >= 80 ? 'bg-emerald-500' : adr.compliance_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{adr.compliance_score}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{adr.decided_by || '—'}</TableCell>
                  <TableCell className="text-sm">{adr.decided_at || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Architecture Decision Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ADR Number</Label><Input value={form.adr_number} onChange={e => setForm({...form, adr_number: e.target.value})} placeholder={nextADR} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['general','infrastructure','application','integration','security','data'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Context</Label><Textarea value={form.context} onChange={e => setForm({...form, context: e.target.value})} rows={2} placeholder="What is the issue or context?" /></div>
            <div><Label>Decision</Label><Textarea value={form.decision} onChange={e => setForm({...form, decision: e.target.value})} rows={2} placeholder="What was decided?" /></div>
            <div><Label>Consequences</Label><Textarea value={form.consequences} onChange={e => setForm({...form, consequences: e.target.value})} rows={2} placeholder="What are the implications?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Decided By</Label><Input value={form.decided_by} onChange={e => setForm({...form, decided_by: e.target.value})} /></div>
              <div><Label>Compliance Score (0-100)</Label><Input type="number" min={0} max={100} value={form.compliance_score} onChange={e => setForm({...form, compliance_score: Number(e.target.value)})} /></div>
            </div>
            <div><Label>Related Tech Asset</Label>
              <Select value={form.related_tech_asset_id} onValueChange={v => setForm({...form, related_tech_asset_id: v})}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {techAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.title}>Create ADR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
