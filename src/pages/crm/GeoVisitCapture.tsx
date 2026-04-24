import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MapPin, Camera, LogIn, LogOut, Upload, Loader2, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeoCheckIn, useUploadVisitEvidence, useVisitEvidence } from "@/hooks/useVisitEvidence";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export default function GeoVisitCapture() {
  const [visitId, setVisitId] = useState<string>("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: visits = [] } = useQuery({
    queryKey: ["visits-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("visits")
        .select("id, visit_number, status, scheduled_date, customer_name")
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const checkIn = useGeoCheckIn();
  const upload = useUploadVisitEvidence();
  const { data: evidence = [] } = useVisitEvidence(visitId);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        toast.error(err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  useEffect(() => { captureLocation(); }, []);

  const handleAction = (direction: "in" | "out") => {
    if (!visitId) { toast.error("Select a visit"); return; }
    if (!coords) { toast.error("Capture your location first"); return; }
    checkIn.mutate({
      visitId,
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy,
      direction,
    });
  };

  const handleUpload = (file: File) => {
    if (!visitId) { toast.error("Select a visit"); return; }
    upload.mutate({
      visitId,
      file,
      lat: coords?.lat,
      lng: coords?.lng,
    });
  };

  return (
    <div className="page-enter space-y-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Geo-Tagged Visit Capture
      </h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Location</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {coords ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Lat:</span> {coords.lat.toFixed(6)}{" "}
                <span className="text-muted-foreground ml-3">Lng:</span> {coords.lng.toFixed(6)}
              </p>
              {coords.accuracy && (
                <Badge variant="outline" className="text-xs">
                  ± {Math.round(coords.accuracy)} m
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No location captured</p>
          )}
          <Button size="sm" variant="outline" onClick={captureLocation} disabled={locating}>
            {locating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-2" />}
            Refresh GPS
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Select Visit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Today's visits</Label>
            <Select value={visitId} onValueChange={setVisitId}>
              <SelectTrigger><SelectValue placeholder="Select a scheduled visit" /></SelectTrigger>
              <SelectContent>
                {visits.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">No visits scheduled today</div>
                ) : (
                  visits.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.visit_number} — {v.customer_name ?? ""} ({v.status})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleAction("in")}
              disabled={!visitId || !coords || checkIn.isPending}
              className="gap-1.5"
            >
              <LogIn className="h-4 w-4" /> Check In
            </Button>
            <Button
              onClick={() => handleAction("out")}
              disabled={!visitId || !coords || checkIn.isPending}
              variant="secondary"
              className="gap-1.5"
            >
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evidence</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!visitId || upload.isPending}
              variant="outline"
              className="gap-1.5"
            >
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Take Photo
            </Button>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!visitId || upload.isPending}
              variant="outline"
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" /> Upload File
            </Button>
          </div>

          {evidence.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground">Uploaded ({evidence.length})</p>
              {evidence.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs border border-muted rounded p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span className="flex-1 truncate">{e.file_name ?? e.file_type}</span>
                  <a href={e.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
