import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle, XCircle, Clock, Database, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const ENTITY_TYPES = ['customer', 'vendor', 'item', 'employee', 'project', 'chart_of_accounts', 'accounting_mapping'];

export default function MasterDataStewardship() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [tab, setTab] = useState('pending');
  const [formData, setFormData] = useState({ entity_type: 'customer', entity_name: '', change_type: 'update', justification: '' });
  const [fieldChanges, setFieldChanges] = useState([{ field_name: '', field_label: '', old_value: '', new_value: '' }]);

  const { data: requests = [] } = useQuery({
    queryKey: ['master-data-changes', activeCompanyId, tab],
    queryFn: async () => {
      let q = (supabase.from('master_data_change_requests' as any).select('*').order('created_at', { ascending: false }) as any);
      if (tab !== 'all') q = q.eq('status', tab);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: changeFields = [] } = useQuery({
    queryKey: ['master-data-change-fields', selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest) return [];
      const { data, error } = await (supabase.from('master_data_change_fields' as any).select('*').eq('change_request_id', selectedRequest.id) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRequest,
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('master_data_change_requests' as any).insert({ ...formData, company_id: activeCompanyId, submitted_by: user?.id, submitted_by_name: user?.email }).select().single() as any);
      if (error) throw error;
      const validFields = fieldChanges.filter(f => f.field_name);
      if (validFields.length > 0) {
        const { error: fErr } = await (supabase.from('master_data_change_fields' as any).insert(validFields.map(f => ({ ...f, change_request_id: data.id }))) as any);
        if (fErr) throw fErr;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-data-changes'] }); setShowCreate(false); toast({ title: 'Change request submitted' }); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: any = { status };
      if (status === 'approved') { updates.approved_by = user?.id; updates.approved_by_name = user?.email; updates.approved_at = new Date().toISOString(); }
      if (status === 'reviewed') { updates.reviewed_by = user?.id; updates.reviewed_by_name = user?.email; updates.reviewed_at = new Date().toISOString(); }
      if (status === 'rejected') { updates.rejected_reason = notes; }
      if (notes) updates.review_notes = notes;
      const { error } = await (supabase.from('master_data_change_requests' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-data-changes'] }); setSelectedRequest(null); toast({ title: 'Status updated' }); },
  });

  const statusColor = (s: string) => s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'reviewed' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6" />Master Data Stewardship</h1>
          <p className="text-muted-foreground">Review and approve changes to master data before they take effect</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Submit Change Request</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Submit Master Data Change</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Entity Type</Label>
                  <Select value={formData.entity_type} onValueChange={v => setFormData(p => ({ ...p, entity_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Change Type</Label>
                  <Select value={formData.change_type} onValueChange={v => setFormData(p => ({ ...p, change_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="create">Create</SelectItem><SelectItem value="update">Update</SelectItem><SelectItem value="deactivate">Deactivate</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Entity Name</Label><Input value={formData.entity_name} onChange={e => setFormData(p => ({ ...p, entity_name: e.target.value }))} /></div>
              <div><Label>Justification</Label><Textarea value={formData.justification} onChange={e => setFormData(p => ({ ...p, justification: e.target.value }))} /></div>
              <div><Label className="font-bold">Field Changes</Label>
                {fieldChanges.map((fc, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mt-2">
                    <Input placeholder="Field" value={fc.field_name} onChange={e => { const n = [...fieldChanges]; n[i].field_name = e.target.value; setFieldChanges(n); }} />
                    <Input placeholder="Label" value={fc.field_label} onChange={e => { const n = [...fieldChanges]; n[i].field_label = e.target.value; setFieldChanges(n); }} />
                    <Input placeholder="Old" value={fc.old_value} onChange={e => { const n = [...fieldChanges]; n[i].old_value = e.target.value; setFieldChanges(n); }} />
                    <Input placeholder="New" value={fc.new_value} onChange={e => { const n = [...fieldChanges]; n[i].new_value = e.target.value; setFieldChanges(n); }} />
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => setFieldChanges([...fieldChanges, { field_name: '', field_label: '', old_value: '', new_value: '' }])}>+ Add Field</Button>
              </div>
              <Button onClick={() => submitRequest.mutate()} disabled={!formData.entity_name}>{t('common.submit')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Pending', value: requests.filter((r: any) => r.status === 'pending').length, icon: Clock },
          { label: 'Reviewed', value: requests.filter((r: any) => r.status === 'reviewed').length, icon: Eye },
          { label: 'Approved', value: requests.filter((r: any) => r.status === 'approved').length, icon: CheckCircle },
          { label: 'Rejected', value: requests.filter((r: any) => r.status === 'rejected').length, icon: XCircle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="pending">{t('common.pending')}</TabsTrigger><TabsTrigger value="reviewed">Reviewed</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Entity</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Change</TableHead><TableHead>Submitted By</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {requests.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.entity_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.entity_type}</Badge></TableCell>
                      <TableCell className="text-sm">{r.change_type}</TableCell>
                      <TableCell className="text-sm">{r.submitted_by_name}</TableCell>
                      <TableCell className="text-sm">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'reviewed' })}>Review</Button>}
                          {(r.status === 'pending' || r.status === 'reviewed') && (
                            <>
                              <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: r.id, status: 'rejected', notes: 'Rejected by reviewer' })}>Reject</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No change requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
