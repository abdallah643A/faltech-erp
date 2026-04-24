import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PageHelpTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function PageHelpTooltip({ content, side = 'bottom' }: PageHelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label="Page help"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
