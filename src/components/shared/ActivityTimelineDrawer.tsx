import { useMemo, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  History, MessageSquare, CheckCircle2, FileEdit, Loader2, Inbox, Filter,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivityTimeline, TimelineEvent, TimelineEventType } from '@/hooks/useActivityTimeline';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ActivityTimelineDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityType: string;
  recordId: string;
  recordTitle?: string;
}

const TYPE_META: Record<TimelineEventType, {
  icon: typeof History;
  color: string;
  bg: string;
  enLabel: string;
  arLabel: string;
}> = {
  audit:    { icon: FileEdit,    color: 'text-info',    bg: 'bg-info/10',    enLabel: 'Changes',  arLabel: 'تغييرات' },
  comment:  { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10', enLabel: 'Comments', arLabel: 'تعليقات' },
  approval: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', enLabel: 'Approvals', arLabel: 'موافقات' },
};

export function ActivityTimelineDrawer({
  open, onOpenChange, entityType, recordId, recordTitle,
}: ActivityTimelineDrawerProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [filter, setFilter] = useState<'all' | TimelineEventType>('all');

  const { data: events = [], isLoading } = useActivityTimeline({
    entityType, recordId, enabled: open,
  });

  const filtered = useMemo(
    () => filter === 'all' ? events : events.filter(e => e.type === filter),
    [events, filter]
  );

  const counts = useMemo(() => ({
    all: events.length,
    audit: events.filter(e => e.type === 'audit').length,
    comment: events.filter(e => e.type === 'comment').length,
    approval: events.filter(e => e.type === 'approval').length,
  }), [events]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isAr ? 'left' : 'right'}
        className="w-full sm:max-w-xl p-0 flex flex-col"
      >
        <SheetHeader className="border-b px-6 py-4 text-start">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {isAr ? 'سجل النشاط' : 'Activity Timeline'}
          </SheetTitle>
          <SheetDescription>
            {recordTitle ?? (isAr ? 'كل التغييرات والتعليقات والموافقات' : 'All changes, comments and approvals')}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-3 border-b">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all" className="text-xs">
                {isAr ? 'الكل' : 'All'}
                <Badge variant="secondary" className="ms-1.5 px-1.5">{counts.all}</Badge>
              </TabsTrigger>
              {(['audit', 'comment', 'approval'] as TimelineEventType[]).map(t => {
                const m = TYPE_META[t];
                return (
                  <TabsTrigger key={t} value={t} className="text-xs">
                    {isAr ? m.arLabel : m.enLabel}
                    <Badge variant="secondary" className="ms-1.5 px-1.5">{counts[t]}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin me-2" />
                {isAr ? 'جارِ التحميل...' : 'Loading…'}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-50" />
                <p className="text-sm">
                  {isAr ? 'لا يوجد نشاط' : 'No activity yet'}
                </p>
              </div>
            ) : (
              <ol className="relative border-s ms-3 space-y-6">
                {filtered.map(ev => <TimelineRow key={ev.id} ev={ev} isAr={isAr} />)}
              </ol>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function TimelineRow({ ev, isAr }: { ev: TimelineEvent; isAr: boolean }) {
  const meta = TYPE_META[ev.type];
  const Icon = meta.icon;
  const when = new Date(ev.at);

  return (
    <li className="ms-6">
      <span className={cn(
        'absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background',
        meta.bg, meta.color,
      )}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium">{ev.title}</span>
        {ev.stage && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">{ev.stage}</Badge>
        )}
        <time
          className="text-xs text-muted-foreground"
          title={format(when, 'PPpp')}
        >
          {formatDistanceToNow(when, { addSuffix: true })}
        </time>
      </div>
      {ev.actor && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {isAr ? 'بواسطة' : 'by'} {ev.actor}
        </div>
      )}
      {ev.body && (
        <p className={cn(
          'mt-2 text-sm text-foreground/90 whitespace-pre-wrap rounded-md p-2',
          'bg-muted/40 border',
        )}>
          {ev.body}
        </p>
      )}
      {ev.changedFields && ev.changedFields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {ev.changedFields.slice(0, 8).map(f => (
            <Badge key={f} variant="outline" className="text-[10px] font-mono">
              {f}
            </Badge>
          ))}
          {ev.changedFields.length > 8 && (
            <Badge variant="outline" className="text-[10px]">
              +{ev.changedFields.length - 8}
            </Badge>
          )}
        </div>
      )}
    </li>
  );
}

/** Compact button to open the drawer — drop into any record header. */
export function ActivityTimelineButton({
  entityType, recordId, recordTitle,
}: Omit<ActivityTimelineDrawerProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <History className="h-4 w-4 me-1.5" />
        {language === 'ar' ? 'النشاط' : 'Activity'}
      </Button>
      <ActivityTimelineDrawer
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        recordId={recordId}
        recordTitle={recordTitle}
      />
    </>
  );
}
