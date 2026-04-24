import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Bookmark, BookmarkPlus, Check, Pin, Share2, Trash2, Star, X,
} from 'lucide-react';
import { useSavedFilters, type SavedFilter } from '@/hooks/useSavedFilters';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SavedViewsBarProps {
  /** Stable identifier per list page, e.g. 'sales_orders', 'ar_invoices'. */
  entityName: string;
  /** Optional callback fired when a view is applied so the parent can re-query. */
  onApply?: (config: Record<string, any>) => void;
  /**
   * If true, automatically applies the user's pinned default view on first mount
   * when the URL has no filters yet. Default: true.
   */
  autoApplyDefault?: boolean;
  className?: string;
}

/**
 * SavedViewsBar — Module 1 / Enhancement #5
 *
 * Reusable toolbar control for any list page. Reads/writes filters through
 * `useUrlFilters` (URL-as-state) and persists named views via `useSavedFilters`
 * (table: app_saved_filters).
 *
 * Capabilities:
 *  - Save current URL filters as a named view (private or shared)
 *  - Apply any saved view (own + shared by colleagues, scoped per entity)
 *  - Pin one view as personal default (auto-applied on next visit)
 *  - Delete own views
 */
export function SavedViewsBar({
  entityName, onApply, autoApplyDefault = true, className,
}: SavedViewsBarProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { filters: currentFilters, setFilters, clearAll } = useUrlFilters();
  const { filters: views, saveFilter, deleteFilter, setDefault, defaultFilter, isSaving } = useSavedFilters(entityName);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [appliedDefault, setAppliedDefault] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Auto-apply pinned default on first mount when URL is clean
  useEffect(() => {
    if (!autoApplyDefault || appliedDefault) return;
    if (!defaultFilter) return;
    if (Object.keys(currentFilters).length > 0) { setAppliedDefault(true); return; }
    setFilters(defaultFilter.filter_config as Record<string, string>);
    setActiveViewId(defaultFilter.id);
    onApply?.(defaultFilter.filter_config);
    setAppliedDefault(true);
  }, [defaultFilter, autoApplyDefault, appliedDefault, currentFilters, setFilters, onApply]);

  const hasFilters = Object.keys(currentFilters).length > 0;
  const filterCount = Object.keys(currentFilters).length;

  const apply = (v: SavedFilter) => {
    clearAll();
    setFilters(v.filter_config as Record<string, string>);
    setActiveViewId(v.id);
    onApply?.(v.filter_config);
    toast.success(isAr ? `تم تطبيق: ${v.filter_name}` : `Applied: ${v.filter_name}`);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error(isAr ? 'أدخل اسماً للعرض' : 'Enter a view name');
      return;
    }
    saveFilter({ filter_name: name.trim(), filter_config: currentFilters, is_shared: shared });
    setName(''); setShared(false); setOpen(false);
    toast.success(isAr ? 'تم حفظ العرض' : 'View saved');
  };

  const handleDelete = (v: SavedFilter) => {
    deleteFilter(v.id);
    if (activeViewId === v.id) setActiveViewId(null);
    toast.success(isAr ? 'تم الحذف' : 'View deleted');
  };

  const handlePin = (v: SavedFilter) => {
    setDefault(v.id);
    toast.success(isAr ? `تم التثبيت: ${v.filter_name}` : `Pinned as default: ${v.filter_name}`);
  };

  const activeView = views.find(v => v.id === activeViewId);

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Bookmark className="h-3.5 w-3.5" />
            {activeView ? (
              <span className="font-medium">{activeView.filter_name}</span>
            ) : (
              <span>{isAr ? 'العروض المحفوظة' : 'Saved Views'}</span>
            )}
            {views.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{views.length}</Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs flex items-center justify-between">
            <span>{isAr ? 'العروض المحفوظة' : 'Saved views'}</span>
            {activeView && (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                onClick={() => { clearAll(); setActiveViewId(null); }}
              >
                <X className="h-3 w-3" /> {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {isAr ? 'لا توجد عروض محفوظة بعد' : 'No saved views yet'}
            </div>
          )}
          {views.map(v => (
            <DropdownMenuItem
              key={v.id}
              onSelect={(e) => { e.preventDefault(); apply(v); }}
              className="flex items-center justify-between gap-2 py-2 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {activeViewId === v.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                {v.is_default && <Star className="h-3 w-3 text-warning fill-warning shrink-0" />}
                {v.is_shared && <Share2 className="h-3 w-3 text-info shrink-0" />}
                <span className="truncate text-sm">{v.filter_name}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePin(v); }}
                  className="p-1 rounded hover:bg-accent"
                  title={isAr ? 'تعيين كافتراضي' : 'Pin as default'}
                >
                  <Pin className={cn('h-3 w-3', v.is_default && 'fill-warning text-warning')} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                  title={isAr ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!hasFilters}
            title={!hasFilters ? (isAr ? 'طبق فلاتر أولاً' : 'Apply filters first') : undefined}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            {isAr ? 'حفظ كعرض' : 'Save view'}
            {hasFilters && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{filterCount}</Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAr ? 'حفظ العرض الحالي' : 'Save current view'}</DialogTitle>
            <DialogDescription className="text-xs">
              {isAr
                ? 'احفظ المرشحات الحالية كعرض مسمى يمكنك العودة إليه بنقرة واحدة.'
                : 'Save the current filters as a named view you can restore in one click.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{isAr ? 'اسم العرض' : 'View name'}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAr ? 'مثال: متأخرات > 60 يوم' : 'e.g. Overdue > 60 days'}
                className="h-8 mt-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <div>
                <Label className="text-xs">{isAr ? 'مشاركة مع الفريق' : 'Share with team'}</Label>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? 'يصبح متاحاً لزملائك في نفس الشركة' : 'Visible to colleagues in the same company'}
                </p>
              </div>
              <Switch checked={shared} onCheckedChange={setShared} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isAr ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
