import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, LineChart, ShieldCheck, Sparkles, AlertTriangle, FileText, Lightbulb, Loader2 } from 'lucide-react';
import { CONTROLLED_AI_CAPABILITIES, CONTROLLED_AI_MODULES, type ControlledAICapability, type ControlledAIModule, useControlledAI } from '@/hooks/useControlledAI';
import { ExplainCard } from '@/components/copilot/ExplainCard';

const capabilityIcon: Record<ControlledAICapability, any> = {
  anomaly: AlertTriangle,
  forecast: LineChart,
  narrative: FileText,
  next_best_action: Lightbulb,
  decision_support: Brain,
};

export default function ControlledAIDashboard() {
  const [module, setModule] = useState<ControlledAIModule>('finance');
  const [capability, setCapability] = useState<ControlledAICapability>('anomaly');
  const [prompt, setPrompt] = useState('Review recent operational signals, detect issues, create safe drafts, and explain the evidence.');
  const { suggestions, forecasts, narratives, decisions, generate, reviewSuggestion, metrics } = useControlledAI();

  const moduleSuggestions = (suggestions.data ?? []).filter((s) => s.module === module);
  const CapabilityIcon = capabilityIcon[capability];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Brain className="h-6 w-6 text-primary" />Controlled AI Command Center</h1>
          <p className="text-sm text-muted-foreground">Explainable, permission-aware AI across finance, CRM, procurement, CPMS, inventory, and HR.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1"><ShieldCheck className="h-3.5 w-3.5" />Single approval before live impact</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { label: 'Generated insights', value: metrics.generated, icon: Sparkles },
          { label: 'Pending review', value: metrics.pending, icon: ShieldCheck },
          { label: 'Approved', value: metrics.approved, icon: LineChart },
          { label: 'High risk', value: metrics.highRisk, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CapabilityIcon className="h-4 w-4 text-primary" />Generate controlled AI draft</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[180px_220px_1fr_auto]">
          <Select value={module} onValueChange={(v) => setModule(v as ControlledAIModule)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONTROLLED_AI_MODULES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={capability} onValueChange={(v) => setCapability(v as ControlledAICapability)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONTROLLED_AI_CAPABILITIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-10" />
          <Button disabled={generate.isPending} onClick={() => generate.mutate({ module, capability, prompt })} className="gap-2">
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Generate
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="suggestions">
        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="suggestions">Suggestions</TabsTrigger><TabsTrigger value="forecasts">Forecasts</TabsTrigger><TabsTrigger value="narratives">Narratives</TabsTrigger><TabsTrigger value="decisions">Decisions</TabsTrigger></TabsList>
        <TabsContent value="suggestions" className="mt-4 grid gap-3 lg:grid-cols-2">
          {moduleSuggestions.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No reviewed suggestions for this module yet.</CardContent></Card> : moduleSuggestions.map((s) => (
            <ExplainCard key={s.id} suggestion={s} canApprove canExecute={false} onApprove={() => reviewSuggestion.mutate({ id: s.id, status: 'approved' })} onReject={() => reviewSuggestion.mutate({ id: s.id, status: 'rejected' })} />
          ))}
        </TabsContent>
        <TabsContent value="forecasts" className="mt-4 grid gap-3 lg:grid-cols-2">{(forecasts.data ?? []).filter((r) => r.module === module).map((r) => <InsightCard key={r.id} title={r.forecast_name} status={r.status} body={r.explanation ?? 'Forecast generated with recorded assumptions.'} confidence={r.confidence} />)}</TabsContent>
        <TabsContent value="narratives" className="mt-4 grid gap-3 lg:grid-cols-2">{(narratives.data ?? []).filter((r) => r.module === module).map((r) => <InsightCard key={r.id} title={r.report_name} status={r.status} body={r.narrative} confidence={r.confidence} />)}</TabsContent>
        <TabsContent value="decisions" className="mt-4 grid gap-3 lg:grid-cols-2">{(decisions.data ?? []).filter((r) => r.module === module).map((r) => <InsightCard key={r.id} title={r.case_title} status={r.status} body={String(r.recommendation?.summary ?? 'Decision recommendation generated as a draft.')} confidence={r.confidence} />)}</TabsContent>
      </Tabs>
    </div>
  );
}

function InsightCard({ title, status, body, confidence }: { title: string; status: string; body: string; confidence: number | null }) {
  return <Card><CardContent className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{title}</h3><Badge variant="outline" className="capitalize">{status.replace(/_/g, ' ')}</Badge></div><p className="text-sm text-muted-foreground">{body}</p>{confidence != null && <Badge variant="secondary">{Math.round(confidence * 100)}% confidence</Badge>}</CardContent></Card>;
}
