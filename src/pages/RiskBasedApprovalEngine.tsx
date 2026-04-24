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
import { ShieldAlert, Plus, Play, Settings, Users, Clock, ArrowRight, Zap } from 'lucide-react';

export default function RiskBasedApprovalEngine() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('rules');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    rule_name: '', document_type: 'purchase_order', condition_field: 'amount', condition_operator: 'greater_than',
    condition_value: '', risk_score_min: 0, risk_score_max: 100, routing_type: 'sequential',
    delegation_allowed: false, escalation_hours: 48, emergency_path: false, priority: 100,
  });
  const [simDoc, setSimDoc] = useState({ document_type: 'purchase_order', amount: '', risk_score: '' });

  const { data: rules = [] } = useQuery({
    queryKey: ['risk-approval-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('risk_approval_rules' as any).select('*').order('priority') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRule = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await (supabase.from('risk_approval_rules' as any).insert({ ...r, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risk-approval-rules'] }); toast.success('Rule created'); setShowCreate(false); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('risk_approval_rules' as any).update({ is_active }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risk-approval-rules'] }); },
  });

  // Simple simulator
  const simulateResult = () => {
    const amount = parseFloat(simDoc.amount) || 0;
    const risk = parseFloat(simDoc.risk_score) || 0;
    const matching = rules.filter((r: any) => {
      if (r.document_type !== simDoc.document_type || !r.is_active) return false;
      if (r.condition_field === 'amount') {
        const threshold = parseFloat(r.condition_value) || 0;
        if (r.condition_operator === 'greater_than' && amount <= threshold) return false;
        if (r.condition_operator === 'less_than' && amount >= threshold) return false;
      }
      if (r.risk_score_min != null && risk < r.risk_score_min) return false;
      if (r.risk_score_max != null && risk > r.risk_score_max) return false;
      return true;
    });
    return matching;
  };

  const simResults = simDoc.amount || simDoc.risk_score ? simulateResult() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6" />Risk-Based Approval Engine</h1>
          <p className="text-muted-foreground">Dynamic approval routing based on risk, amount, and policy</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{rules.length}</p><p className="text-xs text-muted-foreground">Total Rules</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{rules.filter((r: any) => r.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-amber-600">{rules.filter((r: any) => r.emergency_path).length}</p><p className="text-xs text-muted-foreground">Emergency Paths</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{rules.filter((r: any) => r.delegation_allowed).length}</p><p className="text-xs text-muted-foreground">With Delegation</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules">Approval Rules</TabsTrigger>
          <TabsTrigger value="simulator">Routing Simulator</TabsTrigger>
          <TabsTrigger value="delegation">Delegation Setup</TabsTrigger>
          <TabsTrigger value="analytics">Approval Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="flex justify-end mb-4">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Rule</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Approval Rule</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Document Type</Label>
                      <Select value={form.document_type} onValueChange={v => setForm({ ...form, document_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['purchase_order', 'sales_order', 'invoice', 'leave_request', 'material_request', 'journal_entry'].map(t => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: +e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Field</Label><Input value={form.condition_field} onChange={e => setForm({ ...form, condition_field: e.target.value })} /></div>
                    <div><Label>Operator</Label>
                      <Select value={form.condition_operator} onValueChange={v => setForm({ ...form, condition_operator: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Value</Label><Input value={form.condition_value} onChange={e => setForm({ ...form, condition_value: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Risk Score Min</Label><Input type="number" value={form.risk_score_min} onChange={e => setForm({ ...form, risk_score_min: +e.target.value })} /></div>
                    <div><Label>Risk Score Max</Label><Input type="number" value={form.risk_score_max} onChange={e => setForm({ ...form, risk_score_max: +e.target.value })} /></div>
                  </div>
                  <div><Label>Escalation Hours</Label><Input type="number" value={form.escalation_hours} onChange={e => setForm({ ...form, escalation_hours: +e.target.value })} /></div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2"><Checkbox checked={form.delegation_allowed} onCheckedChange={v => setForm({ ...form, delegation_allowed: !!v })} /><span className="text-sm">Allow Delegation</span></div>
                    <div className="flex items-center gap-2"><Checkbox checked={form.emergency_path} onCheckedChange={v => setForm({ ...form, emergency_path: !!v })} /><span className="text-sm">Emergency Path</span></div>
                  </div>
                  <Button onClick={() => createRule.mutate(form)} disabled={!form.rule_name}>Create Rule</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {rules.map((r: any) => (
              <Card key={r.id} className={!r.is_active ? 'opacity-50' : ''}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.rule_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.document_type.replace(/_/g, ' ')} • {r.condition_field} {r.condition_operator.replace(/_/g, ' ')} {r.condition_value}
                      {r.risk_score_min != null && ` • Risk: ${r.risk_score_min}-${r.risk_score_max}`}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">P{r.priority}</Badge>
                    {r.emergency_path && <Badge variant="destructive"><Zap className="h-3 w-3 mr-1" />Emergency</Badge>}
                    {r.delegation_allowed && <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Delegation</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: r.id, is_active: !r.is_active })}>
                      {r.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="simulator">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Play className="h-5 w-5" />Route Simulator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Document Type</Label>
                  <Select value={simDoc.document_type} onValueChange={v => setSimDoc({ ...simDoc, document_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['purchase_order', 'sales_order', 'invoice', 'leave_request', 'material_request'].map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" value={simDoc.amount} onChange={e => setSimDoc({ ...simDoc, amount: e.target.value })} /></div>
                <div><Label>Risk Score</Label><Input type="number" value={simDoc.risk_score} onChange={e => setSimDoc({ ...simDoc, risk_score: e.target.value })} /></div>
              </div>
              {simResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-green-600">✓ {simResults.length} rule(s) matched</p>
                  {simResults.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-medium">{r.rule_name}</span>
                      <Badge variant="outline">{r.routing_type}</Badge>
                      {r.emergency_path && <Badge variant="destructive">Emergency</Badge>}
                      <span className="text-sm text-muted-foreground ml-auto">Escalation: {r.escalation_hours}h</span>
                    </div>
                  ))}
                </div>
              ) : (simDoc.amount || simDoc.risk_score) ? (
                <p className="text-amber-600">No rules matched for this scenario. Default routing will apply.</p>
              ) : (
                <p className="text-muted-foreground">Enter values to simulate routing</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegation">
          <div className="space-y-3">
            {rules.filter((r: any) => r.delegation_allowed).map((r: any) => (
              <Card key={r.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.rule_name}</p>
                    <p className="text-sm text-muted-foreground">Max delegation: {r.delegation_max_days || 5} days</p>
                  </div>
                  <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Delegation Enabled</Badge>
                </CardContent>
              </Card>
            ))}
            {rules.filter((r: any) => r.delegation_allowed).length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No rules with delegation enabled</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Rules by Document Type</CardTitle></CardHeader>
              <CardContent>
                {[...new Set(rules.map((r: any) => r.document_type))].map(dt => (
                  <div key={dt} className="flex items-center justify-between py-2">
                    <span className="text-sm capitalize">{dt.replace(/_/g, ' ')}</span>
                    <Badge variant="outline">{rules.filter((r: any) => r.document_type === dt).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Escalation Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Avg Escalation Time</span><span className="font-medium">{rules.length > 0 ? Math.round(rules.reduce((s: number, r: any) => s + (r.escalation_hours || 0), 0) / rules.length) : 0}h</span></div>
                  <div className="flex justify-between text-sm"><span>Emergency Paths</span><span className="font-medium">{rules.filter((r: any) => r.emergency_path).length}</span></div>
                  <div className="flex justify-between text-sm"><span>With Delegation</span><span className="font-medium">{rules.filter((r: any) => r.delegation_allowed).length}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
