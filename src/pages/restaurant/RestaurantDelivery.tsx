import { useState } from 'react';
import { useRestaurantDeliveryOrders } from '@/hooks/useRestaurantData';
import { useRestaurantAggregatorOrders } from '@/hooks/useRestaurantPhase2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Clock, MapPin, CheckCircle, Package, Globe, DollarSign, AlertTriangle } from 'lucide-react';

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  preparing: { color: 'bg-blue-100 text-blue-800', label: 'Preparing' },
  dispatched: { color: 'bg-purple-100 text-purple-800', label: 'Dispatched' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

const aggStatusConfig: Record<string, { color: string }> = {
  received: { color: 'bg-yellow-100 text-yellow-800' }, accepted: { color: 'bg-blue-100 text-blue-800' },
  ready: { color: 'bg-green-100 text-green-800' }, picked_up: { color: 'bg-purple-100 text-purple-800' },
  delivered: { color: 'bg-green-100 text-green-800' }, cancelled: { color: 'bg-red-100 text-red-800' },
};

export default function RestaurantDelivery() {
  const { data: deliveries, isLoading } = useRestaurantDeliveryOrders();
  const { updateStatus } = useRestaurantDeliveryOrders();
  const { data: aggOrders, updateStatus: updateAggStatus } = useRestaurantAggregatorOrders();

  const active = (deliveries || []).filter((d: any) => !['delivered', 'cancelled'].includes(d.status));
  const completed = (deliveries || []).filter((d: any) => d.status === 'delivered');
  const activeAgg = (aggOrders || []).filter((a: any) => !['delivered', 'cancelled'].includes(a.status));
  const totalDeliveryFees = completed.reduce((s: number, d: any) => s + Number(d.delivery_fee || 0), 0);
  const codPending = active.filter((d: any) => d.is_cod && !d.cod_reconciled).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" /> Delivery & Dispatch</h1>
          <p className="text-sm text-muted-foreground">Dispatch board, rider management, aggregator orders, and COD reconciliation</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{active.length} Active</Badge>
          <Badge variant="outline">{completed.length} Delivered</Badge>
          {codPending > 0 && <Badge variant="destructive" className="gap-1"><DollarSign className="h-3 w-3" />{codPending} COD Pending</Badge>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Deliveries', value: active.length, icon: Truck, color: 'text-blue-600' },
          { label: 'Completed Today', value: completed.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Delivery Fees', value: `SAR ${totalDeliveryFees.toFixed(2)}`, icon: DollarSign, color: 'text-purple-600' },
          { label: 'Aggregator Orders', value: activeAgg.length, icon: Globe, color: 'text-orange-600' },
        ].map(k => (
          <Card key={k.label} className="border">
            <CardContent className="p-3">
              <k.icon className={`h-4 w-4 ${k.color} mb-1`} />
              <p className="text-lg font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="dispatch">
        <TabsList>
          <TabsTrigger value="dispatch" className="gap-1"><Truck className="h-3.5 w-3.5" /> Dispatch Board</TabsTrigger>
          <TabsTrigger value="aggregator" className="gap-1"><Globe className="h-3.5 w-3.5" /> Aggregators</TabsTrigger>
          <TabsTrigger value="completed" className="gap-1"><CheckCircle className="h-3.5 w-3.5" /> Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map((d: any) => {
              const cfg = statusConfig[d.status] || statusConfig.pending;
              return (
                <Card key={d.id} className="border">
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">#{d.rest_orders?.order_number}</CardTitle>
                      <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{d.delivery_address}</div>
                      {d.rider_name && <div className="flex items-center gap-1"><Truck className="h-3 w-3 text-muted-foreground" />{d.rider_name} {d.rider_phone && `(${d.rider_phone})`}</div>}
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />ETA: {d.estimated_delivery_minutes || '?'} min</div>
                      {d.delivery_zone && <Badge variant="outline" className="text-[10px]">Zone: {d.delivery_zone}</Badge>}
                      {d.is_cod && <Badge variant="destructive" className="text-[10px]">COD: SAR {Number(d.cod_amount || d.rest_orders?.grand_total || 0).toFixed(2)}</Badge>}
                      {d.aggregator_name && <Badge variant="secondary" className="text-[10px]">{d.aggregator_name}</Badge>}
                    </div>
                    <p className="text-sm font-bold">SAR {Number(d.rest_orders?.grand_total || 0).toFixed(2)}</p>
                    <div className="flex gap-1">
                      {d.status === 'pending' && <Button size="sm" className="text-xs h-7 flex-1" onClick={() => updateStatus.mutate({ id: d.id, status: 'dispatched' })}>Dispatch</Button>}
                      {d.status === 'dispatched' && <Button size="sm" className="text-xs h-7 flex-1" onClick={() => updateStatus.mutate({ id: d.id, status: 'delivered' })}>Delivered</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!active.length && <p className="col-span-full text-center text-muted-foreground py-8">{isLoading ? 'Loading...' : 'No active deliveries'}</p>}
          </div>
        </TabsContent>

        <TabsContent value="aggregator" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(aggOrders || []).map((a: any) => {
              const cfg = aggStatusConfig[a.status] || { color: 'bg-gray-100 text-gray-800' };
              return (
                <Card key={a.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold text-sm">{a.aggregator_name}</span>
                      </div>
                      <Badge className={`${cfg.color} text-xs`}>{a.status}</Badge>
                    </div>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>External ID: <span className="font-mono text-foreground">{a.external_order_id || '-'}</span></p>
                      {a.rest_orders?.order_number && <p>Internal: #{a.rest_orders.order_number}</p>}
                      <p>Commission: {a.commission_percent}% (SAR {Number(a.commission_amount || 0).toFixed(2)})</p>
                      <p>Platform Fee: SAR {Number(a.platform_fee || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      {a.status === 'received' && <Button size="sm" className="text-xs h-7 flex-1" onClick={() => updateAggStatus.mutate({ id: a.id, status: 'accepted' })}>Accept</Button>}
                      {a.status === 'accepted' && <Button size="sm" className="text-xs h-7 flex-1" onClick={() => updateAggStatus.mutate({ id: a.id, status: 'ready' })}>Ready</Button>}
                      {a.status === 'ready' && <Button size="sm" className="text-xs h-7 flex-1" onClick={() => updateAggStatus.mutate({ id: a.id, status: 'picked_up' })}>Picked Up</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!(aggOrders || []).length && <p className="col-span-full text-center text-muted-foreground py-8">No aggregator orders</p>}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-3">
          <Card className="border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Order</th>
                  <th className="text-left py-2 px-3">Address</th>
                  <th className="text-left py-2 px-3">Rider</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">COD</th>
                  <th className="text-left py-2 px-3">Delivered</th>
                </tr></thead>
                <tbody>
                  {completed.slice(0, 30).map((d: any) => (
                    <tr key={d.id} className="border-b">
                      <td className="py-2 px-3 font-mono text-xs">{d.rest_orders?.order_number}</td>
                      <td className="py-2 px-3 text-xs truncate max-w-[200px]">{d.delivery_address}</td>
                      <td className="py-2 px-3 text-xs">{d.rider_name || '-'}</td>
                      <td className="py-2 px-3 text-right font-bold">{Number(d.rest_orders?.grand_total || 0).toFixed(2)}</td>
                      <td className="py-2 px-3">{d.is_cod ? <Badge variant="outline" className="text-[10px]">COD</Badge> : '-'}</td>
                      <td className="py-2 px-3 text-xs">{d.delivered_at ? new Date(d.delivered_at).toLocaleTimeString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
