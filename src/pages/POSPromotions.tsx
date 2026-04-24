import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePOSPromotions, usePromotionRules, usePromotionConditions, usePromotionUsage } from '@/hooks/usePOSPromotions';
import { Plus, Tag, Percent, ShoppingCart, Clock, Users, Check, X, Pause, Play, BarChart3, Settings2, Gift, Zap } from 'lucide-react';
import { format } from 'date-fns';

const PROMO_TYPES = [
  { value: 'bogo', label: 'Buy One Get One', icon: Gift },
  { value: 'bundle', label: 'Bundle Pricing', icon: ShoppingCart },
  { value: 'category_discount', label: 'Category Discount', icon: Tag },
  { value: 'item_discount', label: 'Item Discount', icon: Percent },
  { value: 'time_based', label: 'Time-Based', icon: Clock },
  { value: 'customer_segment', label: 'Customer Segment', icon: Users },
  { value: 'min_basket', label: 'Min Basket Value', icon: ShoppingCart },
  { value: 'cashback', label: 'Cashback', icon: Zap },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'secondary', pending_approval: 'outline', approved: 'default', active: 'default', paused: 'secondary', expired: 'destructive', cancelled: 'destructive',
};

export default function POSPromotions() {
  const { promotions, isLoading, createPromotion, updatePromotion, deletePromotion, approvePromotion } = usePOSPromotions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '', description: '', promotion_type: 'item_discount' as string, priority: 10,
    start_date: new Date().toISOString().slice(0, 16), end_date: '', min_basket_value: 0,
    max_uses_total: 0, max_uses_per_customer: 0, is_combinable: false, customer_segment: '',
  });

  const selected = promotions.find((p: any) => p.id === selectedId);
  const { rules, upsertRule, deleteRule } = usePromotionRules(selectedId || undefined);
  const { conditions, upsertCondition } = usePromotionConditions(selectedId || undefined);
  const { usage } = usePromotionUsage(selectedId || undefined);

  const handleCreate = () => {
    const payload: any = { ...newPromo, status: 'draft' };
    if (!payload.end_date) delete payload.end_date;
    if (!payload.max_uses_total) delete payload.max_uses_total;
    if (!payload.max_uses_per_customer) delete payload.max_uses_per_customer;
    if (!payload.customer_segment) delete payload.customer_segment;
    createPromotion.mutate(payload, { onSuccess: () => { setShowCreate(false); setNewPromo({ name: '', description: '', promotion_type: 'item_discount', priority: 10, start_date: new Date().toISOString().slice(0, 16), end_date: '', min_basket_value: 0, max_uses_total: 0, max_uses_per_customer: 0, is_combinable: false, customer_segment: '' }); } });
  };

  const activeCount = promotions.filter((p: any) => p.status === 'active').length;
  const totalUsage = promotions.reduce((sum: number, p: any) => sum + (p.current_uses || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-primary" /> POS Promotion Engine</h1>
          <p className="text-muted-foreground">BOGO, bundles, category discounts, time-based, segment offers, and approval controls</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Promotion</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Promotion</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div><Label>Name</Label><Input value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Summer Sale 20% Off" /></div>
              <div><Label>Description</Label><Textarea value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={newPromo.promotion_type} onValueChange={v => setNewPromo(p => ({ ...p, promotion_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROMO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="datetime-local" value={newPromo.start_date} onChange={e => setNewPromo(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date (optional)</Label><Input type="datetime-local" value={newPromo.end_date} onChange={e => setNewPromo(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Priority (lower = higher)</Label><Input type="number" value={newPromo.priority} onChange={e => setNewPromo(p => ({ ...p, priority: Number(e.target.value) }))} /></div>
                <div><Label>Min Basket Value</Label><Input type="number" value={newPromo.min_basket_value} onChange={e => setNewPromo(p => ({ ...p, min_basket_value: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max Uses Total</Label><Input type="number" value={newPromo.max_uses_total} onChange={e => setNewPromo(p => ({ ...p, max_uses_total: Number(e.target.value) }))} placeholder="0 = unlimited" /></div>
                <div><Label>Max Uses/Customer</Label><Input type="number" value={newPromo.max_uses_per_customer} onChange={e => setNewPromo(p => ({ ...p, max_uses_per_customer: Number(e.target.value) }))} placeholder="0 = unlimited" /></div>
              </div>
              <div><Label>Customer Segment (optional)</Label><Input value={newPromo.customer_segment} onChange={e => setNewPromo(p => ({ ...p, customer_segment: e.target.value }))} placeholder="e.g. VIP, Gold, Wholesale" /></div>
              <div className="flex items-center gap-2"><Switch checked={newPromo.is_combinable} onCheckedChange={v => setNewPromo(p => ({ ...p, is_combinable: v }))} /><Label>Can combine with other promotions</Label></div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!newPromo.name || createPromotion.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-primary/10"><Tag className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Promotions</p><p className="text-2xl font-bold">{promotions.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-green-100"><Play className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{activeCount}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Pending Approval</p><p className="text-2xl font-bold">{promotions.filter((p: any) => p.status === 'pending_approval').length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-4"><div className="p-3 rounded-full bg-blue-100"><BarChart3 className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Uses</p><p className="text-2xl font-bold">{totalUsage}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Promotions List */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Promotions</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {promotions.map((p: any) => {
              const TypeIcon = PROMO_TYPES.find(t => t.value === p.promotion_type)?.icon || Tag;
              return (
                <div key={p.id} onClick={() => setSelectedId(p.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                    <Badge variant={STATUS_COLORS[p.status] as any || 'secondary'}>{p.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {PROMO_TYPES.find(t => t.value === p.promotion_type)?.label} · Priority: {p.priority}
                  </div>
                </div>
              );
            })}
            {promotions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No promotions yet</p>}
          </CardContent>
        </Card>

        {/* Right: Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <Tabs defaultValue="rules">
              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="rules"><Settings2 className="h-4 w-4 mr-1" /> Rules</TabsTrigger>
                  <TabsTrigger value="conditions"><Clock className="h-4 w-4 mr-1" /> Conditions</TabsTrigger>
                  <TabsTrigger value="usage"><BarChart3 className="h-4 w-4 mr-1" /> Usage</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  {selected.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updatePromotion.mutate({ id: selected.id, status: 'pending_approval' })}>Submit for Approval</Button>}
                  {selected.status === 'pending_approval' && <Button size="sm" onClick={() => approvePromotion.mutate(selected.id)}><Check className="h-3 w-3 mr-1" /> Approve</Button>}
                  {selected.status === 'approved' && <Button size="sm" onClick={() => updatePromotion.mutate({ id: selected.id, status: 'active' })}><Play className="h-3 w-3 mr-1" /> Activate</Button>}
                  {selected.status === 'active' && <Button size="sm" variant="outline" onClick={() => updatePromotion.mutate({ id: selected.id, status: 'paused' })}><Pause className="h-3 w-3 mr-1" /> Pause</Button>}
                  {selected.status === 'paused' && <Button size="sm" onClick={() => updatePromotion.mutate({ id: selected.id, status: 'active' })}><Play className="h-3 w-3 mr-1" /> Resume</Button>}
                </div>
              </div>

              <TabsContent value="rules">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Discount Rules</CardTitle>
                    <Button size="sm" onClick={() => upsertRule.mutate({ rule_type: 'percent_off', discount_percent: 10, buy_quantity: 1, get_quantity: 1 })}><Plus className="h-3 w-3 mr-1" /> Add Rule</Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Rule Type</TableHead><TableHead>Buy Item/Group</TableHead><TableHead>Buy Qty</TableHead>
                        <TableHead>Get Item/Group</TableHead><TableHead>Get Qty</TableHead><TableHead>Discount</TableHead><TableHead>Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {rules.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Select value={r.rule_type} onValueChange={v => upsertRule.mutate({ id: r.id, rule_type: v })}>
                                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                                  <SelectItem value="percent_off">% Off</SelectItem>
                                  <SelectItem value="fixed_off">Fixed Off</SelectItem>
                                  <SelectItem value="fixed_price">Fixed Price</SelectItem>
                                  <SelectItem value="bundle_price">Bundle Price</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input value={r.buy_item_code || r.buy_item_group || ''} onChange={e => upsertRule.mutate({ id: r.id, buy_item_code: e.target.value })} placeholder="Item/Group" className="w-24" /></TableCell>
                            <TableCell><Input type="number" value={r.buy_quantity} onChange={e => upsertRule.mutate({ id: r.id, buy_quantity: Number(e.target.value) })} className="w-16" /></TableCell>
                            <TableCell><Input value={r.get_item_code || r.get_item_group || ''} onChange={e => upsertRule.mutate({ id: r.id, get_item_code: e.target.value })} placeholder="Item/Group" className="w-24" /></TableCell>
                            <TableCell><Input type="number" value={r.get_quantity} onChange={e => upsertRule.mutate({ id: r.id, get_quantity: Number(e.target.value) })} className="w-16" /></TableCell>
                            <TableCell>
                              {r.rule_type === 'percent_off' && <Input type="number" value={r.discount_percent} onChange={e => upsertRule.mutate({ id: r.id, discount_percent: Number(e.target.value) })} className="w-20" />}
                              {r.rule_type === 'fixed_off' && <Input type="number" value={r.discount_amount} onChange={e => upsertRule.mutate({ id: r.id, discount_amount: Number(e.target.value) })} className="w-20" />}
                              {r.rule_type === 'fixed_price' && <Input type="number" value={r.fixed_price || 0} onChange={e => upsertRule.mutate({ id: r.id, fixed_price: Number(e.target.value) })} className="w-20" />}
                              {r.rule_type === 'bundle_price' && <Input type="number" value={r.bundle_price || 0} onChange={e => upsertRule.mutate({ id: r.id, bundle_price: Number(e.target.value) })} className="w-20" />}
                              {r.rule_type === 'buy_x_get_y' && <span className="text-xs text-muted-foreground">Free</span>}
                            </TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(r.id)}><X className="h-3 w-3" /></Button></TableCell>
                          </TableRow>
                        ))}
                        {rules.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">Add rules to define how this promotion applies</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="conditions">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Conditions</CardTitle>
                    <Button size="sm" onClick={() => upsertCondition.mutate({ condition_type: 'time_window' })}><Plus className="h-3 w-3 mr-1" /> Add Condition</Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Time Start</TableHead><TableHead>Time End</TableHead><TableHead>Days</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {conditions.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Select value={c.condition_type} onValueChange={v => upsertCondition.mutate({ id: c.id, condition_type: v })}>
                                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="time_window">Time Window</SelectItem>
                                  <SelectItem value="day_of_week">Day of Week</SelectItem>
                                  <SelectItem value="customer_segment">Customer Segment</SelectItem>
                                  <SelectItem value="payment_method">Payment Method</SelectItem>
                                  <SelectItem value="min_quantity">Min Quantity</SelectItem>
                                  <SelectItem value="min_amount">Min Amount</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input type="time" value={c.time_start || ''} onChange={e => upsertCondition.mutate({ id: c.id, time_start: e.target.value })} className="w-24" /></TableCell>
                            <TableCell><Input type="time" value={c.time_end || ''} onChange={e => upsertCondition.mutate({ id: c.id, time_end: e.target.value })} className="w-24" /></TableCell>
                            <TableCell><Input value={(c.days_of_week || []).join(',')} onChange={e => upsertCondition.mutate({ id: c.id, days_of_week: e.target.value.split(',').map(Number).filter(Boolean) })} placeholder="1,2,3" className="w-20" /></TableCell>
                            <TableCell><Input value={c.segment_value || c.min_value || ''} onChange={e => upsertCondition.mutate({ id: c.id, segment_value: e.target.value, min_value: Number(e.target.value) || null })} placeholder="Value" className="w-24" /></TableCell>
                          </TableRow>
                        ))}
                        {conditions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No conditions. Promotion applies universally.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Usage History ({usage.length})</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead className="text-right">Discount</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {usage.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>{format(new Date(u.used_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell>{u.customer_name || u.customer_code || '—'}</TableCell>
                            <TableCell>{u.invoice_number || '—'}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">-{(u.discount_applied || 0).toFixed(2)} SAR</TableCell>
                          </TableRow>
                        ))}
                        {usage.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No usage recorded yet</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Promotion Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Name</Label><Input value={selected.name} onChange={e => updatePromotion.mutate({ id: selected.id, name: e.target.value })} /></div>
                      <div><Label>Priority</Label><Input type="number" value={selected.priority} onChange={e => updatePromotion.mutate({ id: selected.id, priority: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Description</Label><Textarea value={selected.description || ''} onChange={e => updatePromotion.mutate({ id: selected.id, description: e.target.value })} /></div>
                    <div className="flex items-center gap-2"><Switch checked={selected.is_combinable} onCheckedChange={v => updatePromotion.mutate({ id: selected.id, is_combinable: v })} /><Label>Combinable with other promotions</Label></div>
                    <div className="pt-4 border-t"><Button variant="destructive" size="sm" onClick={() => { deletePromotion.mutate(selected.id); setSelectedId(null); }}>Delete Promotion</Button></div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Tag className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>Select a promotion or create a new one</p></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
