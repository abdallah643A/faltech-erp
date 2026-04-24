import { useState, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, ChevronRight, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDocumentChecklists } from '@/hooks/useDocumentChecklists';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  documentType: string;
  documentId: string;
  companyId?: string;
  compact?: boolean;
}

export function DocumentChecklistPanel({ documentType, documentId, companyId, compact }: Props) {
  const {
    templates, instances, uninitializedTemplates,
    initChecklist, toggleItem,
  } = useDocumentChecklists(documentType, documentId, companyId);

  // Auto-initialize checklists from templates
  useEffect(() => {
    uninitializedTemplates.forEach(t => {
      initChecklist.mutate(t.id);
    });
  }, [uninitializedTemplates.length]);

  if (templates.length === 0 && instances.length === 0) return null;

  const totalItems = instances.reduce((acc, i) => acc + i.items_progress.length, 0);
  const completedItems = instances.reduce(
    (acc, i) => acc + i.items_progress.filter(p => p.completed).length, 0
  );
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const allComplete = instances.every(i => i.is_complete);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {allComplete ? (
          <Badge variant="outline" className="gap-1 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3" /> Checklist Complete
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-warning border-warning/30">
            <Clock className="h-3 w-3" /> {completedItems}/{totalItems} items
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Checklists</span>
        <Badge variant={allComplete ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
          {pct}%
        </Badge>
        <div className="flex-1" />
        {!allComplete && (
          <span className="text-[10px] text-muted-foreground">{completedItems}/{totalItems} completed</span>
        )}
      </div>
      <div className="p-2">
        <Progress value={pct} className="h-1.5 mb-2" />
        {instances.map(instance => {
          const template = templates.find(t => t.id === instance.template_id);
          return (
            <ChecklistSection
              key={instance.id}
              title={template?.name || 'Checklist'}
              isMandatory={template?.is_mandatory || false}
              items={instance.items_progress}
              onToggle={(key) => toggleItem.mutate({ instanceId: instance.id, itemKey: key })}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChecklistSection({ title, isMandatory, items, onToggle }: {
  title: string;
  isMandatory: boolean;
  items: any[];
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const completed = items.filter(i => i.completed).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full px-1 py-1 text-xs font-medium hover:bg-muted/50 rounded">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
        <span className="text-[10px] text-muted-foreground ml-auto">{completed}/{items.length}</span>
        {isMandatory && (
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-3 w-3 text-warning" />
            </TooltipTrigger>
            <TooltipContent>Required before status change</TooltipContent>
          </Tooltip>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-0.5">
        {items.map(item => (
          <button
            key={item.key}
            className="flex items-center gap-2 w-full text-left px-1 py-1 text-xs rounded hover:bg-muted/50 transition-colors"
            onClick={() => onToggle(item.key)}
          >
            {item.completed ? (
              <CheckSquare className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={item.completed ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
            {item.completed && item.completed_by && (
              <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                {item.completed_by} • {item.completed_at ? formatDistanceToNow(new Date(item.completed_at), { addSuffix: true }) : ''}
              </span>
            )}
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
