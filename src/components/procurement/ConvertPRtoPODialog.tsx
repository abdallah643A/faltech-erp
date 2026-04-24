import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, ArrowRight, AlertTriangle } from 'lucide-react';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { usePurchaseOrders } from '@/hooks/useProcurement';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

interface PRLine {
  id: string;
  line_num: number;
  item_code: string;
  item_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pr: any;
  prLines: PRLine[];
}

export function ConvertPRtoPODialog({ open, onOpenChange, pr, prLines }: Props) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { businessPartners } = useBusinessPartners();
  const { createPO } = usePurchaseOrders();
  const vendors = businessPartners?.filter(bp => bp.card_type === 'vendor') || [];

  const [vendorId, setVendorId] = useState('');
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && prLines.length > 0) {
      const sel: Record<string, boolean> = {};
      const qty: Record<string, number> = {};
      const prc: Record<string, number> = {};
      prLines.forEach(l => {
        sel[l.id] = true;
        qty[l.id] = l.quantity;
        prc[l.id] = l.unit_price || 0;
      });
      setSelectedLines(sel);
      setQuantities(qty);
      setPrices(prc);
    }
  }, [open, prLines]);

  const selectedItems = prLines.filter(l => selectedLines[l.id]);
  const totalValue = selectedItems.reduce((s, l) => s + (quantities[l.id] || 0) * (prices[l.id] || 0), 0);
  const selectedVendor = vendors.find(v => v.id === vendorId);
  const isPartial = selectedItems.length < prLines.length || selectedItems.some(l => (quantities[l.id] || 0) < l.quantity);

  const handleCreate = async () => {
    if (!vendorId || selectedItems.length === 0) {
      toast({ title: 'Error', description: 'Select a vendor and at least one line item', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const poNumber = 'PO-' + String(Date.now()).slice(-8);
      const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
        po_number: poNumber,
        vendor_code: selectedVendor?.card_code || '',
        vendor_name: selectedVendor?.card_name || '',
        vendor_id: vendorId,
        doc_date: new Date().toISOString().split('T')[0],
        delivery_date: pr.required_date || null,
        status: 'open',
        subtotal: totalValue,
        total: totalValue,
        remarks: `Created from PR ${pr.pr_number}`,
        purchase_request_id: pr.id,
        created_by: user?.id,
        branch_id: pr.branch_id || null,
        project_id: pr.project_id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      } as any).select().single();

      if (poError) throw poError;

      // Insert PO lines
      const poLines = selectedItems.map((l, idx) => ({
        purchase_order_id: po.id,
        line_num: idx + 1,
        item_code: l.item_code || '',
        item_description: l.item_description,
        quantity: quantities[l.id] || l.quantity,
        unit: l.unit || 'EA',
        unit_price: prices[l.id] || 0,
      }));

      const { error: linesError } = await supabase.from('purchase_order_lines').insert(poLines as any);
      if (linesError) throw linesError;

      // Update PR status
      const newStatus = isPartial ? 'partially_ordered' : 'fully_ordered';
      await supabase.from('purchase_requests').update({ status: newStatus } as any).eq('id', pr.id);

      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order Created', description: `${poNumber} created from ${pr.pr_number}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Convert PR to Purchase Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* PR Info */}
          <Card><CardContent className="p-3">
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><span className="text-muted-foreground">PR:</span> <strong>{pr?.pr_number}</strong></div>
              <div><span className="text-muted-foreground">Requester:</span> <strong>{pr?.requester_name || '-'}</strong></div>
              <div><span className="text-muted-foreground">Department:</span> <strong>{pr?.department || '-'}</strong></div>
              <div><span className="text-muted-foreground">Required:</span> <strong>{pr?.required_date || '-'}</strong></div>
            </div>
          </CardContent></Card>

          {/* Vendor Selection */}
          <div>
            <Label className="text-xs font-semibold">Select Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choose a vendor..." /></SelectTrigger>
              <SelectContent>
                {vendors.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.card_code} - {v.card_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partial Fulfillment Notice */}
          {isPartial && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Partial fulfillment — PR will be marked as "Partially Ordered"
              </span>
            </div>
          )}

          {/* Line Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs w-20">PR Qty</TableHead>
                <TableHead className="text-xs w-24">PO Qty</TableHead>
                <TableHead className="text-xs w-28">Unit Price</TableHead>
                <TableHead className="text-xs w-24 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prLines.map(line => (
                <TableRow key={line.id} className={!selectedLines[line.id] ? 'opacity-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={!!selectedLines[line.id]}
                      onCheckedChange={v => setSelectedLines(s => ({ ...s, [line.id]: !!v }))}
                    />
                  </TableCell>
                  <TableCell className="text-xs font-mono">{line.item_code || '-'}</TableCell>
                  <TableCell className="text-xs">{line.item_description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{line.quantity}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={quantities[line.id] || 0}
                      onChange={e => setQuantities(q => ({ ...q, [line.id]: parseFloat(e.target.value) || 0 }))}
                      className="h-7 text-xs w-20"
                      min={0}
                      max={line.quantity}
                      disabled={!selectedLines[line.id]}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={prices[line.id] || 0}
                      onChange={e => setPrices(p => ({ ...p, [line.id]: parseFloat(e.target.value) || 0 }))}
                      className="h-7 text-xs w-24"
                      min={0}
                      disabled={!selectedLines[line.id]}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {((quantities[line.id] || 0) * (prices[line.id] || 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={6} className="text-right text-xs">Total PO Value</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(totalValue)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !vendorId || selectedItems.length === 0}>
            <ArrowRight className="h-4 w-4 mr-1" />
            {creating ? 'Creating...' : `Create PO (${selectedItems.length} items)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
