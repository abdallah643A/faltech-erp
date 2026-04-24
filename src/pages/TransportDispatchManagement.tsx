import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Truck, MapPin, Clock, AlertTriangle, CheckCircle, Plus, Package, Upload } from 'lucide-react';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800', in_transit: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-muted text-muted-foreground', delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800', available: 'bg-green-100 text-green-800',
  on_trip: 'bg-amber-100 text-amber-800', maintenance: 'bg-red-100 text-red-800',
};

export default function TransportDispatchManagement() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('planning');
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [tripForm, setTripForm] = useState<any>({ driver_name: '', route_name: '', planned_departure: '', notes: '' });
  const [vehicleForm, setVehicleForm] = useState<any>({ plate_number: '', vehicle_type: 'truck', driver_name: '' });

  const { data: trips = [] } = useQuery({
    queryKey: ['dispatch-trips', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('dispatch_trips' as any).select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['dispatch-vehicles', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('dispatch_vehicles' as any).select('*').eq('company_id', activeCompanyId!).order('plate_number'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: stops = [] } = useQuery({
    queryKey: ['dispatch-stops', activeCompanyId],
    queryFn: async () => {
      const tripIds = trips.map(t => t.id);
      if (!tripIds.length) return [];
      const { data, error } = await (supabase.from('dispatch_trip_stops' as any).select('*').in('trip_id', tripIds).order('stop_order'));
      if (error) throw error;
      return data as any[];
    },
    enabled: trips.length > 0,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['dispatch-incidents', activeCompanyId],
    queryFn: async () => {
      const tripIds = trips.map(t => t.id);
      if (!tripIds.length) return [];
      const { data, error } = await (supabase.from('dispatch_delay_incidents' as any).select('*').in('trip_id', tripIds).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: trips.length > 0,
  });

  const createTrip = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('dispatch_trips' as any).insert({ company_id: activeCompanyId, ...form }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dispatch-trips'] }); setShowTripDialog(false); toast({ title: 'Trip created' }); },
  });

  const updateTrip = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { error } = await (supabase.from('dispatch_trips' as any).update(u).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dispatch-trips'] }); toast({ title: 'Trip updated' }); },
  });

  const createVehicle = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('dispatch_vehicles' as any).insert({ company_id: activeCompanyId, ...form }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dispatch-vehicles'] }); setShowVehicleDialog(false); toast({ title: 'Vehicle added' }); },
  });

  const kpis = useMemo(() => {
    const today = trips.filter(t => t.status === 'in_transit').length;
    const completed = trips.filter(t => t.status === 'completed').length;
    const delayed = incidents.length;
    return { today, completed, delayed, total: trips.length };
  }, [trips, incidents]);

  return (
    <div className="p-4 md:p-6 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'إدارة النقل والتوزيع' : 'Transport & Dispatch Management'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'تخطيط ومراقبة الشحنات' : 'Plan and monitor outbound logistics'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><Truck className="h-6 w-6 mx-auto text-amber-500 mb-1" /><p className="text-2xl font-bold">{kpis.today}</p><p className="text-xs text-muted-foreground">In Transit</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" /><p className="text-2xl font-bold">{kpis.completed}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-1" /><p className="text-2xl font-bold">{kpis.delayed}</p><p className="text-xs text-muted-foreground">Incidents</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-xs text-muted-foreground">Total Trips</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="planning">Dispatch Planning</TabsTrigger>
          <TabsTrigger value="trips">Trip Sheets</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Allocation</TabsTrigger>
          <TabsTrigger value="route">Route Status</TabsTrigger>
          <TabsTrigger value="proof">Delivery Proof</TabsTrigger>
          <TabsTrigger value="incidents">Delay & Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="planning">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dispatch Planning Board</CardTitle>
              <Dialog open={showTripDialog} onOpenChange={setShowTripDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Trip</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Trip</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Driver</Label><Input value={tripForm.driver_name} onChange={e => setTripForm({ ...tripForm, driver_name: e.target.value })} /></div>
                    <div><Label>Route</Label><Input value={tripForm.route_name} onChange={e => setTripForm({ ...tripForm, route_name: e.target.value })} /></div>
                    <div><Label>Vehicle</Label>
                      <Select value={tripForm.vehicle_id || ''} onValueChange={v => setTripForm({ ...tripForm, vehicle_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                        <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.vehicle_type}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Planned Departure</Label><Input type="datetime-local" value={tripForm.planned_departure} onChange={e => setTripForm({ ...tripForm, planned_departure: e.target.value })} /></div>
                    <div><Label>Notes</Label><Textarea value={tripForm.notes} onChange={e => setTripForm({ ...tripForm, notes: e.target.value })} /></div>
                    <Button className="w-full" onClick={() => createTrip.mutate(tripForm)}>Create Trip</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['planned', 'in_transit', 'completed'].map(status => (
                  <div key={status} className="border rounded-lg p-3">
                    <h3 className="font-semibold mb-2 capitalize">{status.replace('_', ' ')}</h3>
                    <div className="space-y-2">
                      {trips.filter(t => t.status === status).slice(0, 8).map((t: any) => (
                        <div key={t.id} className="border rounded p-2 text-sm space-y-1">
                          <div className="flex justify-between"><span className="font-medium">{t.trip_number}</span><Badge className={statusColor[t.status] || ''}>{t.status}</Badge></div>
                          <p className="text-muted-foreground">{t.route_name || 'No route'} • {t.driver_name || 'Unassigned'}</p>
                          {status === 'planned' && (
                            <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => updateTrip.mutate({ id: t.id, status: 'in_transit', actual_departure: new Date().toISOString() })}>
                              Start Trip
                            </Button>
                          )}
                          {status === 'in_transit' && (
                            <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => updateTrip.mutate({ id: t.id, status: 'completed', actual_arrival: new Date().toISOString() })}>
                              Complete Trip
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips">
          <Card>
            <CardHeader><CardTitle>Trip Sheets</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip #</TableHead><TableHead>Driver</TableHead><TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead><TableHead>Arrival</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.trip_number}</TableCell>
                      <TableCell>{t.driver_name || '-'}</TableCell>
                      <TableCell>{t.route_name || '-'}</TableCell>
                      <TableCell>{t.actual_departure ? format(new Date(t.actual_departure), 'dd/MM HH:mm') : t.planned_departure ? format(new Date(t.planned_departure), 'dd/MM HH:mm') : '-'}</TableCell>
                      <TableCell>{t.actual_arrival ? format(new Date(t.actual_arrival), 'dd/MM HH:mm') : '-'}</TableCell>
                      <TableCell><Badge className={statusColor[t.status] || ''}>{t.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vehicle Allocation</CardTitle>
              <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Vehicle</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Plate Number</Label><Input value={vehicleForm.plate_number} onChange={e => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} /></div>
                    <div><Label>Type</Label>
                      <Select value={vehicleForm.vehicle_type} onValueChange={v => setVehicleForm({ ...vehicleForm, vehicle_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="truck">Truck</SelectItem><SelectItem value="van">Van</SelectItem>
                          <SelectItem value="pickup">Pickup</SelectItem><SelectItem value="trailer">Trailer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Driver</Label><Input value={vehicleForm.driver_name} onChange={e => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} /></div>
                    <Button className="w-full" onClick={() => createVehicle.mutate(vehicleForm)}>Add Vehicle</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Plate</TableHead><TableHead>Type</TableHead><TableHead>Driver</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {vehicles.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.plate_number}</TableCell>
                      <TableCell className="capitalize">{v.vehicle_type}</TableCell>
                      <TableCell>{v.driver_name || '-'}</TableCell>
                      <TableCell><Badge className={statusColor[v.status] || ''}>{v.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route">
          <Card>
            <CardHeader><CardTitle>Route Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trips.filter(t => t.status === 'in_transit').map((t: any) => {
                  const tripStops = stops.filter((s: any) => s.trip_id === t.id);
                  const completed = tripStops.filter((s: any) => s.status === 'delivered').length;
                  return (
                    <div key={t.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div><span className="font-bold">{t.trip_number}</span><span className="text-muted-foreground ml-2">{t.route_name}</span></div>
                        <Badge className="bg-amber-100 text-amber-800">In Transit</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />{completed}/{tripStops.length} stops completed
                        <Clock className="h-4 w-4 ml-2" />Driver: {t.driver_name || 'N/A'}
                      </div>
                    </div>
                  );
                })}
                {trips.filter(t => t.status === 'in_transit').length === 0 && <p className="text-muted-foreground text-center py-8">No active routes</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proof">
          <Card>
            <CardHeader><CardTitle>Delivery Proof Center</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Stop</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Signed By</TableHead><TableHead>POD</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stops.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>#{s.stop_order}</TableCell>
                      <TableCell>{s.customer_name || '-'}</TableCell>
                      <TableCell><Badge className={statusColor[s.status] || ''}>{s.status}</Badge></TableCell>
                      <TableCell>{s.signed_by || '-'}</TableCell>
                      <TableCell>{s.proof_of_delivery_url ? <a href={s.proof_of_delivery_url} target="_blank" className="text-primary underline"><Upload className="h-4 w-4 inline" /> View</a> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader><CardTitle>Delay & Incident Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Trip</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Delay (min)</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {incidents.map((i: any) => {
                    const trip = trips.find(t => t.id === i.trip_id);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{trip?.trip_number || '-'}</TableCell>
                        <TableCell className="capitalize">{i.incident_type}</TableCell>
                        <TableCell>{i.delay_reason || '-'}</TableCell>
                        <TableCell>{i.delay_minutes}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{i.description || '-'}</TableCell>
                        <TableCell>{format(new Date(i.created_at), 'dd/MM/yyyy')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
