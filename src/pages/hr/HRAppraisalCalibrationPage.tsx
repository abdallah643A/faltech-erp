import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Grid3x3, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppraisalCycles, useAppraisals, useCalibrationAdjust } from "@/hooks/useHRLifecycle";

const NINE_BOX = [
  { cell: 7, label: "Future Star",     desc: "Hi Perf · Hi Pot",  tone: "bg-success/20" },
  { cell: 8, label: "Consistent Star", desc: "Hi Perf · Med Pot", tone: "bg-success/30" },
  { cell: 9, label: "Star",            desc: "Hi Perf · Hi Pot",  tone: "bg-success/40" },
  { cell: 4, label: "Inconsistent",    desc: "Med Perf · Hi Pot", tone: "bg-warning/20" },
  { cell: 5, label: "Core Player",     desc: "Med Perf · Med",    tone: "bg-warning/30" },
  { cell: 6, label: "High Impact",     desc: "Med Perf · Hi Pot", tone: "bg-warning/40" },
  { cell: 1, label: "Risk",            desc: "Lo Perf · Hi Pot",  tone: "bg-destructive/20" },
  { cell: 2, label: "Effective",       desc: "Lo Perf · Med Pot", tone: "bg-destructive/15" },
  { cell: 3, label: "Trusted Pro",     desc: "Lo Perf · Lo Pot",  tone: "bg-destructive/10" },
];

export default function HRAppraisalCalibrationPage() {
  const { data: cycles = [] } = useAppraisalCycles();
  const [cycleId, setCycleId] = useState<string>("");
  const { data: apprs = [] } = useAppraisals(cycleId);
  const adjust = useCalibrationAdjust();
  const [editing, setEditing] = useState<any | null>(null);
  const [newCell, setNewCell] = useState<number>(5);
  const [rationale, setRationale] = useState("");
  const [sessionId, setSessionId] = useState("");

  const byCell = (cell: number) => apprs.filter((a: any) => (a.calibrated_nine_box_cell ?? a.nine_box_cell) === cell);

  return (
    <div className="page-enter p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-primary" /> 9-Box Calibration
        </h1>
        <div className="w-72">
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger><SelectValue placeholder="Select appraisal cycle" /></SelectTrigger>
            <SelectContent>
              {cycles.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.cycle_name} ({c.fiscal_year})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!cycleId ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Select a cycle to view the 9-box grid</CardContent></Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {NINE_BOX.map((box) => {
            const list = byCell(box.cell);
            return (
              <Card key={box.cell} className={`${box.tone} min-h-32`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center justify-between">
                    {box.label}
                    <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground">{box.desc}</p>
                </CardHeader>
                <CardContent className="space-y-1">
                  {list.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={() => { setEditing(a); setNewCell(a.calibrated_nine_box_cell ?? a.nine_box_cell ?? box.cell); setRationale(""); }}
                      className="w-full text-left text-xs bg-background/60 hover:bg-background border rounded px-2 py-1 flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      {a.employees ? `${a.employees.first_name} ${a.employees.last_name}` : "—"}
                    </button>
                  ))}
                  {list.length === 0 && <p className="text-[10px] text-muted-foreground italic">empty</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calibrate {editing?.employees ? `${editing.employees.first_name} ${editing.employees.last_name}` : "Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Session ID (calibration meeting)</Label>
              <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="UUID of session" />
              <p className="text-[10px] text-muted-foreground">Create a session first under "Calibration Sessions" if needed.</p>
            </div>
            <div className="space-y-1.5">
              <Label>New 9-box cell</Label>
              <Select value={String(newCell)} onValueChange={(v) => setNewCell(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NINE_BOX.map((b) => <SelectItem key={b.cell} value={String(b.cell)}>{b.cell} — {b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rationale (required)</Label>
              <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why is this calibration adjustment being made?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={!sessionId || !rationale || adjust.isPending}
              onClick={async () => {
                await adjust.mutateAsync({
                  session_id: sessionId,
                  appraisal_id: editing.id,
                  original_nine_box: editing.calibrated_nine_box_cell ?? editing.nine_box_cell,
                  adjusted_nine_box: newCell,
                  rationale,
                });
                setEditing(null);
              }}
            >Apply Calibration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
