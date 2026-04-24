import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useBidManagement } from '@/hooks/useBidManagement';
import { Plus, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function BidMaterialPrices() {
  const { materialPrices, createMaterialPrice } = useBidManagement();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = (materialPrices.data || []).filter(p =>
    !search || p.material_name.toLowerCase().includes(search.toLowerCase()) ||
    p.material_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (formData: FormData) => {
    await createMaterialPrice.mutateAsync({
      material_code: formData.get('material_code') as string,
      material_name: formData.get('material_name') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      unit_price: Number(formData.get('unit_price')) || 0,
      supplier_name: formData.get('supplier_name') as string,
    } as any);
    setShowAdd(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Material Price List</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..." className="pl-9 w-64" />
            </div>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Material</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Material Price</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); handleAdd(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Code *</Label><Input name="material_code" required /></div>
                    <div className="space-y-2"><Label>Name *</Label><Input name="material_name" required /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Category</Label><Input name="category" /></div>
                    <div className="space-y-2"><Label>Unit</Label><Input name="unit" placeholder="ea, kg, m" /></div>
                    <div className="space-y-2"><Label>Unit Price *</Label><Input name="unit_price" type="number" step="0.01" required /></div>
                  </div>
                  <div className="space-y-2"><Label>Supplier</Label><Input name="supplier_name" /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button type="submit">Add</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No material prices found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.material_code}</TableCell>
                <TableCell className="font-medium">{p.material_name}</TableCell>
                <TableCell>{p.category || '-'}</TableCell>
                <TableCell>{p.unit || '-'}</TableCell>
                <TableCell className="text-right font-medium">{p.unit_price.toLocaleString()} {p.currency}</TableCell>
                <TableCell>{p.supplier_name || '-'}</TableCell>
                <TableCell>
                  {p.price_change_percent ? (
                    <div className={`flex items-center gap-1 text-xs ${p.price_change_percent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {p.price_change_percent > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(p.price_change_percent).toFixed(1)}%
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-xs">{format(new Date(p.effective_date), 'dd MMM yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
