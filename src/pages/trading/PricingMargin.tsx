import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, DollarSign, TrendingUp, Percent, Trash2, CheckCircle } from 'lucide-react';
import { useDynamicPriceRules, useMarginAlerts } from '@/hooks/useDynamicPricing';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PricingMarginPage() {
  const { t } = useLanguage();
  const { rules, isLoading, createRule, updateRule, deleteRule } = useDynamicPriceRules();
  const { alerts, resolveAlert } = useMarginAlerts();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', item_code: '', item_group: '', cost_method: 'wac', target_margin_percent: 20, min_margin_percent: 10, markup_percent: 0 });

  const activeAlerts = (alerts || []).filter(a => a.status === 'active');

  const handleCreate = () => {
    createRule.mutate(form);
    setShowCreate(false);
    setForm({ name: '', item_code: '', item_group: '', cost_method: 'wac', target_margin_percent: 20, min_margin_percent: 10, markup_percent: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing & Margin Management</h1>
          <p className="text-muted-foreground">Dynamic price rules with margin protection alerts</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Price Rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Price Rule</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Rule Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Default Margin Rule" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Item Code (optional)</Label><Input value={form.item_code} onChange={e => setForm({ ...form, item_code: e.target.value })} /></div>
                <div><Label>Item Group (optional)</Label><Input value={form.item_group} onChange={e => setForm({ ...form, item_group: e.target.value })} /></div>
              </div>
              <div>
                <Label>Cost Method</Label>
                <Select value={form.cost_method} onValueChange={v => setForm({ ...form, cost_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wac">Weighted Average Cost (WAC)</SelectItem>
                    <SelectItem value="fifo">FIFO</SelectItem>
                    <SelectItem value="lifo">LIFO</SelectItem>
                    <SelectItem value="standard">Standard Cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Target Margin %</Label><Input type="number" value={form.target_margin_percent} onChange={e => setForm({ ...form, target_margin_percent: +e.target.value })} /></div>
                <div><Label>Min Margin %</Label><Input type="number" value={form.min_margin_percent} onChange={e => setForm({ ...form, min_margin_percent: +e.target.value })} /></div>
                <div><Label>Markup %</Label><Input type="number" value={form.markup_percent} onChange={e => setForm({ ...form, markup_percent: +e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={createRule.isPending}>Create Rule</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Active Rules</div>
          <div className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Avg Target Margin</div>
          <div className="text-2xl font-bold text-green-600">
            {rules.length > 0 ? (rules.reduce((s, r) => s + (r.target_margin_percent || 0), 0) / rules.length).toFixed(1) : 0}%
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Active Alerts</div>
          <div className="text-2xl font-bold text-destructive">{activeAlerts.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Cost Methods</div>
          <div className="text-2xl font-bold">{new Set(rules.map(r => r.cost_method)).size}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Price Rules</TabsTrigger>
          <TabsTrigger value="alerts">Margin Alerts ({activeAlerts.length})</TabsTrigger>
          <TabsTrigger value="calculator">Margin Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Item/Group</TableHead>
                    <TableHead>Cost Method</TableHead>
                    <TableHead>Target Margin</TableHead>
                    <TableHead>Min Margin</TableHead>
                    <TableHead>Markup</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.item_code || r.item_group || 'All'}</TableCell>
                      <TableCell><Badge variant="outline">{r.cost_method?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-green-600 font-medium">{r.target_margin_percent}%</TableCell>
                      <TableCell className="text-yellow-600">{r.min_margin_percent}%</TableCell>
                      <TableCell>{r.markup_percent || '-'}%</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => updateRule.mutate({ id: r.id, is_active: !r.is_active })}>
                            {r.is_active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rules.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No price rules configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.item_description || a.item_code}</TableCell>
                      <TableCell>{(a.current_cost || 0).toLocaleString()} SAR</TableCell>
                      <TableCell>{(a.selling_price || 0).toLocaleString()} SAR</TableCell>
                      <TableCell className={a.current_margin_percent < a.threshold_margin_percent ? 'text-destructive font-bold' : 'text-green-600'}>
                        {(a.current_margin_percent || 0).toFixed(1)}%
                      </TableCell>
                      <TableCell>{(a.threshold_margin_percent || 0)}%</TableCell>
                      <TableCell><Badge variant={a.status === 'active' ? 'destructive' : 'secondary'}>{a.status}</Badge></TableCell>
                      <TableCell>
                        {a.status === 'active' && (
                          <Button variant="outline" size="sm" onClick={() => resolveAlert.mutate(a.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {alerts.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No margin alerts</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <MarginCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MarginCalculator() {
  const [cost, setCost] = useState(0);
  const [targetMargin, setTargetMargin] = useState(20);
  const [markup, setMarkup] = useState(0);

  const sellingByMargin = targetMargin < 100 ? cost / (1 - targetMargin / 100) : 0;
  const sellingByMarkup = cost * (1 + markup / 100);
  const actualMarginFromMarkup = sellingByMarkup > 0 ? ((sellingByMarkup - cost) / sellingByMarkup) * 100 : 0;
  const profit = sellingByMargin - cost;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Quick Margin Calculator</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div><Label>Landed Cost (SAR)</Label><Input type="number" value={cost} onChange={e => setCost(+e.target.value)} /></div>
            <div><Label>Target Margin %</Label><Input type="number" value={targetMargin} onChange={e => setTargetMargin(+e.target.value)} /></div>
            <div><Label>Or Markup %</Label><Input type="number" value={markup} onChange={e => setMarkup(+e.target.value)} /></div>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <Card className="bg-muted/50"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Sell Price (by margin)</div>
              <div className="text-2xl font-bold text-green-600">{sellingByMargin.toFixed(2)} SAR</div>
              <div className="text-xs text-muted-foreground">Profit: {profit.toFixed(2)} SAR</div>
            </CardContent></Card>
            <Card className="bg-muted/50"><CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Sell Price (by markup)</div>
              <div className="text-2xl font-bold">{sellingByMarkup.toFixed(2)} SAR</div>
              <div className="text-xs text-muted-foreground">Actual margin: {actualMarginFromMarkup.toFixed(1)}%</div>
            </CardContent></Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
