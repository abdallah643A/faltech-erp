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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Briefcase, Plus, Target, AlertTriangle, TrendingUp, Calendar, Users, ClipboardList } from 'lucide-react';

export default function PMOPortfolioGovernance() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [form, setForm] = useState({ project_name: '', portfolio_category: 'active', current_gate: 'initiation', priority_score: 50, risk_level: 'medium', sponsor_name: '', pmo_owner: '' });
  const [decisionForm, setDecisionForm] = useState({ portfolio_item_id: '', decision_type: 'gate_review', title: '', description: '', decided_by: '' });

  const { data: items = [] } = useQuery({
    queryKey: ['pmo-portfolio-items', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_portfolio_items' as any).select('*').order('priority_score', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ['pmo-decision-log', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_decision_log' as any).select('*').order('decided_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createItem = useMutation({
    mutationFn: async (i: any) => {
      const { error } = await (supabase.from('pmo_portfolio_items' as any).insert({ ...i, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pmo-portfolio-items'] }); toast.success('Portfolio item added'); setShowCreate(false); },
  });

  const createDecision = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await (supabase.from('pmo_decision_log' as any).insert({ ...d, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pmo-decision-log'] }); toast.success('Decision logged'); setShowDecision(false); },
  });

  const highRisk = items.filter((i: any) => i.risk_level === 'critical' || i.risk_level === 'high');
  const slipping = items.filter((i: any) => i.milestone_health === 'red' || (i.schedule_variance_pct || 0) > 10);
  const riskColor = (r: string) => r === 'critical' ? 'destructive' : r === 'high' ? 'destructive' : r === 'medium' ? 'secondary' : 'outline';
  const healthColor = (h: string) => h === 'green' ? 'text-green-600' : h === 'amber' ? 'text-amber-600' : 'text-destructive';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6" />PMO Portfolio Governance</h1>
          <p className="text-muted-foreground">Enterprise project portfolio oversight and governance</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showDecision} onOpenChange={setShowDecision}>
            <DialogTrigger asChild><Button variant="outline"><ClipboardList className="h-4 w-4 mr-2" />Log Decision</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Governance Decision</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Portfolio Item</Label>
                  <Select value={decisionForm.portfolio_item_id} onValueChange={v => setDecisionForm({ ...decisionForm, portfolio_item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.project_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Decision Type</Label>
                  <Select value={decisionForm.decision_type} onValueChange={v => setDecisionForm({ ...decisionForm, decision_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gate_review">Gate Review</SelectItem>
                      <SelectItem value="budget_change">Budget Change</SelectItem>
                      <SelectItem value="scope_change">Scope Change</SelectItem>
                      <SelectItem value="risk_escalation">Risk Escalation</SelectItem>
                      <SelectItem value="resource_reallocation">Resource Reallocation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={decisionForm.title} onChange={e => setDecisionForm({ ...decisionForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={decisionForm.description} onChange={e => setDecisionForm({ ...decisionForm, description: e.target.value })} /></div>
                <div><Label>Decided By</Label><Input value={decisionForm.decided_by} onChange={e => setDecisionForm({ ...decisionForm, decided_by: e.target.value })} /></div>
                <Button onClick={() => createDecision.mutate(decisionForm)} disabled={!decisionForm.title}>Log Decision</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Project</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Portfolio Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Project Name</Label><Input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Current Gate</Label><Input value={form.current_gate} onChange={e => setForm({ ...form, current_gate: e.target.value })} /></div>
                  <div><Label>Priority (0-100)</Label><Input type="number" value={form.priority_score} onChange={e => setForm({ ...form, priority_score: +e.target.value })} /></div>
                </div>
                <div><Label>Risk Level</Label>
                  <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Sponsor</Label><Input value={form.sponsor_name} onChange={e => setForm({ ...form, sponsor_name: e.target.value })} /></div>
                  <div><Label>PMO Owner</Label><Input value={form.pmo_owner} onChange={e => setForm({ ...form, pmo_owner: e.target.value })} /></div>
                </div>
                <Button onClick={() => createItem.mutate(form)} disabled={!form.project_name}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground">Portfolio Items</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{highRisk.length}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{slipping.length}</p><p className="text-xs text-muted-foreground">Slipping</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{items.filter((i: any) => i.decision_required).length}</p><p className="text-xs text-muted-foreground">Decisions Required</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{decisions.length}</p><p className="text-xs text-muted-foreground">Decisions Logged</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Portfolio Dashboard</TabsTrigger>
          <TabsTrigger value="gates">Stage Gate Tracker</TabsTrigger>
          <TabsTrigger value="health">Milestone Health</TabsTrigger>
          <TabsTrigger value="risk">Risk & Issue Matrix</TabsTrigger>
          <TabsTrigger value="resources">Resource Pressure</TabsTrigger>
          <TabsTrigger value="decisions">Decision Log</TabsTrigger>
          <TabsTrigger value="calendar">Governance Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="space-y-3">
            {items.map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{i.project_name}</p>
                      <p className="text-sm text-muted-foreground">Gate: {i.current_gate} • Sponsor: {i.sponsor_name || '—'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={riskColor(i.risk_level)}>{i.risk_level} risk</Badge>
                      <span className={`text-sm font-bold ${healthColor(i.milestone_health)}`}>●</span>
                    </div>
                  </div>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    <span>Priority: {i.priority_score}</span>
                    <span>Budget Var: {i.budget_variance_pct || 0}%</span>
                    <span>Schedule Var: {i.schedule_variance_pct || 0}%</span>
                    <span>Resource: {i.resource_pressure || 'normal'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gates">
          <div className="space-y-3">
            {items.map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.project_name}</p>
                    <p className="text-sm text-muted-foreground">Current: {i.current_gate}</p>
                  </div>
                  <Badge variant={i.gate_status === 'on_track' ? 'default' : i.gate_status === 'at_risk' ? 'secondary' : 'destructive'}>{i.gate_status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['green', 'amber', 'red'].map(h => (
              <Card key={h}>
                <CardHeader><CardTitle className={`text-base capitalize ${healthColor(h)}`}>{h} Projects</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {items.filter((i: any) => i.milestone_health === h).map((i: any) => (
                    <div key={i.id} className="text-sm">{i.project_name}</div>
                  ))}
                  {items.filter((i: any) => i.milestone_health === h).length === 0 && <p className="text-sm text-muted-foreground">None</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk">
          <div className="space-y-3">
            {highRisk.map((i: any) => (
              <Card key={i.id} className="border-destructive/30">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />{i.project_name}</p>
                    <p className="text-sm text-muted-foreground">Budget Var: {i.budget_variance_pct}% • Schedule Var: {i.schedule_variance_pct}%</p>
                  </div>
                  <Badge variant="destructive">{i.risk_level}</Badge>
                </CardContent>
              </Card>
            ))}
            {highRisk.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No high-risk projects</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="space-y-3">
            {items.map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.project_name}</p>
                    <p className="text-sm text-muted-foreground">PMO: {i.pmo_owner || '—'}</p>
                  </div>
                  <Badge variant={i.resource_pressure === 'critical' ? 'destructive' : i.resource_pressure === 'high' ? 'secondary' : 'outline'}>{i.resource_pressure || 'normal'}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="decisions">
          <div className="space-y-3">
            {decisions.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-sm text-muted-foreground">{d.decision_type.replace(/_/g, ' ')} • {d.decided_by || '—'} • {new Date(d.decided_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline">{d.status}</Badge>
                  </div>
                  {d.description && <p className="text-sm mt-2">{d.description}</p>}
                </CardContent>
              </Card>
            ))}
            {decisions.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No decisions logged</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="space-y-3">
            {items.filter((i: any) => i.next_review_date).sort((a: any, b: any) => new Date(a.next_review_date).getTime() - new Date(b.next_review_date).getTime()).map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.project_name}</p>
                    <p className="text-sm text-muted-foreground">Gate: {i.current_gate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(i.next_review_date).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {items.filter((i: any) => i.next_review_date).length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No governance reviews scheduled</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
