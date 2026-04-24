import { useState } from 'react';
import { useExecutiveReporting } from '@/hooks/useExecutiveReporting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { TrendingUp, FileText, MessageSquare, Target, AlertTriangle, Calendar, Mail, Layout, Sparkles, Plus, RefreshCw, Trash2, Users, Layers, TrendingDown, ShieldAlert, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { PersonaDashboard, type ExecPersona } from '@/components/executive/PersonaDashboard';
import { ExecutivePersonaSwitcher } from '@/components/executive/ExecutivePersonaSwitcher';
import { StrategicScorecard } from '@/components/executive/StrategicScorecard';
import { KPIDrilldown } from '@/components/executive/KPIDrilldown';
import { ProfitabilityWaterfall } from '@/components/executive/ProfitabilityWaterfall';
import { RiskHeatmap } from '@/components/executive/RiskHeatmap';
import { GroupConsolidationView } from '@/components/executive/GroupConsolidationView';
import { BoardPackViewer } from '@/components/executive/BoardPackViewer';

export default function ExecutiveReportingHub() {
  const r = useExecutiveReporting();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [persona, setPersona] = useState<ExecPersona>('ceo');
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  return (
    <div className="space-y-4 p-4 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executive Reporting Hub</h1>
          <p className="text-sm text-muted-foreground">Cross-company KPIs, board packs, decisions, goals, risks, expiries, and AI insights</p>
        </div>
      </div>

      <Tabs defaultValue="personas" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="personas"><Users className="h-4 w-4 mr-1" />{isAr ? 'الشخصيات' : 'Personas'}</TabsTrigger>
          <TabsTrigger value="scorecard"><Target className="h-4 w-4 mr-1" />{isAr ? 'بطاقة الأداء' : 'Scorecard'}</TabsTrigger>
          <TabsTrigger value="kpis"><TrendingUp className="h-4 w-4 mr-1" />KPIs</TabsTrigger>
          <TabsTrigger value="drilldown"><Layers className="h-4 w-4 mr-1" />{isAr ? 'تفصيل' : 'Drill-Down'}</TabsTrigger>
          <TabsTrigger value="waterfall"><TrendingDown className="h-4 w-4 mr-1" />{isAr ? 'الربحية' : 'Waterfall'}</TabsTrigger>
          <TabsTrigger value="heatmap"><ShieldAlert className="h-4 w-4 mr-1" />{isAr ? 'خريطة المخاطر' : 'Risk Map'}</TabsTrigger>
          <TabsTrigger value="group"><Building2 className="h-4 w-4 mr-1" />{isAr ? 'المجموعة' : 'Group'}</TabsTrigger>
          <TabsTrigger value="board"><FileText className="h-4 w-4 mr-1" />Board Pack</TabsTrigger>
          <TabsTrigger value="decisions"><MessageSquare className="h-4 w-4 mr-1" />Decisions</TabsTrigger>
          <TabsTrigger value="goals"><Target className="h-4 w-4 mr-1" />Goals</TabsTrigger>
          <TabsTrigger value="risks"><AlertTriangle className="h-4 w-4 mr-1" />Risks</TabsTrigger>
          <TabsTrigger value="expiry"><Calendar className="h-4 w-4 mr-1" />Doc Expiry</TabsTrigger>
          <TabsTrigger value="schedules"><Mail className="h-4 w-4 mr-1" />Schedules</TabsTrigger>
          <TabsTrigger value="widgets"><Layout className="h-4 w-4 mr-1" />Widgets</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1" />AI Insights</TabsTrigger>
        </TabsList>

        {/* Personas */}
        <TabsContent value="personas" className="space-y-3 mt-4">
          <ExecutivePersonaSwitcher active={persona} onChange={setPersona} isAr={isAr} />
          <PersonaDashboard persona={persona} isAr={isAr} />
        </TabsContent>

        {/* Scorecard */}
        <TabsContent value="scorecard" className="mt-4">
          <StrategicScorecard isAr={isAr} />
        </TabsContent>

        {/* KPIs */}
        <TabsContent value="kpis" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">KPI Snapshots</CardTitle>
              <Button size="sm" onClick={() => r.computeKpiSnapshot.mutate({ period_start: monthStart, period_end: today })}>
                <RefreshCw className="h-4 w-4 mr-1" />Compute MTD
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(r.kpiSnapshots.data ?? []).slice(0, 8).map((k: any) => (
                  <Card key={k.id}><CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">{k.kpi_label}</div>
                    <div className="text-xl font-bold">{Number(k.value ?? 0).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">{format(new Date(k.period_end), 'dd MMM yyyy')}</div>
                  </CardContent></Card>
                ))}
                {(r.kpiSnapshots.data ?? []).length === 0 && <p className="text-sm text-muted-foreground col-span-full">No snapshots yet — click Compute MTD.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PR2 — Analytics */}
        <TabsContent value="drilldown" className="mt-4"><KPIDrilldown isAr={isAr} /></TabsContent>
        <TabsContent value="waterfall" className="mt-4"><ProfitabilityWaterfall isAr={isAr} /></TabsContent>
        <TabsContent value="heatmap" className="mt-4"><RiskHeatmap isAr={isAr} /></TabsContent>
        <TabsContent value="group" className="mt-4"><GroupConsolidationView isAr={isAr} /></TabsContent>

        {/* Board Pack */}
        <TabsContent value="board" className="mt-4"><BoardPackTab r={r} /></TabsContent>
        <TabsContent value="decisions" className="mt-4"><DecisionsTab r={r} /></TabsContent>
        <TabsContent value="goals" className="mt-4"><GoalsTab r={r} /></TabsContent>
        <TabsContent value="risks" className="mt-4"><RisksTab r={r} /></TabsContent>
        <TabsContent value="expiry" className="mt-4"><ExpiryTab r={r} /></TabsContent>
        <TabsContent value="schedules" className="mt-4"><SchedulesTab r={r} /></TabsContent>
        <TabsContent value="widgets" className="mt-4"><WidgetsTab r={r} /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AIInsightsTab r={r} /></TabsContent>
      </Tabs>
    </div>
  );
}

function BoardPackTab({ r }: any) {
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', period_start: '', period_end: '' });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Board Packs <Sparkles className="h-3 w-3 text-primary" /></CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Generate</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Board Pack (with AI narrative)</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Q4 2025 Board Pack" /></div>
              <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} /></div>
              <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} /></div>
              <p className="text-[11px] text-muted-foreground">AI narrative is produced via google/gemini-2.5-flash and rendered with the data.</p>
            </div>
            <DialogFooter><Button onClick={() => { r.generateBoardPack.mutate(form); setOpen(false); }} disabled={r.generateBoardPack.isPending}>{r.generateBoardPack.isPending ? 'Generating…' : 'Generate'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(r.boardPacks.data ?? []).map((p: any) => (
            <button key={p.id} onClick={() => setViewId(p.id)} className="w-full flex items-center justify-between p-2 rounded border hover:bg-accent text-left transition-colors">
              <div>
                <div className="font-medium text-sm">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.period_start} → {p.period_end}</div>
                {p.notes && <div className="text-[10px] text-muted-foreground mt-0.5">{p.notes}</div>}
              </div>
              <Badge variant={p.status === 'generated' ? 'default' : 'outline'}>{p.status}</Badge>
            </button>
          ))}
          {(r.boardPacks.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No board packs yet. Click Generate to build one with KPIs, risks, and an AI executive summary.</p>}
        </div>
        <BoardPackViewer packId={viewId} onClose={() => setViewId(null)} />
      </CardContent>
    </Card>
  );
}

function DecisionsTab({ r }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', status: 'open', priority: 'medium' });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Management Decisions</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Log Decision</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Decision</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Owner name" value={form.owner_name ?? ''} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter><Button onClick={() => { r.upsertDecision.mutate(form); setOpen(false); setForm({ title: '', description: '', status: 'open', priority: 'medium' }); }}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(r.decisions.data ?? []).map((d: any) => (
            <div key={d.id} className="flex items-start justify-between p-2 rounded border">
              <div className="flex-1">
                <div className="font-medium text-sm">{d.title}</div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{d.owner_name} • {d.decision_date}</div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline">{d.status}</Badge>
                <Button size="sm" variant="ghost" onClick={() => r.deleteDecision.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
          {(r.decisions.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No decisions logged yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsTab({ r }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', perspective: 'financial', status: 'on_track' });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Strategic Goals</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Strategic Goal</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Owner" value={form.owner_name ?? ''} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              <Input type="number" placeholder="Target value" value={form.target_value ?? ''} onChange={e => setForm({ ...form, target_value: Number(e.target.value) })} />
              <Input type="number" placeholder="Current value" value={form.current_value ?? ''} onChange={e => setForm({ ...form, current_value: Number(e.target.value) })} />
            </div>
            <DialogFooter><Button onClick={() => { r.upsertGoal.mutate(form); setOpen(false); setForm({ title: '', perspective: 'financial', status: 'on_track' }); }}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(r.goals.data ?? []).map((g: any) => {
            const pct = g.target_value ? Math.round((Number(g.current_value ?? 0) / Number(g.target_value)) * 100) : 0;
            return (
              <div key={g.id} className="p-2 rounded border">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{g.title}</div>
                  <Badge variant={g.status === 'on_track' ? 'default' : 'destructive'}>{g.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{g.owner_name} • {pct}% of target</div>
                <div className="h-1.5 bg-muted rounded mt-1 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
          {(r.goals.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function RisksTab({ r }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', probability: 3, impact: 3, status: 'identified' });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Risk Register</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Risk</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Risk</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="1" max="5" placeholder="Probability 1-5" value={form.probability} onChange={e => setForm({ ...form, probability: Number(e.target.value) })} />
                <Input type="number" min="1" max="5" placeholder="Impact 1-5" value={form.impact} onChange={e => setForm({ ...form, impact: Number(e.target.value) })} />
              </div>
              <Textarea placeholder="Mitigation strategy" value={form.mitigation_strategy ?? ''} onChange={e => setForm({ ...form, mitigation_strategy: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={() => { r.upsertRisk.mutate(form); setOpen(false); setForm({ title: '', probability: 3, impact: 3, status: 'identified' }); }}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(r.risks.data ?? []).map((risk: any) => (
            <div key={risk.id} className="flex items-start justify-between p-2 rounded border">
              <div className="flex-1">
                <div className="font-medium text-sm">{risk.title}</div>
                <div className="text-xs text-muted-foreground">Score: {risk.inherent_score} • {risk.category ?? 'general'}</div>
              </div>
              <div className="flex items-center gap-1">
                <Select value={risk.status} onValueChange={v => r.transitionRiskStatus.mutate({ id: risk.id, status: v })}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identified">Identified</SelectItem>
                    <SelectItem value="assessed">Assessed</SelectItem>
                    <SelectItem value="mitigating">Mitigating</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {(r.risks.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No risks yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ExpiryTab({ r }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Document Expiry Watchlist</CardTitle>
        <Button size="sm" onClick={() => r.refreshDocExpiry.mutate()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {(r.docExpiry.data ?? []).map((d: any) => (
            <div key={d.id} className="flex items-center justify-between p-2 rounded border text-sm">
              <div>
                <div className="font-medium">{d.document_type} {d.document_ref && `• ${d.document_ref}`}</div>
                <div className="text-xs text-muted-foreground">{d.entity_name} • expires {d.expiry_date}</div>
              </div>
              <Badge variant={d.severity === 'critical' ? 'destructive' : 'outline'}>{d.severity ?? 'low'}</Badge>
            </div>
          ))}
          {(r.docExpiry.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Watchlist is empty.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SchedulesTab({ r }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ schedule_name: '', channel: 'email', frequency: 'daily', recipients: [] });
  const [recipientText, setRecipientText] = useState('');
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Scheduled Executive Summaries</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Schedule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Schedule</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="Schedule name" value={form.schedule_name} onChange={e => setForm({ ...form, schedule_name: e.target.value })} />
              <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
              </Select>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
              <Textarea placeholder="Recipients (comma-separated emails or phone numbers)" value={recipientText} onChange={e => setRecipientText(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={() => {
                const recipients = recipientText.split(',').map(s => s.trim()).filter(Boolean);
                r.upsertSchedule.mutate({ ...form, recipients });
                setOpen(false);
                setForm({ schedule_name: '', channel: 'email', frequency: 'daily', recipients: [] });
                setRecipientText('');
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(r.schedules.data ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded border text-sm">
              <div>
                <div className="font-medium">{s.schedule_name}</div>
                <div className="text-xs text-muted-foreground">{s.channel} • {s.frequency} • {(s.recipients ?? []).length} recipients</div>
              </div>
              <Badge variant={s.is_active ? 'default' : 'outline'}>{s.is_active ? 'Active' : 'Paused'}</Badge>
            </div>
          ))}
          {(r.schedules.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No schedules yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetsTab({ r }: any) {
  const [role, setRole] = useState('executive');
  const widgets = ['kpis', 'pending_approvals', 'cashflow', 'project_health', 'risk_heatmap', 'document_expiry', 'ai_insights'];
  const configs = (r.widgetConfigs.data ?? []).filter((c: any) => c.role === role);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role-Based Widget Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="cfo">CFO</SelectItem>
              <SelectItem value="coo">COO</SelectItem>
              <SelectItem value="ceo">CEO</SelectItem>
              <SelectItem value="board">Board</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          {widgets.map((w, i) => {
            const existing = configs.find((c: any) => c.widget_key === w);
            const visible = existing?.visible ?? true;
            return (
              <div key={w} className="flex items-center justify-between p-2 rounded border text-sm">
                <span>{w.replace(/_/g, ' ')}</span>
                <Button size="sm" variant={visible ? 'default' : 'outline'} onClick={() =>
                  r.upsertWidgetConfig.mutate({ role, widget_key: w, widget_label: w, visible: !visible, display_order: i })
                }>{visible ? 'Visible' : 'Hidden'}</Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AIInsightsTab({ r }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI Narrative Insights</CardTitle>
        <Button size="sm" onClick={() => r.generateInsight.mutate({ insight_type: 'kpi_review', scope: 'company' })}>
          <Sparkles className="h-4 w-4 mr-1" />Generate
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(r.aiInsights.data ?? []).map((i: any) => (
            <div key={i.id} className="p-3 rounded border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{i.title}</div>
                <Badge variant="outline">{i.insight_type}</Badge>
              </div>
              <p className="text-sm mt-1">{i.narrative}</p>
              {(i.highlights ?? []).length > 0 && (
                <ul className="mt-2 text-xs list-disc pl-4 space-y-0.5">
                  {(i.highlights as string[]).map((h, idx) => <li key={idx}>{h}</li>)}
                </ul>
              )}
              {(i.recommendations ?? []).length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold">Recommendations</div>
                  <ul className="text-xs list-disc pl-4">
                    {(i.recommendations as string[]).map((rec, idx) => <li key={idx}>{rec}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {(r.aiInsights.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No insights yet — click Generate.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
