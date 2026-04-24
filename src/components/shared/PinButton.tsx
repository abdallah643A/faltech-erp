import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePinnedRecords, PinInput } from '@/hooks/usePinnedRecords';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface PinButtonProps extends PinInput {
  size?: 'sm' | 'icon' | 'default';
  variant?: 'ghost' | 'outline';
  className?: string;
}

/**
 * Drop-in pin/unpin toggle for any record header.
 *
 * Example:
 *   <PinButton entity_type="purchase_order" record_id={po.id}
 *     record_title={po.doc_num} record_subtitle={po.vendor_name}
 *     record_path={`/purchase-orders/${po.id}`} category="Procurement" />
 */
export function PinButton({
  size = 'icon',
  variant = 'ghost',
  className,
  ...input
}: PinButtonProps) {
  const { isPinned, togglePin } = usePinnedRecords();
  const { language } = useLanguage();
  const pinned = isPinned(input.entity_type, input.record_id);
  const label = pinned
    ? (language === 'ar' ? 'إلغاء التثبيت' : 'Unpin from tray')
    : (language === 'ar' ? 'تثبيت في الشريط' : 'Pin to tray');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size={size}
            variant={variant}
            onClick={(e) => { e.stopPropagation(); togglePin(input); }}
            className={cn(pinned && 'text-warning hover:text-warning', className)}
            aria-pressed={pinned}
            aria-label={label}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
