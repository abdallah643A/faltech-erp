import { useState } from 'react';
import { usePOSTransactions } from '@/hooks/usePOSData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function POSTransactions() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: txns, isLoading } = usePOSTransactions({ status: statusFilter === 'all' ? undefined : statusFilter });

  const filtered = (txns || []).filter((t: any) => {
    const q = search.toLowerCase();
    return !q || t.transaction_no?.toLowerCase().includes(q) || t.customer_name?.toLowerCase().includes(q);
  });

  const statusBadge = (s: string) => {
    switch (s) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 text-xs">{s}</Badge>;
      case 'returned': return <Badge className="bg-red-100 text-red-800 text-xs">{s}</Badge>;
      case 'voided': return <Badge variant="secondary" className="text-xs">{s}</Badge>;
      default: return <Badge variant="outline" className="text-xs">{s}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">POS Transactions</h1><p className="text-sm text-muted-foreground">All point of sale transactions</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transaction # or customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-3">Transaction #</th>
                <th className="text-left py-3 px-3">Customer</th>
                <th className="text-left py-3 px-3">Cashier</th>
                <th className="text-left py-3 px-3">Payment</th>
                <th className="text-right py-3 px-3">Subtotal</th>
                <th className="text-right py-3 px-3">Tax</th>
                <th className="text-right py-3 px-3">Total</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-left py-3 px-3">Date</th>
                <th className="py-3 px-3"></th>
              </tr></thead>
              <tbody>
                {filtered.map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/pos/transactions/${t.id}`)}>
                    <td className="py-2 px-3 font-mono text-xs">{t.transaction_no}</td>
                    <td className="py-2 px-3">{t.customer_name || 'Walk-in'}</td>
                    <td className="py-2 px-3 text-xs">{t.cashier_name}</td>
                    <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{t.payment_method}</Badge></td>
                    <td className="py-2 px-3 text-right">{Number(t.subtotal || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right">{Number(t.tax_amount || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold">{Number(t.grand_total || 0).toFixed(2)}</td>
                    <td className="py-2 px-3">{statusBadge(t.status)}</td>
                    <td className="py-2 px-3 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3"><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No transactions found'}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
