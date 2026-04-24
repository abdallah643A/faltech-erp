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
import { Plus, Wrench } from 'lucide-react';
import { format } from 'date-fns';

const AssetOverhaulPage = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [overhauls, setOverhauls] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ equipment_id: '', title: '', overhaul_type: 'refurbishment', scope_description: '', estimated_budget: '', planned_start: '', planned_end: '' });

  const fetchData = async () => {
    const [eq, oh] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_overhauls' as any).select('*').order('created_at', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setOverhauls((oh.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.equipment_id || !form.title) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_overhauls' as any).insert({
      ...form, estimated_budget: form.estimated_budget ? parseFloat(form.estimated_budget) : 0,
      company_id: activeCompanyId, created_by: user?.id, status: 'draft',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Overhaul created' }); setShowAdd(false); fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'in_progress') updates.actual_start = new Date().toISOString();
    if (status === 'completed') updates.actual_end = new Date().toISOString();
    await supabase.from('asset_overhauls' as any).update(updates as any).eq('id', id);
    toast({ title: `Status: ${status}` }); fetchData();
  };

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const statusColor: Record<string, string> = { draft: 'secondary', pending_approval: 'default', approved: 'default', in_progress: 'default', completed: 'secondary', cancelled: 'destructive' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Refurbishment & Major Overhaul</h1><p className="text-sm text-muted-foreground">Scope, budget, parts, performance comparison</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Overhaul</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Wrench className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{overhauls.length}</div><div className="text-xs text-muted-foreground">Total Overhauls</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{overhauls.filter(o => o.status === 'in_progress').length}</div><div className="text-xs text-muted-foreground">In Progress</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{overhauls.reduce((s, o) => s + (o.estimated_budget || 0), 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Budget</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{overhauls.reduce((s, o) => s + (o.actual_cost || 0), 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Actual Cost</div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Overhaul #</TableHead><TableHead>Equipment</TableHead><TableHead>Type</TableHead><TableHead>Budget</TableHead><TableHead>Actual</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {overhauls.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.overhaul_number}</TableCell>
                <TableCell>{eqName(o.equipment_id)}</TableCell>
                <TableCell>{o.overhaul_type}</TableCell>
                <TableCell>{(o.estimated_budget || 0).toLocaleString()}</TableCell>
                <TableCell>{(o.actual_cost || 0).toLocaleString()}</TableCell>
                <TableCell><Badge variant={statusColor[o.status] as any}>{o.status}</Badge></TableCell>
                <TableCell>
                  {o.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'pending_approval')}>Submit</Button>}
                  {o.status === 'pending_approval' && <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'approved')}>Approve</Button>}
                  {o.status === 'approved' && <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'in_progress')}>Start</Button>}
                  {o.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, 'completed')}>Complete</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Overhaul</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select Equipment" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Select value={form.overhaul_type} onValueChange={v => setForm({ ...form, overhaul_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="refurbishment">Refurbishment</SelectItem><SelectItem value="major_overhaul">Major Overhaul</SelectItem><SelectItem value="rebuild">Rebuild</SelectItem><SelectItem value="retrofit">Retrofit</SelectItem></SelectContent></Select>
            <Textarea placeholder="Scope Description" value={form.scope_description} onChange={e => setForm({ ...form, scope_description: e.target.value })} />
            <Input type="number" placeholder="Estimated Budget" value={form.estimated_budget} onChange={e => setForm({ ...form, estimated_budget: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs">Planned Start</label><Input type="date" value={form.planned_start} onChange={e => setForm({ ...form, planned_start: e.target.value })} /></div>
              <div><label className="text-xs">Planned End</label><Input type="date" value={form.planned_end} onChange={e => setForm({ ...form, planned_end: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetOverhaulPage;
