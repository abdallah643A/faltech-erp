import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Search, Plus, CheckCircle2, XCircle, AlertTriangle, Clock, BarChart3,
  Download, Play, RotateCcw, FileText, Filter, Loader2, Trash2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const MODULES = ['CRM', 'Procurement', 'HR', 'Manufacturing', 'Construction', 'Finance', 'Inventory', 'Sales'];

const resultColors: Record<string, string> = {
  pass: 'bg-success/10 text-success', fail: 'bg-destructive/10 text-destructive',
  blocker: 'bg-warning/10 text-warning', pending: 'bg-muted text-muted-foreground',
  skipped: 'bg-muted text-muted-foreground',
};

const resultIcons: Record<string, React.ElementType> = {
  pass: CheckCircle2, fail: XCircle, blocker: AlertTriangle, pending: Clock, skipped: Clock,
};

export default function RegressionTestCockpit() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState('runs');
  const [filterModule, setFilterModule] = useState('all');
  const [search, setSearch] = useState('');
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  // Scenario form
  const [scenarioForm, setScenarioForm] = useState({ module: 'CRM', title: '', description: '', steps: '', expected_result: '', priority: 'medium', tags: '' });
  // Run form
  const [runForm, setRunForm] = useState({ run_name: '', description: '', tester_name: '' });

  // Fetch scenarios
  const { data: scenarios = [] } = useQuery({
    queryKey: ['regression-scenarios', activeCompanyId, filterModule],
    queryFn: async () => {
      let q = supabase.from('regression_test_scenarios').select('*').eq('is_active', true).order('module').order('title');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as any;
      if (filterModule !== 'all') q = q.eq('module', filterModule) as any;
      const { data } = await q;
      return data || [];
    },
  });

  // Fetch runs
  const { data: runs = [] } = useQuery({
    queryKey: ['regression-runs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('regression_test_runs').select('*').order('created_at', { ascending: false }).limit(20);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as any;
      const { data } = await q;
      return data || [];
    },
  });

  // Fetch results for selected run
  const { data: results = [] } = useQuery({
    queryKey: ['regression-results', selectedRun],
    queryFn: async () => {
      if (!selectedRun) return [];
      const { data } = await supabase.from('regression_test_results')
        .select('*, regression_test_scenarios(module, title, expected_result, priority, steps)')
        .eq('run_id', selectedRun)
        .order('created_at');
      return data || [];
    },
    enabled: !!selectedRun,
  });

  // Create scenario
  const createScenario = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('regression_test_scenarios').insert({
        ...scenarioForm,
        tags: scenarioForm.tags ? scenarioForm.tags.split(',').map(t => t.trim()) : [],
        company_id: activeCompanyId || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regression-scenarios'] });
      toast({ title: 'Scenario created' });
      setShowScenarioDialog(false);
      setScenarioForm({ module: 'CRM', title: '', description: '', steps: '', expected_result: '', priority: 'medium', tags: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Start a new run
  const startRun = useMutation({
    mutationFn: async () => {
      // Create run
      const { data: run, error: runErr } = await supabase.from('regression_test_runs').insert({
        run_name: runForm.run_name,
        description: runForm.description || null,
        tester_name: runForm.tester_name || null,
        tester_id: user?.id,
        status: 'in_progress',
        total_scenarios: scenarios.length,
        company_id: activeCompanyId || null,
        created_by: user?.id,
      } as any).select().single();
      if (runErr) throw runErr;

      // Create result rows for each scenario
      const resultRows = scenarios.map((s: any) => ({
        run_id: run.id,
        scenario_id: s.id,
        result: 'pending',
        tested_by: runForm.tester_name || null,
      }));
      if (resultRows.length > 0) {
        const { error: resErr } = await supabase.from('regression_test_results').insert(resultRows as any);
        if (resErr) throw resErr;
      }
      return run;
    },
    onSuccess: (run: any) => {
      queryClient.invalidateQueries({ queryKey: ['regression-runs'] });
      toast({ title: 'Test run started' });
      setShowRunDialog(false);
      setSelectedRun(run.id);
      setActiveTab('execution');
      setRunForm({ run_name: '', description: '', tester_name: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Update result
  const updateResult = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; result?: string; actual_result?: string; notes?: string; evidence_url?: string; blocker_description?: string }) => {
      const updateData: any = { ...updates, tested_at: new Date().toISOString() };
      if (updates.result && updates.result !== 'pending') {
        updateData.retest_count = 1; // will increment on retests
        updateData.last_retest_at = new Date().toISOString();
      }
      const { error } = await supabase.from('regression_test_results').update(updateData).eq('id', id);
      if (error) throw error;

      // Update run stats
      if (selectedRun) {
        const { data: allResults } = await supabase.from('regression_test_results').select('result').eq('run_id', selectedRun);
        if (allResults) {
          const stats = {
            passed: allResults.filter(r => r.result === 'pass').length,
            failed: allResults.filter(r => r.result === 'fail').length,
            blocked: allResults.filter(r => r.result === 'blocker').length,
            skipped: allResults.filter(r => r.result === 'skipped').length,
          };
          const allDone = allResults.every(r => r.result !== 'pending');
          await supabase.from('regression_test_runs').update({
            ...stats,
            status: allDone ? 'completed' : 'in_progress',
            completed_at: allDone ? new Date().toISOString() : null,
          } as any).eq('id', selectedRun);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regression-results', selectedRun] });
      queryClient.invalidateQueries({ queryKey: ['regression-runs'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Export report
  const exportReport = () => {
  const { t } = useLanguage();

    if (!selectedRun || results.length === 0) return;
    const run = runs.find((r: any) => r.id === selectedRun);
    const csv = [
      ['Module', 'Scenario', 'Expected', 'Result', 'Actual Result', 'Notes', 'Evidence', 'Blocker', 'Tested At'].join(','),
      ...results.map((r: any) => [
        r.regression_test_scenarios?.module,
        `"${(r.regression_test_scenarios?.title || '').replace(/"/g, '""')}"`,
        `"${(r.regression_test_scenarios?.expected_result || '').replace(/"/g, '""')}"`,
        r.result,
        `"${(r.actual_result || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        r.evidence_url || '',
        `"${(r.blocker_description || '').replace(/"/g, '""')}"`,
        r.tested_at || '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regression-report-${run?.run_name || 'run'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats for selected run
  const runStats = useMemo(() => {
    if (results.length === 0) return null;
    const total = results.length;
    const passed = results.filter((r: any) => r.result === 'pass').length;
    const failed = results.filter((r: any) => r.result === 'fail').length;
    const blocked = results.filter((r: any) => r.result === 'blocker').length;
    const pending = results.filter((r: any) => r.result === 'pending').length;
    return { total, passed, failed, blocked, pending, passRate: total > 0 ? Math.round((passed / total) * 100) : 0 };
  }, [results]);

  const filteredScenarios = scenarios.filter((s: any) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.module.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'اختبار الانحدار' : 'Regression Testing Cockpit'}</h1>
          <p className="text-muted-foreground">Manage test scenarios, execute runs, and track results</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" onClick={() => setShowScenarioDialog(true)}>
            <Plus className="h-4 w-4" /> Scenario
          </Button>
          <Button className="gap-1" onClick={() => setShowRunDialog(true)} disabled={scenarios.length === 0}>
            <Play className="h-4 w-4" /> Start Run
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="runs" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Runs</TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1"><FileText className="h-3.5 w-3.5" /> Scenarios ({scenarios.length})</TabsTrigger>
          <TabsTrigger value="execution" className="gap-1" disabled={!selectedRun}><Play className="h-3.5 w-3.5" /> Execution</TabsTrigger>
        </TabsList>

        {/* Runs Tab */}
        <TabsContent value="runs" className="mt-4 space-y-4">
          {runs.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No test runs yet. Create scenarios first, then start a run.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {runs.map((run: any) => {
                const total = run.total_scenarios || 1;
                const passRate = total > 0 ? Math.round(((run.passed || 0) / total) * 100) : 0;
                return (
                  <Card key={run.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedRun(run.id); setActiveTab('execution'); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{run.run_name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {run.tester_name && `${run.tester_name} • `}
                            {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge className={run.status === 'completed' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}>
                          {run.status}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{passRate}% pass rate</span>
                          <span>{run.passed || 0}P / {run.failed || 0}F / {run.blocked || 0}B / {total} total</span>
                        </div>
                        <Progress value={passRate} className="h-2" />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] text-success">{run.passed || 0} passed</Badge>
                        <Badge variant="outline" className="text-[10px] text-destructive">{run.failed || 0} failed</Badge>
                        <Badge variant="outline" className="text-[10px] text-warning">{run.blocked || 0} blocked</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search scenarios..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredScenarios.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No scenarios found. Add your first test scenario.</CardContent></Card>
          ) : (
            <div className="enterprise-card divide-y divide-border">
              {filteredScenarios.map((s: any) => (
                <div key={s.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{s.module}</Badge>
                        <h4 className="font-medium text-sm">{s.title}</h4>
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground mt-1 truncate">{s.description}</p>}
                      {s.expected_result && <p className="text-xs text-success mt-0.5">Expected: {s.expected_result}</p>}
                    </div>
                    <Badge className={s.priority === 'high' ? 'bg-destructive/10 text-destructive' : s.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}>
                      {s.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Execution Tab */}
        <TabsContent value="execution" className="mt-4 space-y-4">
          {!selectedRun ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Select a run from the Runs tab</CardContent></Card>
          ) : (
            <>
              {/* Stats bar */}
              {runStats && (
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: 'Total', value: runStats.total, color: '' },
                    { label: 'Passed', value: runStats.passed, color: 'text-success' },
                    { label: 'Failed', value: runStats.failed, color: 'text-destructive' },
                    { label: 'Blocked', value: runStats.blocked, color: 'text-warning' },
                    { label: 'Pending', value: runStats.pending, color: 'text-muted-foreground' },
                  ].map(s => (
                    <Card key={s.label}>
                      <CardContent className="p-3 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="gap-1" onClick={exportReport}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>

              {/* Results list */}
              <div className="enterprise-card divide-y divide-border">
                {results.map((r: any) => {
                  const Icon = resultIcons[r.result] || Clock;
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`mt-0.5 p-1 rounded ${resultColors[r.result]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{r.regression_test_scenarios?.module}</Badge>
                              <span className="font-medium text-sm truncate">{r.regression_test_scenarios?.title}</span>
                            </div>
                            {r.regression_test_scenarios?.expected_result && (
                              <p className="text-xs text-muted-foreground mt-0.5">Expected: {r.regression_test_scenarios.expected_result}</p>
                            )}
                            {r.actual_result && <p className="text-xs mt-0.5">Actual: {r.actual_result}</p>}
                            {r.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{r.notes}</p>}
                            {r.blocker_description && <p className="text-xs text-warning mt-0.5">🚫 {r.blocker_description}</p>}
                            {r.retest_count > 1 && <Badge variant="outline" className="text-[9px] mt-1"><RotateCcw className="h-3 w-3 mr-1" /> Retested {r.retest_count}x</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Select value={r.result} onValueChange={v => updateResult.mutate({ id: r.id, result: v })}>
                            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['pending', 'pass', 'fail', 'blocker', 'skipped'].map(v => (
                                <SelectItem key={v} value={v} className="capitalize text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* Quick input fields */}
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input placeholder="Actual result..." className="h-8 text-xs"
                          defaultValue={r.actual_result || ''}
                          onBlur={e => { if (e.target.value !== (r.actual_result || '')) updateResult.mutate({ id: r.id, actual_result: e.target.value }); }}
                        />
                        <Input placeholder="Notes..." className="h-8 text-xs"
                          defaultValue={r.notes || ''}
                          onBlur={e => { if (e.target.value !== (r.notes || '')) updateResult.mutate({ id: r.id, notes: e.target.value }); }}
                        />
                        <Input placeholder="Evidence URL..." className="h-8 text-xs"
                          defaultValue={r.evidence_url || ''}
                          onBlur={e => { if (e.target.value !== (r.evidence_url || '')) updateResult.mutate({ id: r.id, evidence_url: e.target.value }); }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Scenario Dialog */}
      <Dialog open={showScenarioDialog} onOpenChange={setShowScenarioDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Test Scenario</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Module *</Label>
              <Select value={scenarioForm.module} onValueChange={v => setScenarioForm({ ...scenarioForm, module: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={scenarioForm.title} onChange={e => setScenarioForm({ ...scenarioForm, title: e.target.value })} placeholder="e.g. Create Sales Order and verify invoice" /></div>
            <div><Label>Description</Label><Textarea value={scenarioForm.description} onChange={e => setScenarioForm({ ...scenarioForm, description: e.target.value })} rows={2} /></div>
            <div><Label>Steps</Label><Textarea value={scenarioForm.steps} onChange={e => setScenarioForm({ ...scenarioForm, steps: e.target.value })} rows={3} placeholder="1. Navigate to...\n2. Click..." /></div>
            <div><Label>Expected Result</Label><Input value={scenarioForm.expected_result} onChange={e => setScenarioForm({ ...scenarioForm, expected_result: e.target.value })} placeholder="Invoice created with correct total" /></div>
            <div><Label>Priority</Label>
              <Select value={scenarioForm.priority} onValueChange={v => setScenarioForm({ ...scenarioForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={scenarioForm.tags} onChange={e => setScenarioForm({ ...scenarioForm, tags: e.target.value })} placeholder="smoke, critical-path" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScenarioDialog(false)}>Cancel</Button>
            <Button onClick={() => createScenario.mutate()} disabled={!scenarioForm.title || createScenario.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Run Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start Test Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Run Name *</Label><Input value={runForm.run_name} onChange={e => setRunForm({ ...runForm, run_name: e.target.value })} placeholder="Sprint 12 Regression" /></div>
            <div><Label>Tester Name</Label><Input value={runForm.tester_name} onChange={e => setRunForm({ ...runForm, tester_name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={runForm.description} onChange={e => setRunForm({ ...runForm, description: e.target.value })} rows={2} /></div>
            <p className="text-xs text-muted-foreground">{scenarios.length} scenarios will be included in this run</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>Cancel</Button>
            <Button onClick={() => startRun.mutate()} disabled={!runForm.run_name || startRun.isPending}>
              <Play className="h-4 w-4 mr-1" /> Start Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
