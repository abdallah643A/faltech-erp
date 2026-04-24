import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QARecordBadgeProps {
  runName?: string;
  className?: string;
}

export function QARecordBadge({ runName, className }: QARecordBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-[9px] px-1 py-0 gap-0.5 ${className || ''}`}>
            <FlaskConical className="h-2.5 w-2.5" />
            QA
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">QA Test Record{runName ? ` — ${runName}` : ''}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
