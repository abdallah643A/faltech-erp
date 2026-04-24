import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, BarChart3, Bot, CheckCircle2, Eye, Gauge, Lightbulb, Lock, PanelTop, PlayCircle, Settings2, Sparkles, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useRegisterCommandAction } from '@/lib/commandActions';

type WidgetSize = 'compact' | 'wide' | 'tall';

interface BuilderWidget {
  id: string;
  title: string;
  module: string;
  metric: string;
  size: WidgetSize;
  hint: string;
  enabled: boolean;
}

const STORAGE_KEY = 'myerp_personal_dashboard_widgets';

const defaultWidgets: BuilderWidget[] = [
  { id: 'cash-risk', title: 'Cash exposure', module: 'Finance', metric: '7 exceptions', size: 'compact', hint: 'Review unreconciled bank lines before period close.', enabled: true },
  { id: 'sales-focus', title: 'Pipeline focus', module: 'CRM', metric: '12 hot deals', size: 'wide', hint: 'Prioritize deals with next activity missing.', enabled: true },
  { id: 'po-delay', title: 'PO delays', module: 'Procurement', metric: '4 late suppliers', size: 'compact', hint: 'Open supplier scorecards before expediting.', enabled: true },
  { id: 'site-watch', title: 'CPMS watchlist', module: 'CPMS', metric: '3 claims pending', size: 'tall', hint: 'Check approval evidence before claims move forward.', enabled: false },
  { id: 'stock-health', title: 'Stock health', module: 'Inventory', metric: '18 low items', size: 'compact', hint: 'Convert replenishment suggestions into drafts only.', enabled: true },
  { id: 'hr-actions', title: 'People actions', module: 'HR', metric: '9 due tasks', size: 'compact', hint: 'Handle expiry and attendance exceptions by role permission.', enabled: false },
];

const walkthroughs = [
  { title: 'Finance close path', route: '/finance', steps: ['Review cash exposure', 'Open approval inbox', 'Export statutory reports'] },
  { title: 'Procure-to-pay path', route: '/procurement-dashboard', steps: ['Check delayed suppliers', 'Open PO exceptions', 'Review draft recommendations'] },
  { title: 'Sales operating rhythm', route: '/sales-pipeline', steps: ['Filter hot deals', 'Schedule missing activities', 'Review customer health'] },
];

function readWidgets() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as BuilderWidget[] : defaultWidgets;
  } catch {
    return defaultWidgets;
  }
}

export default function PersonalDashboardBuilder() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const primaryRole = roles[0] || 'user';
  const [widgets, setWidgets] = useState<BuilderWidget[]>(readWidgets);
  const enabledWidgets = widgets.filter((w) => w.enabled);

  const roleHints = useMemo(() => {
    const role = primaryRole.toLowerCase();
    if (role.includes('admin')) return ['Pin governance queues first', 'Use walkthroughs to standardize onboarding', 'Keep AI drafts in review before execution'];
    if (role.includes('finance')) return ['Start with cash exposure', 'Review journal and posting exceptions', 'Export reports after approvals clear'];
    if (role.includes('sales')) return ['Pin pipeline focus', 'Open next-best-actions daily', 'Keep customer health visible'];
    return ['Pin the modules you use daily', 'Use Ctrl+K for cross-module commands', 'Follow role-safe hints before acting'];
  }, [primaryRole]);

  useRegisterCommandAction([
    { id: 'open-personal-dashboard-builder', label: 'Open personal dashboard builder', group: 'Productivity', icon: PanelTop, perform: () => navigate('/personal-dashboard'), keywords: ['dashboard', 'builder', 'personal'], shortcut: 'Ctrl K' },
    { id: 'open-role-workspaces', label: 'Open role workspaces', group: 'Productivity', icon: Gauge, perform: () => navigate('/role-workspaces'), keywords: ['role', 'workspace'], priority: 5 },
    { id: 'open-ai-review-queue', label: 'Open AI review queue', group: 'Governance', icon: Lock, perform: () => navigate('/controlled-ai/review'), keywords: ['ai', 'review', 'approval'], priority: 6 },
  ]);

  const persist = (next: BuilderWidget[]) => {
    setWidgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleWidget = (id: string) => persist(widgets.map((w) => w.id === id ? { ...w, enabled: !w.enabled } : w));
  const moveWidget = (id: string, direction: -1 | 1) => {
    const index = widgets.findIndex((w) => w.id === id);
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };
  const applyRolePreset = () => persist(defaultWidgets.map((w) => ({ ...w, enabled: roleHints.some((h) => h.toLowerCase().includes(w.module.toLowerCase())) || w.enabled })));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Personal Dashboard Builder</h1>
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Governance unchanged</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Compose your workspace, launch guided flows, and surface role-aware productivity hints.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={applyRolePreset}><Wand2 className="mr-2 h-4 w-4" />Apply role preset</Button>
          <Button size="sm" onClick={() => navigate('/controlled-ai/review')}><CheckCircle2 className="mr-2 h-4 w-4" />Review drafts</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><PanelTop className="h-4 w-4 text-primary" />Canvas preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {enabledWidgets.map((widget) => (
                <div key={widget.id} className={`rounded-lg border bg-muted/30 p-4 ${widget.size === 'wide' ? 'md:col-span-2' : ''} ${widget.size === 'tall' ? 'md:row-span-2' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{widget.module}</p>
                      <h2 className="text-sm font-semibold">{widget.title}</h2>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{widget.size}</Badge>
                  </div>
                  <p className="mt-4 text-2xl font-bold">{widget.metric}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{widget.hint}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-primary" />Role hints</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="capitalize">{primaryRole.replace('_', ' ')}</Badge>
            {roleHints.map((hint) => <div key={hint} className="rounded-md border bg-background p-3 text-sm">{hint}</div>)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="builder">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="builder"><Settings2 className="mr-2 h-4 w-4" />Widgets</TabsTrigger>
          <TabsTrigger value="walkthroughs"><PlayCircle className="mr-2 h-4 w-4" />Walkthroughs</TabsTrigger>
          <TabsTrigger value="recommendations"><Sparkles className="mr-2 h-4 w-4" />Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget, index) => (
            <Card key={widget.id} className={!widget.enabled ? 'opacity-70' : undefined}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="mb-2 text-[10px]">{widget.module}</Badge>
                    <h3 className="font-semibold">{widget.title}</h3>
                    <p className="text-xs text-muted-foreground">{widget.hint}</p>
                  </div>
                  <Button variant={widget.enabled ? 'default' : 'outline'} size="sm" onClick={() => toggleWidget(widget.id)}>
                    {widget.enabled ? 'Pinned' : 'Pin'}
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => moveWidget(widget.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={index === widgets.length - 1} onClick={() => moveWidget(widget.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <span className="text-xs text-muted-foreground">Position {index + 1}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="walkthroughs" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {walkthroughs.map((flow) => (
            <Card key={flow.title}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{flow.title}</h3><Eye className="h-4 w-4 text-primary" /></div>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  {flow.steps.map((step, i) => <li key={step}>{i + 1}. {step}</li>)}
                </ol>
                <Button className="mt-4 w-full" variant="outline" onClick={() => navigate(flow.route)}>Start</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {['Pin AI review queue for draft approvals', 'Add delayed supplier widget this week', 'Use command palette to jump between Finance, CRM, HR'].map((item) => (
            <Card key={item}><CardContent className="flex items-start gap-3 p-4"><Bot className="mt-0.5 h-4 w-4 text-primary" /><p className="text-sm">{item}</p></CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}