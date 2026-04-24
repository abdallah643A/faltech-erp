import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Info, Zap, Undo2, X, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MatchSuggestion {
  bankLineId: string;
  bankDesc: string;
  bankAmount: number;
  matchedDesc?: string;
  matchedAmount?: number;
  confidence: number;
  matchType: string;
  ruleName: string;
  ruleExplanation: string;
  amountTolerance?: string;
  dateTolerance?: string;
}

interface ReconciliationAssistantProps {
  suggestions: MatchSuggestion[];
  onAccept: (bankLineId: string) => void;
  onAcceptAll: (bankLineIds: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ReconciliationAssistant({
  suggestions,
  onAccept,
  onAcceptAll,
  isOpen,
  onClose,
}: ReconciliationAssistantProps) {
  const { toast } = useToast();
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<string[][]>([]);

  const highConfidence = suggestions.filter(s => s.confidence >= 90 && !acceptedIds.has(s.bankLineId));
  const medConfidence = suggestions.filter(s => s.confidence >= 60 && s.confidence < 90 && !acceptedIds.has(s.bankLineId));
  const lowConfidence = suggestions.filter(s => s.confidence > 0 && s.confidence < 60 && !acceptedIds.has(s.bankLineId));

  const handleAcceptAll = useCallback(() => {
    const ids = highConfidence.map(s => s.bankLineId);
    setUndoStack(prev => [...prev, ids]);
    setAcceptedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    onAcceptAll(ids);
    toast({
      title: `Accepted ${ids.length} matches`,
      description: 'High-confidence matches applied.',
      action: (
        <Button variant="outline" size="sm" onClick={() => handleUndo(ids)} className="h-7 text-xs">
          <Undo2 className="h-3 w-3 mr-1" /> Undo
        </Button>
      ),
    });
  }, [highConfidence, onAcceptAll, toast]);

  const handleUndo = useCallback((ids: string[]) => {
    setAcceptedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    setUndoStack(prev => prev.slice(0, -1));
    toast({ title: 'Undone', description: `${ids.length} matches reverted.` });
  }, [toast]);

  const handleAcceptSingle = useCallback((id: string) => {
    setUndoStack(prev => [...prev, [id]]);
    setAcceptedIds(prev => new Set([...prev, id]));
    onAccept(id);
  }, [onAccept]);

  const getConfidenceColor = (c: number) => {
    if (c >= 90) return 'text-green-600';
    if (c >= 60) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const getRuleBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    if (type === 'exact') return 'default';
    if (type.startsWith('fuzzy')) return 'secondary';
    return 'outline';
  };

  if (!isOpen) return null;

  return (
    <div className="w-[360px] border-l border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Match Assistant</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Accept All High Confidence */}
      {highConfidence.length > 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-950/30 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                {highConfidence.length} high-confidence matches
              </p>
              <p className="text-[10px] text-green-600/70 dark:text-green-500/70">
                90%+ confidence, safe to auto-accept
              </p>
            </div>
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={handleAcceptAll}>
              <CheckCircle className="h-3 w-3 mr-1" /> Accept All
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* High Confidence */}
          {highConfidence.length > 0 && (
            <SuggestionGroup
              title="High Confidence (≥90%)"
              items={highConfidence}
              onAccept={handleAcceptSingle}
              getConfidenceColor={getConfidenceColor}
              getRuleBadgeVariant={getRuleBadgeVariant}
            />
          )}

          {medConfidence.length > 0 && (
            <>
              <Separator />
              <SuggestionGroup
                title="Medium Confidence (60-89%)"
                items={medConfidence}
                onAccept={handleAcceptSingle}
                getConfidenceColor={getConfidenceColor}
                getRuleBadgeVariant={getRuleBadgeVariant}
              />
            </>
          )}

          {lowConfidence.length > 0 && (
            <>
              <Separator />
              <SuggestionGroup
                title="Low Confidence (<60%)"
                items={lowConfidence}
                onAccept={handleAcceptSingle}
                getConfidenceColor={getConfidenceColor}
                getRuleBadgeVariant={getRuleBadgeVariant}
              />
            </>
          )}

          {suggestions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No match suggestions</p>
              <p className="text-xs">Import bank statements and run matching first.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground flex justify-between">
        <span>{acceptedIds.size} accepted</span>
        <span>{suggestions.length - acceptedIds.size} remaining</span>
      </div>
    </div>
  );
}

function SuggestionGroup({
  title,
  items,
  onAccept,
  getConfidenceColor,
  getRuleBadgeVariant,
}: {
  title: string;
  items: MatchSuggestion[];
  onAccept: (id: string) => void;
  getConfidenceColor: (c: number) => string;
  getRuleBadgeVariant: (type: string) => 'default' | 'secondary' | 'outline';
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      {items.map(s => (
        <Card key={s.bankLineId} className="shadow-none border-muted">
          <CardContent className="p-2.5 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{s.bankDesc || 'Bank transaction'}</p>
                <p className="text-[10px] text-muted-foreground">
                  SAR {s.bankAmount?.toLocaleString()} → {s.matchedDesc || '—'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-xs font-bold ${getConfidenceColor(s.confidence)}`}>{s.confidence}%</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onAccept(s.bankLineId)}>
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                </Button>
              </div>
            </div>

            {/* Rule explanation toggle */}
            <button
              onClick={() => setExpanded(expanded === s.bankLineId ? null : s.bankLineId)}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Info className="h-2.5 w-2.5" />
              Why this match?
              <ChevronRight className={`h-2.5 w-2.5 transition-transform ${expanded === s.bankLineId ? 'rotate-90' : ''}`} />
            </button>

            {expanded === s.bankLineId && (
              <div className="bg-muted/50 rounded p-2 text-[10px] space-y-1">
                <div className="flex items-center gap-1">
                  <Badge variant={getRuleBadgeVariant(s.matchType)} className="text-[9px] h-4">{s.matchType.replace('_', ' ')}</Badge>
                  <span className="font-medium">{s.ruleName}</span>
                </div>
                <p className="text-muted-foreground">{s.ruleExplanation}</p>
                {s.amountTolerance && <p>Amount tolerance: {s.amountTolerance}</p>}
                {s.dateTolerance && <p>Date tolerance: {s.dateTolerance}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
