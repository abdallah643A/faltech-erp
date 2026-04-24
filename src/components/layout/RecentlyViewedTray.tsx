import { Clock, Trash2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRecentItems, useClearRecents } from '@/hooks/useRecentItems';
import { useLanguage } from '@/contexts/LanguageContext';

const ENTITY_LABELS: Record<string, { en: string; ar: string }> = {
  purchase_order: { en: 'Purchase Order', ar: 'أمر شراء' },
  ar_invoice: { en: 'AR Invoice', ar: 'فاتورة عميل' },
  ap_invoice: { en: 'AP Invoice', ar: 'فاتورة مورد' },
  sales_order: { en: 'Sales Order', ar: 'أمر بيع' },
  project: { en: 'Project', ar: 'مشروع' },
  employee: { en: 'Employee', ar: 'موظف' },
  business_partner: { en: 'Partner', ar: 'شريك' },
  item: { en: 'Item', ar: 'صنف' },
};

function entityLabel(entity_type: string, lang: 'en' | 'ar') {
  return ENTITY_LABELS[entity_type]?.[lang] ?? entity_type.replace(/_/g, ' ');
}

export function RecentlyViewedTray() {
  const { items } = useRecentItems(20);
  const clear = useClearRecents();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const title = language === 'ar' ? 'العناصر الأخيرة' : 'Recently viewed';
  const clearLabel = language === 'ar' ? 'مسح الكل' : 'Clear all';
  const emptyLabel = language === 'ar' ? 'لا توجد عناصر بعد' : 'No recent items yet';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-foreground hover:bg-primary-foreground/10"
          aria-label={title}
          title={title}
        >
          <Clock className="h-5 w-5" />
          {items.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-info text-info-foreground border-0"
            >
              {items.length}
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
            <Clock className="h-4 w-4 text-info" />
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{items.length}</Badge>
            {items.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:text-destructive"
                onClick={() => clear.mutate()}
                aria-label={clearLabel}
                title={clearLabel}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-50" />
            <p className="text-sm">{emptyLabel}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <div className="py-1">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => it.record_path && navigate(it.record_path)}
                  className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{it.record_title}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                        {entityLabel(it.entity_type, language === 'ar' ? 'ar' : 'en')}
                      </Badge>
                    </div>
                    {it.record_subtitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {it.record_subtitle}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {it.last_accessed_at
                        ? formatDistanceToNow(new Date(it.last_accessed_at), { addSuffix: true })
                        : ''}
                      {it.access_count && it.access_count > 1
                        ? ` · ${it.access_count}×`
                        : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
