import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Star } from 'lucide-react';

const ratingColors: Record<string, string> = { excellent: 'bg-green-100 text-green-800', good: 'bg-blue-100 text-blue-800', average: 'bg-yellow-100 text-yellow-800', poor: 'bg-red-100 text-red-800', unrated: 'bg-gray-100 text-gray-600' };

const VendorScorecard = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vendor_name: '', service_type: 'maintenance', contract_reference: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('asset_vendor_scorecards' as any).select('*').order('overall_score', { ascending: false });
    setScorecards((data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const handleAdd = async () => {
    if (!form.vendor_name) { toast({ title: 'Vendor name required', variant: 'destructive' }); return; }
    const { error } = await supabase.from('asset_vendor_scorecards' as any).insert({ ...form, company_id: activeCompanyId, rating: 'unrated' } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Vendor scorecard created' }); setShowAdd(false); fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Service Vendor Scorecard</h1><p className="text-sm text-muted-foreground">Response time, repair quality, SLA compliance tracking</p></div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#1a7a4a' }}><Plus className="h-4 w-4 mr-1" />Add Vendor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><Star className="h-5 w-5 text-yellow-500 mb-1" /><div className="text-2xl font-bold">{scorecards.length}</div><div className="text-xs text-muted-foreground">Total Vendors</div></CardContent></Card>
        {['excellent', 'good', 'poor'].map(r => (
          <Card key={r}><CardContent className="pt-4"><div className="text-2xl font-bold">{scorecards.filter(s => s.rating === r).length}</div><div className="text-xs text-muted-foreground capitalize">{r}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Vendor</TableHead><TableHead>Service Type</TableHead><TableHead>Jobs</TableHead><TableHead>Avg Response</TableHead><TableHead>Quality</TableHead><TableHead>SLA %</TableHead><TableHead>Overall</TableHead><TableHead>Rating</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {scorecards.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.vendor_name}</TableCell>
                <TableCell>{s.service_type || '-'}</TableCell>
                <TableCell>{s.total_jobs}</TableCell>
                <TableCell>{s.avg_response_hours ? `${Number(s.avg_response_hours).toFixed(1)}h` : '-'}</TableCell>
                <TableCell><Progress value={(s.avg_repair_quality || 0) * 20} className="w-16 h-2" /></TableCell>
                <TableCell>{s.sla_compliance_percent ? `${Number(s.sla_compliance_percent).toFixed(0)}%` : '-'}</TableCell>
                <TableCell><span className="font-bold">{Number(s.overall_score || 0).toFixed(0)}</span>/100</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs font-medium ${ratingColors[s.rating]}`}>{s.rating}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Add Service Vendor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Vendor Name *" value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} />
            <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="repair">Repair</SelectItem><SelectItem value="calibration">Calibration</SelectItem><SelectItem value="inspection">Inspection</SelectItem></SelectContent></Select>
            <Input placeholder="Contract Reference" value={form.contract_reference} onChange={e => setForm({ ...form, contract_reference: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleAdd} style={{ backgroundColor: '#0066cc' }}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorScorecard;
