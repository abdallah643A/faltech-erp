import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useCashPositions } from '@/hooks/useBankTreasury';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { Link } from 'react-router-dom';

export default function CashPositionDashboardPage() {
  const { data: positions = [], isLoading } = useCashPositions();

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const summary = useMemo(() => {
    const latestByAccount = new Map<string, any>();
    positions.forEach((p: any) => {
      const key = p.bank_account_id || p.account_number || 'main';
      const existing = latestByAccount.get(key);
      if (!existing || p.snapshot_date > existing.snapshot_date) latestByAccount.set(key, p);
    });
    const latest = Array.from(latestByAccount.values());
    return {
      total: latest.reduce((s, p) => s + Number(p.closing_balance || 0), 0),
      available: latest.reduce((s, p) => s + Number(p.available_balance || 0), 0),
      pendingIn: latest.reduce((s, p) => s + Number(p.pending_inflows || 0), 0),
      pendingOut: latest.reduce((s, p) => s + Number(p.pending_outflows || 0), 0),
      accounts: latest,
    };
  }, [positions]);

  const trend = useMemo(() => {
    const byDate = new Map<string, number>();
    positions.forEach((p: any) => {
      byDate.set(p.snapshot_date, (byDate.get(p.snapshot_date) || 0) + Number(p.closing_balance || 0));
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, balance]) => ({ date: format(parseISO(date), 'MMM dd'), balance }));
  }, [positions]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Position Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time consolidated cash & liquidity view</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/banking/forecast-scenarios">Forecast Scenarios</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/banking/payment-optimization">Optimize Payments</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Wallet className="h-4 w-4 text-primary"/>Total Balance</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">SAR {fmt(summary.total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Available</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">SAR {fmt(summary.available)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600"/>Pending Inflows</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold text-green-600">SAR {fmt(summary.pendingIn)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600"/>Pending Outflows</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-semibold text-red-600">SAR {fmt(summary.pendingOut)}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">30-Day Cash Trend</CardTitle></CardHeader>
          <CardContent>
            {trend.length === 0 ? <EmptyChartState message="No cash position snapshots yet" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                  <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Balance by Account</CardTitle></CardHeader>
          <CardContent>
            {summary.accounts.length === 0 ? <EmptyChartState message="No bank accounts tracked" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.accounts.map((a: any) => ({ name: a.bank_name || a.account_number || 'Account', balance: Number(a.closing_balance || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                  <Bar dataKey="balance" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Account Snapshots ({summary.accounts.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> :
            summary.accounts.length === 0 ? <p className="text-sm text-muted-foreground">No snapshots recorded.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2">Bank</th><th>Account</th><th>Currency</th>
                    <th className="text-right">Closing</th><th className="text-right">Available</th>
                    <th className="text-right">Pending In</th><th className="text-right">Pending Out</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.accounts.map((a: any) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="py-2">{a.bank_name || '—'}</td>
                      <td className="font-mono text-xs">{a.account_number || '—'}</td>
                      <td><Badge variant="outline" className="text-[10px]">{a.currency}</Badge></td>
                      <td className="text-right font-medium">{fmt(Number(a.closing_balance || 0))}</td>
                      <td className="text-right text-green-600">{fmt(Number(a.available_balance || 0))}</td>
                      <td className="text-right">{fmt(Number(a.pending_inflows || 0))}</td>
                      <td className="text-right">{fmt(Number(a.pending_outflows || 0))}</td>
                      <td className="text-xs text-muted-foreground">{a.snapshot_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
