import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  useApprovalTemplates, useUpsertApprovalTemplate,
  useApprovalTemplateSteps, useUpsertTemplateStep,
} from "@/hooks/useGovernanceSuite";
import { Plus, Layers, Edit } from "lucide-react";

export default function ApprovalTemplatesPage() {
  const { data: templates = [] } = useApprovalTemplates();
  const upsert = useUpsertApprovalTemplate();
  const upsertStep = useUpsertTemplateStep();

  const [editing, setEditing] = useState<any | null>(null);
  const [stepDialog, setStepDialog] = useState<any | null>(null);
  const { data: steps = [] } = useApprovalTemplateSteps(stepDialog?.id);

  const save = async (form: any) => {
    await upsert.mutateAsync(form);
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable multi-step approval flows with SLAs, escalation, and delegation rules.
          </p>
        </div>
        <Button onClick={() => setEditing({ name: "", entity_type: "", default_sla_hours: 48, escalation_hours: 24, allow_delegation: true, is_active: true })}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Delegation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No templates yet</TableCell></TableRow>
              )}
              {templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.name}
                    {t.template_name_ar && <span className="text-xs text-muted-foreground ms-2">/ {t.template_name_ar}</span>}
                  </TableCell>
                  <TableCell className="text-xs">{t.entity_type ?? t.document_type ?? "—"}</TableCell>
                  <TableCell>{t.default_sla_hours ?? t.sla_hours ?? "—"}h</TableCell>
                  <TableCell>{t.escalation_hours ?? "—"}h</TableCell>
                  <TableCell>{t.allow_delegation ? "✓" : "—"}</TableCell>
                  <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setStepDialog(t)}><Layers className="w-3 h-3 mr-1" /> Steps</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Edit className="w-3 h-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} approval template</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs">Name</label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs">Arabic name</label>
                <Input value={editing.template_name_ar ?? ""} onChange={(e) => setEditing({ ...editing, template_name_ar: e.target.value })} />
              </div>
              <div>
                <label className="text-xs">Entity type</label>
                <Input value={editing.entity_type ?? ""} onChange={(e) => setEditing({ ...editing, entity_type: e.target.value })} placeholder="ar_invoice, po, jv…" />
              </div>
              <div>
                <label className="text-xs">SLA hours</label>
                <Input type="number" value={editing.default_sla_hours ?? 48} onChange={(e) => setEditing({ ...editing, default_sla_hours: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs">Escalation hours</label>
                <Input type="number" value={editing.escalation_hours ?? 24} onChange={(e) => setEditing({ ...editing, escalation_hours: +e.target.value })} />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch checked={!!editing.allow_delegation} onCheckedChange={(v) => setEditing({ ...editing, allow_delegation: v })} />
                <span className="text-sm">Allow delegation</span>
              </div>
              <div className="col-span-2">
                <label className="text-xs">Description</label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save(editing)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stepDialog} onOpenChange={(o) => !o && setStepDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Steps — {stepDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {steps.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 p-2 border rounded">
                <Badge variant="outline">{s.step_order}</Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm">{s.step_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.approver_type} · {s.approver_value ?? "—"} · {s.approval_mode} · SLA {s.sla_hours ?? "default"}h
                  </div>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                const order = (steps?.length ?? 0) + 1;
                upsertStep.mutate({
                  template_id: stepDialog.id,
                  step_order: order,
                  step_name: `Step ${order}`,
                  approver_type: "user",
                  approval_mode: "any",
                });
              }}
            >
              <Plus className="w-3 h-3 mr-1" /> Add step
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
