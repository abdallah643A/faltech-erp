import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Building2, Plus, Home, Users, ArrowLeftRight, Wrench, ClipboardCheck, MapPin, Download, Bed } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const CAMP_TYPES = { owned: 'Owned', rented: 'Rented', shared: 'Shared' };
const ROOM_TYPES = { single: 'Single', double: 'Double', triple: 'Triple', dormitory: 'Dormitory', suite: 'Suite' };
const MAINT_CATEGORIES = { plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC', structural: 'Structural', cleaning: 'Cleaning', pest_control: 'Pest Control', general: 'General', furniture: 'Furniture', appliance: 'Appliance' };
const PRIORITIES = { low: 'secondary', medium: 'outline', high: 'default', urgent: 'destructive' } as const;
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(25, 95%, 53%)', 'hsl(262, 80%, 50%)', 'hsl(0, 84%, 60%)'];

export default function LaborCampManagement() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('camps');
  const [showCampDialog, setShowCampDialog] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showMaintDialog, setShowMaintDialog] = useState(false);
  const [showInspDialog, setShowInspDialog] = useState(false);
  const [selectedCampId, setSelectedCampId] = useState('');

  // Data queries
  const { data: camps = [] } = useQuery({
    queryKey: ['labor-camps', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('labor_camps' as any).select('*').order('camp_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['camp-rooms', selectedCampId],
    queryFn: async () => {
      let q = supabase.from('camp_rooms' as any).select('*').order('room_number') as any;
      if (selectedCampId) q = q.eq('camp_id', selectedCampId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['camp-assignments', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('camp_bed_assignments' as any).select('*').order('check_in_date', { ascending: false }).limit(500) as any;
      if (activeCompanyId && selectedCampId) q = q.eq('camp_id', selectedCampId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['camp-transfers', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('camp_transfers' as any).select('*').order('transfer_date', { ascending: false }).limit(200) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['camp-maintenance', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('camp_maintenance_requests' as any).select('*').order('reported_date', { ascending: false }).limit(200) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['camp-inspections', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('camp_inspections' as any).select('*').order('inspection_date', { ascending: false }).limit(200) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-camp', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('employees').select('id, first_name, last_name, employee_code') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.eq('status', 'active').limit(500);
      return data || [];
    },
  });

  // KPIs
  const kpis = useMemo(() => {
    const totalCamps = camps.length;
    const totalCapacity = camps.reduce((s: number, c: any) => s + (c.total_capacity || 0), 0);
    const totalOccupancy = camps.reduce((s: number, c: any) => s + (c.current_occupancy || 0), 0);
    const occupancyRate = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;
    const totalRooms = rooms.length;
    const openMaint = maintenance.filter((m: any) => m.status === 'open' || m.status === 'in_progress').length;
    const activeResidents = assignments.filter((a: any) => a.status === 'active').length;
    return { totalCamps, totalCapacity, totalOccupancy, occupancyRate, totalRooms, openMaint, activeResidents };
  }, [camps, rooms, maintenance, assignments]);

  // Camp occupancy chart
  const campOccupancy = useMemo(() =>
    camps.map((c: any) => ({ name: c.camp_name, capacity: c.total_capacity || 0, occupancy: c.current_occupancy || 0 })),
  [camps]);

  // Forms
  const [campForm, setCampForm] = useState({ camp_name: '', camp_code: '', location_address: '', city: '', camp_type: 'rented', total_capacity: 0, transport_route: '', transport_provider: '', landlord_name: '', rent_amount: 0, notes: '' });
  const [roomForm, setRoomForm] = useState({ camp_id: '', room_number: '', floor: 1, room_type: 'dormitory', bed_count: 4, has_ac: true, has_bathroom: false, notes: '' });
  const [assignForm, setAssignForm] = useState({ camp_id: '', room_id: '', employee_id: '', bed_number: '', check_in_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [maintForm, setMaintForm] = useState({ camp_id: '', room_id: '', category: 'general', priority: 'medium', description: '', reported_by: '', assigned_to: '' });
  const [inspForm, setInspForm] = useState({ camp_id: '', inspection_date: format(new Date(), 'yyyy-MM-dd'), inspector_name: '', inspector_org: '', inspection_type: 'routine', overall_score: 0, findings: '', corrective_actions: '', is_passed: true });

  // Mutations
  const saveCamp = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('labor_camps' as any).insert({ ...campForm, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labor-camps'] }); setShowCampDialog(false); toast.success(t('camp.campCreated')); },
    onError: () => toast.error('Failed'),
  });

  const saveRoom = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('camp_rooms' as any).insert(roomForm) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camp-rooms'] }); setShowRoomDialog(false); toast.success(t('camp.roomCreated')); },
    onError: () => toast.error('Failed'),
  });

  const saveAssignment = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e: any) => e.id === assignForm.employee_id) as any;
      if (!emp) throw new Error('Select employee');
      const { error } = await (supabase.from('camp_bed_assignments' as any).insert({
        ...assignForm, employee_name: `${emp.first_name} ${emp.last_name}`, employee_code: emp.employee_code, status: 'active',
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camp-assignments'] }); setShowAssignDialog(false); toast.success(t('camp.assigned')); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMaint = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('camp_maintenance_requests' as any).insert(maintForm) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camp-maintenance'] }); setShowMaintDialog(false); toast.success(t('camp.maintCreated')); },
    onError: () => toast.error('Failed'),
  });

  const saveInsp = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('camp_inspections' as any).insert({ ...inspForm, status: 'completed' }) as any);
      if (error) throw error;
      // Update camp compliance
      if (inspForm.camp_id) {
        await (supabase.from('labor_camps' as any).update({
          last_inspection_date: inspForm.inspection_date,
          next_inspection_date: inspForm.is_passed ? null : inspForm.inspection_date,
          compliance_status: inspForm.is_passed ? 'compliant' : 'non_compliant',
        }).eq('id', inspForm.camp_id) as any);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camp-inspections'] }); qc.invalidateQueries({ queryKey: ['labor-camps'] }); setShowInspDialog(false); toast.success(t('camp.inspRecorded')); },
    onError: () => toast.error('Failed'),
  });

  const updateMaintStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed') updates.completed_date = format(new Date(), 'yyyy-MM-dd');
      const { error } = await (supabase.from('camp_maintenance_requests' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camp-maintenance'] }); toast.success('Updated'); },
  });

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(camps.map((c: any) => ({
      Camp: c.camp_name, Code: c.camp_code, City: c.city, Type: c.camp_type,
      Capacity: c.total_capacity, Occupancy: c.current_occupancy, Status: c.status, Compliance: c.compliance_status,
    }))), 'Camps');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assignments.filter((a: any) => a.status === 'active').map((a: any) => ({
      Employee: a.employee_name, Code: a.employee_code, Bed: a.bed_number, CheckIn: a.check_in_date, Status: a.status,
    }))), 'Residents');
    XLSX.writeFile(wb, `camp_report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />{t('nav.laborCamps')}</h1>
          <p className="text-muted-foreground">{t('camp.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />{t('common.export')}</Button>
          <Dialog open={showCampDialog} onOpenChange={setShowCampDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('camp.newCamp')}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('camp.newCamp')}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>{t('camp.campName')}</Label><Input value={campForm.camp_name} onChange={e => setCampForm(p => ({ ...p, camp_name: e.target.value }))} /></div>
                <div><Label>{t('camp.campCode')}</Label><Input value={campForm.camp_code} onChange={e => setCampForm(p => ({ ...p, camp_code: e.target.value }))} /></div>
                <div><Label>{t('camp.campType')}</Label>
                  <Select value={campForm.camp_type} onValueChange={v => setCampForm(p => ({ ...p, camp_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CAMP_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>{t('camp.address')}</Label><Input value={campForm.location_address} onChange={e => setCampForm(p => ({ ...p, location_address: e.target.value }))} /></div>
                <div><Label>{t('camp.city')}</Label><Input value={campForm.city} onChange={e => setCampForm(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label>{t('camp.capacity')}</Label><Input type="number" value={campForm.total_capacity} onChange={e => setCampForm(p => ({ ...p, total_capacity: +e.target.value }))} /></div>
                <div><Label>{t('camp.transportRoute')}</Label><Input value={campForm.transport_route} onChange={e => setCampForm(p => ({ ...p, transport_route: e.target.value }))} /></div>
                <div><Label>{t('camp.transportProvider')}</Label><Input value={campForm.transport_provider} onChange={e => setCampForm(p => ({ ...p, transport_provider: e.target.value }))} /></div>
                <div><Label>{t('camp.landlord')}</Label><Input value={campForm.landlord_name} onChange={e => setCampForm(p => ({ ...p, landlord_name: e.target.value }))} /></div>
                <div><Label>{t('camp.rent')}</Label><Input type="number" value={campForm.rent_amount} onChange={e => setCampForm(p => ({ ...p, rent_amount: +e.target.value }))} /></div>
                <div className="col-span-2"><Label>{t('common.notes')}</Label><Textarea value={campForm.notes} onChange={e => setCampForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              </div>
              <DialogFooter><Button onClick={() => saveCamp.mutate()} disabled={!campForm.camp_name}>{t('common.save')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: t('camp.totalCamps'), value: kpis.totalCamps, icon: Building2 },
          { label: t('camp.totalCapacity'), value: kpis.totalCapacity, icon: Users },
          { label: t('camp.occupancy'), value: kpis.totalOccupancy, icon: Bed },
          { label: t('camp.occupancyRate'), value: `${kpis.occupancyRate.toFixed(0)}%`, icon: Home },
          { label: t('camp.rooms'), value: kpis.totalRooms, icon: Home },
          { label: t('camp.openMaint'), value: kpis.openMaint, icon: Wrench },
          { label: t('camp.activeResidents'), value: kpis.activeResidents, icon: Users },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-3 flex items-center gap-2">
            <k.icon className="h-4 w-4 text-primary" />
            <div><div className="text-lg font-bold">{k.value}</div><div className="text-[10px] text-muted-foreground leading-tight">{k.label}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="camps">{t('camp.camps')}</TabsTrigger>
          <TabsTrigger value="rooms">{t('camp.roomsTab')}</TabsTrigger>
          <TabsTrigger value="residents">{t('camp.residents')}</TabsTrigger>
          <TabsTrigger value="transfers">{t('camp.transfers')}</TabsTrigger>
          <TabsTrigger value="maintenance">{t('camp.maintenance')}</TabsTrigger>
          <TabsTrigger value="inspections">{t('camp.inspections')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('camp.analytics')}</TabsTrigger>
        </TabsList>

        {/* Camps Tab */}
        <TabsContent value="camps">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('camp.campName')}</TableHead><TableHead>{t('camp.city')}</TableHead><TableHead>{t('camp.campType')}</TableHead>
                <TableHead>{t('camp.capacity')}</TableHead><TableHead>{t('camp.occupancyRate')}</TableHead>
                <TableHead>{t('camp.transport')}</TableHead><TableHead>{t('camp.compliance')}</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {camps.map((c: any) => {
                  const rate = c.total_capacity > 0 ? (c.current_occupancy / c.total_capacity) * 100 : 0;
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => { setSelectedCampId(c.id); setTab('rooms'); }}>
                      <TableCell><div className="font-medium">{c.camp_name}</div><div className="text-xs text-muted-foreground">{c.camp_code}</div></TableCell>
                      <TableCell>{c.city || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{CAMP_TYPES[c.camp_type as keyof typeof CAMP_TYPES] || c.camp_type}</Badge></TableCell>
                      <TableCell>{c.current_occupancy}/{c.total_capacity}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={rate} className="w-16 h-2" /><span className="text-xs">{rate.toFixed(0)}%</span></div></TableCell>
                      <TableCell className="text-xs">{c.transport_route || '—'}</TableCell>
                      <TableCell><Badge variant={c.compliance_status === 'compliant' ? 'default' : 'destructive'}>{c.compliance_status}</Badge></TableCell>
                      <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {camps.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Select value={selectedCampId} onValueChange={setSelectedCampId}>
                <SelectTrigger className="w-60"><SelectValue placeholder={t('camp.selectCamp')} /></SelectTrigger>
                <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.camp_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('camp.addRoom')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('camp.addRoom')}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Label>{t('camp.selectCamp')}</Label>
                    <Select value={roomForm.camp_id} onValueChange={v => setRoomForm(p => ({ ...p, camp_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.camp_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('camp.roomNumber')}</Label><Input value={roomForm.room_number} onChange={e => setRoomForm(p => ({ ...p, room_number: e.target.value }))} /></div>
                  <div><Label>{t('camp.floor')}</Label><Input type="number" value={roomForm.floor} onChange={e => setRoomForm(p => ({ ...p, floor: +e.target.value }))} /></div>
                  <div><Label>{t('camp.roomType')}</Label>
                    <Select value={roomForm.room_type} onValueChange={v => setRoomForm(p => ({ ...p, room_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ROOM_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('camp.bedCount')}</Label><Input type="number" value={roomForm.bed_count} onChange={e => setRoomForm(p => ({ ...p, bed_count: +e.target.value }))} /></div>
                  <div className="flex items-center gap-2"><Switch checked={roomForm.has_ac} onCheckedChange={v => setRoomForm(p => ({ ...p, has_ac: v }))} /><Label>A/C</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={roomForm.has_bathroom} onCheckedChange={v => setRoomForm(p => ({ ...p, has_bathroom: v }))} /><Label>{t('camp.bathroom')}</Label></div>
                </div>
                <DialogFooter><Button onClick={() => saveRoom.mutate()} disabled={!roomForm.camp_id || !roomForm.room_number}>{t('common.save')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('camp.roomNumber')}</TableHead><TableHead>{t('camp.floor')}</TableHead><TableHead>{t('camp.roomType')}</TableHead>
                <TableHead>{t('camp.beds')}</TableHead><TableHead>{t('camp.amenitiesCol')}</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rooms.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.room_number}</TableCell>
                    <TableCell>{r.floor}</TableCell>
                    <TableCell>{ROOM_TYPES[r.room_type as keyof typeof ROOM_TYPES] || r.room_type}</TableCell>
                    <TableCell>{r.occupied_beds}/{r.bed_count}</TableCell>
                    <TableCell className="text-xs">{[r.has_ac && 'A/C', r.has_bathroom && 'Bath'].filter(Boolean).join(', ') || '—'}</TableCell>
                    <TableCell><Badge variant={r.status === 'available' ? 'default' : r.status === 'full' ? 'secondary' : 'destructive'}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {rooms.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{selectedCampId ? t('common.noData') : t('camp.selectCampFirst')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Residents Tab */}
        <TabsContent value="residents">
          <div className="flex justify-end mb-3">
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('camp.assignBed')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('camp.assignBed')}</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div><Label>{t('camp.selectCamp')}</Label>
                    <Select value={assignForm.camp_id} onValueChange={v => setAssignForm(p => ({ ...p, camp_id: v, room_id: '' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.camp_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('camp.room')}</Label>
                    <Select value={assignForm.room_id} onValueChange={v => setAssignForm(p => ({ ...p, room_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{rooms.filter((r: any) => r.camp_id === assignForm.camp_id).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.room_number} ({r.room_type})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('hr.employee')}</Label>
                    <Select value={assignForm.employee_id} onValueChange={v => setAssignForm(p => ({ ...p, employee_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('camp.bedNumber')}</Label><Input value={assignForm.bed_number} onChange={e => setAssignForm(p => ({ ...p, bed_number: e.target.value }))} placeholder="e.g. B1" /></div>
                  <div><Label>{t('camp.checkIn')}</Label><Input type="date" value={assignForm.check_in_date} onChange={e => setAssignForm(p => ({ ...p, check_in_date: e.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={() => saveAssignment.mutate()} disabled={!assignForm.employee_id || !assignForm.room_id}>{t('common.save')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('hr.employee')}</TableHead><TableHead>{t('camp.bedNumber')}</TableHead><TableHead>{t('camp.checkIn')}</TableHead>
                <TableHead>{t('camp.checkOut')}</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell><div className="font-medium">{a.employee_name}</div><div className="text-xs text-muted-foreground">{a.employee_code}</div></TableCell>
                    <TableCell>{a.bed_number || '—'}</TableCell>
                    <TableCell>{a.check_in_date}</TableCell>
                    <TableCell>{a.check_out_date || '—'}</TableCell>
                    <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('hr.employee')}</TableHead><TableHead>{t('camp.from')}</TableHead><TableHead>{t('camp.to')}</TableHead>
                <TableHead>{t('common.date')}</TableHead><TableHead>{t('camp.reason')}</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {transfers.map((tr: any) => {
                  const fromCamp = camps.find((c: any) => c.id === tr.from_camp_id) as any;
                  const toCamp = camps.find((c: any) => c.id === tr.to_camp_id) as any;
                  return (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium">{tr.employee_name}</TableCell>
                      <TableCell>{fromCamp?.camp_name || '—'}</TableCell>
                      <TableCell>{toCamp?.camp_name || '—'}</TableCell>
                      <TableCell>{tr.transfer_date}</TableCell>
                      <TableCell className="max-w-xs truncate">{tr.reason || '—'}</TableCell>
                      <TableCell><Badge variant={tr.status === 'completed' ? 'default' : 'outline'}>{tr.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {transfers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <div className="flex justify-end mb-3">
            <Dialog open={showMaintDialog} onOpenChange={setShowMaintDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('camp.newMaint')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('camp.newMaint')}</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div><Label>{t('camp.selectCamp')}</Label>
                    <Select value={maintForm.camp_id} onValueChange={v => setMaintForm(p => ({ ...p, camp_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.camp_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('camp.category')}</Label>
                    <Select value={maintForm.category} onValueChange={v => setMaintForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(MAINT_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('common.priority')}</Label>
                    <Select value={maintForm.priority} onValueChange={v => setMaintForm(p => ({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.keys(PRIORITIES).map(k => <SelectItem key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('common.description')}</Label><Textarea value={maintForm.description} onChange={e => setMaintForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
                  <div><Label>{t('camp.reportedBy')}</Label><Input value={maintForm.reported_by} onChange={e => setMaintForm(p => ({ ...p, reported_by: e.target.value }))} /></div>
                  <div><Label>{t('camp.assignedTo')}</Label><Input value={maintForm.assigned_to} onChange={e => setMaintForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={() => saveMaint.mutate()} disabled={!maintForm.camp_id || !maintForm.description}>{t('common.save')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>{t('camp.campName')}</TableHead><TableHead>{t('camp.category')}</TableHead>
                <TableHead>{t('common.priority')}</TableHead><TableHead>{t('common.description')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {maintenance.map((m: any) => {
                  const camp = camps.find((c: any) => c.id === m.camp_id) as any;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.request_number}</TableCell>
                      <TableCell>{camp?.camp_name || '—'}</TableCell>
                      <TableCell>{MAINT_CATEGORIES[m.category as keyof typeof MAINT_CATEGORIES] || m.category}</TableCell>
                      <TableCell><Badge variant={PRIORITIES[m.priority as keyof typeof PRIORITIES] || 'outline'}>{m.priority}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate">{m.description}</TableCell>
                      <TableCell><Badge variant={m.status === 'completed' ? 'default' : m.status === 'open' ? 'destructive' : 'secondary'}>{m.status}</Badge></TableCell>
                      <TableCell>
                        {m.status !== 'completed' && m.status !== 'cancelled' && (
                          <div className="flex gap-1">
                            {m.status === 'open' && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateMaintStatus.mutate({ id: m.id, status: 'in_progress' })}>Start</Button>}
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateMaintStatus.mutate({ id: m.id, status: 'completed' })}>Complete</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {maintenance.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections">
          <div className="flex justify-end mb-3">
            <Dialog open={showInspDialog} onOpenChange={setShowInspDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('camp.newInspection')}</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t('camp.newInspection')}</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div><Label>{t('camp.selectCamp')}</Label>
                    <Select value={inspForm.camp_id} onValueChange={v => setInspForm(p => ({ ...p, camp_id: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.camp_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('common.date')}</Label><Input type="date" value={inspForm.inspection_date} onChange={e => setInspForm(p => ({ ...p, inspection_date: e.target.value }))} /></div>
                  <div><Label>{t('camp.inspector')}</Label><Input value={inspForm.inspector_name} onChange={e => setInspForm(p => ({ ...p, inspector_name: e.target.value }))} /></div>
                  <div><Label>{t('camp.inspectorOrg')}</Label><Input value={inspForm.inspector_org} onChange={e => setInspForm(p => ({ ...p, inspector_org: e.target.value }))} /></div>
                  <div><Label>{t('camp.inspectionType')}</Label>
                    <Select value={inspForm.inspection_type} onValueChange={v => setInspForm(p => ({ ...p, inspection_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="surprise">Surprise</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('camp.score')}</Label><Input type="number" value={inspForm.overall_score} onChange={e => setInspForm(p => ({ ...p, overall_score: +e.target.value }))} /></div>
                  <div className="flex items-center gap-2"><Switch checked={inspForm.is_passed} onCheckedChange={v => setInspForm(p => ({ ...p, is_passed: v }))} /><Label>{t('camp.passed')}</Label></div>
                  <div><Label>{t('camp.findings')}</Label><Textarea value={inspForm.findings} onChange={e => setInspForm(p => ({ ...p, findings: e.target.value }))} rows={2} /></div>
                  <div><Label>{t('camp.corrective')}</Label><Textarea value={inspForm.corrective_actions} onChange={e => setInspForm(p => ({ ...p, corrective_actions: e.target.value }))} rows={2} /></div>
                </div>
                <DialogFooter><Button onClick={() => saveInsp.mutate()} disabled={!inspForm.camp_id || !inspForm.inspector_name}>{t('common.save')}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('camp.campName')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>{t('camp.inspector')}</TableHead>
                <TableHead>{t('camp.inspectionType')}</TableHead><TableHead>{t('camp.score')}</TableHead><TableHead>{t('camp.result')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {inspections.map((ins: any) => {
                  const camp = camps.find((c: any) => c.id === ins.camp_id) as any;
                  return (
                    <TableRow key={ins.id}>
                      <TableCell className="font-medium">{camp?.camp_name || '—'}</TableCell>
                      <TableCell>{ins.inspection_date}</TableCell>
                      <TableCell>{ins.inspector_name}<div className="text-xs text-muted-foreground">{ins.inspector_org}</div></TableCell>
                      <TableCell><Badge variant="outline">{ins.inspection_type}</Badge></TableCell>
                      <TableCell>{ins.overall_score}/{ins.max_score}</TableCell>
                      <TableCell><Badge variant={ins.is_passed ? 'default' : 'destructive'}>{ins.is_passed ? t('camp.passed') : t('camp.failed')}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {inspections.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">{t('camp.occupancyBycamp')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campOccupancy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="capacity" name="Capacity" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="occupancy" name="Occupancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">{t('camp.maintByCategory')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={Object.entries(
                      maintenance.reduce((acc: Record<string, number>, m: any) => { acc[m.category] = (acc[m.category] || 0) + 1; return acc; }, {})
                    ).map(([name, value]) => ({ name: MAINT_CATEGORIES[name as keyof typeof MAINT_CATEGORIES] || name, value }))}
                    cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {Object.keys(MAINT_CATEGORIES).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
