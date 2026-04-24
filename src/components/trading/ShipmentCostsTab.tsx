import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatSAR } from '@/lib/currency';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit, DollarSign, AlertTriangle, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const COST_TYPES = [
  'Ocean Freight', 'Air Freight', 'Insurance', 'Customs Duty', 'Origin Charges',
  'Destination Charges', 'Inland Transport', 'Port Handling', 'Documentation Fee',
  'Inspection Fee', 'Bank Charges', 'Other',
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  'Ocean Freight': 'Freight', 'Air Freight': 'Freight',
  'Insurance': 'Insurance', 'Customs Duty': 'Customs',
  'Origin Charges': 'Handling', 'Destination Charges': 'Handling',
  'Inland Transport': 'Freight', 'Port Handling': 'Handling',
  'Documentation Fee': 'Other', 'Inspection Fee': 'Other',
  'Bank Charges': 'Banking', 'Other': 'Other',
};

const ALLOCATION_METHODS = ['By Value', 'By Weight', 'By Volume', 'Equal Split'];

interface CostForm {
  cost_type: string;
  vendor_name: string;
  description: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  paid: boolean;
  paid_date: string;
  invoice_reference: string;
  notes: string;
}

const emptyCostForm: CostForm = {
  cost_type: 'Ocean Freight', vendor_name: '', description: '', amount: 0,
  currency: 'SAR', exchange_rate: 1, paid: false, paid_date: '', invoice_reference: '', notes: '',
};

interface ShipmentCostsTabProps {
  shipmentId: string;
  shipment: any;
  purchaseOrders: any[];
  salesOrders: any[];
}

export function ShipmentCostsTab({ shipmentId, shipment, purchaseOrders, salesOrders }: ShipmentCostsTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [costFormOpen, setCostFormOpen] = useState(false);
  const [editCostId, setEditCostId] = useState<string | null>(null);
  const [costForm, setCostForm] = useState<CostForm>(emptyCostForm);
  const [allocationMethod, setAllocationMethod] = useState('By Value');

  // Fetch costs
  const { data: costs = [] } = useQuery({
    queryKey: ['shipment-costs', shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_costs')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked PO total
  const linkedPO = shipment?.purchase_order_id
    ? purchaseOrders.find((po: any) => po.id === shipment.purchase_order_id)
    : null;

  const { data: poDetail } = useQuery({
    queryKey: ['po-detail-for-cost', shipment?.purchase_order_id],
    queryFn: async () => {
      if (!shipment?.purchase_order_id) return null;
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_name, total, currency')
        .eq('id', shipment.purchase_order_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!shipment?.purchase_order_id,
  });

  const { data: soDetail } = useQuery({
    queryKey: ['so-detail-for-cost', shipment?.sales_order_id],
    queryFn: async () => {
      if (!shipment?.sales_order_id) return null;
      const { data, error } = await supabase
        .from('sales_orders')
        .select('id, doc_num, customer_name, total, currency')
        .eq('id', shipment.sales_order_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!shipment?.sales_order_id,
  });

  // Save cost
  const saveCostMutation = useMutation({
    mutationFn: async (data: CostForm) => {
      const payload: any = {
        shipment_id: shipmentId,
        cost_type: data.cost_type,
        cost_category: TYPE_TO_CATEGORY[data.cost_type] || 'Other',
        vendor_name: data.vendor_name || null,
        description: data.description || null,
        amount: data.amount || 0,
        currency: data.currency || 'SAR',
        exchange_rate: data.exchange_rate || 1,
        paid: data.paid,
        paid_date: data.paid_date || null,
        invoice_reference: data.invoice_reference || null,
        notes: data.notes || null,
      };
      if (editCostId) {
        const { error } = await supabase.from('shipment_costs').update(payload).eq('id', editCostId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from('shipment_costs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-costs', shipmentId] });
      toast.success(editCostId ? 'Cost updated' : 'Cost added');
      setCostFormOpen(false);
      setEditCostId(null);
      setCostForm(emptyCostForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipment_costs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-costs', shipmentId] });
      toast.success('Cost deleted');
    },
  });

  const openEditCost = (c: any) => {
    setCostForm({
      cost_type: c.cost_type || 'Other',
      vendor_name: c.vendor_name || '',
      description: c.description || '',
      amount: c.amount || 0,
      currency: c.currency || 'SAR',
      exchange_rate: c.exchange_rate || 1,
      paid: c.paid || false,
      paid_date: c.paid_date || '',
      invoice_reference: c.invoice_reference || '',
      notes: c.notes || '',
    });
    setEditCostId(c.id);
    setCostFormOpen(true);
  };

  // Category totals
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    costs.forEach((c: any) => {
      const cat = c.cost_category || 'Other';
      map[cat] = (map[cat] || 0) + (c.amount_home_currency || c.amount * (c.exchange_rate || 1));
    });
    return map;
  }, [costs]);

  const totalCosts = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  // Profit calculation
  const productCost = poDetail?.total || 0;
  const saleAmount = soDetail?.total || 0;
  const landedCost = productCost + totalCosts;
  const grossProfit = saleAmount - landedCost;
  const marginPercent = saleAmount > 0 ? (grossProfit / saleAmount) * 100 : 0;
  const hasBothLinked = !!poDetail && !!soDetail;
  const allCostsPaid = costs.length > 0 && costs.every((c: any) => c.paid);
  const isDelivered = shipment?.status === 'Delivered';
  const profitStatus = isDelivered && allCostsPaid ? 'Actual' : 'Estimated';

  return (
    <div className="space-y-6">
      {/* Costs Table */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Shipment Costs</h3>
        <Button size="sm" onClick={() => { setCostForm(emptyCostForm); setEditCostId(null); setCostFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Cost
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Home (SAR)</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No costs added yet</TableCell></TableRow>
              ) : costs.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{c.cost_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{c.vendor_name || '—'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{c.description || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{formatSAR(c.amount)}</TableCell>
                  <TableCell className="text-xs">{c.currency}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatSAR(c.amount_home_currency)}</TableCell>
                  <TableCell>
                    {c.paid ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEditCost(c)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteCostMutation.mutate(c.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Summary */}
      {costs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Summary (SAR)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total {cat}:</span>
                <span className="font-mono">{formatSAR(amt)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>TOTAL SHIPMENT COSTS:</span>
              <span className="font-mono text-lg">{formatSAR(totalCosts)} SAR</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profit Calculation */}
      {hasBothLinked && (
        <Card className={`border-2 ${grossProfit < 0 ? 'border-red-500/50' : marginPercent < 5 ? 'border-yellow-500/50' : 'border-green-500/30'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Profit Calculation
              <Badge variant="outline" className="text-xs ml-auto">{profitStatus}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground">Purchase Order ({poDetail?.po_number})</p>
                <p className="text-xs text-muted-foreground">{poDetail?.vendor_name}</p>
              </div>
              <p className="text-right font-mono">{formatSAR(productCost)} SAR</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-muted-foreground">+ Shipment Costs</p>
              <p className="text-right font-mono">{formatSAR(totalCosts)} SAR</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 font-semibold">
              <p>LANDED COST</p>
              <p className="text-right font-mono">{formatSAR(landedCost)} SAR</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground">Sales Order (SO-{soDetail?.doc_num})</p>
                <p className="text-xs text-muted-foreground">{soDetail?.customer_name}</p>
              </div>
              <p className="text-right font-mono">{formatSAR(saleAmount)} SAR</p>
            </div>
            <Separator />
            <div className={`grid grid-cols-2 gap-2 font-bold text-lg ${grossProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
              <p>GROSS PROFIT</p>
              <p className="text-right font-mono">{formatSAR(grossProfit)} SAR</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-muted-foreground">Margin %</p>
              <p className={`text-right font-bold ${marginPercent < 0 ? 'text-red-600' : marginPercent < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                {marginPercent.toFixed(2)}%
              </p>
            </div>

            {grossProfit < 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" /> <strong>LOSS</strong> — Review pricing. Landed cost exceeds sale amount.
              </div>
            )}
            {grossProfit >= 0 && marginPercent < 5 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" /> <strong>Low margin</strong> — Consider reviewing shipment costs or pricing.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Allocation (placeholder for multi-SO) */}
      {costs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Allocation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-xs">Allocation Method</Label>
                <Select value={allocationMethod} onValueChange={setAllocationMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {shipment?.sales_order_id && soDetail && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Allocation %</TableHead>
                    <TableHead className="text-right">Allocated Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">SO-{soDetail.doc_num}</TableCell>
                    <TableCell>{soDetail.customer_name}</TableCell>
                    <TableCell className="text-right font-mono">{formatSAR(soDetail.total)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatSAR(totalCosts)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
            {!shipment?.sales_order_id && (
              <p className="text-sm text-muted-foreground">Link a Sales Order to allocate costs.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Cost Dialog */}
      <Dialog open={costFormOpen} onOpenChange={o => { if (!o) { setCostFormOpen(false); setEditCostId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCostId ? 'Edit Cost' : 'Add Cost'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost Type</Label>
                <Select value={costForm.cost_type} onValueChange={v => setCostForm(f => ({ ...f, cost_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Input value={TYPE_TO_CATEGORY[costForm.cost_type] || 'Other'} disabled className="bg-muted" />
              </div>
            </div>
            <div><Label>Vendor</Label><Input value={costForm.vendor_name} onChange={e => setCostForm(f => ({ ...f, vendor_name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={costForm.description} onChange={e => setCostForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Amount</Label><Input type="number" value={costForm.amount} onChange={e => setCostForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Currency</Label>
                <Select value={costForm.currency} onValueChange={v => setCostForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Exchange Rate</Label><Input type="number" step="0.0001" value={costForm.exchange_rate} onChange={e => setCostForm(f => ({ ...f, exchange_rate: parseFloat(e.target.value) || 1 }))} /></div>
            </div>
            <div className="text-sm text-muted-foreground">
              Home currency amount: <strong>{formatSAR(costForm.amount * costForm.exchange_rate)} SAR</strong>
            </div>
            <div><Label>Invoice Reference</Label><Input value={costForm.invoice_reference} onChange={e => setCostForm(f => ({ ...f, invoice_reference: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <Checkbox checked={costForm.paid} onCheckedChange={v => setCostForm(f => ({ ...f, paid: !!v }))} id="cost-paid" />
              <Label htmlFor="cost-paid">Paid</Label>
              {costForm.paid && (
                <Input type="date" className="w-40" value={costForm.paid_date} onChange={e => setCostForm(f => ({ ...f, paid_date: e.target.value }))} />
              )}
            </div>
            <div><Label>Notes</Label><Textarea value={costForm.notes} onChange={e => setCostForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCostFormOpen(false); setEditCostId(null); }}>Cancel</Button>
            <Button onClick={() => saveCostMutation.mutate(costForm)} disabled={saveCostMutation.isPending}>
              {saveCostMutation.isPending ? 'Saving...' : editCostId ? 'Update' : 'Add Cost'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
