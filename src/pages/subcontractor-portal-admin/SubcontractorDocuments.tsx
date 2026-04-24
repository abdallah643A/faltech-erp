import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSubcontractorPackages, useSubconDocuments, useUploadSubconDoc } from "@/hooks/useSubcontractorPortal";
import { Upload } from "lucide-react";
import { format } from "date-fns";

const DOC_TYPES = ["drawing", "shop_drawing", "method_statement", "transmittal", "material_submittal", "test_report", "as_built"];

export default function SubcontractorDocuments() {
  const { data: packages = [] } = useSubcontractorPackages();
  const [pkgId, setPkgId] = useState<string | undefined>();
  const { data: docs = [] } = useSubconDocuments(pkgId);
  const upload = useUploadSubconDoc();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ doc_type: "drawing", title: "", revision: "", direction: "main_to_subcontractor" });
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!pkgId || !file) return;
    await upload.mutateAsync({ ...form, package_id: pkgId, file });
    setOpen(false); setFile(null); setForm({ doc_type: "drawing", title: "", revision: "", direction: "main_to_subcontractor" });
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Exchange</h1>
          <p className="text-sm text-muted-foreground">Drawings, shop drawings, method statements, transmittals — both directions.</p>
        </div>
        <div className="flex gap-2">
          <Select value={pkgId} onValueChange={setPkgId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select package" /></SelectTrigger>
            <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.package_code} — {p.package_name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" disabled={!pkgId}><Upload className="h-4 w-4 mr-1" /> Upload</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Type</Label>
                    <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Revision</Label><Input value={form.revision} onChange={e => setForm({ ...form, revision: e.target.value })} /></div>
                </div>
                <div><Label>File</Label><Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
                <Button className="w-full" onClick={submit} disabled={!file || !form.title}>Upload</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{docs.length} document{docs.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Rev</TableHead>
              <TableHead>Direction</TableHead><TableHead>Status</TableHead><TableHead>Uploaded</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {docs.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell><Badge variant="outline">{d.doc_type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-xs">{d.revision ?? "—"}</TableCell>
                  <TableCell className="text-xs">{d.direction.replace(/_/g, " → ")}</TableCell>
                  <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                  <TableCell className="text-xs">{format(new Date(d.uploaded_at), "MMM d HH:mm")}</TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{pkgId ? "No documents yet" : "Select a package"}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
