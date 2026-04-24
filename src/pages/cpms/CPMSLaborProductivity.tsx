import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users, Clock, TrendingUp } from 'lucide-react';
import { useLaborHours } from '@/hooks/useLaborProductivity';
import { useCPMS } from '@/hooks/useCPMS';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LaborProductivityPage() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { hours, createEntry, getProductivitySummary } = useLaborHours(selectedProjectId);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    employee_name: '', trade: '', work_date: new Date().toISOString().split('T')[0],
    regular_hours: 8, overtime_hours: 0, hourly_rate: 0, units_completed: 0, unit_of_measure: '',
    geo_lat: 0, geo_lng: 0
  });

  const data = hours.data || [];
  const summary = getProductivitySummary(data);

  const handleCreate = () => {
    if (!selectedProjectId) return;
    createEntry.mutate({ ...form, project_id: selectedProjectId });
    setShowDialog(false);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setForm({ ...form, geo_lat: pos.coords.latitude, geo_lng: pos.coords.longitude });
      });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Labor Productivity</h1>
            <p className="text-muted-foreground">Track hours, productivity rates & geo-verified attendance</p>
          </div>
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Hours</p><p className="text-2xl font-bold">{(summary?.totalHours || 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Units Completed</p><p className="text-2xl font-bold">{(summary?.totalUnits || 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Productivity (Units/Hr)</p><p className="text-2xl font-bold">{(summary?.avgProductivity || 0).toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Labor Cost</p><p className="text-2xl font-bold">{(summary?.totalCost || 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cost Per Unit</p><p className="text-2xl font-bold">{(summary?.costPerUnit || 0).toFixed(2)}</p></CardContent></Card>
        </div>

        {/* Trade breakdown */}
        {summary?.byTrade && Object.keys(summary.byTrade).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(summary.byTrade).map(([trade, d]: any) => (
              <Card key={trade}>
                <CardContent className="pt-4">
                  <p className="font-semibold text-foreground">{trade}</p>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    <p>Workers: {d.workers.size} | Hours: {d.hours.toFixed(0)} | Units: {d.units.toFixed(0)}</p>
                    <p>Productivity: {d.hours > 0 ? (d.units / d.hours).toFixed(2) : '0'} units/hr</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button disabled={!selectedProjectId}><Plus className="h-4 w-4 mr-2" />Log Hours</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Labor Hours</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Employee Name</Label><Input value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} /></div>
                  <div><Label>Trade</Label><Input value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })} placeholder="Electrician, Carpenter..." /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Work Date</Label><Input type="date" value={form.work_date} onChange={e => setForm({ ...form, work_date: e.target.value })} /></div>
                  <div><Label>Regular Hrs</Label><Input type="number" value={form.regular_hours} onChange={e => setForm({ ...form, regular_hours: Number(e.target.value) })} /></div>
                  <div><Label>OT Hrs</Label><Input type="number" value={form.overtime_hours} onChange={e => setForm({ ...form, overtime_hours: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Hourly Rate</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: Number(e.target.value) })} /></div>
                  <div><Label>Units Done</Label><Input type="number" value={form.units_completed} onChange={e => setForm({ ...form, units_completed: Number(e.target.value) })} /></div>
                  <div><Label>UoM</Label><Input value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} placeholder="m², pcs" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" type="button" onClick={handleGetLocation} className="gap-1"><TrendingUp className="h-4 w-4" />Get GPS</Button>
                  {form.geo_lat !== 0 && <span className="text-xs text-muted-foreground">{form.geo_lat.toFixed(4)}, {form.geo_lng.toFixed(4)}</span>}
                </div>
                <Button onClick={handleCreate} className="w-full">Log Hours</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('common.date')}</TableHead><TableHead>{t('hr.employee')}</TableHead><TableHead>Trade</TableHead>
              <TableHead className="text-right">Reg Hrs</TableHead><TableHead className="text-right">OT</TableHead>
              <TableHead className="text-right">Total Hrs</TableHead><TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Rate (U/H)</TableHead><TableHead className="text-right">Cost</TableHead><TableHead>GPS</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{h.work_date}</TableCell>
                  <TableCell>{h.employee_name}</TableCell>
                  <TableCell><Badge variant="outline">{h.trade || '-'}</Badge></TableCell>
                  <TableCell className="text-right">{h.regular_hours}</TableCell>
                  <TableCell className="text-right">{h.overtime_hours}</TableCell>
                  <TableCell className="text-right font-semibold">{h.total_hours}</TableCell>
                  <TableCell className="text-right">{h.units_completed}</TableCell>
                  <TableCell className="text-right">{(h.productivity_rate || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{(h.total_cost || 0).toLocaleString()}</TableCell>
                  <TableCell>{h.is_geo_verified ? <Badge variant="secondary">✓</Badge> : <Badge variant="outline">-</Badge>}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No labor records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
