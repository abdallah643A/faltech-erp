import { useState } from 'react';
import { useRestaurantOrders } from '@/hooks/useRestaurantData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

const statusBadge = (s: string) => {
  const map: Record<string, string> = { open: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', closed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', refunded: 'bg-orange-100 text-orange-800' };
  return <Badge className={`${map[s] || 'bg-gray-100 text-gray-800'} text-xs`}>{s}</Badge>;
};

export default function RestaurantOrders() {
  const { data: orders, isLoading } = useRestaurantOrders();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = (orders || []).filter((o: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || o.order_type === typeFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">All restaurant orders and transactions</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order # or customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dine_in">Dine In</SelectItem>
            <SelectItem value="takeaway">Takeaway</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="drive_thru">Drive Thru</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-3">Order #</th>
                <th className="text-left py-3 px-3">Type</th>
                <th className="text-left py-3 px-3">Customer</th>
                <th className="text-left py-3 px-3">Waiter</th>
                <th className="text-right py-3 px-3">Subtotal</th>
                <th className="text-right py-3 px-3">Tax</th>
                <th className="text-right py-3 px-3">Total</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-left py-3 px-3">Date</th>
              </tr></thead>
              <tbody>
                {filtered.map((o: any) => (
                  <tr key={o.id} className="border-b hover:bg-muted/20">
                    <td className="py-2 px-3 font-mono text-xs">{o.order_number}</td>
                    <td className="py-2 px-3"><Badge variant="outline" className="text-xs capitalize">{o.order_type?.replace('_', ' ')}</Badge></td>
                    <td className="py-2 px-3">{o.customer_name || 'Walk-in'}</td>
                    <td className="py-2 px-3 text-xs">{o.waiter_name || '-'}</td>
                    <td className="py-2 px-3 text-right">{Number(o.subtotal || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{Number(o.tax_amount || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold">{Number(o.grand_total || 0).toFixed(2)}</td>
                    <td className="py-2 px-3">{statusBadge(o.status)}</td>
                    <td className="py-2 px-3 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No orders found'}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
