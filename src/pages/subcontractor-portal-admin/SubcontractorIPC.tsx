import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorPackages, useIPCs, useUpsertIPC } from "@/hooks/useSubcontractorPortal";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function SubcontractorIPC() {
  const { data: packages = [] } = useSubcontractorPackages();
  const [pkgId, setPkgId] = useState<string | undefined>();
  const { data: ipcs = [] } = useIPCs(pkgId);
  const upsert = useUpsertIPC();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ current_certified: 0, retention_pct: 5, period_start: "", period_end: "" });

  const create = async () => {
    if (!pkgId) return;
    await upsert.mutateAsync({ ...form, package_id: pkgId, gross_value: form.current_certified });
    setOpen(false);
    setForm({ current_certified: 0, retention_pct: 5, period_start: "", period_end: "" });
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IPC & Retention</h1>
          <p className="text-sm text-muted-foreground">Interim Payment Certificates with auto-calculated retention.</p>
        </div>
        <div className="flex gap-2">
          <Select value={pkgId} onValueChange={setPkgId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select package" /></SelectTrigger>
            <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.package_code} — {p.package_name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" disabled={!pkgId}><Plus className="h-4 w-4 mr-1" /> New IPC</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New IPC</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} /></div>
                  <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} /></div>
                </div>
                <div><Label>Current Certified</Label><Input type="number" value={form.current_certified} onChange={e => setForm({ ...form, current_certified: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Retention %</Label><Input type="number" value={form.retention_pct} onChange={e => setForm({ ...form, retention_pct: parseFloat(e.target.value) || 0 })} /></div>
                <Button className="w-full" onClick={create}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{ipcs.length} IPC{ipcs.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>IPC #</TableHead><TableHead>Period</TableHead><TableHead>Certified</TableHead>
              <TableHead>Retention</TableHead><TableHead>Net Payable</TableHead>
              <TableHead>Status</TableHead><TableHead>Invoice</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {ipcs.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.ipc_number ?? i.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{i.period_start ? `${format(new Date(i.period_start), "MMM d")} – ${i.period_end ? format(new Date(i.period_end), "MMM d") : ""}` : "—"}</TableCell>
                  <TableCell>{i.current_certified?.toLocaleString()} {i.currency}</TableCell>
                  <TableCell className="text-orange-600">{i.retention_amount?.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{i.net_payable?.toLocaleString()}</TableCell>
                  <TableCell><Badge>{i.status}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{i.invoice_status ?? "—"}</Badge></TableCell>
                </TableRow>
              ))}
              {ipcs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{pkgId ? "No IPCs yet" : "Select a package"}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
