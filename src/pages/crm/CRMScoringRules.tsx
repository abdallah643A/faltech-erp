import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useScoringRules, useUpsertScoringRule, useApproveScoringRule } from "@/hooks/useCRMGovernance";
import { Plus, CheckCircle2, Star } from "lucide-react";

export default function CRMScoringRules() {
  const { data: rules = [] } = useScoringRules();
  const upsert = useUpsertScoringRule();
  const approve = useApproveScoringRule();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ rule_name: "", weight: 10, category: "fit", condition_field: "", condition_operator: "=", condition_value: {}, requires_approval: true });

  const save = async () => { await upsert.mutateAsync(form); setOpen(false); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-5 w-5" /> Lead Scoring Rules</h1>
          <p className="text-sm text-muted-foreground">Governed scoring rules with approval before activation.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New rule</Button>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="border-b">
            <th className="text-left px-4 py-2 font-medium">Rule</th>
            <th className="text-left px-4 py-2 font-medium">Category</th>
            <th className="text-left px-4 py-2 font-medium">Weight</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-right px-4 py-2 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {rules.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No rules yet</td></tr>
              : rules.map((r:any) => (
              <tr key={r.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{r.rule_name}</td>
                <td className="px-4 py-2"><Badge variant="outline">{r.category}</Badge></td>
                <td className="px-4 py-2">{r.weight}</td>
                <td className="px-4 py-2">
                  {r.is_active ? <Badge>Active</Badge> : r.requires_approval && !r.approved_at ? <Badge variant="secondary">Pending approval</Badge> : <Badge variant="outline">Inactive</Badge>}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.requires_approval && !r.approved_at && (
                    <Button size="sm" onClick={() => approve.mutate(r.id)}><CheckCircle2 className="h-3 w-3 mr-1" /> Approve</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New scoring rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.rule_name} onChange={e=>setForm({...form, rule_name: e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v=>setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit</SelectItem>
                    <SelectItem value="behavior">Behavior</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="recency">Recency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Weight</Label><Input type="number" value={form.weight} onChange={e=>setForm({...form, weight: Number(e.target.value)})}/></div>
            </div>
            <div><Label>Condition field</Label><Input placeholder="e.g. email" value={form.condition_field} onChange={e=>setForm({...form, condition_field: e.target.value})}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
