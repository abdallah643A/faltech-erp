import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, Plus, FileText, Lock, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function DocumentRetentionCenter() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('policies');
  const [showPolicy, setShowPolicy] = useState(false);
  const [pForm, setPForm] = useState({ document_type: '', category: '', retention_years: 7, legal_requirement: '', destruction_method: 'secure_delete', requires_approval: true });

  const { data: policies = [] } = useQuery({
    queryKey: ['retention-policies', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('document_retention_policies' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ['retention-records', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('document_retention_records' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createPolicy = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await (supabase.from('document_retention_policies' as any).insert({ ...p, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retention-policies'] }); toast.success('Policy created'); setShowPolicy(false); },
  });

  const setLegalHold = useMutation({
    mutationFn: async ({ id, hold }: { id: string; hold: boolean }) => {
      const { error } = await (supabase.from('document_retention_records' as any).update({
        legal_hold: hold, legal_hold_at: hold ? new Date().toISOString() : null, legal_hold_reason: hold ? 'Legal hold applied' : null,
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retention-records'] }); toast.success('Updated'); },
  });

  const approveDestruction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('document_retention_records' as any).update({
        lifecycle_status: 'destroyed', destruction_approved_at: new Date().toISOString(), destroyed_at: new Date().toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retention-records'] }); toast.success('Destruction approved'); },
  });

  const legalHolds = records.filter((r: any) => r.legal_hold);
  const pendingDestruction = records.filter((r: any) => r.lifecycle_status === 'pending_destruction');
  const expired = records.filter((r: any) => r.retention_expires_at && new Date(r.retention_expires_at) < new Date() && r.lifecycle_status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Document Retention & Records Policy</h1>
          <p className="text-muted-foreground">Policy-driven document lifecycle management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{policies.length}</p><p className="text-xs text-muted-foreground">Active Policies</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{legalHolds.length}</p><p className="text-xs text-muted-foreground">Legal Holds</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{expired.length}</p><p className="text-xs text-muted-foreground">Retention Expired</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{pendingDestruction.length}</p><p className="text-xs text-muted-foreground">Pending Destruction</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="policies">Retention Policies</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle Monitor</TabsTrigger>
          <TabsTrigger value="legal">Legal Hold Queue</TabsTrigger>
          <TabsTrigger value="destruction">Destruction Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <div className="flex justify-end mb-4">
            <Dialog open={showPolicy} onOpenChange={setShowPolicy}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Policy</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Retention Policy</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Document Type</Label><Input value={pForm.document_type} onChange={e => setPForm({ ...pForm, document_type: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={pForm.category} onChange={e => setPForm({ ...pForm, category: e.target.value })} /></div>
                  <div><Label>Retention Years</Label><Input type="number" value={pForm.retention_years} onChange={e => setPForm({ ...pForm, retention_years: +e.target.value })} /></div>
                  <div><Label>Legal Requirement</Label><Input value={pForm.legal_requirement} onChange={e => setPForm({ ...pForm, legal_requirement: e.target.value })} /></div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={pForm.requires_approval} onCheckedChange={v => setPForm({ ...pForm, requires_approval: !!v })} />
                    <span className="text-sm">Requires approval for destruction</span>
                  </div>
                  <Button onClick={() => createPolicy.mutate(pForm)} disabled={!pForm.document_type}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {policies.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.document_type}</p>
                    <p className="text-sm text-muted-foreground">{p.category} • {p.retention_years} years • {p.destruction_method}</p>
                  </div>
                  <div className="flex gap-2">
                    {p.requires_approval && <Badge variant="secondary">Approval Required</Badge>}
                    <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lifecycle">
          <div className="space-y-3">
            {records.map((r: any) => (
              <Card key={r.id} className={r.legal_hold ? 'border-amber-400' : ''}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.document_title || r.document_reference}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {r.retention_expires_at ? new Date(r.retention_expires_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.legal_hold && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Legal Hold</Badge>}
                    <Badge variant={r.lifecycle_status === 'destroyed' ? 'destructive' : r.lifecycle_status === 'archived' ? 'secondary' : 'default'}>{r.lifecycle_status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {records.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No retention records</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="legal">
          <div className="space-y-3">
            {legalHolds.length > 0 ? legalHolds.map((r: any) => (
              <Card key={r.id} className="border-amber-400">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2"><Lock className="h-4 w-4 text-amber-600" />{r.document_title || r.document_reference}</p>
                    <p className="text-sm text-muted-foreground">Hold since: {r.legal_hold_at ? new Date(r.legal_hold_at).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLegalHold.mutate({ id: r.id, hold: false })}>Release Hold</Button>
                </CardContent>
              </Card>
            )) : <Card><CardContent className="py-8 text-center text-muted-foreground">No active legal holds</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="destruction">
          <div className="space-y-3">
            {pendingDestruction.length > 0 ? pendingDestruction.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.document_title || r.document_reference}</p>
                    <p className="text-sm text-muted-foreground">Requested: {r.destruction_requested_at ? new Date(r.destruction_requested_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => approveDestruction.mutate(r.id)}><Trash2 className="h-4 w-4 mr-1" />Approve Destruction</Button>
                  </div>
                </CardContent>
              </Card>
            )) : <Card><CardContent className="py-8 text-center text-muted-foreground">No pending destruction requests</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
