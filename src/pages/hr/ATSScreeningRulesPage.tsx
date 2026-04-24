import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Filter } from 'lucide-react';
import { useATSScreeningRules } from '@/hooks/useHREnhanced';

export default function ATSScreeningRulesPage() {
  const { data: rules = [], upsert } = useATSScreeningRules();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ rule_type: 'auto_screen', auto_action: 'flag', weight: 10, is_active: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Filter className="h-6 w-6 text-primary" />ATS Screening Rules</h1>
          <p className="text-muted-foreground">Auto-filter unqualified candidates by criteria</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Rule</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Rule</TableHead><TableHead>Type</TableHead><TableHead>Min Exp</TableHead>
              <TableHead>Education</TableHead><TableHead>Keywords</TableHead><TableHead>Action</TableHead>
              <TableHead>Weight</TableHead><TableHead>Active</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rule_name}</TableCell>
                  <TableCell><Badge variant="outline">{r.rule_type}</Badge></TableCell>
                  <TableCell>{r.min_years_experience ? `${r.min_years_experience}y` : '—'}</TableCell>
                  <TableCell className="text-xs">{r.required_education_level || '—'}</TableCell>
                  <TableCell className="text-xs">{(r.required_keywords || []).slice(0, 3).join(', ') || '—'}</TableCell>
                  <TableCell><Badge variant={r.auto_action === 'reject' ? 'destructive' : r.auto_action === 'advance' ? 'default' : 'secondary'}>{r.auto_action}</Badge></TableCell>
                  <TableCell>{r.weight}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Yes' : 'No'}</Badge></TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No rules</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Screening Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Rule Name</Label><Input value={draft.rule_name || ''} onChange={(e) => setDraft({ ...draft, rule_name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.rule_type} onValueChange={(v) => setDraft({ ...draft, rule_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['auto_screen', 'qualification', 'preference', 'disqualifier'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auto Action</Label>
              <Select value={draft.auto_action} onValueChange={(v) => setDraft({ ...draft, auto_action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['flag', 'advance', 'reject', 'review'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Min Years Experience</Label><Input type="number" step="0.5" value={draft.min_years_experience || ''} onChange={(e) => setDraft({ ...draft, min_years_experience: Number(e.target.value) })} /></div>
            <div><Label>Education Level</Label><Input value={draft.required_education_level || ''} onChange={(e) => setDraft({ ...draft, required_education_level: e.target.value })} placeholder="bachelor, master, phd…" /></div>
            <div className="col-span-2"><Label>Required Keywords (comma)</Label><Input value={(draft.required_keywords || []).join(',')} onChange={(e) => setDraft({ ...draft, required_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="React, Node, AWS" /></div>
            <div className="col-span-2"><Label>Blocked Keywords</Label><Input value={(draft.blocked_keywords || []).join(',')} onChange={(e) => setDraft({ ...draft, blocked_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
            <div><Label>Max Expected Salary</Label><Input type="number" value={draft.max_expected_salary || ''} onChange={(e) => setDraft({ ...draft, max_expected_salary: Number(e.target.value) })} /></div>
            <div><Label>Weight (1-100)</Label><Input type="number" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.rule_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
