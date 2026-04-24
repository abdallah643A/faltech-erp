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
import { Plus, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

const AssetAuditCount = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ audit_name: '', audit_type: 'full', planned_date: '', location: '', report_notes: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('asset_audit_plans' as any).select('*').order('planned_date', { ascending: false });
    setPlans((data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.audit_name || !form.planned_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_audit_plans' as any).insert({
      ...form, company_id: activeCompanyId, created_by: user?.id, status: 'planned',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Audit plan created' }); setShowAdd(false); fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'completed') updates.completed_date = new Date().toISOString().split('T')[0];
    await supabase.from('asset_audit_plans' as any).update(updates as any).eq('id', id);
    toast({ title: `Status: ${status}` }); fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Fixed Asset Audit & Count</h1><p className="text-sm text-muted-foreground">Audit plans, scan verification, variance resolution</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Audit Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><ClipboardCheck className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{plans.length}</div><div className="text-xs text-muted-foreground">Total Audits</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{plans.filter(p => p.status === 'in_progress').length}</div><div className="text-xs text-muted-foreground">In Progress</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{plans.reduce((s, p) => s + (p.missing || 0), 0)}</div><div className="text-xs text-muted-foreground">Total Missing</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{plans.filter(p => p.status === 'completed').length}</div><div className="text-xs text-muted-foreground">Completed</div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Audit Name</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Counted</TableHead><TableHead>Missing</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.audit_name}</TableCell>
                <TableCell><Badge variant="outline">{p.audit_type}</Badge></TableCell>
                <TableCell>{format(new Date(p.planned_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{p.location || '-'}</TableCell>
                <TableCell>{p.counted || 0}/{p.total_assets || 0}</TableCell>
                <TableCell>{p.missing || 0}</TableCell>
                <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                <TableCell>
                  {p.status === 'planned' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'in_progress')}>Start</Button>}
                  {p.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'pending_review')}>Review</Button>}
                  {p.status === 'pending_review' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'completed')}>Complete</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Audit Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Audit Name *" value={form.audit_name} onChange={e => setForm({ ...form, audit_name: e.target.value })} />
            <Select value={form.audit_type} onValueChange={v => setForm({ ...form, audit_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Full Count</SelectItem><SelectItem value="sample">Sample</SelectItem><SelectItem value="spot_check">Spot Check</SelectItem></SelectContent></Select>
            <Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} />
            <Input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <Textarea placeholder="Notes" value={form.report_notes} onChange={e => setForm({ ...form, report_notes: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetAuditCount;
