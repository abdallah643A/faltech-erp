import { useMemo, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, GitCompare, Layers, Play, Rocket, ShieldCheck, SlidersHorizontal, Sparkles, TimerReset } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

const sandboxItems = [
  { name: 'Chart of accounts sandbox', owner: 'Finance', status: 'Ready', impact: '48 mapped accounts' },
  { name: 'Branch warehouse model', owner: 'Inventory', status: 'In review', impact: '6 bins, 2 transfer rules' },
  { name: 'Approval workflow variant', owner: 'Governance', status: 'Draft', impact: '3 maker-checker steps' },
];

const releaseDiffs = [
  { area: 'Finance setup', source: 'v1.8 template', target: 'Branch rollout pack', changes: '+12 rules, -2 legacy mappings' },
  { area: 'Localization', source: 'Generic GCC', target: 'New legal entity', changes: '+VAT terms, +bank format' },
  { area: 'Workflow', source: 'HQ baseline', target: 'Regional branch', changes: '+site approval lane' },
];

const templates = [
  { industry: 'Construction', modules: 'CPMS, procurement, finance gates', readiness: 92 },
  { industry: 'Manufacturing', modules: 'BOM, WIP, quality, inventory', readiness: 88 },
  { industry: 'Retail & POS', modules: 'POS, pricing, stock transfer', readiness: 85 },
  { industry: 'Healthcare', modules: 'Patients, billing, pharmacy', readiness: 81 },
];

const cutoverSteps = [
  'Freeze template baseline',
  'Validate master-data imports',
  'Dry-run opening balances',
  'Confirm role assignments',
  'Run branch readiness checklist',
  'Approve go-live window',
];

export default function RolloutCockpit() {
  const { roles } = useAuth();
  const primaryRole = roles[0] || 'implementation_lead';
  const [completed, setCompleted] = useState<string[]>(cutoverSteps.slice(0, 2));

  const readiness = useMemo(() => Math.round((completed.length / cutoverSteps.length) * 100), [completed.length]);
  const toggleStep = (step: string) => setCompleted((current) => current.includes(step) ? current.filter((item) => item !== step) : [...current, step]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">Rollout Acceleration Cockpit</h1>
            <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Governance inherited</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Coordinate company and branch rollouts with sandboxed configuration, release comparisons, templates, and cutover control.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" />Open sandbox</Button>
          <Button size="sm"><Rocket className="mr-2 h-4 w-4" />Start cutover</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ['Sandbox changes', '21', Layers],
          ['Release gaps', '8', GitCompare],
          ['Template packs', '4', Sparkles],
          ['Cutover readiness', `${readiness}%`, ClipboardCheck],
        ].map(([label, value, Icon]) => (
          <Card key={label as string}>
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-2xl font-bold">{value as string}</p></div>
              <Icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sandbox">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="sandbox"><Layers className="mr-2 h-4 w-4" />Configuration sandbox</TabsTrigger>
          <TabsTrigger value="compare"><GitCompare className="mr-2 h-4 w-4" />Release comparison</TabsTrigger>
          <TabsTrigger value="templates"><Sparkles className="mr-2 h-4 w-4" />Industry templates</TabsTrigger>
          <TabsTrigger value="cutover"><Rocket className="mr-2 h-4 w-4" />Cutover cockpit</TabsTrigger>
        </TabsList>

        <TabsContent value="sandbox" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {sandboxItems.map((item) => (
            <Card key={item.name}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{item.name}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><Badge variant="secondary">{item.owner}</Badge><Badge variant="outline">{item.status}</Badge></div>
                <p className="text-sm text-muted-foreground">{item.impact}</p>
                <Button variant="outline" className="w-full" size="sm">Compare to baseline</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="compare" className="space-y-3">
          {releaseDiffs.map((diff) => (
            <Card key={diff.area}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_1fr_1fr] md:items-center">
                <div><p className="font-semibold">{diff.area}</p><p className="text-xs text-muted-foreground">Release-controlled setup area</p></div>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                <div className="text-sm"><span className="text-muted-foreground">From</span> {diff.source}<br /><span className="text-muted-foreground">To</span> {diff.target}</div>
                <Badge variant="outline" className="justify-center">{diff.changes}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {templates.map((template) => (
            <Card key={template.industry}>
              <CardContent className="p-4">
                <Building2 className="mb-3 h-5 w-5 text-primary" />
                <h3 className="font-semibold">{template.industry}</h3>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">{template.modules}</p>
                <div className="mt-4 flex items-center justify-between"><Badge variant="secondary">{template.readiness}% ready</Badge><Button size="sm" variant="outline">Use</Button></div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="cutover" className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TimerReset className="h-4 w-4 text-primary" />Guided cutover checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cutoverSteps.map((step) => (
                <button key={step} onClick={() => toggleStep(step)} className="flex w-full items-center justify-between rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-muted/50">
                  <span>{step}</span>
                  {completed.includes(step) ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Coordination summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/30 p-3"><p className="text-muted-foreground">Rollout owner</p><p className="font-semibold capitalize">{primaryRole.replace('_', ' ')}</p></div>
              <div className="rounded-md border bg-muted/30 p-3"><p className="text-muted-foreground">Next gate</p><p className="font-semibold">Master-data import validation</p></div>
              <div className="rounded-md border bg-muted/30 p-3"><p className="text-muted-foreground">Go-live posture</p><p className="font-semibold">Controlled, approval-ready</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}