import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubcontractorPackages, useSubmitQA, useSubmitHSE } from "@/hooks/useSubcontractorPortal";
import { ClipboardCheck, ShieldAlert, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function SubPortalSiteForms() {
  const { data: packages = [] } = useSubcontractorPackages();
  const qa = useSubmitQA();
  const hse = useSubmitHSE();
  const [pkgId, setPkgId] = useState<string | undefined>();

  // QA state
  const [qaForm, setQaForm] = useState<any>({ inspection_type: "", inspector_name: "", location: "", notes: "" });
  // HSE state
  const [hseForm, setHseForm] = useState<any>({ submission_type: "incident", severity: "low", title: "", description: "", location: "" });

  const captureGPS = (setter: (g: any) => void) => {
    navigator.geolocation.getCurrentPosition(
      p => { setter((f: any) => ({ ...f, gps_lat: p.coords.latitude, gps_lng: p.coords.longitude })); toast.success("GPS captured"); },
      () => toast.error("GPS failed")
    );
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Site Forms</h1>
      <div>
        <Label>Package</Label>
        <Select value={pkgId} onValueChange={setPkgId}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.package_code}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="qa">
        <TabsList className="w-full">
          <TabsTrigger value="qa" className="flex-1"><ClipboardCheck className="h-4 w-4 mr-1" /> QA / QC</TabsTrigger>
          <TabsTrigger value="hse" className="flex-1"><ShieldAlert className="h-4 w-4 mr-1" /> HSE</TabsTrigger>
        </TabsList>

        <TabsContent value="qa">
          <Card>
            <CardHeader><CardTitle className="text-base">Inspection</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Inspection Type</Label><Input value={qaForm.inspection_type} onChange={e => setQaForm({ ...qaForm, inspection_type: e.target.value })} /></div>
              <div><Label>Inspector Name</Label><Input value={qaForm.inspector_name} onChange={e => setQaForm({ ...qaForm, inspector_name: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={qaForm.location} onChange={e => setQaForm({ ...qaForm, location: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={qaForm.notes} onChange={e => setQaForm({ ...qaForm, notes: e.target.value })} /></div>
              <Button variant="outline" size="sm" onClick={() => captureGPS(setQaForm)}><MapPin className="h-3 w-3 mr-1" /> {qaForm.gps_lat ? "GPS captured" : "Capture GPS"}</Button>
              <Button className="w-full" onClick={async () => {
                if (!pkgId) return toast.error("Select package");
                await qa.mutateAsync({ ...qaForm, package_id: pkgId });
                setQaForm({ inspection_type: "", inspector_name: "", location: "", notes: "" });
              }}>Submit Inspection</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hse">
          <Card>
            <CardHeader><CardTitle className="text-base">HSE Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Type</Label>
                <Select value={hseForm.submission_type} onValueChange={v => setHseForm({ ...hseForm, submission_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="near_miss">Near miss</SelectItem>
                    <SelectItem value="toolbox_talk">Toolbox talk</SelectItem>
                    <SelectItem value="safety_observation">Safety observation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={hseForm.severity} onValueChange={v => setHseForm({ ...hseForm, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={hseForm.title} onChange={e => setHseForm({ ...hseForm, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={hseForm.description} onChange={e => setHseForm({ ...hseForm, description: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={hseForm.location} onChange={e => setHseForm({ ...hseForm, location: e.target.value })} /></div>
              <Button variant="outline" size="sm" onClick={() => captureGPS(setHseForm)}><MapPin className="h-3 w-3 mr-1" /> {hseForm.gps_lat ? "GPS captured" : "Capture GPS"}</Button>
              <Button className="w-full" onClick={async () => {
                if (!pkgId) return toast.error("Select package");
                await hse.mutateAsync({ ...hseForm, package_id: pkgId, occurred_at: new Date().toISOString() });
                setHseForm({ submission_type: "incident", severity: "low", title: "", description: "", location: "" });
              }}>Submit HSE</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
