import { useState } from 'react';
import { X, Loader2, ChevronDown, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BulkAction<T = any> {
  id: string;
  label: string;
  labelAr?: string;
  icon: LucideIcon;
  perform: (selectedIds: string[], selectedItems: T[]) => void | Promise<void>;
  /** Show as a primary button (vs. menu item). First 2 primary actions are visible. */
  primary?: boolean;
  destructive?: boolean;
  /** Require confirmation dialog before performing. */
  requireConfirm?: boolean;
  /** Optional override of the default confirm copy. */
  confirmTitle?: string;
  confirmDescription?: string;
  /** Disable when this returns true (e.g. mixed statuses block approval). */
  disabled?: (selectedIds: string[], selectedItems: T[]) => boolean;
  /** Tooltip when disabled. */
  disabledReason?: string;
}

interface BulkActionsToolbarProps<T> {
  selection: {
    selectedIds: string[];
    selectedItems: T[];
    selectedCount: number;
    clear: () => void;
  };
  actions: BulkAction<T>[];
  /** Optional label for the entity, e.g. "orders", "invoices". */
  entityLabel?: { en: string; ar: string };
}

/**
 * Floating toolbar that appears when one or more rows are selected.
 * Designed to dock above the page footer / status bar.
 */
export function BulkActionsToolbar<T>({
  selection,
  actions,
  entityLabel,
}: BulkActionsToolbarProps<T>) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BulkAction<T> | null>(null);

  if (selection.selectedCount === 0) return null;

  const primaries = actions.filter(a => a.primary).slice(0, 2);
  const overflow = actions.filter(a => !primaries.includes(a));

  const run = async (a: BulkAction<T>) => {
    if (a.requireConfirm) { setConfirm(a); return; }
    await execute(a);
  };

  const execute = async (a: BulkAction<T>) => {
    setPending(a.id);
    try {
      await a.perform(selection.selectedIds, selection.selectedItems);
    } catch (e: any) {
      toast.error(e?.message ?? (isAr ? 'فشل تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setPending(null);
      setConfirm(null);
    }
  };

  const countLabel = isAr
    ? `${selection.selectedCount} ${entityLabel?.ar ?? 'محدد'}`
    : `${selection.selectedCount} ${entityLabel?.en ?? 'selected'}`;

  return (
    <>
      <div
        className={cn(
          'fixed bottom-20 left-1/2 -translate-x-1/2 z-30 print:hidden',
          'flex items-center gap-2 rounded-lg border bg-popover shadow-xl px-3 py-2',
          'animate-in fade-in-0 slide-in-from-bottom-2'
        )}
        dir={isAr ? 'rtl' : 'ltr'}
        role="toolbar"
        aria-label={isAr ? 'إجراءات جماعية' : 'Bulk actions'}
      >
        <Badge variant="secondary" className="font-semibold">{countLabel}</Badge>

        <div className="h-5 w-px bg-border mx-1" />

        {primaries.map(a => {
          const Icon = a.icon;
          const disabled = a.disabled?.(selection.selectedIds, selection.selectedItems) ?? false;
          return (
            <Button
              key={a.id}
              size="sm"
              variant={a.destructive ? 'destructive' : 'default'}
              onClick={() => run(a)}
              disabled={disabled || pending === a.id}
              title={disabled ? a.disabledReason : undefined}
            >
              {pending === a.id
                ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                : <Icon className="h-4 w-4 mr-1" />}
              {isAr ? (a.labelAr ?? a.label) : a.label}
            </Button>
          );
        })}

        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                {isAr ? 'المزيد' : 'More'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {overflow.map((a, i) => {
                const Icon = a.icon;
                const disabled = a.disabled?.(selection.selectedIds, selection.selectedItems) ?? false;
                return (
                  <div key={a.id}>
                    {a.destructive && i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => run(a)}
                      disabled={disabled || pending === a.id}
                      className={cn(a.destructive && 'text-destructive focus:text-destructive')}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {isAr ? (a.labelAr ?? a.label) : a.label}
                    </DropdownMenuItem>
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="h-5 w-px bg-border mx-1" />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={selection.clear}
          aria-label={isAr ? 'إلغاء التحديد' : 'Clear selection'}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
        <AlertDialogContent dir={isAr ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.confirmTitle
                ?? (isAr
                  ? `تأكيد: ${confirm?.labelAr ?? confirm?.label ?? ''}`
                  : `Confirm: ${confirm?.label ?? ''}`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.confirmDescription
                ?? (isAr
                  ? `سيتم تطبيق هذا الإجراء على ${selection.selectedCount} عنصر. هل أنت متأكد؟`
                  : `This action will apply to ${selection.selectedCount} item${selection.selectedCount === 1 ? '' : 's'}. Are you sure?`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && execute(confirm)}
              className={cn(confirm?.destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {isAr ? 'تأكيد' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
