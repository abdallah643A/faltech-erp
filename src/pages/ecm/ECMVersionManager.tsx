import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useECMVersions } from "@/hooks/useECMVersions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { History, Upload, Download, FileText } from "lucide-react";
import { format } from "date-fns";

export default function ECMVersionManager() {
  const { id } = useParams<{ id: string }>();
  const { versions, uploadVersion, downloadVersion } = useECMVersions(id);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"major" | "minor">("minor");
  const [comment, setComment] = useState("");

  const { data: doc } = useQuery({
    queryKey: ["ecm-document", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("ecm_documents").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!file) return;
    await uploadVersion.mutateAsync({ file, versionType: type, comment });
    setOpen(false);
    setFile(null);
    setComment("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Version History
          </h1>
          <p className="text-muted-foreground">
            {doc ? <>Document: <strong>{doc.title}</strong> · Current v{doc.current_version_number}</> : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!id}>
          <Upload className="h-4 w-4 mr-2" />
          Upload New Version
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Versions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.data?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-bold">v{v.version_number}</TableCell>
                  <TableCell><Badge variant={v.version_type === "major" ? "default" : "secondary"}>{v.version_type}</Badge></TableCell>
                  <TableCell className="text-sm max-w-md truncate">{v.comment ?? "—"}</TableCell>
                  <TableCell className="text-sm">{(v.file_size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell className="text-sm">{format(new Date(v.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => downloadVersion(v.file_path)}>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {versions.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No versions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload New Version</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>File</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Version Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "major" | "minor")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor (1.x)</SelectItem>
                  <SelectItem value="major">Major (x.0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Change Comment</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What changed in this version?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!file || uploadVersion.isPending}>
              {uploadVersion.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
