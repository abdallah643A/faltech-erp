import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRequiredFieldsContext } from '@/components/RequiredFieldsProvider';

interface RFLabelProps {
  htmlFor?: string;
  fieldName: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Required Field Label - automatically reads required status from context.
 * Double-click to toggle required (unless system default).
 * Shows bold + asterisk when required. Tooltip explains interaction.
 */
export function RFLabel({ htmlFor, fieldName, children, className }: RFLabelProps) {
  const ctx = useRequiredFieldsContext();

  // If no context, render as regular label
  if (!ctx) {
    return <Label htmlFor={htmlFor} className={className}>{children}</Label>;
  }

  const isRequired = ctx.isFieldRequired(fieldName);
  const isSystemDefault = ctx.isSystemDefault(fieldName);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSystemDefault) return;
    ctx.toggleRequired(fieldName);
  };

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Label
            htmlFor={htmlFor}
            onDoubleClick={handleDoubleClick}
            className={cn(
              'select-none inline-flex items-center gap-0.5',
              isRequired && 'font-bold',
              !isSystemDefault && 'cursor-pointer',
              className
            )}
          >
            {children}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
            {isSystemDefault && isRequired && (
              <Lock className="h-2.5 w-2.5 text-muted-foreground ml-0.5 inline-block" />
            )}
          </Label>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {isSystemDefault
            ? 'System required field — cannot be changed'
            : isRequired
              ? 'Required field. Double-click to make optional.'
              : 'Optional field. Double-click to make required.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SAP-style field wrapper with required field support.
 * Used in SAP B1-style forms with inline label + input layout.
 */
export function RFSAPField({
  fieldName,
  label,
  children,
  className,
}: {
  fieldName: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useRequiredFieldsContext();
  const isRequired = ctx?.isFieldRequired(fieldName) ?? false;
  const isSystemDefault = ctx?.isSystemDefault(fieldName) ?? false;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ctx || isSystemDefault) return;
    ctx.toggleRequired(fieldName);
  };

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", className)}>
            <span
              onDoubleClick={handleDoubleClick}
              className={cn(
                "text-[11px] text-muted-foreground whitespace-nowrap min-w-[130px] md:min-w-[150px] text-right pr-2 select-none",
                isRequired && "font-bold text-foreground",
                !isSystemDefault && "cursor-pointer"
              )}
            >
              {label}
              {isRequired && <span className="text-destructive ml-0.5">*</span>}
              {isSystemDefault && isRequired && (
                <Lock className="h-2.5 w-2.5 text-muted-foreground ml-0.5 inline-block" />
              )}
            </span>
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {isSystemDefault
            ? 'System required field — cannot be changed'
            : isRequired
              ? 'Required field. Double-click to make optional.'
              : 'Optional field. Double-click to make required.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
