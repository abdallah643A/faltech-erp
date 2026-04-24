import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Truck, Package, CheckCircle, Clock, XCircle, ArrowRight, Plus, RefreshCw, Search, MapPin, Phone, User } from 'lucide-react';
import { useOrderFulfillment, STATE_TRANSITIONS, STATE_LABELS, FULFILLMENT_STATES } from '@/hooks/useOrderFulfillment';
import { useSalesOrders } from '@/hooks/useSalesOrderContracts';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const STATE_ICONS: Record<string, React.ElementType> = {
  draft: Clock,
  confirmed: CheckCircle,
  picking: Package,
  packed: Package,
  shipped: Truck,
  in_transit: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const STATE_PROGRESS: Record<string, number> = {
  draft: 0, confirmed: 16, picking: 33, packed: 50, shipped: 66, in_transit: 83, delivered: 100, cancelled: 0,
};

export default function OrderFulfillmentPage() {
  const { t } = useLanguage();
  const { fulfillments, isLoading, createFulfillment, transitionState, updateTracking } = useOrderFulfillment();
  const { salesOrders } = useSalesOrders();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSO, setSelectedSO] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [transitionDialog, setTransitionDialog] = useState<{ id: string; current: string } | null>(null);
  const [trackingDialog, setTrackingDialog] = useState<any>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [estDelivery, setEstDelivery] = useState('');

  const filtered = (fulfillments || []).filter(f => {
    if (stateFilter !== 'all' && f.current_state !== stateFilter) return false;
    if (search && !f.tracking_number?.toLowerCase().includes(search.toLowerCase()) && !f.receiver_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stateCounts = FULFILLMENT_STATES.reduce((acc, s) => {
    acc[s] = (fulfillments || []).filter(f => f.current_state === s).length;
    return acc;
  }, {} as Record<string, number>);

  const handleCreate = () => {
    if (!selectedSO) { toast({ title: 'Select a Sales Order', variant: 'destructive' }); return; }
    createFulfillment.mutate({ sales_order_id: selectedSO, shipping_address: shippingAddress, receiver_name: receiverName, receiver_phone: receiverPhone, notes });
    setShowCreate(false);
    setSelectedSO(''); setShippingAddress(''); setReceiverName(''); setReceiverPhone(''); setNotes('');
  };

  const handleTransition = (toState: string) => {
    if (!transitionDialog) return;
    transitionState.mutate({ fulfillmentId: transitionDialog.id, toState, notes: transitionNotes });
    setTransitionDialog(null);
    setTransitionNotes('');
  };

  const handleUpdateTracking = () => {
    if (!trackingDialog) return;
    updateTracking.mutate({ fulfillmentId: trackingDialog.id, tracking_number: trackingNumber, carrier_name: carrierName, estimated_delivery: estDelivery });
    setTrackingDialog(null);
    setTrackingNumber(''); setCarrierName(''); setEstDelivery('');
  };

  const soMap = (salesOrders || []).reduce((m: any, so: any) => { m[so.id] = so; return m; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Fulfillment</h1>
          <p className="text-muted-foreground">Track order lifecycle from draft to delivery</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Fulfillment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Fulfillment Order</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sales Order</Label>
                <Select value={selectedSO} onValueChange={setSelectedSO}>
                  <SelectTrigger><SelectValue placeholder="Select order..." /></SelectTrigger>
                  <SelectContent>
                    {(salesOrders || []).map((so: any) => (
                      <SelectItem key={so.id} value={so.id}>SO-{so.doc_num} - {so.customer_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Receiver Name</Label><Input value={receiverName} onChange={e => setReceiverName(e.target.value)} /></div>
                <div><Label>Receiver Phone</Label><Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} /></div>
              </div>
              <div><Label>Shipping Address</Label><Textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} /></div>
              <div><Label>{t('common.notes')}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={createFulfillment.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* State Summary Cards */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {FULFILLMENT_STATES.map(s => {
          const Icon = STATE_ICONS[s] || Clock;
          const config = STATE_LABELS[s];
          return (
            <Card key={s} className={`cursor-pointer transition-all ${stateFilter === s ? 'ring-2 ring-primary' : ''}`} onClick={() => setStateFilter(stateFilter === s ? 'all' : s)}>
              <CardContent className="p-3 text-center">
                <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{stateCounts[s] || 0}</div>
                <div className="text-[10px] text-muted-foreground">{config?.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tracking or receiver..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Est. Delivery</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f: any) => {
                const so = soMap[f.sales_order_id];
                const config = STATE_LABELS[f.current_state] || { label: f.current_state, color: 'secondary' };
                const nextStates = STATE_TRANSITIONS[f.current_state] || [];
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">SO-{so?.doc_num || '?'}</TableCell>
                    <TableCell>{so?.customer_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={config.color as any}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="w-32">
                      <Progress value={STATE_PROGRESS[f.current_state] || 0} className="h-2" />
                    </TableCell>
                    <TableCell>
                      {f.tracking_number ? (
                        <span className="text-sm">{f.carrier_name && `${f.carrier_name}: `}{f.tracking_number}</span>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => { setTrackingDialog(f); setTrackingNumber(f.tracking_number || ''); setCarrierName(f.carrier_name || ''); setEstDelivery(f.estimated_delivery || ''); }}>
                          Add Tracking
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{f.receiver_name || '-'}</div>
                      {f.receiver_phone && <div className="text-xs text-muted-foreground">{f.receiver_phone}</div>}
                    </TableCell>
                    <TableCell>{f.estimated_delivery || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {nextStates.map(ns => (
                          <Button key={ns} variant="outline" size="sm" onClick={() => setTransitionDialog({ id: f.id, current: f.current_state })}>
                            <ArrowRight className="h-3 w-3 mr-1" /> {STATE_LABELS[ns]?.label || ns}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No fulfillment orders found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transition Dialog */}
      <Dialog open={!!transitionDialog} onOpenChange={() => setTransitionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Current: <Badge>{STATE_LABELS[transitionDialog?.current || '']?.label}</Badge></p>
            <div><Label>Notes (optional)</Label><Textarea value={transitionNotes} onChange={e => setTransitionNotes(e.target.value)} /></div>
            <div className="flex gap-2 flex-wrap">
              {(STATE_TRANSITIONS[transitionDialog?.current || ''] || []).map(ns => (
                <Button key={ns} onClick={() => handleTransition(ns)} disabled={transitionState.isPending}>
                  <ArrowRight className="h-4 w-4 mr-1" /> {STATE_LABELS[ns]?.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={!!trackingDialog} onOpenChange={() => setTrackingDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Tracking</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Carrier</Label><Input value={carrierName} onChange={e => setCarrierName(e.target.value)} placeholder="e.g. Aramex, SMSA" /></div>
            <div><Label>Tracking Number</Label><Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} /></div>
            <div><Label>Estimated Delivery</Label><Input type="date" value={estDelivery} onChange={e => setEstDelivery(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateTracking}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
