import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ShieldCheck, ShieldAlert, ShieldQuestion, Check, X, Play, Eye } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { CopilotSuggestion } from '@/hooks/useAICopilot';

interface Props {
  suggestion: CopilotSuggestion;
  onApprove?: (notes?: string) => void;
  onReject?: (notes?: string) => void;
  onExecute?: () => void;
  canApprove?: boolean;
  canExecute?: boolean;
}

const RISK_META = {
  low:    { Icon: ShieldCheck,    label: 'Low risk',    cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  medium: { Icon: ShieldQuestion, label: 'Medium risk', cls: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  high:   { Icon: ShieldAlert,    label: 'High risk',   cls: 'text-destructive bg-destructive/10 border-destructive/20' },
} as const;

/**
 * ExplainCard — single suggestion with:
 *  - risk + confidence badges
 *  - "Why" (explanation) collapsible (always present, never hidden)
 *  - evidence object dump for full transparency
 *  - approve/reject/execute buttons that respect permission props
 */
export function ExplainCard({ suggestion, onApprove, onReject, onExecute, canApprove, canExecute }: Props) {
  const [open, setOpen] = useState(false);
  const risk = RISK_META[suggestion.risk_level];
  const RiskIcon = risk.Icon;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm truncate">{suggestion.title}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-[10px] gap-1 ${risk.cls}`}>
              <RiskIcon className="h-3 w-3" />{risk.label}
            </Badge>
            {suggestion.confidence != null && (
              <Badge variant="outline" className="text-[10px]">
                {Math.round(suggestion.confidence * 100)}%
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] capitalize">{suggestion.capability.replace(/_/g, ' ')}</Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{suggestion.summary}</p>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <Eye className="h-3 w-3" /> {open ? 'Hide' : 'Why this?'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="rounded border border-border/60 bg-muted/30 p-3 text-xs">
              <div className="font-medium mb-1">Explanation</div>
              <p className="text-muted-foreground whitespace-pre-wrap">{suggestion.explanation}</p>
            </div>
            {suggestion.evidence && Object.keys(suggestion.evidence).length > 0 && (
              <div className="rounded border border-border/60 bg-muted/30 p-3 text-xs">
                <div className="font-medium mb-1">Evidence</div>
                <pre className="overflow-x-auto text-[10px] text-muted-foreground">
                  {JSON.stringify(suggestion.evidence, null, 2)}
                </pre>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {suggestion.status === 'pending' ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">Awaiting human review</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={!canApprove}
                onClick={() => onReject?.()}>
                <X className="h-3 w-3" /> Reject
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" disabled={!canApprove}
                onClick={() => onApprove?.()}>
                <Check className="h-3 w-3" /> Approve
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <Badge variant={suggestion.status === 'rejected' ? 'destructive' : 'default'} className="text-[10px] capitalize">
              {suggestion.status}
            </Badge>
            {suggestion.status === 'approved' && canExecute && onExecute && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onExecute}>
                <Play className="h-3 w-3" /> Execute
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
