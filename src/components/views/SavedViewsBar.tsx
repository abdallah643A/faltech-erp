import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSavedViews, type SavedView } from '@/hooks/useSavedViews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Bookmark, Plus, Star, Trash2, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface SavedViewsBarProps {
  module: string;
  /** Current filter snapshot to save when the user creates a new view. */
  currentFilters: Record<string, any>;
  /** Optional: current visible columns / sort to persist alongside filters. */
  currentColumns?: string[];
  currentSort?: { column?: string; direction?: 'asc' | 'desc' };
  /** Called when the user activates a saved view — apply its filters/columns/sort. */
  onApply: (view: SavedView) => void;
}

/**
 * Drop-in toolbar for any list page. Lets users save the current filter set
 * as a named view, switch between views, mark a default, and delete views.
 */
export function SavedViewsBar({ module, currentFilters, currentColumns = [], currentSort = {}, onApply }: SavedViewsBarProps) {
  const { views, saveView, deleteView } = useSavedViews(module);
  const { language } = useLanguage();
  const qc = useQueryClient();
  const isAr = language === 'ar';
  const [activeId, setActiveId] = useState<string | null>(() => views.find(v => v.is_default)?.id ?? null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  // Local mutation: set default flag (existing hook doesn't expose it).
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      // Clear other defaults for this module, then mark this one.
      await supabase.from('saved_views').update({ is_default: false } as any).eq('module', module);
      const { error } = await supabase.from('saved_views').update({ is_default: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views', module] }),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    saveView.mutate(
      {
        view_name: name.trim(),
        filters: currentFilters as any,
        columns: currentColumns,
        sort_config: currentSort,
        grouping: null,
        is_shared: false,
        is_default: false,
      },
      {
        onSuccess: () => {
          setName(''); setNaming(false);
          toast.success(isAr ? 'تم حفظ العرض' : 'View saved');
        },
      },
    );
  };

  const handleApply = (v: SavedView) => {
    setActiveId(v.id);
    onApply(v);
  };

  const handleSetDefault = (v: SavedView) => {
    setDefault.mutate(v.id);
    toast.success(isAr ? 'تم تعيين الافتراضي' : 'Default view set');
  };

  const active = views.find(v => v.id === activeId);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Bookmark className="h-3.5 w-3.5" />
            {active ? active.view_name : (isAr ? 'العروض المحفوظة' : 'Saved views')}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs">{isAr ? 'تطبيق عرض' : 'Apply a view'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {isAr ? 'لا توجد عروض محفوظة بعد' : 'No saved views yet'}
            </div>
          )}
          {views.map(v => (
            <DropdownMenuItem key={v.id} className="flex items-center justify-between gap-2 group">
              <button onClick={() => handleApply(v)} className="flex items-center gap-1.5 flex-1 text-left">
                {v.id === activeId ? <Check className="h-3 w-3 text-primary" /> : <span className="w-3" />}
                <span className="truncate">{v.view_name}</span>
                {v.is_default && <Star className="h-3 w-3 text-warning fill-warning" />}
              </button>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetDefault(v); }}
                  className="p-0.5 hover:text-warning"
                  title={isAr ? 'افتراضي' : 'Default'}
                ><Star className="h-3 w-3" /></button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteView.mutate(v.id); if (activeId === v.id) setActiveId(null); }}
                  className="p-0.5 hover:text-destructive"
                  title={isAr ? 'حذف' : 'Delete'}
                ><Trash2 className="h-3 w-3" /></button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {naming ? (
        <div className="flex items-center gap-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setNaming(false); setName(''); } }}
            placeholder={isAr ? 'اسم العرض' : 'View name'}
            className="h-8 w-40 text-xs"
            autoFocus
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleSave}>{isAr ? 'حفظ' : 'Save'}</Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setNaming(false); setName(''); }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setNaming(true)}>
          <Plus className="h-3 w-3" /> {isAr ? 'حفظ كعرض' : 'Save as view'}
        </Button>
      )}
    </div>
  );
}
