import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const RentalAssetBilling = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ equipment_id: '', customer_name: '', start_date: '', end_date: '', rate_type: 'daily', rate_amount: '' });

  const fetchData = async () => {
    const [eq, ct] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_rental_contracts' as any).select('*').order('created_at', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setContracts((ct.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.equipment_id || !form.customer_name || !form.start_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_rental_contracts' as any).insert({
      ...form, rate_amount: parseFloat(form.rate_amount) || 0,
      company_id: activeCompanyId, created_by: user?.id, status: 'draft',
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contract created' }); setShowAdd(false); fetchData();
  };

  const eqName = (id: string) => equipment.find(e => e.id === id)?.name || id;
  const totalBilled = contracts.reduce((s, c) => s + (c.total_billed || 0), 0);
  const totalCollected = contracts.reduce((s, c) => s + (c.total_collected || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Rental Asset Billing</h1><p className="text-sm text-muted-foreground">Rental contracts, billing, utilization & profitability</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Contract</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{contracts.length}</div><div className="text-xs text-muted-foreground">Total Contracts</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{contracts.filter(c => c.status === 'active').length}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4"><DollarSign className="h-5 w-5 text-green-600 mb-1" /><div className="text-2xl font-bold">{totalBilled.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Billed</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalCollected.toLocaleString()}</div><div className="text-xs text-muted-foreground">Collected</div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Equipment</TableHead><TableHead>Customer</TableHead><TableHead>Rate</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {contracts.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{eqName(c.equipment_id)}</TableCell>
                <TableCell>{c.customer_name}</TableCell>
                <TableCell>{c.rate_amount}/{c.rate_type}</TableCell>
                <TableCell>{format(new Date(c.start_date), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{c.end_date ? format(new Date(c.end_date), 'yyyy-MM-dd') : 'Open'}</TableCell>
                <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Rental Contract</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}><SelectTrigger><SelectValue placeholder="Select Equipment" /></SelectTrigger><SelectContent>{equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Customer Name *" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.rate_type} onValueChange={v => setForm({ ...form, rate_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select>
              <Input type="number" placeholder="Rate Amount" value={form.rate_amount} onChange={e => setForm({ ...form, rate_amount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs">Start Date</label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label className="text-xs">End Date</label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalAssetBilling;
