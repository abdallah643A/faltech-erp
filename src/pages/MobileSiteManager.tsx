import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HardHat, FileText, Package, Camera, MapPin, Sun, Cloud, CloudRain, Wind,
  Plus, Send, Clock, CheckCircle, ChevronLeft, Users, AlertTriangle, Truck,
  ClipboardList, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { MobileBottomNav } from '@/components/cpms/mobile/MobileBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MobileSiteManager() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['site-projects', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_projects').select('id, project_name, project_number, status').in('status', ['active', 'in_progress']);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.order('project_name');
      return (data || []) as any[];
    },
  });

  const [selectedProject, setSelectedProject] = useState<string>('');

  // Fetch today's progress reports
  const { data: todayReports = [] } = useQuery({
    queryKey: ['site-daily-progress', selectedProject, activeCompanyId],
    enabled: !!selectedProject,
    queryFn: async () => {
      let q = (supabase.from('site_daily_progress') as any).select('*').eq('project_id', selectedProject).order('report_date', { ascending: false }).limit(10);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // Fetch material arrivals
  const { data: arrivals = [] } = useQuery({
    queryKey: ['site-material-arrivals', selectedProject, activeCompanyId],
    enabled: !!selectedProject,
    queryFn: async () => {
      let q = (supabase.from('site_material_arrivals') as any).select('*').eq('project_id', selectedProject).order('arrival_date', { ascending: false }).limit(20);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  // GPS
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const getLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => toast({ title: 'GPS unavailable', variant: 'destructive' }),
        { enableHighAccuracy: true }
      );
    }
  }, [toast]);

  useEffect(() => { getLocation(); }, [getLocation]);

  // Daily Progress form
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({
    weather: 'sunny', workforce_count: '', subcontractor_count: '',
    work_summary: '', work_areas: '', delays: '', safety_incidents: '0', safety_notes: '', equipment_used: '',
  });

  const submitProgress = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('site_daily_progress') as any).insert({
        ...data,
        project_id: selectedProject,
        company_id: activeCompanyId || undefined,
        gps_lat: gps?.lat, gps_lng: gps?.lng, gps_accuracy: gps?.accuracy,
        status: 'submitted', submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-daily-progress'] });
      toast({ title: 'Daily report submitted ✅' });
      setShowProgressForm(false);
      setProgressForm({ weather: 'sunny', workforce_count: '', subcontractor_count: '', work_summary: '', work_areas: '', delays: '', safety_incidents: '0', safety_notes: '', equipment_used: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Material Arrival form
  const [showArrivalForm, setShowArrivalForm] = useState(false);
  const [arrivalForm, setArrivalForm] = useState({
    material_name: '', quantity: '', unit: 'pcs', supplier_name: '',
    delivery_note_number: '', condition: 'good', condition_notes: '', po_reference: '',
  });

  const submitArrival = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('site_material_arrivals') as any).insert({
        ...data,
        quantity: parseFloat(data.quantity) || 0,
        project_id: selectedProject,
        company_id: activeCompanyId || undefined,
        gps_lat: gps?.lat, gps_lng: gps?.lng,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-material-arrivals'] });
      toast({ title: 'Material arrival logged ✅' });
      setShowArrivalForm(false);
      setArrivalForm({ material_name: '', quantity: '', unit: 'pcs', supplier_name: '', delivery_note_number: '', condition: 'good', condition_notes: '', po_reference: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const weatherIcons: Record<string, React.ElementType> = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, windy: Wind };
  const selectedProjectName = projects.find(p => p.id === selectedProject)?.project_name || 'Select Project';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')} className="min-h-[44px] min-w-[44px]">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2"><HardHat className="h-5 w-5 text-primary" /> Site Manager</h1>
            <p className="text-xs text-muted-foreground">Field Operations</p>
          </div>
          {gps && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" /> GPS ✓
            </Badge>
          )}
        </div>

        {/* Project Selector */}
        <div className="mt-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.project_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProject ? (
        <div className="p-6 text-center text-muted-foreground">
          <HardHat className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a project to start</p>
          <p className="text-sm">Choose an active project from the dropdown above</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-20 flex-col gap-2 text-sm"
              onClick={() => setShowProgressForm(true)}
            >
              <ClipboardList className="h-6 w-6" />
              Daily Report
            </Button>
            <Button
              variant="secondary"
              className="h-20 flex-col gap-2 text-sm"
              onClick={() => setShowArrivalForm(true)}
            >
              <Truck className="h-6 w-6" />
              Material Arrival
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 text-sm"
              onClick={() => navigate('/cpms/mobile/photos')}
            >
              <Camera className="h-6 w-6" />
              Site Photos
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 text-sm"
              onClick={() => navigate('/cpms/mobile/time')}
            >
              <Clock className="h-6 w-6" />
              Time Clock
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="reports" className="space-y-3">
            <TabsList className="w-full">
              <TabsTrigger value="reports" className="flex-1 min-h-[40px]">
                <FileText className="h-4 w-4 mr-1" /> Reports
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex-1 min-h-[40px]">
                <Package className="h-4 w-4 mr-1" /> Materials
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-3">
              {todayReports.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No reports yet. Tap "Daily Report" to start.</p>
                  </CardContent>
                </Card>
              ) : todayReports.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{format(new Date(r.report_date), 'dd MMM yyyy')}</span>
                      <Badge variant={r.status === 'submitted' ? 'default' : 'secondary'} className="text-xs">
                        {r.status === 'submitted' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {r.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        {(() => { const W = weatherIcons[r.weather] || Sun; return <W className="h-3 w-3" />; })()}
                        {r.weather}
                      </div>
                      <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.workforce_count || 0}</div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {r.safety_incidents || 0} incidents
                      </div>
                    </div>
                    {r.work_summary && <p className="text-sm line-clamp-2">{r.work_summary}</p>}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="materials" className="space-y-3">
              {arrivals.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No arrivals logged. Tap "Material Arrival" to log one.</p>
                  </CardContent>
                </Card>
              ) : arrivals.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{a.material_name}</span>
                      <Badge variant={a.condition === 'good' ? 'default' : 'destructive'} className="text-xs">{a.condition}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{a.quantity} {a.unit} • {a.supplier_name || 'Unknown supplier'}</p>
                      <p>{format(new Date(a.arrival_date), 'dd MMM yyyy')}{a.delivery_note_number ? ` • DN: ${a.delivery_note_number}` : ''}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Daily Progress Dialog */}
      <Dialog open={showProgressForm} onOpenChange={setShowProgressForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Daily Site Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Weather</Label>
                <Select value={progressForm.weather} onValueChange={v => setProgressForm(f => ({ ...f, weather: v }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunny">☀️ Sunny</SelectItem>
                    <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                    <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                    <SelectItem value="windy">💨 Windy</SelectItem>
                    <SelectItem value="dusty">🌫️ Dusty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Safety Incidents</Label>
                <Input type="number" min="0" className="min-h-[44px]"
                  value={progressForm.safety_incidents}
                  onChange={e => setProgressForm(f => ({ ...f, safety_incidents: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Workers on Site</Label>
                <Input type="number" min="0" className="min-h-[44px]" placeholder="0"
                  value={progressForm.workforce_count}
                  onChange={e => setProgressForm(f => ({ ...f, workforce_count: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subcontractors</Label>
                <Input type="number" min="0" className="min-h-[44px]" placeholder="0"
                  value={progressForm.subcontractor_count}
                  onChange={e => setProgressForm(f => ({ ...f, subcontractor_count: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Work Summary *</Label>
              <Textarea className="min-h-[80px]" placeholder="Describe today's work progress..."
                value={progressForm.work_summary}
                onChange={e => setProgressForm(f => ({ ...f, work_summary: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Work Areas</Label>
              <Input className="min-h-[44px]" placeholder="e.g. Zone A Foundation, Zone B Steel"
                value={progressForm.work_areas}
                onChange={e => setProgressForm(f => ({ ...f, work_areas: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Delays / Issues</Label>
              <Textarea className="min-h-[60px]" placeholder="Any delays or issues..."
                value={progressForm.delays}
                onChange={e => setProgressForm(f => ({ ...f, delays: e.target.value }))} />
            </div>

            {parseInt(progressForm.safety_incidents) > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-destructive">Safety Incident Details *</Label>
                <Textarea className="min-h-[60px] border-destructive" placeholder="Describe safety incidents..."
                  value={progressForm.safety_notes}
                  onChange={e => setProgressForm(f => ({ ...f, safety_notes: e.target.value }))} />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Equipment Used</Label>
              <Input className="min-h-[44px]" placeholder="e.g. Crane, Excavator, Mixer"
                value={progressForm.equipment_used}
                onChange={e => setProgressForm(f => ({ ...f, equipment_used: e.target.value }))} />
            </div>

            {gps && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} (±{gps.accuracy.toFixed(0)}m)
              </div>
            )}

            <Button
              className="w-full min-h-[48px]"
              disabled={!progressForm.work_summary || submitProgress.isPending}
              onClick={() => submitProgress.mutate({
                weather: progressForm.weather,
                workforce_count: parseInt(progressForm.workforce_count) || 0,
                subcontractor_count: parseInt(progressForm.subcontractor_count) || 0,
                work_summary: progressForm.work_summary,
                work_areas: progressForm.work_areas,
                delays: progressForm.delays,
                safety_incidents: parseInt(progressForm.safety_incidents) || 0,
                safety_notes: progressForm.safety_notes,
                equipment_used: progressForm.equipment_used,
              })}
            >
              {submitProgress.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Arrival Dialog */}
      <Dialog open={showArrivalForm} onOpenChange={setShowArrivalForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Log Material Arrival</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Material Name *</Label>
              <Input className="min-h-[44px]" placeholder="e.g. Steel Bars 12mm"
                value={arrivalForm.material_name}
                onChange={e => setArrivalForm(f => ({ ...f, material_name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantity *</Label>
                <Input type="number" className="min-h-[44px]" placeholder="0"
                  value={arrivalForm.quantity}
                  onChange={e => setArrivalForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select value={arrivalForm.unit} onValueChange={v => setArrivalForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="ton">Tons</SelectItem>
                    <SelectItem value="m3">m³</SelectItem>
                    <SelectItem value="m2">m²</SelectItem>
                    <SelectItem value="bags">Bags</SelectItem>
                    <SelectItem value="rolls">Rolls</SelectItem>
                    <SelectItem value="trips">Trips</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Supplier</Label>
              <Input className="min-h-[44px]" placeholder="Supplier name"
                value={arrivalForm.supplier_name}
                onChange={e => setArrivalForm(f => ({ ...f, supplier_name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Delivery Note #</Label>
                <Input className="min-h-[44px]" placeholder="DN number"
                  value={arrivalForm.delivery_note_number}
                  onChange={e => setArrivalForm(f => ({ ...f, delivery_note_number: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PO Reference</Label>
                <Input className="min-h-[44px]" placeholder="PO number"
                  value={arrivalForm.po_reference}
                  onChange={e => setArrivalForm(f => ({ ...f, po_reference: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Condition</Label>
              <Select value={arrivalForm.condition} onValueChange={v => setArrivalForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">✅ Good</SelectItem>
                  <SelectItem value="damaged">⚠️ Damaged</SelectItem>
                  <SelectItem value="partial">📦 Partial Delivery</SelectItem>
                  <SelectItem value="rejected">❌ Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {arrivalForm.condition !== 'good' && (
              <div className="space-y-1">
                <Label className="text-xs text-destructive">Condition Notes *</Label>
                <Textarea className="min-h-[60px] border-destructive" placeholder="Describe the issue..."
                  value={arrivalForm.condition_notes}
                  onChange={e => setArrivalForm(f => ({ ...f, condition_notes: e.target.value }))} />
              </div>
            )}

            {gps && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </div>
            )}

            <Button
              className="w-full min-h-[48px]"
              disabled={!arrivalForm.material_name || !arrivalForm.quantity || submitArrival.isPending}
              onClick={() => submitArrival.mutate(arrivalForm)}
            >
              {submitArrival.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
              Log Arrival
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}
