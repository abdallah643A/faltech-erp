import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Settings2, Sparkles } from 'lucide-react';
import { useTreasReconRules } from '@/hooks/useTreasuryEnhanced';

export default function ReconRulesEngine() {
  const { data: rules = [], upsert, toggle } = useTreasReconRules();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    priority: 100, match_scope: 'ar_ap', confidence_threshold: 80, is_active: true,
    conditions: { amount_tolerance: 0, date_window_days: 7 },
    actions: { auto_post: false, suggest_only: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation Rules Engine</h1>
          <p className="text-muted-foreground">Priority-driven matching: exact reference, amount tolerance, regex, counterparty, GL auto-post</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Rule</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{rules.length}</p><p className="text-xs text-muted-foreground">Total Rules</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{rules.filter((r: any) => r.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{rules.filter((r: any) => r.actions?.auto_post).length}</p><p className="text-xs text-muted-foreground">Auto-Post</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{rules.reduce((s: number, r: any) => s + (r.hits_count || 0), 0)}</p><p className="text-xs text-muted-foreground">Total Hits</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Rules (priority order)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Hits</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.priority}</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium">{r.rule_name}</div>
                    <div className="text-xs text-muted-foreground">{r.rule_description}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{r.match_scope}</Badge></TableCell>
                  <TableCell>{r.confidence_threshold}%</TableCell>
                  <TableCell>
                    {r.actions?.auto_post ? <Badge><Sparkles className="h-3 w-3 mr-1" />Auto-post</Badge> : <Badge variant="outline">Suggest</Badge>}
                  </TableCell>
                  <TableCell>{r.hits_count || 0}</TableCell>
                  <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })} /></TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No rules defined</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Recon Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input value={draft.rule_name || ''} onChange={(e) => setDraft({ ...draft, rule_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={draft.rule_description || ''} onChange={(e) => setDraft({ ...draft, rule_description: e.target.value })} /></div>
            <div><Label>Priority</Label><Input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} /></div>
            <div>
              <Label>Scope</Label>
              <Select value={draft.match_scope} onValueChange={(v) => setDraft({ ...draft, match_scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['ar', 'ap', 'ar_ap', 'gl', 'intercompany'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Confidence Threshold (%)</Label><Input type="number" value={draft.confidence_threshold} onChange={(e) => setDraft({ ...draft, confidence_threshold: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={draft.actions?.auto_post} onCheckedChange={(v) => setDraft({ ...draft, actions: { ...draft.actions, auto_post: v, suggest_only: !v } })} /><Label>Auto-post on match</Label></div>
            <div className="col-span-2"><Label>Conditions (JSON)</Label><Textarea rows={4} className="font-mono text-xs" value={JSON.stringify(draft.conditions, null, 2)} onChange={(e) => { try { setDraft({ ...draft, conditions: JSON.parse(e.target.value) }); } catch {} }} /></div>
            <div className="col-span-2"><Label>Actions (JSON)</Label><Textarea rows={3} className="font-mono text-xs" value={JSON.stringify(draft.actions, null, 2)} onChange={(e) => { try { setDraft({ ...draft, actions: JSON.parse(e.target.value) }); } catch {} }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={upsert.isPending || !draft.rule_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
