import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Plus } from 'lucide-react';
import { useCustomerPriceBooks } from '@/hooks/useQuoteToCash';

export default function CustomerPriceBookPage() {
  const { priceBooks, isLoading, createPriceBook } = useCustomerPriceBooks();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ price_book_name: '', customer_code: '', currency: 'SAR', effective_from: new Date().toISOString().slice(0, 10) });

  const handleCreate = async () => {
    await createPriceBook.mutateAsync(form);
    setOpen(false);
    setForm({ price_book_name: '', customer_code: '', currency: 'SAR', effective_from: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Customer Price Books</h1>
          <p className="text-sm text-muted-foreground">Per-customer pricing with effective dating</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Price Book</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Customer Price Book</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Price Book Name</Label><Input value={form.price_book_name} onChange={(e) => setForm({ ...form, price_book_name: e.target.value })} /></div>
              <div><Label>Customer Code</Label><Input value={form.customer_code} onChange={(e) => setForm({ ...form, customer_code: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <div><Label>Effective From</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Price Books ({priceBooks.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Customer</TableHead><TableHead>Currency</TableHead><TableHead>Effective From</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && priceBooks.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No price books</TableCell></TableRow>}
              {priceBooks.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.price_book_name}</TableCell>
                  <TableCell>{p.customer_code || '—'}</TableCell>
                  <TableCell>{p.currency}</TableCell>
                  <TableCell>{p.effective_from}</TableCell>
                  <TableCell><Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
