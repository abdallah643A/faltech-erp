import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type Opportunity } from '@/hooks/useOpportunities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DollarSign, MoreVertical, Calendar, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

const stageColors: Record<string, string> = {
  'Discovery': 'border-t-muted-foreground',
  'Qualification': 'border-t-blue-500',
  'Proposal': 'border-t-amber-500',
  'Negotiation': 'border-t-primary',
  'Closed Won': 'border-t-green-500',
  'Closed Lost': 'border-t-destructive',
};

const stageBgColors: Record<string, string> = {
  'Discovery': 'bg-muted/50',
  'Qualification': 'bg-blue-500/5',
  'Proposal': 'bg-amber-500/5',
  'Negotiation': 'bg-primary/5',
  'Closed Won': 'bg-green-500/5',
  'Closed Lost': 'bg-destructive/5',
};

const stageOrder = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

interface OpportunityKanbanProps {
  opportunities: Opportunity[];
  onEdit: (opp: Opportunity) => void;
  onStageUpdate: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onCreateQuote: (opp: Opportunity) => void;
  onSyncToSAP: (id: string) => void;
  onSyncFromSAP: (id: string) => void;
  formatCurrency: (value: number) => string;
}

export function OpportunityKanban({
  opportunities,
  onEdit,
  onStageUpdate,
  onDelete,
  onCreateQuote,
  onSyncToSAP,
  onSyncFromSAP,
  formatCurrency,
}: OpportunityKanbanProps) {
  const { language } = useLanguage();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    setDraggedId(oppId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (draggedId) {
      const opp = opportunities.find(o => o.id === draggedId);
      if (opp && opp.stage !== targetStage) {
        onStageUpdate({ ...opp, stage: targetStage });
      }
    }
    setDraggedId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {stageOrder.map((stage) => {
        const stageOpps = opportunities.filter(o => o.stage === stage);
        const totalValue = stageOpps.reduce((sum, o) => sum + o.value, 0);
        const weightedValue = stageOpps.reduce((sum, o) => sum + (o.value * o.probability / 100), 0);

        return (
          <div
            key={stage}
            className={`flex-shrink-0 w-72 rounded-lg border border-border ${stageBgColors[stage] || 'bg-muted/30'}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Column Header */}
            <div className={`p-3 border-t-4 ${stageColors[stage] || 'border-t-muted'} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{stage}</h3>
                <Badge variant="secondary" className="text-xs">{stageOpps.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مرجح:' : 'Weighted:'} {formatCurrency(weightedValue)}
              </p>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 max-h-[calc(60vh-80px)] overflow-y-auto">
              {stageOpps.map((opp) => (
                <div
                  key={opp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp.id)}
                  className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${
                    draggedId === opp.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{opp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{opp.company}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(opp)}>
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateQuote(opp)}>
                          {language === 'ar' ? 'إنشاء عرض سعر' : 'Create Quote'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSyncToSAP(opp.id)}>
                          <ArrowUp className="mr-2 h-3 w-3" /> Push to SAP
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSyncFromSAP(opp.id)}>
                          <ArrowDown className="mr-2 h-3 w-3" /> Pull from SAP
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(opp.id)}>
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-success" />
                      <span className="text-sm font-semibold">{formatCurrency(opp.value)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={opp.probability} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{opp.probability}%</span>
                    </div>
                    {opp.expected_close && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(opp.expected_close).toLocaleDateString()}
                      </div>
                    )}
                    {opp.owner_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {opp.owner_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {stageOpps.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  {language === 'ar' ? 'لا توجد فرص' : 'No opportunities'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
