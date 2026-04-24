import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GitCompareArrows } from 'lucide-react';
import { useSourcingEvents, useSourcingBidders } from '@/hooks/useProcurementStrategic';

export default function BidComparison() {
  const { data: events } = useSourcingEvents();
  const [eventId, setEventId] = useState<string | null>(null);
  const bidders = useSourcingBidders(eventId ?? undefined);

  const activeEvents = (events || []).filter((e: any) => ['open','evaluating','awarded'].includes(e.status));
  const minBid = bidders.data?.length ? Math.min(...bidders.data.filter((b:any) => b.bid_amount).map((b:any) => Number(b.bid_amount))) : 0;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><GitCompareArrows className="h-5 w-5 text-primary" /> Bid Comparison Matrix</h1>
        <p className="text-xs text-muted-foreground">Side-by-side technical & commercial evaluation across sourcing events</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Sourcing Event</CardTitle></CardHeader>
        <CardContent>
          {!activeEvents.length ? <div className="text-center text-muted-foreground py-6">No active sourcing events. Create one in Strategic Sourcing first.</div> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {activeEvents.map((e: any) => (
                <button key={e.id} onClick={() => setEventId(e.id)}
                  className={`text-left p-3 border rounded-md hover:border-primary transition ${eventId === e.id ? 'border-primary bg-muted/50' : 'border-border'}`}>
                  <div className="font-medium text-sm">{e.event_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{e.event_number}</div>
                  <Badge variant="outline" className="mt-1">{e.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {eventId && (
        <Card>
          <CardHeader><CardTitle>Comparison Matrix</CardTitle></CardHeader>
          <CardContent>
            {!bidders.data?.length ? <div className="text-center text-muted-foreground py-8">No bidders for this event.</div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Rank</TableHead><TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Bid</TableHead><TableHead className="text-right">vs Min</TableHead>
                  <TableHead className="text-right">Tech</TableHead><TableHead className="text-right">Comm</TableHead>
                  <TableHead className="text-right">Total Score</TableHead><TableHead>Result</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bidders.data.map((b: any, i: number) => {
                    const delta = b.bid_amount && minBid ? ((Number(b.bid_amount) - minBid) / minBid * 100) : 0;
                    return (
                      <TableRow key={b.id} className={b.is_awarded ? 'bg-success/10' : ''}>
                        <TableCell className="font-bold">#{b.rank ?? i + 1}</TableCell>
                        <TableCell className="font-medium">{b.vendor_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{b.bid_amount ? Number(b.bid_amount).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{delta > 0 ? `+${delta.toFixed(1)}%` : '—'}</TableCell>
                        <TableCell className="text-right">{b.technical_score ?? '—'}</TableCell>
                        <TableCell className="text-right">{b.commercial_score ?? '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{b.total_score ?? '—'}</TableCell>
                        <TableCell>{b.is_awarded ? <Badge>Awarded</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
