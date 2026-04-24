import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Plus, Trash2, Edit, ArrowRight, GitBranch, Shield, Upload } from 'lucide-react';

const MODULES = ['sales_orders','purchase_orders','quotes','ar_invoices','ap_invoices','leave_requests','material_requests','projects','deliveries','payments'];

export default function WorkflowBuilder() {
  const { language } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: statusRules = [] } = useQuery({
    queryKey: ['workflow-status-rules', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('workflow_status_rules' as any).select('*') as any).order('module');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['workflow-versions'],
    queryFn: async () => {
      const { data } = await (supabase.from('workflow_rule_versions' as any).select('*') as any).order('created_at', { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const [ruleDialog, setRuleDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ module: '', from_status: '', to_status: '', required_fields: '', is_active: true });
  const [filterModule, setFilterModule] = useState('all');

  const createStatusRule = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
 ...data, required_fields: data.required_fields ? data.required_fields.split(',').map((s: string) => s.trim()) : [], company_id: activeCompanyId, created_by: user?.id };
      if (editId) {
        const { error } = await (supabase.from('workflow_status_rules' as any).update(payload) as any).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('workflow_status_rules' as any).insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-status-rules'] }); setRuleDialog(false); toast({ title: 'Saved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => { await supabase.from('workflow_status_rules' as any).delete().eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-status-rules'] }),
  });

  const publishVersion = useMutation({
    mutationFn: async (id: string) => {
      await (supabase.from('workflow_rule_versions' as any).update({ status: 'published', published_by: user?.id, published_at: new Date().toISOString() }) as any).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-versions'] }); toast({ title: 'Published' }); },
  });

  const filtered = filterModule === 'all' ? statusRules : statusRules.filter((r: any) => r.module === filterModule);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><GitBranch className="h-6 w-6" /> Workflow Builder</h1>
          <p className="text-muted-foreground text-sm">Define approval chains, status transitions, and action visibility rules</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ module: '', from_status: '', to_status: '', required_fields: '', is_active: true }); setRuleDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Status Rule
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><Settings className="h-4 w-4 mr-1" /> Status Rules ({statusRules.length})</TabsTrigger>
          <TabsTrigger value="versions"><Shield className="h-4 w-4 mr-1" /> Versions ({versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status Transition Rules</CardTitle>
                <Select value={filterModule} onValueChange={setFilterModule}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Transition</TableHead><TableHead>Required Fields</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="secondary">{r.module?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="flex items-center gap-2"><Badge variant="outline">{r.from_status}</Badge><ArrowRight className="h-3 w-3" /><Badge>{r.to_status}</Badge></TableCell>
                      <TableCell className="text-xs">{r.required_fields?.join(', ') || '-'}</TableCell>
                      <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditId(r.id); setForm({ module: r.module, from_status: r.from_status, to_status: r.to_status, required_fields: r.required_fields?.join(', ') || '', is_active: r.is_active }); setRuleDialog(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No rules defined</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Published By</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {versions.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>v{v.version}</TableCell>
                      <TableCell><Badge variant={v.status === 'published' ? 'default' : v.status === 'draft' ? 'secondary' : 'outline'}>{v.status}</Badge></TableCell>
                      <TableCell className="text-sm">{v.published_by || '-'}</TableCell>
                      <TableCell className="text-xs">{v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}</TableCell>
                      <TableCell>
                        {v.status === 'draft' && <Button size="sm" variant="outline" onClick={() => publishVersion.mutate(v.id)}><Upload className="h-3 w-3 mr-1" /> Publish</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {versions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No versions</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} Status Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Module</Label>
              <Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>From Status</Label><Input value={form.from_status} onChange={e => setForm({ ...form, from_status: e.target.value })} placeholder="e.g. draft" /></div>
              <div><Label>To Status</Label><Input value={form.to_status} onChange={e => setForm({ ...form, to_status: e.target.value })} placeholder="e.g. approved" /></div>
            </div>
            <div><Label>Required Fields (comma-separated)</Label><Input value={form.required_fields} onChange={e => setForm({ ...form, required_fields: e.target.value })} placeholder="e.g. amount, customer_name" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(false)}>Cancel</Button>
            <Button onClick={() => createStatusRule.mutate(form)} disabled={!form.module || !form.from_status || !form.to_status}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
