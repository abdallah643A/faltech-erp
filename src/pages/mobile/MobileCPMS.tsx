import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { CameraCapture } from "@/components/mobile/CameraCapture";
import { BarcodeScanner } from "@/components/mobile/BarcodeScanner";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { HardHat, MapPin, Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Issue {
  id: string;
  severity: "low" | "med" | "high";
  note: string;
  photo?: string;
}

/**
 * /m/cpms — Site Ops daily report + QA/QC issues.
 * - Scan a WBS/site barcode to anchor the report.
 * - Capture progress %, hours, weather notes.
 * - Add QA/QC issues with severity + photo evidence.
 * - Saves through useOfflineMutation → shared sync queue with LWW.
 */
export default function MobileCPMS() {
  const { enqueue, online } = useOfflineMutation();
  const geo = useGeolocation();

  const [wbs, setWbs] = useState("");
  const [progress, setProgress] = useState("");
  const [crewHours, setCrewHours] = useState("");
  const [weather, setWeather] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [issues, setIssues] = useState<Issue[]>([]);

  const addIssue = () =>
    setIssues((p) => [...p, { id: crypto.randomUUID(), severity: "med", note: "" }]);
  const removeIssue = (id: string) => setIssues((p) => p.filter((i) => i.id !== id));
  const patchIssue = (id: string, patch: Partial<Issue>) =>
    setIssues((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const save = async () => {
    if (!wbs) return toast.error("Scan or enter a WBS / site code");
    if (!progress) return toast.error("Enter today's progress %");
    const point = geo.point ?? (await geo.capture());

    await enqueue({
      module: "cpms",
      entity: "mobile_sync_queue",
      table: "mobile_sync_queue",
      operation: "insert",
      payload: {
        module: "cpms",
        entity: "site_daily_report",
        operation: "insert",
        payload: {
          wbs,
          progress: Number(progress),
          crew_hours: Number(crewHours) || 0,
          weather,
          notes,
          photo,
          issues,
          location: point,
          captured_at: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    toast.success(online ? "Report submitted" : "Saved offline");
    setWbs(""); setProgress(""); setCrewHours(""); setWeather("");
    setNotes(""); setPhoto(undefined); setIssues([]);
  };

  return (
    <MobileLayout title="Site · Daily Report" back>
      <BarcodeScanner onScan={setWbs} label="Scan WBS / site code" />
      {wbs && (
        <Badge variant="secondary" className="font-mono text-xs">
          WBS: {wbs}
        </Badge>
      )}

      <Card className="p-3 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1">
          <HardHat className="h-4 w-4" /> Today's progress
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Progress %</Label>
            <Input
              type="number" inputMode="decimal" min={0} max={100}
              value={progress} onChange={(e) => setProgress(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Crew hours</Label>
            <Input
              type="number" inputMode="decimal" min={0}
              value={crewHours} onChange={(e) => setCrewHours(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Weather / conditions</Label>
          <Input value={weather} onChange={(e) => setWeather(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </Card>

      <CameraCapture label="Site photo" onCapture={setPhoto} />

      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> QA / QC issues
          </p>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={addIssue}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">No issues logged.</p>
        ) : (
          issues.map((i) => (
            <div key={i.id} className="border rounded-md p-2 space-y-2">
              <div className="flex gap-1">
                {(["low", "med", "high"] as const).map((s) => (
                  <Button
                    key={s} size="sm"
                    variant={i.severity === s ? "default" : "outline"}
                    className="h-7 flex-1 text-[11px] uppercase"
                    onClick={() => patchIssue(i.id, { severity: s })}
                  >
                    {s}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeIssue(i.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                placeholder="Describe the issue…"
                value={i.note}
                onChange={(e) => patchIssue(i.id, { note: e.target.value })}
                rows={2}
              />
            </div>
          ))
        )}
      </Card>

      <Card className="p-3 flex items-center justify-between">
        <div className="text-xs">
          <p className="font-semibold flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location
          </p>
          <p className="text-muted-foreground">
            {geo.point
              ? `${geo.point.lat.toFixed(5)}, ${geo.point.lng.toFixed(5)} (±${Math.round(geo.point.accuracy)}m)`
              : geo.error ?? "Not captured"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => geo.capture()} disabled={geo.loading}>
          {geo.loading ? "…" : "Pin"}
        </Button>
      </Card>

      <Button className="w-full h-11" onClick={save}>
        {online ? "Submit report" : "Save offline"}
      </Button>
    </MobileLayout>
  );
}
