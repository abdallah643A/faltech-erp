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
import { FlaskConical, CheckCircle, XCircle, AlertTriangle, Plus, ClipboardList, Shield } from 'lucide-react';
import { format } from 'date-fns';

const resultColor: Record<string, string> = {
  pass: 'bg-green-100 text-green-800', fail: 'bg-red-100 text-red-800',
  conditional: 'bg-amber-100 text-amber-800', pending: 'bg-muted text-muted-foreground',
};
const statusColor: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-800', in_testing: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800', on_hold: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800', closed: 'bg-green-100 text-green-800',
};

export default function QualityLabSampleManagement() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('samples');
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [sampleForm, setSampleForm] = useState<any>({ item_code: '', item_description: '', source_type: 'incoming', lot_number: '', notes: '' });
  const [planForm, setPlanForm] = useState<any>({ plan_name: '', description: '', source_type: 'incoming', pass_criteria: '' });

  const { data: samples = [] } = useQuery({
    queryKey: ['quality-samples', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('quality_samples' as any).select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['quality-test-plans', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('quality_test_plans' as any).select('*').eq('company_id', activeCompanyId!).order('plan_name'));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['quality-inspections-all', activeCompanyId],
    queryFn: async () => {
      const sIds = samples.map(s => s.id);
      if (!sIds.length) return [];
      const { data, error } = await (supabase.from('quality_inspections' as any).select('*').in('sample_id', sIds).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: samples.length > 0,
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['quality-capas', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('quality_capa_actions' as any).select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const createSample = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('quality_samples' as any).insert({ company_id: activeCompanyId, ...form }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-samples'] }); setShowSampleDialog(false); toast({ title: 'Sample registered' }); },
  });

  const updateSample = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { error } = await (supabase.from('quality_samples' as any).update(u).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-samples'] }); toast({ title: 'Sample updated' }); },
  });

  const createPlan = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from('quality_test_plans' as any).insert({ company_id: activeCompanyId, ...form }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quality-test-plans'] }); setShowPlanDialog(false); toast({ title: 'Test plan created' }); },
  });

  const kpis = useMemo(() => ({
    total: samples.length,
    passed: samples.filter(s => s.result === 'pass').length,
    failed: samples.filter(s => s.result === 'fail').length,
    openCapas: capas.filter(c => c.status === 'open').length,
  }), [samples, capas]);

  return (
    <div className="p-4 md:p-6 space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'إدارة مختبر الجودة والعينات' : 'Quality Lab & Sample Management'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'فحص وتتبع العينات' : 'Incoming, in-process, and finished-goods QC'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><FlaskConical className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-xs text-muted-foreground">Total Samples</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" /><p className="text-2xl font-bold">{kpis.passed}</p><p className="text-xs text-muted-foreground">Passed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><XCircle className="h-6 w-6 mx-auto text-red-500 mb-1" /><p className="text-2xl font-bold">{kpis.failed}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 mx-auto text-amber-500 mb-1" /><p className="text-2xl font-bold">{kpis.openCapas}</p><p className="text-xs text-muted-foreground">Open CAPAs</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="samples">Sample Register</TabsTrigger>
          <TabsTrigger value="plans">Test Plans</TabsTrigger>
          <TabsTrigger value="inspections">Inspection Results</TabsTrigger>
          <TabsTrigger value="ncr">Nonconformance</TabsTrigger>
          <TabsTrigger value="capa">CAPA Linkage</TabsTrigger>
        </TabsList>

        <TabsContent value="samples">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sample Register</CardTitle>
              <Dialog open={showSampleDialog} onOpenChange={setShowSampleDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Register Sample</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Register Sample</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Item Code</Label><Input value={sampleForm.item_code} onChange={e => setSampleForm({ ...sampleForm, item_code: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={sampleForm.item_description} onChange={e => setSampleForm({ ...sampleForm, item_description: e.target.value })} /></div>
                    <div><Label>Source</Label>
                      <Select value={sampleForm.source_type} onValueChange={v => setSampleForm({ ...sampleForm, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In-Process</SelectItem><SelectItem value="finished">Finished Goods</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Lot Number</Label><Input value={sampleForm.lot_number} onChange={e => setSampleForm({ ...sampleForm, lot_number: e.target.value })} /></div>
                    <div><Label>Test Plan</Label>
                      <Select value={sampleForm.test_plan_id || ''} onValueChange={v => setSampleForm({ ...sampleForm, test_plan_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createSample.mutate(sampleForm)}>Register</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Sample #</TableHead><TableHead>Item</TableHead><TableHead>Source</TableHead><TableHead>Lot</TableHead><TableHead>Result</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {samples.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.sample_number}</TableCell>
                      <TableCell>{s.item_code} - {s.item_description}</TableCell>
                      <TableCell className="capitalize">{s.source_type?.replace('_', ' ')}</TableCell>
                      <TableCell>{s.lot_number || '-'}</TableCell>
                      <TableCell><Badge className={resultColor[s.result] || ''}>{s.result}</Badge></TableCell>
                      <TableCell><Badge className={statusColor[s.status] || ''}>{s.status}</Badge></TableCell>
                      <TableCell>
                        {s.result === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => updateSample.mutate({ id: s.id, result: 'pass', status: 'completed' })}>Pass</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateSample.mutate({ id: s.id, result: 'fail', status: 'completed' })}>Fail</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Test Plan Library</CardTitle>
              <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Plan</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Test Plan</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Plan Name</Label><Input value={planForm.plan_name} onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></div>
                    <div><Label>Source Type</Label>
                      <Select value={planForm.source_type} onValueChange={v => setPlanForm({ ...planForm, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="incoming">Incoming</SelectItem><SelectItem value="in_process">In-Process</SelectItem><SelectItem value="finished">Finished Goods</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Pass Criteria</Label><Input value={planForm.pass_criteria} onChange={e => setPlanForm({ ...planForm, pass_criteria: e.target.value })} /></div>
                    <Button className="w-full" onClick={() => createPlan.mutate(planForm)}>Create Plan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Plan Name</TableHead><TableHead>Source</TableHead><TableHead>Criteria</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                <TableBody>
                  {plans.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.plan_name}</TableCell>
                      <TableCell className="capitalize">{p.source_type}</TableCell>
                      <TableCell>{p.pass_criteria || '-'}</TableCell>
                      <TableCell><Badge className={p.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardHeader><CardTitle>Lab Results</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Sample</TableHead><TableHead>Parameter</TableHead><TableHead>Expected</TableHead><TableHead>Actual</TableHead><TableHead>Result</TableHead><TableHead>Inspector</TableHead></TableRow></TableHeader>
                <TableBody>
                  {inspections.map((i: any) => {
                    const sample = samples.find(s => s.id === i.sample_id);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{sample?.sample_number || '-'}</TableCell>
                        <TableCell>{i.parameter_name || '-'}</TableCell>
                        <TableCell>{i.expected_value || '-'}</TableCell>
                        <TableCell>{i.actual_value || '-'}</TableCell>
                        <TableCell><Badge className={resultColor[i.result] || ''}>{i.result}</Badge></TableCell>
                        <TableCell>{i.inspector || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {inspections.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No inspections recorded yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ncr">
          <Card>
            <CardHeader><CardTitle>Nonconformance Review</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {samples.filter(s => s.result === 'fail').map((s: any) => (
                  <div key={s.id} className="border rounded-lg p-4 border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{s.sample_number} - {s.item_description}</h4>
                        <p className="text-sm text-muted-foreground">Lot: {s.lot_number || 'N/A'} • Source: {s.source_type}</p>
                        {s.notes && <p className="text-sm mt-1">{s.notes}</p>}
                      </div>
                      <Badge className="bg-red-100 text-red-800">Failed</Badge>
                    </div>
                  </div>
                ))}
                {samples.filter(s => s.result === 'fail').length === 0 && <p className="text-center text-muted-foreground py-8">No nonconformances</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capa">
          <Card>
            <CardHeader><CardTitle>CAPA Actions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Root Cause</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {capas.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell className="capitalize">{c.action_type}</TableCell>
                      <TableCell>{c.root_cause || '-'}</TableCell>
                      <TableCell>{c.assigned_to || '-'}</TableCell>
                      <TableCell>{c.due_date || '-'}</TableCell>
                      <TableCell><Badge className={statusColor[c.status] || ''}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {capas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No CAPA actions</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
