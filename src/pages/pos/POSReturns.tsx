import { useState } from 'react';
import { usePOSReturns } from '@/hooks/usePOSData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, RotateCcw } from 'lucide-react';

export default function POSReturns() {
  const { data: returns, isLoading, createReturn } = usePOSReturns();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ original_receipt_number: '', customer_name: '', reason: '', refund_method: 'cash' });

  const filtered = (returns || []).filter((r: any) => {
    const q = search.toLowerCase();
    return !q || r.return_number?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q) || r.original_receipt_number?.toLowerCase().includes(q);
  });

  const statusBadge = (s: string) => {
    switch (s) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 text-xs">{s}</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 text-xs">{s}</Badge>;
      case 'draft': return <Badge className="bg-gray-100 text-gray-800 text-xs">{s}</Badge>;
      default: return <Badge variant="outline" className="text-xs">{s}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Returns & Exchanges</h1><p className="text-sm text-muted-foreground">Process POS returns and refunds</p></div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Return</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search returns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left py-3 px-3">Return #</th>
              <th className="text-left py-3 px-3">Original Receipt</th>
              <th className="text-left py-3 px-3">Customer</th>
              <th className="text-left py-3 px-3">Reason</th>
              <th className="text-left py-3 px-3">Refund Method</th>
              <th className="text-right py-3 px-3">Total</th>
              <th className="text-left py-3 px-3">Status</th>
              <th className="text-left py-3 px-3">Date</th>
            </tr></thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="py-2 px-3 font-mono text-xs">{r.return_number}</td>
                  <td className="py-2 px-3 font-mono text-xs">{r.original_receipt_number || '-'}</td>
                  <td className="py-2 px-3">{r.customer_name || 'Walk-in'}</td>
                  <td className="py-2 px-3 text-xs">{r.reason || '-'}</td>
                  <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{r.refund_method}</Badge></td>
                  <td className="py-2 px-3 text-right font-medium">SAR {Number(r.total || 0).toFixed(2)}</td>
                  <td className="py-2 px-3">{statusBadge(r.status)}</td>
                  <td className="py-2 px-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No returns found'}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Return</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Original Receipt #</Label><Input value={form.original_receipt_number} onChange={e => setForm(p => ({ ...p, original_receipt_number: e.target.value }))} placeholder="POS-XXXXX" /></div>
            <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Defective, wrong item, etc." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={async () => {
              await createReturn.mutateAsync({ header: { ...form, return_type: 'return', status: 'draft', cashier_name: 'Current User' }, lines: [] });
              setShowCreate(false);
              setForm({ original_receipt_number: '', customer_name: '', reason: '', refund_method: 'cash' });
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
