import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Rocket, Plus, CheckCircle2, XCircle, AlertTriangle, Shield, Clock, Package } from 'lucide-react';

export default function ReleaseReadinessCenter() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('checklists');
  const [showCreate, setShowCreate] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [form, setForm] = useState({ release_version: '', release_date: '', release_type: 'minor', impacted_modules: '', notes: '' });
  const [itemForm, setItemForm] = useState({ module: '', item_title: '', item_type: 'test', severity: 'medium', owner_name: '', is_blocker: false });

  const { data: checklists = [] } = useQuery({
    queryKey: ['release-checklists', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('release_checklists' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['release-checklist-items', selectedChecklist?.id],
    queryFn: async () => {
      if (!selectedChecklist) return [];
      const { data, error } = await (supabase.from('release_checklist_items' as any).select('*').eq('checklist_id', selectedChecklist.id).order('created_at') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedChecklist,
  });

  const { data: postIssues = [] } = useQuery({
    queryKey: ['release-post-issues', selectedChecklist?.id],
    queryFn: async () => {
      if (!selectedChecklist) return [];
      const { data, error } = await (supabase.from('release_post_issues' as any).select('*').eq('checklist_id', selectedChecklist.id).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedChecklist,
  });

  const createChecklist = useMutation({
    mutationFn: async (c: any) => {
      const modules = c.impacted_modules ? c.impacted_modules.split(',').map((m: string) => m.trim()) : [];
      const { error } = await (supabase.from('release_checklists' as any).insert({ ...c, impacted_modules: modules, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-checklists'] }); toast.success('Release created'); setShowCreate(false); },
  });

  const addItem = useMutation({
    mutationFn: async (i: any) => {
      const { error } = await (supabase.from('release_checklist_items' as any).insert({ ...i, checklist_id: selectedChecklist.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-checklist-items'] }); toast.success('Item added'); setShowItem(false); },
  });

  const signOffItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('release_checklist_items' as any).update({ status: 'passed', signed_off_at: new Date().toISOString(), signed_off_by: 'Current User' }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-checklist-items'] }); toast.success('Signed off'); },
  });

  const failItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('release_checklist_items' as any).update({ status: 'failed' }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-checklist-items'] }); },
  });

  const updateGoLive = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) => {
      const { error } = await (supabase.from('release_checklists' as any).update({
        go_live_decision: decision, go_live_decided_at: new Date().toISOString(),
        status: decision === 'approved' ? 'released' : decision === 'rejected' ? 'blocked' : 'planning',
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-checklists'] }); toast.success('Decision updated'); },
  });

  const completedPct = items.length > 0 ? Math.round((items.filter((i: any) => i.status === 'passed').length / items.length) * 100) : 0;
  const blockers = items.filter((i: any) => i.is_blocker && i.status !== 'passed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6" />Release Readiness & Regression Center</h1>
          <p className="text-muted-foreground">Safer deployments with formal review and sign-off</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Release</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Release Checklist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Version</Label><Input placeholder="e.g. v2.4.0" value={form.release_version} onChange={e => setForm({ ...form, release_version: e.target.value })} /></div>
              <div><Label>Release Date</Label><Input type="date" value={form.release_date} onChange={e => setForm({ ...form, release_date: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.release_type} onValueChange={v => setForm({ ...form, release_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="patch">Patch</SelectItem>
                    <SelectItem value="hotfix">Hotfix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Impacted Modules (comma-separated)</Label><Input value={form.impacted_modules} onChange={e => setForm({ ...form, impacted_modules: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={() => createChecklist.mutate(form)} disabled={!form.release_version}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="checklists">Release Checklists</TabsTrigger>
          <TabsTrigger value="items">Checklist Items</TabsTrigger>
          <TabsTrigger value="go-live">Go-Live Decision</TabsTrigger>
          <TabsTrigger value="post-release">Post-Release Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="checklists">
          <div className="space-y-3">
            {checklists.map((c: any) => (
              <Card key={c.id} className={`cursor-pointer hover:shadow-md ${selectedChecklist?.id === c.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedChecklist(c)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium flex items-center gap-2"><Package className="h-4 w-4" />{c.release_version}</p>
                      <p className="text-sm text-muted-foreground">{c.release_type} • {c.release_date ? new Date(c.release_date).toLocaleDateString() : 'TBD'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={c.status === 'released' ? 'default' : c.status === 'blocked' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                      <Badge variant={c.go_live_decision === 'approved' ? 'default' : c.go_live_decision === 'rejected' ? 'destructive' : 'outline'}>{c.go_live_decision}</Badge>
                    </div>
                  </div>
                  {c.impacted_modules?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {c.impacted_modules.map((m: string) => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {checklists.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No release checklists</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="items">
          {selectedChecklist ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{selectedChecklist.release_version} - Checklist Items</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={completedPct} className="w-48 h-2" />
                    <span className="text-sm">{completedPct}% complete</span>
                    {blockers.length > 0 && <Badge variant="destructive">{blockers.length} blockers</Badge>}
                  </div>
                </div>
                <Dialog open={showItem} onOpenChange={setShowItem}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Item</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Checklist Item</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Module</Label><Input value={itemForm.module} onChange={e => setItemForm({ ...itemForm, module: e.target.value })} /></div>
                      <div><Label>Title</Label><Input value={itemForm.item_title} onChange={e => setItemForm({ ...itemForm, item_title: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Type</Label>
                          <Select value={itemForm.item_type} onValueChange={v => setItemForm({ ...itemForm, item_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="test">Test</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="config">Config</SelectItem>
                              <SelectItem value="migration">Migration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Severity</Label>
                          <Select value={itemForm.severity} onValueChange={v => setItemForm({ ...itemForm, severity: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>Owner</Label><Input value={itemForm.owner_name} onChange={e => setItemForm({ ...itemForm, owner_name: e.target.value })} /></div>
                      <Button onClick={() => addItem.mutate(itemForm)} disabled={!itemForm.item_title}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {items.map((i: any) => (
                  <Card key={i.id} className={i.is_blocker && i.status !== 'passed' ? 'border-destructive/50' : ''}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {i.status === 'passed' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : i.status === 'failed' ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <p className="font-medium text-sm">{i.item_title}</p>
                          <p className="text-xs text-muted-foreground">{i.module} • {i.item_type} • {i.owner_name || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {i.is_blocker && <Badge variant="destructive" className="text-xs">Blocker</Badge>}
                        <Badge variant={i.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">{i.severity}</Badge>
                        {i.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => signOffItem.mutate(i.id)}>Pass</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => failItem.mutate(i.id)}>Fail</Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a release from the Checklists tab</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="go-live">
          {selectedChecklist ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Go-Live Decision: {selectedChecklist.release_version}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground">Total Items</p></div>
                  <div><p className="text-2xl font-bold text-green-600">{items.filter((i: any) => i.status === 'passed').length}</p><p className="text-xs text-muted-foreground">Passed</p></div>
                  <div><p className="text-2xl font-bold text-destructive">{blockers.length}</p><p className="text-xs text-muted-foreground">Blockers</p></div>
                </div>
                <Progress value={completedPct} className="h-3" />
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => updateGoLive.mutate({ id: selectedChecklist.id, decision: 'approved' })} disabled={blockers.length > 0} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4 mr-2" />Approve Go-Live
                  </Button>
                  <Button variant="destructive" onClick={() => updateGoLive.mutate({ id: selectedChecklist.id, decision: 'rejected' })}>
                    <XCircle className="h-4 w-4 mr-2" />Block Release
                  </Button>
                </div>
                {blockers.length > 0 && <p className="text-sm text-destructive text-center">Cannot approve: {blockers.length} blocker(s) remain</p>}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a release first</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="post-release">
          <div className="space-y-3">
            {postIssues.map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-sm text-muted-foreground">{i.module} • {i.reported_by || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={i.severity === 'critical' ? 'destructive' : 'secondary'}>{i.severity}</Badge>
                    <Badge variant={i.status === 'resolved' ? 'default' : 'secondary'}>{i.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {postIssues.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">{selectedChecklist ? 'No post-release issues' : 'Select a release first'}</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
