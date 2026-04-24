import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBidManagement, Bid, BidItem } from '@/hooks/useBidManagement';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface Props {
  selectedBid: Bid | null;
  onSelectBid: (bid: Bid | null) => void;
  bids: Bid[];
}

export default function BidCostEstimation({ selectedBid, onSelectBid, bids }: Props) {
  const { useBidItems, createBidItem, deleteBidItem, updateBid } = useBidManagement();
  const items = useBidItems(selectedBid?.id || null);
  const [showAddItem, setShowAddItem] = useState(false);

  const bidItems = items.data || [];
  const totalCost = bidItems.reduce((s, i) => s + (i.total_cost || 0), 0);
  const totalPrice = bidItems.reduce((s, i) => s + (i.total_price || 0), 0);

  const handleAddItem = async (formData: FormData) => {
    if (!selectedBid) return;
    await createBidItem.mutateAsync({
      bid_id: selectedBid.id,
      line_num: bidItems.length + 1,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      quantity: Number(formData.get('quantity')) || 0,
      unit: formData.get('unit') as string,
      unit_cost: Number(formData.get('unit_cost')) || 0,
      markup_percent: Number(formData.get('markup_percent')) || 0,
      unit_price: Number(formData.get('unit_price')) || 0,
      sort_order: bidItems.length + 1,
    } as any);
    setShowAddItem(false);
  };

  const recalculateBid = async () => {
    if (!selectedBid) return;
    const contingency = totalCost * ((selectedBid.contingency_percent || 0) / 100);
    const overhead = totalCost * ((selectedBid.overhead_percent || 0) / 100);
    const finalCost = totalCost + contingency + overhead;
    const profit = finalCost * ((selectedBid.profit_percent || 0) / 100);
    const finalPrice = finalCost + profit;
    await updateBid.mutateAsync({
      id: selectedBid.id,
      total_cost: totalCost,
      final_price: finalPrice,
    });
  };

  if (!selectedBid) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Bid for Cost Estimation</h3>
          <p className="text-muted-foreground mb-4">Choose a bid from the register to start building the cost breakdown structure.</p>
          <Select onValueChange={(id) => onSelectBid(bids.find(b => b.id === id) || null)}>
            <SelectTrigger className="w-64 mx-auto"><SelectValue placeholder="Select a bid" /></SelectTrigger>
            <SelectContent>
              {bids.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.bid_number} - {b.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{selectedBid.bid_number}: {selectedBid.title}</h3>
          <p className="text-sm text-muted-foreground">{selectedBid.client_name} · Cost Breakdown Structure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onSelectBid(null)}>Change Bid</Button>
          <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Line Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Cost Item</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleAddItem(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input name="description" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select name="category" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="material">Material</option>
                      <option value="labor">Labor</option>
                      <option value="equipment">Equipment</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="overhead">Overhead</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input name="unit" placeholder="ea, sqm, hr" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input name="quantity" type="number" step="0.01" defaultValue="1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input name="unit_cost" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Markup %</Label>
                    <Input name="markup_percent" type="number" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (Sell)</Label>
                  <Input name="unit_price" type="number" step="0.01" defaultValue="0" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
                  <Button type="submit">Add Item</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="secondary" onClick={recalculateBid}>
            <Calculator className="h-4 w-4 mr-2" />Recalculate
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-xl font-bold">{totalCost.toLocaleString()} SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Contingency ({selectedBid.contingency_percent}%)</p>
          <p className="text-xl font-bold">{(totalCost * (selectedBid.contingency_percent || 0) / 100).toLocaleString()} SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Overhead ({selectedBid.overhead_percent}%)</p>
          <p className="text-xl font-bold">{(totalCost * (selectedBid.overhead_percent || 0) / 100).toLocaleString()} SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Price</p>
          <p className="text-xl font-bold text-primary">{totalPrice.toLocaleString()} SAR</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Margin</p>
          <p className="text-xl font-bold text-green-600">
            {totalPrice > 0 ? `${(((totalPrice - totalCost) / totalPrice) * 100).toFixed(1)}%` : '0%'}
          </p>
        </CardContent></Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Markup %</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bidItems.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No cost items yet. Add line items to build the CBS.</TableCell></TableRow>
              ) : bidItems.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="capitalize">{item.category || '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.unit || '-'}</TableCell>
                  <TableCell className="text-right">{item.unit_cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{item.total_cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.markup_percent}%</TableCell>
                  <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{item.total_price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteBidItem.mutate(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {bidItems.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6} className="text-right">Totals</TableCell>
                  <TableCell className="text-right">{totalCost.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{totalPrice.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
