import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { usePortalActivityFeed } from '@/hooks/usePortalEnhanced';
import { formatDistanceToNow } from 'date-fns';

export default function PortalActivityFeed() {
  const { data: rows = [], markRead } = usePortalActivityFeed({ limit: 200 });
  const unread = rows.filter((r: any) => !r.is_read).length;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Activity className="h-6 w-6" /><h1 className="text-2xl font-bold">Portal Activity Feed</h1></div>
        <Badge variant="secondary">{unread} unread</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Bidirectional events ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {rows.map((e: any) => (
                <div key={e.id} className={`p-4 flex items-start gap-3 ${e.is_read ? 'opacity-60' : ''}`}>
                  <div className={`p-2 rounded-full ${e.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {e.direction === 'inbound' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{e.title}</p>
                      <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                    </div>
                    {e.description && <p className="text-sm text-muted-foreground mt-0.5">{e.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                  </div>
                  {!e.is_read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(e.id)}>Mark read</Button>}
                </div>
              ))}
              {rows.length === 0 && <p className="text-center text-muted-foreground py-12">No activity yet</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
