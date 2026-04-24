import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
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
import { GitBranch, Plus, CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800',
  released: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800',
};
const priorityColor: Record<string, string> = {
  low: 'bg-muted text-muted-foreground', medium: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800', critical: 'bg-red-100 text-red-800',
};

export default function EngineeringChangeControl() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('board');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', change_type: 'design', priority: 'medium', reason: '', impact_analysis: '' });

  const { data: ecrs = [] } = useQuery({
    queryKey: ['ecrs', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('engineering_change_requests' as any).select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ['eng-revisions', activeCompanyId],
    queryFn: async () => {
      const ecrIds = ecrs.map(e => e.id);
      if (!ecrIds.length) return [];
      const { data, error } = await (supabase.from('engineering_revisions' as any).select('*').in('ecr_id', ecrIds).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: ecrs.length > 0,
  });

  const { data: bomChanges = [] } = useQuery({
    queryKey: ['eng-bom-changes', activeCompanyId],
    queryFn: async () => {
      const ecrIds = ecrs.map(e => e.id);
      if (!ecrIds.length) return [];
      const { data, error } = await (supabase.from('engineering_bom_changes' as any).select('*').in('ecr_id', ecrIds));
      if (error) throw error;
      return data as any[];
    },
    enabled: ecrs.length > 0,
  });

  const createECR = useMutation({
    mutationFn: async (f: any) => {
      const { error } = await (supabase.from('engineering_change_requests' as any).insert({ company_id: activeCompanyId, requested_by: user?.id, ...f }));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ecrs'] }); setShowDialog(false); toast({ title: 'ECR created' }); },
  });

  const updateECR = useMutation({
    mutationFn: async ({ id, ...u }: any) => {
      const { error } = await (supabase.from('engineering_change_requests' as any).update(u).eq('id', id));
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ecrs'] }); toast({ title: 'ECR updated' }); },
  });

  const kpis = useMemo(() => ({
    total: ecrs.length,
    pending: ecrs.filter(e => ['submitted', 'under_review'].includes(e.status)).length,
    approved: ecrs.filter(e => e.status === 'approved').length,
    released: ecrs.filter(e => e.status === 'released').length,
  }), [ecrs]);

  return (
    <div className="p-4 md:p-6 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'إدارة التغييرات الهندسية' : 'Engineering Change Control'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'متابعة طلبات التغيير الهندسي' : 'Manage design, BOM, and routing changes'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><GitBranch className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-xs text-muted-foreground">Total ECRs</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-6 w-6 mx-auto text-amber-500 mb-1" /><p className="text-2xl font-bold">{kpis.pending}</p><p className="text-xs text-muted-foreground">Pending Review</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" /><p className="text-2xl font-bold">{kpis.approved}</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><FileText className="h-6 w-6 mx-auto text-emerald-500 mb-1" /><p className="text-2xl font-bold">{kpis.released}</p><p className="text-xs text-muted-foreground">Released</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="board">Change Request Board</TabsTrigger>
          <TabsTrigger value="revisions">Revision Compare</TabsTrigger>
          <TabsTrigger value="impact">Impact Review</TabsTrigger>
          <TabsTrigger value="approval">Approval Workflow</TabsTrigger>
          <TabsTrigger value="history">Release History</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Engineering Change Requests</CardTitle>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New ECR</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Change Request</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                    <div><Label>Change Type</Label>
                      <Select value={form.change_type} onValueChange={v => setForm({ ...form, change_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="design">Design</SelectItem><SelectItem value="bom">BOM</SelectItem><SelectItem value="routing">Routing</SelectItem><SelectItem value="specification">Specification</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Priority</Label>
                      <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div><Label>Impact Analysis</Label><Textarea value={form.impact_analysis} onChange={e => setForm({ ...form, impact_analysis: e.target.value })} /></div>
                    <Button className="w-full" onClick={() => createECR.mutate(form)}>Create ECR</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {['draft', 'submitted', 'under_review', 'approved'].map(status => (
                  <div key={status} className="border rounded-lg p-3">
                    <h3 className="font-semibold mb-2 capitalize text-sm">{status.replace('_', ' ')}</h3>
                    <div className="space-y-2">
                      {ecrs.filter(e => e.status === status).slice(0, 6).map((e: any) => (
                        <div key={e.id} className="border rounded p-2 text-sm">
                          <div className="flex justify-between"><span className="font-medium text-xs">{e.ecr_number}</span><Badge className={`text-[10px] ${priorityColor[e.priority] || ''}`}>{e.priority}</Badge></div>
                          <p className="text-xs mt-1 truncate">{e.title}</p>
                          <p className="text-[10px] text-muted-foreground capitalize mt-1">{e.change_type}</p>
                          {status === 'draft' && <Button size="sm" variant="outline" className="w-full mt-1 text-xs h-7" onClick={() => updateECR.mutate({ id: e.id, status: 'submitted' })}>Submit</Button>}
                          {status === 'submitted' && <Button size="sm" variant="outline" className="w-full mt-1 text-xs h-7" onClick={() => updateECR.mutate({ id: e.id, status: 'under_review' })}>Start Review</Button>}
                          {status === 'under_review' && (
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => updateECR.mutate({ id: e.id, status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })}>Approve</Button>
                              <Button size="sm" variant="destructive" className="flex-1 text-xs h-7" onClick={() => updateECR.mutate({ id: e.id, status: 'rejected' })}>Reject</Button>
                            </div>
                          )}
                          {status === 'approved' && <Button size="sm" variant="outline" className="w-full mt-1 text-xs h-7" onClick={() => updateECR.mutate({ id: e.id, status: 'released', released_by: user?.id, released_at: new Date().toISOString() })}>Release</Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions">
          <Card>
            <CardHeader><CardTitle>Revision Compare</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>ECR</TableHead><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Old Rev</TableHead><TableHead>New Rev</TableHead><TableHead>Change</TableHead><TableHead>Released</TableHead></TableRow></TableHeader>
                <TableBody>
                  {revisions.map((r: any) => {
                    const ecr = ecrs.find(e => e.id === r.ecr_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{ecr?.ecr_number || '-'}</TableCell>
                        <TableCell>{r.document_name}</TableCell>
                        <TableCell className="capitalize">{r.document_type}</TableCell>
                        <TableCell>{r.old_revision || '-'}</TableCell>
                        <TableCell className="font-bold">{r.new_revision || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.change_description || '-'}</TableCell>
                        <TableCell>{r.released_at ? format(new Date(r.released_at), 'dd/MM/yyyy') : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {revisions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No revisions recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact">
          <Card>
            <CardHeader><CardTitle>Impact Review</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ecrs.filter(e => e.impact_analysis).map((e: any) => {
                  const ecrBom = bomChanges.filter(b => b.ecr_id === e.id);
                  return (
                    <div key={e.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div><span className="font-bold">{e.ecr_number}</span> - {e.title}</div>
                        <Badge className={statusColor[e.status] || ''}>{e.status}</Badge>
                      </div>
                      <p className="text-sm mb-2">{e.impact_analysis}</p>
                      {ecrBom.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <p className="text-xs font-semibold mb-1">BOM Changes:</p>
                          {ecrBom.map((b: any) => (
                            <div key={b.id} className="text-xs text-muted-foreground">{b.item_code}: {b.change_type} — {b.old_value} → {b.new_value}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {ecrs.filter(e => e.impact_analysis).length === 0 && <p className="text-center text-muted-foreground py-8">No impact analyses recorded</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval">
          <Card>
            <CardHeader><CardTitle>Approval Workflow</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>ECR #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Approved By</TableHead><TableHead>Approved At</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ecrs.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.ecr_number}</TableCell>
                      <TableCell>{e.title}</TableCell>
                      <TableCell className="capitalize">{e.change_type}</TableCell>
                      <TableCell><Badge className={priorityColor[e.priority] || ''}>{e.priority}</Badge></TableCell>
                      <TableCell><Badge className={statusColor[e.status] || ''}>{e.status}</Badge></TableCell>
                      <TableCell>{e.approved_by || '-'}</TableCell>
                      <TableCell>{e.approved_at ? format(new Date(e.approved_at), 'dd/MM/yyyy') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Release History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>ECR #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Released At</TableHead><TableHead>Revisions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ecrs.filter(e => e.status === 'released').map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.ecr_number}</TableCell>
                      <TableCell>{e.title}</TableCell>
                      <TableCell className="capitalize">{e.change_type}</TableCell>
                      <TableCell>{e.released_at ? format(new Date(e.released_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                      <TableCell>{revisions.filter(r => r.ecr_id === e.id).length}</TableCell>
                    </TableRow>
                  ))}
                  {ecrs.filter(e => e.status === 'released').length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No released changes</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
