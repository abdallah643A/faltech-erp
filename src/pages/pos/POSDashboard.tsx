import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOSDashboardKPIs, usePOSTransactions } from '@/hooks/usePOSData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingCart, RotateCcw, TrendingUp, CreditCard, Banknote, Receipt, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function POSDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: kpis, isLoading } = usePOSDashboardKPIs();
  const { data: recentTxns } = usePOSTransactions({ status: 'completed' });

  const paymentMix = [
    { name: 'Cash', value: kpis?.cashSales || 0 },
    { name: 'Card', value: kpis?.cardSales || 0 },
    { name: 'Other', value: Math.max(0, (kpis?.totalSales || 0) - (kpis?.cashSales || 0) - (kpis?.cardSales || 0)) },
  ].filter(p => p.value > 0);

  const kpiCards = [
    { title: 'Total Sales', value: kpis?.totalSales || 0, icon: DollarSign, color: 'text-green-600' },
    { title: 'Transactions', value: kpis?.transactionCount || 0, icon: ShoppingCart, color: 'text-blue-600', isCurrency: false },
    { title: 'Net Sales', value: kpis?.netSales || 0, icon: TrendingUp, color: 'text-emerald-600' },
    { title: 'Returns', value: kpis?.totalReturns || 0, icon: RotateCcw, color: 'text-red-600' },
    { title: 'Avg Basket', value: kpis?.avgBasket || 0, icon: Receipt, color: 'text-purple-600' },
    { title: 'Discounts', value: kpis?.totalDiscount || 0, icon: DollarSign, color: 'text-orange-600' },
    { title: 'Tax Collected', value: kpis?.totalTax || 0, icon: DollarSign, color: 'text-indigo-600' },
    { title: 'Cash Sales', value: kpis?.cashSales || 0, icon: Banknote, color: 'text-teal-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Today's POS performance overview</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/pos/terminal')} size="lg" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Open Terminal
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <Card key={k.title} className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.title}</p>
                  <p className="text-xl font-bold mt-1">
                    {k.isCurrency === false ? k.value.toLocaleString() : `SAR ${k.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <k.icon className={`h-8 w-8 ${k.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Sales Chart */}
        <Card className="lg:col-span-2 border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis?.hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip formatter={(v: number) => [`SAR ${v.toFixed(2)}`, 'Sales']} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Mix */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {paymentMix.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMix} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`SAR ${v.toFixed(2)}`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-sm">No sales data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pos/transactions')}>View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-2">Receipt #</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-left py-2 px-2">Payment</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {(recentTxns || []).slice(0, 10).map((t: any) => (
                  <tr key={t.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/pos/transactions/${t.id}`)}>
                    <td className="py-2 px-2 font-mono text-xs">{t.receipt_number}</td>
                    <td className="py-2 px-2">{t.customer_name || 'Walk-in'}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{t.payment_method}</Badge></td>
                    <td className="py-2 px-2 text-right font-medium">SAR {Number(t.total_amount || 0).toFixed(2)}</td>
                    <td className="py-2 px-2"><Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className="text-xs">{t.status}</Badge></td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {!recentTxns?.length && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No transactions today</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
