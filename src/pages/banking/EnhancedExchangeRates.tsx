import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ArrowRight, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'pair', header: 'Pair' },
  { key: 'notional', header: 'Notional' },
  { key: 'fwd_rate', header: 'Fwd Rate' },
  { key: 'maturity', header: 'Maturity' },
  { key: 'unrealized_g_l', header: 'Unrealized G/L' },
  { key: 'currency', header: 'Currency' },
  { key: 'open_balance', header: 'Open Balance' },
  { key: 'book_rate', header: 'Book Rate' },
  { key: 'current_rate', header: 'Current Rate' },
  { key: 'fx_g_l_sar', header: 'FX G/L (SAR)' },
];


export default function EnhancedExchangeRates() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('live');
  const [selectedPair, setSelectedPair] = useState('USD/SAR');

  const currencyPairs = ['USD/SAR', 'EUR/SAR', 'GBP/SAR', 'JPY/SAR', 'AED/SAR', 'CHF/SAR'];

  // Live rates
  const liveRates = [
    { pair: 'USD/SAR', rate: 3.7500, change: 0.0012, changePercent: 0.03, source: 'ECB', updated: '2 min ago' },
    { pair: 'EUR/SAR', rate: 4.0850, change: -0.0045, changePercent: -0.11, source: 'Bloomberg', updated: '1 min ago' },
    { pair: 'GBP/SAR', rate: 4.7200, change: 0.0098, changePercent: 0.21, source: 'OANDA', updated: '3 min ago' },
    { pair: 'JPY/SAR', rate: 0.0250, change: -0.0001, changePercent: -0.40, source: 'ECB', updated: '5 min ago' },
    { pair: 'AED/SAR', rate: 1.0210, change: 0.0000, changePercent: 0.00, source: 'Bloomberg', updated: '1 min ago' },
  ];

  // Historical data (30 days)
  const historicalData = Array.from({ length: 30 }, (_, i) => ({
    date: `Mar ${i + 1}`,
    rate: 3.7500 + (Math.sin(i / 5) * 0.02) + (Math.random() - 0.5) * 0.01,
    volume: Math.round(50000 + Math.random() * 30000),
  }));

  // Forward contracts
  const forwardContracts = [
    { id: '1', pair: 'USD/SAR', type: 'Buy', notional: 500000, forwardRate: 3.7550, spotAtInception: 3.7500, maturity: '2026-06-15', status: 'Active', unrealizedGL: 2500 },
    { id: '2', pair: 'EUR/SAR', type: 'Sell', notional: 200000, forwardRate: 4.0900, spotAtInception: 4.0850, maturity: '2026-04-30', status: 'Active', unrealizedGL: -1000 },
    { id: '3', pair: 'GBP/SAR', type: 'Buy', notional: 100000, forwardRate: 4.7100, spotAtInception: 4.7200, maturity: '2026-05-20', status: 'Active', unrealizedGL: 1000 },
    { id: '4', pair: 'USD/SAR', type: 'Sell', notional: 300000, forwardRate: 3.7480, spotAtInception: 3.7450, maturity: '2026-03-25', status: 'Maturing', unrealizedGL: -900 },
  ];

  // Revaluation data
  const revaluationItems = [
    { currency: 'USD', openBalance: 250000, bookRate: 3.7450, currentRate: 3.7500, fxGL: 1250, type: 'gain' },
    { currency: 'EUR', openBalance: 85000, bookRate: 4.0900, currentRate: 4.0850, fxGL: -425, type: 'loss' },
    { currency: 'GBP', openBalance: 45000, bookRate: 4.7100, currentRate: 4.7200, fxGL: 450, type: 'gain' },
    { currency: 'JPY', openBalance: 5000000, bookRate: 0.0252, currentRate: 0.0250, fxGL: -1000, type: 'loss' },
  ];

  const totalUnrealizedGL = forwardContracts.reduce((s, c) => s + c.unrealizedGL, 0);
  const totalRevalGL = revaluationItems.reduce((s, r) => s + r.fxGL, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enhanced Exchange Rates</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="enhanced-exchange-rates" title="Enhanced Exchange Rates" />
          <p className="text-sm text-muted-foreground">Live rates, forward contracts, and FX revaluation</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="live"><RefreshCw className="h-3 w-3 mr-1" /> Live Rates</TabsTrigger>
          <TabsTrigger value="history"><Calendar className="h-3 w-3 mr-1" /> History</TabsTrigger>
          <TabsTrigger value="forwards"><ArrowRight className="h-3 w-3 mr-1" /> Forwards</TabsTrigger>
          <TabsTrigger value="revaluation"><ArrowUpDown className="h-3 w-3 mr-1" /> Revaluation</TabsTrigger>
        </TabsList>

        {/* Live Rates */}
        <TabsContent value="live" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Multi-source real-time rates (ECB, Bloomberg, OANDA)</p>
            <Button size="sm" variant="outline"><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveRates.map(r => (
              <Card key={r.pair} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm">{r.pair}</span>
                    <Badge variant="outline" className="text-[9px]">{r.source}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{r.rate.toFixed(4)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {r.changePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${r.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{r.updated}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rate Alert Config */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rate Alerts</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Currency Pair</label>
                  <Select defaultValue="USD/SAR">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencyPairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <label className="text-xs text-muted-foreground">Threshold %</label>
                  <Input type="number" defaultValue="0.5" step="0.1" />
                </div>
                <Button size="sm"><AlertTriangle className="h-3 w-3 mr-1" /> Set Alert</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historical */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencyPairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline">7D</Button>
            <Button size="sm" variant="outline">30D</Button>
            <Button size="sm" variant="outline">90D</Button>
            <Button size="sm" variant="default">1Y</Button>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{selectedPair} Historical Rate</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="url(#rateGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rate Variance Impact on Payments</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={historicalData.slice(0, 14)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="volume" name="Payment Volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forward Contracts */}
        <TabsContent value="forwards" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Notional</p>
                <p className="text-lg font-bold">{forwardContracts.reduce((s, c) => s + c.notional, 0).toLocaleString()} SAR</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unrealized G/L</p>
                <p className={`text-lg font-bold ${totalUnrealizedGL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalUnrealizedGL >= 0 ? '+' : ''}{totalUnrealizedGL.toLocaleString()} SAR
                </p>
              </div>
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Contract</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs">Pair</th>
                    <th className="text-left p-3 text-xs">{t('common.type')}</th>
                    <th className="text-right p-3 text-xs">Notional</th>
                    <th className="text-right p-3 text-xs">Fwd Rate</th>
                    <th className="text-left p-3 text-xs">Maturity</th>
                    <th className="text-left p-3 text-xs">{t('common.status')}</th>
                    <th className="text-right p-3 text-xs">Unrealized G/L</th>
                  </tr>
                </thead>
                <tbody>
                  {forwardContracts.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{c.pair}</td>
                      <td className="p-3"><Badge variant={c.type === 'Buy' ? 'default' : 'outline'} className="text-[10px]">{c.type}</Badge></td>
                      <td className="p-3 text-right text-xs">{c.notional.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-xs">{c.forwardRate.toFixed(4)}</td>
                      <td className="p-3 text-xs">{c.maturity}</td>
                      <td className="p-3"><Badge variant={c.status === 'Active' ? 'default' : 'destructive'} className="text-[10px]">{c.status}</Badge></td>
                      <td className={`p-3 text-right text-xs font-mono ${c.unrealizedGL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {c.unrealizedGL >= 0 ? '+' : ''}{c.unrealizedGL.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revaluation */}
        <TabsContent value="revaluation" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total FX Revaluation G/L</p>
              <p className={`text-xl font-bold ${totalRevalGL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalRevalGL >= 0 ? '+' : ''}{totalRevalGL.toLocaleString()} SAR
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Generate GL Entries</Button>
              <Button size="sm">Run Revaluation</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs">Currency</th>
                    <th className="text-right p-3 text-xs">Open Balance</th>
                    <th className="text-right p-3 text-xs">Book Rate</th>
                    <th className="text-right p-3 text-xs">Current Rate</th>
                    <th className="text-right p-3 text-xs">FX G/L (SAR)</th>
                    <th className="text-left p-3 text-xs">{t('common.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {revaluationItems.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-xs">{r.currency}</td>
                      <td className="p-3 text-right text-xs">{r.openBalance.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-xs">{r.bookRate.toFixed(4)}</td>
                      <td className="p-3 text-right font-mono text-xs">{r.currentRate.toFixed(4)}</td>
                      <td className={`p-3 text-right font-mono text-xs ${r.fxGL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {r.fxGL >= 0 ? '+' : ''}{r.fxGL.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge variant={r.type === 'gain' ? 'default' : 'destructive'} className="text-[10px]">{r.type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Plus(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
}
