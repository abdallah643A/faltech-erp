import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Check, X } from 'lucide-react';
import { useControlledAI } from '@/hooks/useControlledAI';
import { ExplainCard } from '@/components/copilot/ExplainCard';

export default function ControlledAIReviewQueue() {
  const { suggestions, forecasts, narratives, decisions, reviewSuggestion, reviewRecord, metrics } = useControlledAI();
  const pendingSuggestions = (suggestions.data ?? []).filter((s) => s.status === 'pending');
  const pendingForecasts = (forecasts.data ?? []).filter((r) => r.status === 'pending_review');
  const pendingNarratives = (narratives.data ?? []).filter((r) => r.status === 'pending_review');
  const pendingDecisions = (decisions.data ?? []).filter((r) => r.status === 'pending_review');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-6 w-6 text-primary" />AI Review Queue</h1><p className="text-sm text-muted-foreground">Approve or reject AI drafts before any transaction-facing execution.</p></div>
        <Badge variant="outline">{metrics.pending} pending</Badge>
      </div>
      <Tabs defaultValue="actions">
        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="actions">Actions</TabsTrigger><TabsTrigger value="forecasts">Forecasts</TabsTrigger><TabsTrigger value="narratives">Narratives</TabsTrigger><TabsTrigger value="decisions">Decisions</TabsTrigger></TabsList>
        <TabsContent value="actions" className="mt-4 grid gap-3 lg:grid-cols-2">{pendingSuggestions.map((s) => <ExplainCard key={s.id} suggestion={s} canApprove canExecute={false} onApprove={() => reviewSuggestion.mutate({ id: s.id, status: 'approved' })} onReject={() => reviewSuggestion.mutate({ id: s.id, status: 'rejected' })} />)}{pendingSuggestions.length === 0 && <Empty />}</TabsContent>
        <TabsContent value="forecasts" className="mt-4 grid gap-3 lg:grid-cols-2">{pendingForecasts.map((r) => <ReviewCard key={r.id} title={r.forecast_name} module={r.module} body={r.explanation ?? 'Forecast awaiting review.'} onApprove={() => reviewRecord.mutate({ table: 'ai_forecast_runs', id: r.id, status: 'approved' })} onReject={() => reviewRecord.mutate({ table: 'ai_forecast_runs', id: r.id, status: 'rejected' })} />)}{pendingForecasts.length === 0 && <Empty />}</TabsContent>
        <TabsContent value="narratives" className="mt-4 grid gap-3 lg:grid-cols-2">{pendingNarratives.map((r) => <ReviewCard key={r.id} title={r.report_name} module={r.module} body={r.narrative} onApprove={() => reviewRecord.mutate({ table: 'ai_narrative_reports', id: r.id, status: 'approved' })} onReject={() => reviewRecord.mutate({ table: 'ai_narrative_reports', id: r.id, status: 'rejected' })} />)}{pendingNarratives.length === 0 && <Empty />}</TabsContent>
        <TabsContent value="decisions" className="mt-4 grid gap-3 lg:grid-cols-2">{pendingDecisions.map((r) => <ReviewCard key={r.id} title={r.case_title} module={r.module} body={String(r.recommendation?.summary ?? 'Decision draft awaiting review.')} onApprove={() => reviewRecord.mutate({ table: 'ai_decision_support_cases', id: r.id, status: 'approved' })} onReject={() => reviewRecord.mutate({ table: 'ai_decision_support_cases', id: r.id, status: 'rejected' })} />)}{pendingDecisions.length === 0 && <Empty />}</TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewCard({ title, module, body, onApprove, onReject }: { title: string; module: string; body: string; onApprove: () => void; onReject: () => void }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="flex items-center justify-between gap-2 text-base"><span>{title}</span><Badge variant="outline" className="capitalize">{module}</Badge></CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{body}</p><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={onReject} className="gap-1"><X className="h-3.5 w-3.5" />Reject</Button><Button size="sm" onClick={onApprove} className="gap-1"><Check className="h-3.5 w-3.5" />Approve</Button></div></CardContent></Card>;
}

function Empty() {
  return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No items awaiting review.</CardContent></Card>;
}
