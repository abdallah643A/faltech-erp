import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorPackages, useUpsertPackage } from "@/hooks/useSubcontractorPortal";
import { Plus } from "lucide-react";

export default function SubcontractorPackages() {
  const { data: packages = [] } = useSubcontractorPackages();
  const upsert = useUpsertPackage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ package_code: "", package_name: "", contract_value: 0, retention_pct: 5, currency: "SAR" });

  const submit = async () => {
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ package_code: "", package_name: "", contract_value: 0, retention_pct: 5, currency: "SAR" });
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subcontractor Packages</h1>
          <p className="text-sm text-muted-foreground">Awarded work packages with retention rules.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Package</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Package</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={form.package_code} onChange={e => setForm({ ...form, package_code: e.target.value })} /></div>
              <div><Label>Name (EN)</Label><Input value={form.package_name} onChange={e => setForm({ ...form, package_name: e.target.value })} /></div>
              <div><Label>Name (AR)</Label><Input dir="rtl" value={form.package_name_ar ?? ""} onChange={e => setForm({ ...form, package_name_ar: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Contract Value</Label><Input type="number" value={form.contract_value} onChange={e => setForm({ ...form, contract_value: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Retention %</Label><Input type="number" value={form.retention_pct} onChange={e => setForm({ ...form, retention_pct: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <Button className="w-full" onClick={submit}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>{packages.length} packages</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Value</TableHead>
              <TableHead>Retention</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {packages.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.package_code}</TableCell>
                  <TableCell>{p.package_name}</TableCell>
                  <TableCell>{p.contract_value?.toLocaleString()} {p.currency}</TableCell>
                  <TableCell>{p.retention_pct}%</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
              {packages.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No packages yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
