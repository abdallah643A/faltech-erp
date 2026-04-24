import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Plus, Layers } from 'lucide-react';
import type { QAPlan } from './types';

interface Props {
  plans: QAPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
  onAddPlan: () => void;
  ticketCounts: Record<string, number>;
  isAr: boolean;
}

export function PlanLayerNav({ plans, selectedPlanId, onSelectPlan, onAddPlan, ticketCounts, isAr }: Props) {
  return (
    <div className="w-[220px] border-r bg-muted/30 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          {isAr ? 'الطبقات' : 'Layers'}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddPlan}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {plans.length === 0 && (
            <div className="text-center py-8">
              <Map className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{isAr ? 'لا توجد مخططات' : 'No plans yet'}</p>
              <Button variant="link" size="sm" className="text-xs mt-1" onClick={onAddPlan}>
                {isAr ? 'إضافة مخطط' : 'Add first plan'}
              </Button>
            </div>
          )}
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              className={`w-full text-left rounded-md p-2.5 transition-colors ${
                selectedPlanId === plan.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted border border-transparent'
              }`}
            >
              {/* Thumbnail placeholder */}
              <div className={`h-16 rounded bg-muted/50 border flex items-center justify-center mb-2 ${
                selectedPlanId === plan.id ? 'border-primary/30' : 'border-muted-foreground/10'
              }`}>
                <Map className="h-5 w-5 text-muted-foreground/30" />
              </div>
              <p className="text-[11px] font-medium leading-tight truncate">{plan.plan_title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {[plan.building, plan.floor].filter(Boolean).join(' / ') || plan.discipline || 'No location'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {plan.drawing_number && <Badge variant="outline" className="text-[8px] px-1 py-0">{plan.drawing_number}</Badge>}
                <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-auto">{ticketCounts[plan.id] || 0} pins</Badge>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
