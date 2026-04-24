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
import { Plus, Laptop, Package } from 'lucide-react';
import { format } from 'date-fns';

const ITAssetIssuance = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [packs, setPacks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ pack_name: '', pack_type: 'onboarding', employee_name: '', notes: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('asset_it_packs' as any).select('*').order('created_at', { ascending: false });
    setPacks((data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.pack_name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_it_packs' as any).insert({ ...form, company_id: activeCompanyId, created_by: user?.id, status: 'draft' } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'IT Pack created' }); setShowAdd(false); fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'issued') updates.issued_date = new Date().toISOString();
    if (status === 'returned') updates.returned_date = new Date().toISOString();
    await supabase.from('asset_it_packs' as any).update(updates as any).eq('id', id);
    toast({ title: `Status: ${status}` }); fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Employee IT Asset Issuance</h1><p className="text-sm text-muted-foreground">Onboarding bundles, device issuance & return tracking</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />New Pack</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Package className="h-5 w-5 text-blue-600 mb-1" /><div className="text-2xl font-bold">{packs.length}</div><div className="text-xs text-muted-foreground">Total Packs</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{packs.filter(p => p.status === 'issued').length}</div><div className="text-xs text-muted-foreground">Issued</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{packs.filter(p => p.status === 'acknowledged').length}</div><div className="text-xs text-muted-foreground">Acknowledged</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{packs.filter(p => p.status === 'returned').length}</div><div className="text-xs text-muted-foreground">Returned</div></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pack Name</TableHead><TableHead>Type</TableHead><TableHead>Employee</TableHead><TableHead>Issued</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {packs.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.pack_name}</TableCell>
                <TableCell><Badge variant="outline">{p.pack_type}</Badge></TableCell>
                <TableCell>{p.employee_name || '-'}</TableCell>
                <TableCell>{p.issued_date ? format(new Date(p.issued_date), 'yyyy-MM-dd') : '-'}</TableCell>
                <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                <TableCell>
                  {p.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'issued')}>Issue</Button>}
                  {p.status === 'issued' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'acknowledged')}>Acknowledge</Button>}
                  {p.status === 'acknowledged' && <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, 'returned')}>Return</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New IT Asset Pack</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Pack Name *" value={form.pack_name} onChange={e => setForm({ ...form, pack_name: e.target.value })} />
            <Select value={form.pack_type} onValueChange={v => setForm({ ...form, pack_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="onboarding">Onboarding</SelectItem><SelectItem value="role_based">Role Based</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            <Input placeholder="Employee Name" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} />
            <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ITAssetIssuance;
