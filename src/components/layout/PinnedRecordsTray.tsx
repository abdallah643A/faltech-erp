import { Pin, X, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePinnedRecords } from '@/hooks/usePinnedRecords';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Topbar tray showing the user's pinned records, grouped by category.
 * Click an entry to jump straight to the record. Hover to reveal unpin.
 */
export function PinnedRecordsTray() {
  const { pins, unpin } = usePinnedRecords();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const grouped = pins.reduce<Record<string, typeof pins>>((acc, p) => {
    const k = p.category || (language === 'ar' ? 'مثبتة' : 'Pinned');
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  const totalLabel = language === 'ar' ? 'السجلات المثبتة' : 'Pinned records';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-foreground hover:bg-primary-foreground/10"
          aria-label={totalLabel}
          title={totalLabel}
        >
          <Pin className="h-5 w-5" />
          {pins.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-warning text-warning-foreground border-0"
            >
              {pins.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-96 p-0"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-warning" />
            <h4 className="font-semibold text-sm">{totalLabel}</h4>
          </div>
          <Badge variant="outline" className="text-xs">{pins.length}</Badge>
        </div>

        {pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-50" />
            <p className="text-sm">
              {language === 'ar'
                ? 'لا توجد سجلات مثبتة بعد'
                : 'No pinned records yet'}
            </p>
            <p className="text-xs">
              {language === 'ar'
                ? 'استخدم زر التثبيت على أي سجل'
                : 'Use the pin button on any record'}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="py-2">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-2">
                  <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </div>
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-2 px-4 py-2 hover:bg-accent cursor-pointer"
                      onClick={() => p.record_path && navigate(p.record_path)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.record_title}
                        </div>
                        {p.record_subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {p.record_subtitle}
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'h-7 w-7 opacity-0 group-hover:opacity-100',
                          'hover:text-destructive'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          unpin({ entity_type: p.entity_type, record_id: p.record_id });
                        }}
                        aria-label="Unpin"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
