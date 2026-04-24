import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, BarChart3, AlertTriangle, Package, RefreshCw, Plus } from 'lucide-react';
import { useSalesForecasts, useItemReorderConfig } from '@/hooks/useSalesForecasting';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SalesForecastingPage() {
  const { t } = useLanguage();
  const { forecasts, isLoading, generateForecast } = useSalesForecasts();
  const { configs, upsertConfig } = useItemReorderConfig();
  const [forecastDialog, setForecastDialog] = useState(false);
  const [reorderDialog, setReorderDialog] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [method, setMethod] = useState<'sma' | 'ema'>('sma');
  const [periods, setPeriods] = useState(3);
  const [reorderForm, setReorderForm] = useState({ item_code: '', item_description: '', warehouse: '', avg_daily_usage: 0, max_daily_usage: 0, avg_lead_time_days: 0, max_lead_time_days: 0, economic_order_qty: 0 });

  // Forecast trend chart data
  const forecastItems = useMemo(() => {
    const map: Record<string, any[]> = {};
    (forecasts || []).forEach(f => {
      if (!map[f.item_code]) map[f.item_code] = [];
      map[f.item_code].push(f);
    });
    return map;
  }, [forecasts]);

  const itemCodes = Object.keys(forecastItems);
  const [selectedItem, setSelectedItem] = useState('');
  const chartItem = selectedItem || itemCodes[0] || '';
  const chartData = (forecastItems[chartItem] || [])
    .sort((a, b) => a.forecast_date.localeCompare(b.forecast_date))
    .map(f => ({
      date: f.forecast_date,
      forecast: f.forecasted_qty,
      actual: f.actual_qty,
      confidence: f.confidence_level,
    }));

  // Reorder alerts
  const reorderAlerts = (configs || []).filter(c => {
    // Items where current stock might be below reorder point (simplified check)
    return c.safety_stock > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Forecasting & Safety Stock</h1>
          <p className="text-muted-foreground">Time-series analysis with automated reorder points</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={forecastDialog} onOpenChange={setForecastDialog}>
            <DialogTrigger asChild><Button><TrendingUp className="h-4 w-4 mr-2" /> Generate Forecast</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate Sales Forecast</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Item Code</Label><Input value={itemCode} onChange={e => setItemCode(e.target.value)} placeholder="e.g. A00001" /></div>
                <div>
                  <Label>Method</Label>
                  <Select value={method} onValueChange={v => setMethod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sma">Simple Moving Average (SMA)</SelectItem>
                      <SelectItem value="ema">Exponential Moving Average (EMA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Periods</Label><Input type="number" value={periods} onChange={e => setPeriods(+e.target.value)} min={2} max={12} /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => { generateForecast.mutate({ itemCode, method, periods }); setForecastDialog(false); }} disabled={generateForecast.isPending || !itemCode}>
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={reorderDialog} onOpenChange={setReorderDialog}>
            <DialogTrigger asChild><Button variant="outline"><Package className="h-4 w-4 mr-2" /> Set Reorder Point</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Configure Reorder Point</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Item Code</Label><Input value={reorderForm.item_code} onChange={e => setReorderForm({ ...reorderForm, item_code: e.target.value })} /></div>
                  <div><Label>{t('common.description')}</Label><Input value={reorderForm.item_description} onChange={e => setReorderForm({ ...reorderForm, item_description: e.target.value })} /></div>
                </div>
                <div><Label>Warehouse</Label><Input value={reorderForm.warehouse} onChange={e => setReorderForm({ ...reorderForm, warehouse: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Avg Daily Usage</Label><Input type="number" value={reorderForm.avg_daily_usage} onChange={e => setReorderForm({ ...reorderForm, avg_daily_usage: +e.target.value })} /></div>
                  <div><Label>Max Daily Usage</Label><Input type="number" value={reorderForm.max_daily_usage} onChange={e => setReorderForm({ ...reorderForm, max_daily_usage: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Avg Lead Time (days)</Label><Input type="number" value={reorderForm.avg_lead_time_days} onChange={e => setReorderForm({ ...reorderForm, avg_lead_time_days: +e.target.value })} /></div>
                  <div><Label>Max Lead Time (days)</Label><Input type="number" value={reorderForm.max_lead_time_days} onChange={e => setReorderForm({ ...reorderForm, max_lead_time_days: +e.target.value })} /></div>
                </div>
                <div><Label>Economic Order Qty</Label><Input type="number" value={reorderForm.economic_order_qty} onChange={e => setReorderForm({ ...reorderForm, economic_order_qty: +e.target.value })} /></div>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-sm">
                    <p><strong>Safety Stock</strong> = (Max Usage × Max Lead) - (Avg Usage × Avg Lead)</p>
                    <p className="font-bold mt-1">
                      = ({reorderForm.max_daily_usage} × {reorderForm.max_lead_time_days}) - ({reorderForm.avg_daily_usage} × {reorderForm.avg_lead_time_days})
                      = <span className="text-primary">{(reorderForm.max_daily_usage * reorderForm.max_lead_time_days - reorderForm.avg_daily_usage * reorderForm.avg_lead_time_days).toFixed(2)}</span>
                    </p>
                    <p className="mt-2"><strong>Reorder Point</strong> = (Avg Usage × Avg Lead) + Safety Stock
                      = <span className="text-primary">{(reorderForm.avg_daily_usage * reorderForm.avg_lead_time_days + reorderForm.max_daily_usage * reorderForm.max_lead_time_days - reorderForm.avg_daily_usage * reorderForm.avg_lead_time_days).toFixed(2)}</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
              <DialogFooter>
                <Button onClick={() => { upsertConfig.mutate(reorderForm); setReorderDialog(false); }} disabled={!reorderForm.item_code}>{t('common.save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Forecasted Items</div>
          <div className="text-2xl font-bold">{itemCodes.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Forecasts</div>
          <div className="text-2xl font-bold">{forecasts.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Reorder Configs</div>
          <div className="text-2xl font-bold">{configs.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Reorder Alerts</div>
          <div className="text-2xl font-bold text-yellow-600">{reorderAlerts.length}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="forecasts">
        <TabsList>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Points</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts" className="space-y-4">
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Forecast Trend: {chartItem}</CardTitle>
                {itemCodes.length > 1 && (
                  <Select value={chartItem} onValueChange={setSelectedItem}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {itemCodes.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" strokeWidth={2} name="Forecasted Qty" />
                      <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} name="Actual Qty" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Forecast Qty</TableHead>
                    <TableHead>Actual Qty</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.slice(0, 50).map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.item_code}</TableCell>
                      <TableCell>{f.forecast_date}</TableCell>
                      <TableCell><Badge variant="outline">{f.forecast_method?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="font-medium">{(f.forecasted_qty || 0).toFixed(1)}</TableCell>
                      <TableCell>{f.actual_qty != null ? f.actual_qty.toFixed(1) : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={f.confidence_level >= 80 ? 'default' : 'secondary'}>{(f.confidence_level || 0).toFixed(0)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {forecasts.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Generate your first forecast above</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Avg Daily Use</TableHead>
                    <TableHead>Max Daily Use</TableHead>
                    <TableHead>Avg Lead (days)</TableHead>
                    <TableHead>Max Lead (days)</TableHead>
                    <TableHead>Safety Stock</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>EOQ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.item_code}</TableCell>
                      <TableCell>{c.warehouse || '-'}</TableCell>
                      <TableCell>{c.avg_daily_usage}</TableCell>
                      <TableCell>{c.max_daily_usage}</TableCell>
                      <TableCell>{c.avg_lead_time_days}</TableCell>
                      <TableCell>{c.max_lead_time_days}</TableCell>
                      <TableCell className="font-bold text-yellow-600">{(c.safety_stock || 0).toFixed(1)}</TableCell>
                      <TableCell className="font-bold text-primary">{(c.reorder_point || 0).toFixed(1)}</TableCell>
                      <TableCell>{c.economic_order_qty || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {configs.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No reorder configurations set</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
