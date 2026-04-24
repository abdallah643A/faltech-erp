import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, AlertTriangle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const AssetIncidentRegister = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ equipment_id: '', severity: 'medium', incident_type: 'damage', description: '', location: '', repair_estimate: '' });

  const fetchData = async () => {
    const [eq, inc] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_incidents' as any).select('*').order('incident_date', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setIncidents((inc.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.equipment_id || !form.description) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_incidents' as any).insert({
      ...form, repair_estimate: form.repair_estimate ? parseFloat(form.repair_estimate) : 0,
      company_id: activeCompanyId, reported_by: user?.id, status: 'open',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Incident reported' }); setShowAdd(false); fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('asset_incidents' as any).update({ status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString(), resolved_by: user?.id } : {}) } as any).eq('id', id);
    toast({ title: 'Status updated' }); fetchData();
  };

  const sevColors: Record<string, string> = { low: 'secondary', medium: 'default', high: 'destructive', critical: 'destructive' };
  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Incident & Damage Register</h1><p className="text-sm text-muted-foreground">Log incidents, track repairs, root cause analysis</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />Report Incident</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-600" /><div><div className="text-2xl font-bold">{incidents.filter(i => i.status === 'open').length}</div><div className="text-xs text-muted-foreground">Open</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length}</div><div className="text-xs text-muted-foreground">High/Critical</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{incidents.reduce((s, i) => s + (i.downtime_hours || 0), 0).toFixed(0)}</div><div className="text-xs text-muted-foreground">Total Downtime (hrs)</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{incidents.reduce((s, i) => s + (i.repair_estimate || 0), 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Est. Repair Cost</div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Incident #</TableHead><TableHead>Equipment</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {incidents.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.incident_number}</TableCell>
                <TableCell>{eqName(i.equipment_id)}</TableCell>
                <TableCell>{i.incident_type}</TableCell>
                <TableCell><Badge variant={sevColors[i.severity] as any}>{i.severity}</Badge></TableCell>
                <TableCell>{format(new Date(i.incident_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                <TableCell>
                  {i.status === 'open' && <Button size="sm" variant="outline" onClick={() => updateStatus(i.id, 'investigating')}>Investigate</Button>}
                  {i.status === 'investigating' && <Button size="sm" variant="outline" onClick={() => updateStatus(i.id, 'resolved')}>Resolve</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select Equipment" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
              <Select value={form.incident_type} onValueChange={v => setForm({ ...form, incident_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="damage">Damage</SelectItem><SelectItem value="theft">Theft</SelectItem><SelectItem value="accident">Accident</SelectItem><SelectItem value="malfunction">Malfunction</SelectItem></SelectContent></Select>
            </div>
            <Textarea placeholder="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <Input type="number" placeholder="Repair Estimate" value={form.repair_estimate} onChange={e => setForm({ ...form, repair_estimate: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetIncidentRegister;
