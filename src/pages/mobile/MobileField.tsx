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
import { SignaturePad } from "@/components/mobile/SignaturePad";
import { useOfflineMutation } from "@/hooks/useOfflineMutation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Wrench, MapPin, Plus, X, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Part {
  id: string;
  code: string;
  qty: number;
}

/**
 * /m/field — Field service visit.
 * Scan-first: scan job ID, optional asset ID, then GPS check-in,
 * record parts used, capture photo + signature, check-out.
 * One offline-aware payload per visit.
 */
export default function MobileField() {
  const { enqueue, online } = useOfflineMutation();
  const geo = useGeolocation();

  const [jobId, setJobId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [summary, setSummary] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [signature, setSignature] = useState<string | null>(null);
  const [checkInAt, setCheckInAt] = useState<string | null>(null);

  const addPart = (code: string) =>
    setParts((p) => {
      const existing = p.find((x) => x.code === code);
      if (existing) return p.map((x) => (x.id === existing.id ? { ...x, qty: x.qty + 1 } : x));
      return [...p, { id: crypto.randomUUID(), code, qty: 1 }];
    });
  const removePart = (id: string) => setParts((p) => p.filter((x) => x.id !== id));

  const checkIn = async () => {
    if (!jobId) return toast.error("Scan a job ID first");
    await geo.capture();
    setCheckInAt(new Date().toISOString());
    toast.success("Checked in");
  };

  const checkOut = async () => {
    if (!checkInAt) return toast.error("Check in first");
    if (!summary) return toast.error("Add a work summary");
    const point = geo.point ?? (await geo.capture());

    await enqueue({
      module: "field_ops",
      entity: "mobile_sync_queue",
      table: "mobile_sync_queue",
      operation: "insert",
      payload: {
        module: "field_ops",
        entity: "service_visit",
        operation: "insert",
        payload: {
          job_id: jobId,
          asset_id: assetId || null,
          summary,
          parts,
          photo,
          signature,
          location: point,
          check_in_at: checkInAt,
          check_out_at: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    toast.success(online ? "Visit submitted" : "Saved offline");
    setJobId(""); setAssetId(""); setSummary(""); setParts([]);
    setPhoto(undefined); setSignature(null); setCheckInAt(null);
  };

  return (
    <MobileLayout title="Field · Service Visit" back>
      <Card className="p-3 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-1">
          <Wrench className="h-4 w-4" /> Job
        </p>
        <BarcodeScanner onScan={setJobId} label="Scan job ID / work order" />
        {jobId && <Badge variant="secondary" className="font-mono text-xs">Job: {jobId}</Badge>}
        <Label className="text-xs">Asset ID (optional)</Label>
        <Input value={assetId} onChange={(e) => setAssetId(e.target.value)} className="h-9" />
      </Card>

      <Card className="p-3 flex items-center justify-between gap-2">
        <div className="flex-1 text-xs">
          <p className="font-semibold flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {checkInAt ? "Checked in" : "Not on site"}
          </p>
          <p className="text-muted-foreground truncate">
            {geo.point
              ? `${geo.point.lat.toFixed(5)}, ${geo.point.lng.toFixed(5)}`
              : "Location pending"}
          </p>
        </div>
        {!checkInAt ? (
          <Button size="sm" onClick={checkIn} className="gap-1">
            <LogIn className="h-3 w-3" /> Check in
          </Button>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {new Date(checkInAt).toLocaleTimeString()}
          </Badge>
        )}
      </Card>

      <Card className="p-3 space-y-2">
        <p className="text-sm font-semibold">Parts used</p>
        <BarcodeScanner onScan={addPart} label="Scan part barcode" />
        {parts.length > 0 && (
          <div className="space-y-1">
            {parts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border">
                <p className="flex-1 text-sm font-mono truncate">{p.code}</p>
                <span className="text-sm font-semibold">×{p.qty}</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removePart(p.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-3 space-y-2">
        <Label className="text-xs">Work summary</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="What was done, findings, next steps…"
        />
      </Card>

      <CameraCapture label="Evidence photo" onCapture={setPhoto} />
      <SignaturePad label="Customer signature" onChange={setSignature} />

      <Button className="w-full h-11 gap-1" onClick={checkOut} disabled={!checkInAt}>
        <LogOut className="h-4 w-4" />
        {online ? "Check out & submit" : "Check out (offline)"}
      </Button>
    </MobileLayout>
  );
}
