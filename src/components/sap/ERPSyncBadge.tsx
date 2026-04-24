import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X } from 'lucide-react';

interface ERPSyncBadgeProps {
  erpSynced?: boolean | null;
  size?: 'sm' | 'md';
}

export function ERPSyncBadge({ erpSynced, size = 'sm' }: ERPSyncBadgeProps) {
  const textSize = size === 'sm' ? 'text-[10px] px-1 py-0' : 'text-xs';
  
  if (erpSynced) {
    return (
      <Badge variant="outline" className={`${textSize} border-success text-success gap-0.5`}>
        <Check className="h-3 w-3" />
        ERP
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={`${textSize} gap-0.5`}>
      <X className="h-3 w-3" />
      ERP
    </Badge>
  );
}

interface ERPDocInfoProps {
  erpDocEntry?: string | null;
  erpDocNum?: string | null;
}

export function ERPDocInfo({ erpDocEntry, erpDocNum }: ERPDocInfoProps) {
  if (!erpDocEntry && !erpDocNum) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-xs cursor-help">
          {erpDocNum || erpDocEntry || '-'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>ERP DocNum: {erpDocNum || '-'}</p>
        <p>ERP DocEntry: {erpDocEntry || '-'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
