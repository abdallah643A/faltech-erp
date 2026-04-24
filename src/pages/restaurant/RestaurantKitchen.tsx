import { useState } from 'react';
import { useRestaurantKitchenTickets } from '@/hooks/useRestaurantData';
import { useRestaurantWasteEntries } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, ChefHat, CheckCircle, AlertTriangle, RotateCcw, Trash2, Timer, Flame } from 'lucide-react';

const statusFlow = ['pending', 'preparing', 'ready', 'served'];
const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
  pending: { color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20', label: 'New', icon: Clock },
  preparing: { color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20', label: 'Preparing', icon: ChefHat },
  ready: { color: 'border-green-400 bg-green-50 dark:bg-green-950/20', label: 'Ready', icon: CheckCircle },
};

const STATIONS = ['All', 'Grill', 'Cold', 'Pastry', 'Drinks', 'Fryer', 'Salad'];

function getElapsed(sentAt: string) {
  return Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000);
}

export default function RestaurantKitchen() {
  const { data: tickets, isLoading } = useRestaurantKitchenTickets();
  const { updateTicketStatus } = useRestaurantKitchenTickets();
  const { create: logWaste } = useRestaurantWasteEntries();
  const [stationFilter, setStationFilter] = useState('All');
  const [showRefire, setShowRefire] = useState<any>(null);
  const [showWaste, setShowWaste] = useState(false);
  const [wasteForm, setWasteForm] = useState({ item_name: '', quantity: '', reason: '', cost_estimate: '' });

  const allTickets = (tickets || []).filter((t: any) =>
    stationFilter === 'All' || t.station?.toLowerCase() === stationFilter.toLowerCase()
  );

  const grouped = {
    pending: allTickets.filter((t: any) => t.status === 'pending'),
    preparing: allTickets.filter((t: any) => t.status === 'preparing'),
    ready: allTickets.filter((t: any) => t.status === 'ready'),
  };

  const nextStatus = (current: string) => {
    const idx = statusFlow.indexOf(current);
    return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  const avgPrepTime = (() => {
    const served = (tickets || []).filter((t: any) => t.preparing_at && t.ready_at);
    if (!served.length) return 0;
    const totalMs = served.reduce((s: number, t: any) => s + (new Date(t.ready_at).getTime() - new Date(t.preparing_at).getTime()), 0);
    return Math.round(totalMs / served.length / 60000);
  })();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ChefHat className="h-6 w-6" /> Kitchen Display System</h1>
          <p className="text-sm text-muted-foreground">Real-time order tickets by station with prep tracking</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge className="bg-yellow-100 text-yellow-800">{grouped.pending.length} New</Badge>
          <Badge className="bg-blue-100 text-blue-800">{grouped.preparing.length} Preparing</Badge>
          <Badge className="bg-green-100 text-green-800">{grouped.ready.length} Ready</Badge>
          {avgPrepTime > 0 && <Badge variant="outline" className="gap-1"><Timer className="h-3 w-3" /> Avg {avgPrepTime}m</Badge>}
        </div>
      </div>

      {/* Station filter + actions */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Station" /></SelectTrigger>
          <SelectContent>
            {STATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowWaste(true)} className="gap-1"><Trash2 className="h-3.5 w-3.5" /> Log Waste</Button>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">KDS Board</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['pending', 'preparing', 'ready'] as const).map(status => {
              const cfg = statusConfig[status];
              return (
                <div key={status} className="space-y-3">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <cfg.icon className="h-4 w-4" />{cfg.label} ({grouped[status].length})
                  </h2>
                  {grouped[status].map((ticket: any) => {
                    const elapsed = getElapsed(ticket.sent_at || ticket.created_at);
                    const isUrgent = elapsed > 15;
                    const isWarning = elapsed > 10 && !isUrgent;
                    return (
                      <Card key={ticket.id} className={`border-2 ${cfg.color} ${isUrgent ? 'ring-2 ring-red-400 animate-pulse' : isWarning ? 'ring-1 ring-orange-300' : ''}`}>
                        <CardHeader className="p-3 pb-1">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold">#{ticket.ticket_number || ticket.rest_orders?.order_number}</CardTitle>
                            <div className="flex items-center gap-1">
                              {isUrgent && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                              {isWarning && <Flame className="h-3.5 w-3.5 text-orange-500" />}
                              <Badge variant="outline" className={`text-[10px] ${isUrgent ? 'text-red-700 border-red-300' : ''}`}>{elapsed}m</Badge>
                              {ticket.station && <Badge variant="secondary" className="text-[10px]">{ticket.station}</Badge>}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ticket.rest_orders?.order_type?.replace('_', ' ')} {ticket.priority !== 'normal' && <Badge variant="destructive" className="text-[9px] ml-1">RUSH</Badge>}
                          </p>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="space-y-1">
                            {(ticket.rest_kitchen_ticket_lines || []).map((line: any) => (
                              <div key={line.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{line.quantity}x {line.item_name}</span>
                                {line.notes && <span className="text-xs text-muted-foreground italic">{line.notes}</span>}
                              </div>
                            ))}
                          </div>
                          {ticket.notes && <p className="text-xs text-orange-700 mt-2 italic">⚠ {ticket.notes}</p>}
                          <div className="flex gap-1 mt-3">
                            {nextStatus(status) && (
                              <Button size="sm" className="flex-1" onClick={() => updateTicketStatus.mutate({ id: ticket.id, status: nextStatus(status)! })}>
                                Mark {statusConfig[nextStatus(status)!]?.label || nextStatus(status)}
                              </Button>
                            )}
                            {status === 'preparing' && (
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowRefire(ticket)}>
                                <RotateCcw className="h-3 w-3" /> Re-fire
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!grouped[status].length && <p className="text-sm text-muted-foreground text-center py-4">No tickets</p>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Ticket</th>
                  <th className="text-left py-2 px-3">Station</th>
                  <th className="text-left py-2 px-3">Items</th>
                  <th className="text-left py-2 px-3">Sent</th>
                  <th className="text-left py-2 px-3">Started</th>
                  <th className="text-left py-2 px-3">Ready</th>
                  <th className="text-left py-2 px-3">Prep Time</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr></thead>
                <tbody>
                  {(tickets || []).slice(0, 50).map((t: any) => {
                    const prepMs = t.preparing_at && t.ready_at ? new Date(t.ready_at).getTime() - new Date(t.preparing_at).getTime() : null;
                    return (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 px-3 font-mono text-xs">{t.ticket_number || t.rest_orders?.order_number}</td>
                        <td className="py-2 px-3 text-xs">{t.station || '-'}</td>
                        <td className="py-2 px-3 text-xs">{(t.rest_kitchen_ticket_lines || []).map((l: any) => `${l.quantity}x ${l.item_name}`).join(', ')}</td>
                        <td className="py-2 px-3 text-xs">{t.sent_at ? new Date(t.sent_at).toLocaleTimeString() : '-'}</td>
                        <td className="py-2 px-3 text-xs">{t.preparing_at ? new Date(t.preparing_at).toLocaleTimeString() : '-'}</td>
                        <td className="py-2 px-3 text-xs">{t.ready_at ? new Date(t.ready_at).toLocaleTimeString() : '-'}</td>
                        <td className="py-2 px-3 text-xs">{prepMs ? `${Math.round(prepMs / 60000)}m` : '-'}</td>
                        <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{t.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Re-fire dialog */}
      <Dialog open={!!showRefire} onOpenChange={() => setShowRefire(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Re-fire Ticket #{showRefire?.ticket_number}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will reset the ticket to pending and send it back to the kitchen.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefire(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { updateTicketStatus.mutate({ id: showRefire.id, status: 'pending' }); setShowRefire(null); }}>Re-fire</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waste log dialog */}
      <Dialog open={showWaste} onOpenChange={setShowWaste}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Kitchen Waste</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Name</Label><Input value={wasteForm.item_name} onChange={e => setWasteForm({ ...wasteForm, item_name: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input type="number" value={wasteForm.quantity} onChange={e => setWasteForm({ ...wasteForm, quantity: e.target.value })} /></div>
            <div><Label>Reason</Label><Input value={wasteForm.reason} onChange={e => setWasteForm({ ...wasteForm, reason: e.target.value })} placeholder="Spoiled, burnt, dropped..." /></div>
            <div><Label>Est. Cost (SAR)</Label><Input type="number" value={wasteForm.cost_estimate} onChange={e => setWasteForm({ ...wasteForm, cost_estimate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaste(false)}>Cancel</Button>
            <Button onClick={() => {
              logWaste.mutate({ item_name: wasteForm.item_name, quantity: parseFloat(wasteForm.quantity) || 0, waste_reason: wasteForm.reason, cost_estimate: parseFloat(wasteForm.cost_estimate) || 0 });
              setShowWaste(false);
              setWasteForm({ item_name: '', quantity: '', reason: '', cost_estimate: '' });
            }}>Log Waste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
