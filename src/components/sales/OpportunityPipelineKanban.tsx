import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useOpportunities, type Opportunity } from '@/hooks/useOpportunities';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, User, TrendingUp, GripVertical } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

/**
 * Opportunity Pipeline Kanban — Module 2 / Enhancement #1
 *
 * Drag-and-drop deal stages with weighted forecast totals per column,
 * stage-aging warnings, and probability-aware value summaries.
 */

interface PipelineStage {
  id: string;
  label: { en: string; ar: string };
  defaultProbability: number;
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'destructive';
}

const STAGES: PipelineStage[] = [
  { id: 'Prospecting',  label: { en: 'Prospecting',  ar: 'استكشاف'    }, defaultProbability: 10, tone: 'neutral' },
  { id: 'Qualification',label: { en: 'Qualification',ar: 'تأهيل'      }, defaultProbability: 25, tone: 'info' },
  { id: 'Proposal',     label: { en: 'Proposal',     ar: 'عرض'        }, defaultProbability: 50, tone: 'info' },
  { id: 'Negotiation',  label: { en: 'Negotiation',  ar: 'تفاوض'      }, defaultProbability: 75, tone: 'warning' },
  { id: 'Closed Won',   label: { en: 'Closed Won',   ar: 'فوز'        }, defaultProbability: 100,tone: 'success' },
  { id: 'Closed Lost',  label: { en: 'Closed Lost',  ar: 'خسارة'      }, defaultProbability: 0,  tone: 'destructive' },
];

const STAGE_AGING_DAYS = 30;

const toneClasses: Record<PipelineStage['tone'], string> = {
  neutral:     'border-t-muted-foreground/40',
  info:        'border-t-primary',
  warning:     'border-t-warning',
  success:     'border-t-success',
  destructive: 'border-t-destructive',
};

interface OpportunityPipelineKanbanProps {
  /** Optional pre-filtered opportunities (e.g. by owner). Defaults to all. */
  opportunities?: Opportunity[];
}

export function OpportunityPipelineKanban({ opportunities: external }: OpportunityPipelineKanbanProps) {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const { currencySymbol } = useCompanyCurrency();
  const { opportunities: all, updateOpportunity } = useOpportunities();
  const opportunities = external ?? all;

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    STAGES.forEach(s => map.set(s.id, []));
    opportunities.forEach(opp => {
      const stage = map.has(opp.stage) ? opp.stage : 'Prospecting';
      map.get(stage)!.push(opp);
    });
    return map;
  }, [opportunities]);

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const oppId = String(e.active.id);
    const newStage = e.over?.id ? String(e.over.id) : null;
    if (!newStage) return;

    const opp = opportunities.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;

    const stageDef = STAGES.find(s => s.id === newStage);
    updateOpportunity.mutate({
      id: oppId,
      stage: newStage,
      probability: stageDef?.defaultProbability ?? opp.probability,
      weighted_amount: opp.value * ((stageDef?.defaultProbability ?? opp.probability) / 100),
    });
  }

  const activeOpp = activeId ? opportunities.find(o => o.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        dir={direction}
        className="flex gap-3 overflow-x-auto pb-3 min-h-[60vh]"
      >
        {STAGES.map(stage => {
          const items = grouped.get(stage.id) ?? [];
          const total = items.reduce((s, o) => s + (o.value || 0), 0);
          const weighted = items.reduce(
            (s, o) => s + (o.value || 0) * ((o.probability ?? stage.defaultProbability) / 100),
            0,
          );
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              count={items.length}
              total={fmt(total)}
              weighted={fmt(weighted)}
              isAr={isAr}
            >
              {items.map(opp => (
                <KanbanCard
                  key={opp.id}
                  opp={opp}
                  isAr={isAr}
                  symbol={currencySymbol}
                />
              ))}
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                  {isAr ? 'لا توجد فرص' : 'No deals'}
                </div>
              )}
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeOpp && (
          <KanbanCard opp={activeOpp} isAr={isAr} symbol={currencySymbol} dragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  stage: PipelineStage;
  count: number;
  total: string;
  weighted: string;
  isAr: boolean;
  children: React.ReactNode;
}

function KanbanColumn({ stage, count, total, weighted, isAr, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 shrink-0 bg-muted/30 rounded-lg border-t-4 transition-colors',
        toneClasses[stage.tone],
        isOver && 'bg-muted/60 ring-2 ring-primary/40',
      )}
    >
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">
            {isAr ? stage.label.ar : stage.label.en}
          </h3>
          <Badge variant="secondary" className="h-5 text-[11px]">{count}</Badge>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{isAr ? 'الإجمالي' : 'Total'}: <span className="font-semibold text-foreground">{total}</span></span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span className="font-semibold text-foreground">{weighted}</span>
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">{children}</div>
    </div>
  );
}

interface KanbanCardProps {
  opp: Opportunity;
  isAr: boolean;
  symbol: string;
  dragging?: boolean;
}

function KanbanCard({ opp, isAr, symbol, dragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id });
  const ageInStage = opp.updated_at
    ? differenceInDays(new Date(), new Date(opp.updated_at))
    : 0;
  const isStale = ageInStage > STAGE_AGING_DAYS && !opp.stage.startsWith('Closed');

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'p-2.5 cursor-grab active:cursor-grabbing bg-card hover:shadow-md transition-shadow',
        (isDragging || dragging) && 'opacity-50 ring-2 ring-primary',
        isStale && 'border-warning/60',
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{opp.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{opp.company}</div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold">
              {symbol}{(opp.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <Badge variant="outline" className="h-4 text-[10px] px-1.5">
              {opp.probability}%
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-muted-foreground">
            {opp.owner_name && (
              <span className="flex items-center gap-1 truncate">
                <User className="h-2.5 w-2.5" />
                <span className="truncate">{opp.owner_name}</span>
              </span>
            )}
            {opp.expected_close && (
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="h-2.5 w-2.5" />
                {format(new Date(opp.expected_close), 'MMM d')}
              </span>
            )}
          </div>

          {isStale && (
            <div className="mt-1.5 text-[10px] text-warning font-medium">
              {isAr ? `راكدة منذ ${ageInStage} يوم` : `Stale for ${ageInStage}d`}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
