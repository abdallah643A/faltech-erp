import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubcontractorPackages, useSubmitProgress } from "@/hooks/useSubcontractorPortal";
import { enqueue, flushQueue } from "@/lib/subcontractorOfflineQueue";
import { supabase } from "@/integrations/supabase/client";
import { Camera, MapPin, WifiOff, Wifi, Send } from "lucide-react";
import { toast } from "sonner";

export default function SubPortalSiteCapture() {
  const { data: packages = [] } = useSubcontractorPackages();
  const submit = useSubmitProgress();
  const [pkgId, setPkgId] = useState<string | undefined>();
  const [wbsCode, setWbsCode] = useState("");
  const [pct, setPct] = useState(0);
  const [foreman, setForeman] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [gps, setGps] = useState<{ lat?: number; lng?: number }>({});
  const [online, setOnline] = useState(navigator.onLine);
  const fileRef = useRef<HTMLInputElement>(null);

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error("GPS not available");
    navigator.geolocation.getCurrentPosition(
      p => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("GPS captured"); },
      () => toast.error("Failed to get GPS")
    );
  };

  const uploadPhotos = async () => {
    const urls: { url: string; lat?: number; lng?: number }[] = [];
    for (const file of photos) {
      const path = `${pkgId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("subcontractor-photos").upload(path, file);
      if (!error) urls.push({ url: path, lat: gps.lat, lng: gps.lng });
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!pkgId || !wbsCode) return toast.error("Package & WBS code required");
    const submission = {
      package_id: pkgId, wbs_code: wbsCode, current_pct: pct,
      foreman_name: foreman, notes, gps_lat: gps.lat, gps_lng: gps.lng,
    };

    if (!navigator.onLine) {
      // Note: photos themselves can't be queued without storing blobs; we queue metadata only here.
      await enqueue({ kind: "progress", payload: { submission, photos: [] } });
      toast.success("Saved offline — will sync when online");
      reset();
      return;
    }

    const uploadedPhotos = photos.length ? await uploadPhotos() : [];
    await submit.mutateAsync({ submission, photos: uploadedPhotos });
    reset();
  };

  const reset = () => { setWbsCode(""); setPct(0); setNotes(""); setPhotos([]); setGps({}); };

  const sync = async () => {
    const count = await flushQueue({
      progress: async (p) => { await submit.mutateAsync(p); },
      qa: async () => {},
      hse: async () => {},
    });
    toast.success(`Synced ${count} item(s)`);
  };

  // Listen for online/offline
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Site Progress Capture</h1>
        <div className="flex items-center gap-2">
          {online ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-destructive" />}
          {online && <Button size="sm" variant="ghost" onClick={sync}><Send className="h-3 w-3 mr-1" /> Sync</Button>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">New WBS submission</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Package</Label>
            <Select value={pkgId} onValueChange={setPkgId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.package_code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>WBS Code</Label><Input value={wbsCode} onChange={e => setWbsCode(e.target.value)} /></div>
          <div><Label>% Complete (this period)</Label><Input type="number" min={0} max={100} value={pct} onChange={e => setPct(parseFloat(e.target.value) || 0)} /></div>
          <div><Label>Foreman Name (signature)</Label><Input value={foreman} onChange={e => setForeman(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={captureGPS}>
              <MapPin className="h-3 w-3 mr-1" /> {gps.lat ? `${gps.lat.toFixed(4)}, ${gps.lng?.toFixed(4)}` : "Capture GPS"}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}>
              <Camera className="h-3 w-3 mr-1" /> {photos.length ? `${photos.length} photo(s)` : "Add Photos"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden"
              onChange={e => setPhotos(Array.from(e.target.files ?? []))} />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Submitting..." : online ? "Submit" : "Save offline"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
