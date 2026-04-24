import { useState } from 'react';
import { useRestaurantWasteEntries, useRestaurantBranches } from '@/hooks/useRestaurantData';
import { useRestaurantStockConsumption, useRestaurantProcurementSuggestions } from '@/hooks/useRestaurantPhase2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, AlertTriangle, Trash2, TrendingDown, ShoppingCart, Plus, BarChart3 } from 'lucide-react';

export default function RestaurantInventory() {
  const { data: branches } = useRestaurantBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: waste, create: createWaste } = useRestaurantWasteEntries(selectedBranch || undefined);
  const { data: consumption } = useRestaurantStockConsumption(selectedBranch || undefined);
  const { data: suggestions, updateStatus } = useRestaurantProcurementSuggestions(selectedBranch || undefined);
  const [showWaste, setShowWaste] = useState(false);
  const [wasteForm, setWasteForm] = useState({ item_name: '', quantity: '', waste_reason: '', cost_estimate: '', uom: 'kg' });

  const totalWasteCost = (waste || []).reduce((s: number, w: any) => s + Number(w.cost_estimate || 0), 0);
  const totalVariance = (consumption || []).reduce((s: number, c: any) => s + Number(c.variance_cost || 0), 0);
  const criticalSuggestions = (suggestions || []).filter((s: any) => s.urgency === 'critical' || s.urgency === 'high').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Inventory & Waste</h1>
          <p className="text-sm text-muted-foreground">Stock consumption, waste tracking, variance analysis, and procurement suggestions</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>{(branches || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Waste Cost (Period)', value: `SAR ${totalWasteCost.toFixed(2)}`, icon: Trash2, color: 'text-red-600' },
          { label: 'Consumption Variance', value: `SAR ${Math.abs(totalVariance).toFixed(2)}`, icon: BarChart3, color: totalVariance > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Waste Entries', value: (waste || []).length, icon: TrendingDown, color: 'text-orange-600' },
          { label: 'Reorder Alerts', value: criticalSuggestions, icon: AlertTriangle, color: 'text-yellow-600' },
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

      <Tabs defaultValue="waste">
        <TabsList>
          <TabsTrigger value="waste" className="gap-1"><Trash2 className="h-3.5 w-3.5" /> Waste Log</TabsTrigger>
          <TabsTrigger value="consumption" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Consumption Variance</TabsTrigger>
          <TabsTrigger value="procurement" className="gap-1"><ShoppingCart className="h-3.5 w-3.5" /> Procurement</TabsTrigger>
        </TabsList>

        <TabsContent value="waste" className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowWaste(true)}><Plus className="h-4 w-4 mr-1" /> Log Waste</Button>
          </div>
          <Card className="border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-left py-2 px-3">Reason</th>
                  <th className="text-right py-2 px-3">Cost</th>
                </tr></thead>
                <tbody>
                  {(waste || []).map((w: any) => (
                    <tr key={w.id} className="border-b">
                      <td className="py-2 px-3 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-medium">{w.item_name}</td>
                      <td className="py-2 px-3 text-right">{w.quantity} {w.uom || ''}</td>
                      <td className="py-2 px-3 text-xs">{w.waste_reason || '-'}</td>
                      <td className="py-2 px-3 text-right font-bold text-red-600">SAR {Number(w.cost_estimate || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!(waste || []).length && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No waste entries</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption" className="mt-3">
          <Card className="border">
            <CardHeader><CardTitle className="text-sm">Theoretical vs Actual Consumption</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Ingredient</th>
                  <th className="text-right py-2 px-3">Theoretical</th>
                  <th className="text-right py-2 px-3">Actual</th>
                  <th className="text-right py-2 px-3">Variance</th>
                  <th className="text-right py-2 px-3">Theo Cost</th>
                  <th className="text-right py-2 px-3">Actual Cost</th>
                  <th className="text-right py-2 px-3">Var Cost</th>
                </tr></thead>
                <tbody>
                  {(consumption || []).map((c: any) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 px-3 font-medium">{c.ingredient_name}</td>
                      <td className="py-2 px-3 text-right">{Number(c.theoretical_qty).toFixed(2)} {c.uom}</td>
                      <td className="py-2 px-3 text-right">{c.actual_qty != null ? Number(c.actual_qty).toFixed(2) : '-'}</td>
                      <td className="py-2 px-3 text-right"><span className={Number(c.variance_qty || 0) > 0 ? 'text-red-600' : 'text-green-600'}>{Number(c.variance_qty || 0).toFixed(2)}</span></td>
                      <td className="py-2 px-3 text-right">{Number(c.theoretical_cost || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{c.actual_cost != null ? Number(c.actual_cost).toFixed(2) : '-'}</td>
                      <td className="py-2 px-3 text-right font-bold"><span className={Number(c.variance_cost || 0) > 0 ? 'text-red-600' : 'text-green-600'}>SAR {Number(c.variance_cost || 0).toFixed(2)}</span></td>
                    </tr>
                  ))}
                  {!(consumption || []).length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">No consumption records</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="mt-3">
          <Card className="border">
            <CardHeader><CardTitle className="text-sm">Procurement Suggestions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Ingredient</th>
                  <th className="text-right py-2 px-3">Current Stock</th>
                  <th className="text-right py-2 px-3">Par Level</th>
                  <th className="text-right py-2 px-3">Reorder Qty</th>
                  <th className="text-right py-2 px-3">Days of Stock</th>
                  <th className="text-left py-2 px-3">Urgency</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Action</th>
                </tr></thead>
                <tbody>
                  {(suggestions || []).map((s: any) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 px-3 font-medium">{s.ingredient_name}</td>
                      <td className="py-2 px-3 text-right">{Number(s.current_stock || 0).toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{Number(s.par_level || 0).toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-bold">{Number(s.reorder_qty || 0).toFixed(1)}</td>
                      <td className="py-2 px-3 text-right">{Number(s.days_of_stock || 0).toFixed(1)}</td>
                      <td className="py-2 px-3"><Badge variant={s.urgency === 'critical' ? 'destructive' : s.urgency === 'high' ? 'default' : 'outline'} className="text-xs">{s.urgency}</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">{s.status}</Badge></td>
                      <td className="py-2 px-3">
                        {s.status === 'pending' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus.mutate({ id: s.id, status: 'approved' })}>Approve</Button>}
                      </td>
                    </tr>
                  ))}
                  {!(suggestions || []).length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">No procurement suggestions</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Waste Dialog */}
      <Dialog open={showWaste} onOpenChange={setShowWaste}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Waste / Spoilage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item</Label><Input value={wasteForm.item_name} onChange={e => setWasteForm({ ...wasteForm, item_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input type="number" value={wasteForm.quantity} onChange={e => setWasteForm({ ...wasteForm, quantity: e.target.value })} /></div>
              <div><Label>UOM</Label><Input value={wasteForm.uom} onChange={e => setWasteForm({ ...wasteForm, uom: e.target.value })} /></div>
            </div>
            <div><Label>Reason</Label><Input value={wasteForm.waste_reason} onChange={e => setWasteForm({ ...wasteForm, waste_reason: e.target.value })} placeholder="Expired, burnt, spill..." /></div>
            <div><Label>Estimated Cost (SAR)</Label><Input type="number" value={wasteForm.cost_estimate} onChange={e => setWasteForm({ ...wasteForm, cost_estimate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaste(false)}>Cancel</Button>
            <Button onClick={() => {
              createWaste.mutate({ branch_id: selectedBranch || null, ...wasteForm, quantity: parseFloat(wasteForm.quantity) || 0, cost_estimate: parseFloat(wasteForm.cost_estimate) || 0 });
              setShowWaste(false);
              setWasteForm({ item_name: '', quantity: '', waste_reason: '', cost_estimate: '', uom: 'kg' });
            }}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
