import { useState } from "react";
import { useCRMSegments, useUpsertSegment } from "@/hooks/useCRMLifecycle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users, Loader2 } from "lucide-react";

export default function CRMSegments() {
  const { data: segments, isLoading } = useCRMSegments();
  const upsert = useUpsertSegment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ segment_code: "", name: "", name_ar: "", description: "", color: "#3B82F6" });

  const handleSave = async () => {
    if (!form.segment_code || !form.name) return;
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ segment_code: "", name: "", name_ar: "", description: "", color: "#3B82F6" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Lifecycle Segments</h1>
          <p className="text-muted-foreground mt-1">Group accounts by lifecycle stage, value tier, or behavior.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Segment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Segment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code *</Label><Input value={form.segment_code} onChange={e => setForm({ ...form, segment_code: e.target.value })} placeholder="VIP, AT_RISK, NEW" /></div>
              <div><Label>Name (EN) *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Name (AR)</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} dir="rtl" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Color</Label><Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></div>
              <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
                {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments?.map(s => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: s.color || "hsl(var(--primary))" }} />
                    {s.name}
                  </CardTitle>
                  <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_dynamic ? "Dynamic" : "Static"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{s.description || "—"}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" /> <span className="font-semibold">{s.member_count ?? 0}</span> members
                </div>
                <p className="text-xs text-muted-foreground mt-2">Code: {s.segment_code}</p>
              </CardContent>
            </Card>
          ))}
          {segments?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">No segments yet. Create your first one.</p>
          )}
        </div>
      )}
    </div>
  );
}
