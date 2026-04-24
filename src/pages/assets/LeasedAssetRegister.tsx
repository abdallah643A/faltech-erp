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
import { Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';

const LeasedAssetRegister = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [leases, setLeases] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ lease_type: 'leased', provider_name: '', asset_description: '', start_date: '', end_date: '', monthly_charge: '', terms: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('asset_leases' as any).select('*').order('created_at', { ascending: false });
    setLeases((data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.provider_name || !form.start_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_leases' as any).insert({
      ...form, monthly_charge: parseFloat(form.monthly_charge) || 0,
      company_id: activeCompanyId, created_by: user?.id, status: 'active',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Lease registered' }); setShowAdd(false); fetchData();
  };

  const totalMonthly = leases.filter(l => l.status === 'active').reduce((s, l) => s + (l.monthly_charge || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Borrowed & Leased Asset Register</h1><p className="text-sm text-muted-foreground">Track externally leased, rented, or borrowed assets</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />Add Lease</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><FileText className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{leases.length}</div><div className="text-xs text-muted-foreground">Total Leases</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{leases.filter(l => l.status === 'active').length}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalMonthly.toLocaleString()}</div><div className="text-xs text-muted-foreground">Monthly Cost</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{leases.filter(l => l.end_date && new Date(l.end_date) < new Date() && l.status === 'active').length}</div><div className="text-xs text-muted-foreground">Overdue Returns</div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Provider</TableHead><TableHead>Asset</TableHead><TableHead>Monthly</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {leases.map(l => (
              <TableRow key={l.id}>
                <TableCell><Badge variant="outline">{l.lease_type}</Badge></TableCell>
                <TableCell className="font-medium">{l.provider_name}</TableCell>
                <TableCell>{l.asset_description || '-'}</TableCell>
                <TableCell>{(l.monthly_charge || 0).toLocaleString()}</TableCell>
                <TableCell>{format(new Date(l.start_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{l.end_date ? format(new Date(l.end_date), 'yyyy-MM-dd') : 'Open'}</TableCell>
                <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Register Lease</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.lease_type} onValueChange={v => setForm({ ...form, lease_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leased">Leased</SelectItem><SelectItem value="rented">Rented</SelectItem><SelectItem value="borrowed">Borrowed</SelectItem></SelectContent></Select>
            <Input placeholder="Provider Name *" value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} />
            <Input placeholder="Asset Description" value={form.asset_description} onChange={e => setForm({ ...form, asset_description: e.target.value })} />
            <Input type="number" placeholder="Monthly Charge" value={form.monthly_charge} onChange={e => setForm({ ...form, monthly_charge: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs">Start Date</label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label className="text-xs">End Date</label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <Textarea placeholder="Terms" value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Register</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeasedAssetRegister;
