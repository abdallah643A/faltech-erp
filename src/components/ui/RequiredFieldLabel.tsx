import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequiredFieldLabelProps {
  htmlFor?: string;
  fieldName: string;
  children: React.ReactNode;
  isRequired: boolean;
  isSystemDefault: boolean;
  onToggle: (fieldName: string) => void;
  className?: string;
}

export function RequiredFieldLabel({
  htmlFor,
  fieldName,
  children,
  isRequired,
  isSystemDefault,
  onToggle,
  className,
}: RequiredFieldLabelProps) {
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSystemDefault) return;
    onToggle(fieldName);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Label
            htmlFor={htmlFor}
            onDoubleClick={handleDoubleClick}
            className={cn(
              'select-none cursor-default inline-flex items-center gap-1',
              isRequired && 'font-bold',
              !isSystemDefault && 'cursor-pointer',
              className
            )}
          >
            {children}
            {isRequired && <span className="text-destructive">*</span>}
            {isSystemDefault && isRequired && (
              <Lock className="h-3 w-3 text-muted-foreground inline" />
            )}
          </Label>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {isSystemDefault
            ? 'System required field (cannot be changed)'
            : isRequired
              ? 'Double-click to make optional'
              : 'Double-click to make required'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
