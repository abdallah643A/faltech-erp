import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Bot, Loader2, FileText, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import { useAICopilot, type CopilotModule, type CopilotCapability } from '@/hooks/useAICopilot';
import { ExplainCard } from './ExplainCard';

interface Props {
  module: CopilotModule;
  /** Snapshot of data the copilot should reason about (kept small to control tokens). */
  context: Record<string, any>;
  /** Caller permissions — wire these from useAuth/role context. */
  canRequest?: boolean;
  canApprove?: boolean;
  canExecute?: boolean;
  /** Optional title override. */
  title?: string;
}

const CAPABILITIES: { key: CopilotCapability; label: string; Icon: any }[] = [
  { key: 'next_best_action', label: 'Suggest', Icon: Lightbulb },
  { key: 'anomaly',          label: 'Anomalies', Icon: AlertTriangle },
  { key: 'forecast',         label: 'Forecast', Icon: TrendingUp },
  { key: 'narrative',        label: 'Narrative', Icon: FileText },
];

/**
 * CopilotPanel — the shared, reusable copilot surface.
 * Mounts inside any module page; controls capability tab, generation,
 * and the human-review queue scoped to that module.
 */
export function CopilotPanel({
  module, context, canRequest = true, canApprove = false, canExecute = false, title,
}: Props) {
  const [active, setActive] = useState<CopilotCapability>('narrative');
  const { suggestions, generate, review, execute } = useAICopilot(module);
  const moduleSuggestions = (suggestions.data ?? []).filter(s => s.module === module);
  const pendingCount = moduleSuggestions.filter(s => s.status === 'pending').length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            {title ?? 'AI Copilot'}
            <Badge variant="outline" className="text-[10px] capitalize">{module}</Badge>
            {pendingCount > 0 && (
              <Badge variant="default" className="text-[10px]">{pendingCount} pending</Badge>
            )}
          </CardTitle>
          <Button size="sm" className="h-8 gap-1"
            disabled={!canRequest || generate.isPending}
            onClick={() => generate.mutate({ module, capability: active, context })}>
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={active} onValueChange={(v) => setActive(v as CopilotCapability)}>
          <TabsList className="grid grid-cols-4 h-9">
            {CAPABILITIES.map(({ key, label, Icon }) => (
              <TabsTrigger key={key} value={key} className="text-xs gap-1">
                <Icon className="h-3 w-3" />{label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CAPABILITIES.map(({ key }) => {
            const items = moduleSuggestions.filter(s => s.capability === key);
            return (
              <TabsContent key={key} value={key} className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No {key.replace(/_/g, ' ')} suggestions yet. Click Generate to ask the copilot.
                  </p>
                ) : items.map(s => (
                  <ExplainCard
                    key={s.id} suggestion={s}
                    canApprove={canApprove} canExecute={canExecute}
                    onApprove={() => review.mutate({ id: s.id, status: 'approved' })}
                    onReject={() => review.mutate({ id: s.id, status: 'rejected' })}
                    onExecute={() => execute.mutate({ id: s.id })}
                  />
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
