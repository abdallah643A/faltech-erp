import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useCashierKPIs } from '@/hooks/usePOSChecklists';

export default function CashierProductivity() {
  const { data, isLoading } = useCashierKPIs();
  const rows = data || [];

  const totals = rows.reduce((acc: any, r: any) => ({
    cashiers: acc.cashiers + 1,
    sales: acc.sales + Number(r.total_sales || 0),
    txns: acc.txns + Number(r.transaction_count || 0),
    voids: acc.voids + Number(r.void_count || 0),
  }), { cashiers: 0, sales: 0, txns: 0, voids: 0 });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7 text-primary" />Cashier Productivity KPIs</h1>
        <p className="text-muted-foreground">Per-cashier performance: throughput, basket size, voids, refunds, and variance.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Cashiers</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.cashiers}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Total Sales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.sales.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Transactions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.txns}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Voids</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.voids}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Cashier Leaderboard</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Shifts</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Avg Basket</TableHead>
                  <TableHead className="text-right">Txn/hr</TableHead>
                  <TableHead className="text-right">Voids</TableHead>
                  <TableHead className="text-right">Refunds</TableHead>
                  <TableHead className="text-right">Avg Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.cashier_name || '—'}</TableCell>
                    <TableCell className="text-right">{r.shifts_count}</TableCell>
                    <TableCell className="text-right">{Number(r.total_hours).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{r.transaction_count}</TableCell>
                    <TableCell className="text-right">{Number(r.total_sales).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.avg_basket).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.transactions_per_hour).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{r.void_count > 0 ? <Badge variant="destructive">{r.void_count}</Badge> : '0'}</TableCell>
                    <TableCell className="text-right">{r.refund_count}</TableCell>
                    <TableCell className="text-right"><Badge variant={Math.abs(Number(r.avg_variance)) > 10 ? 'destructive' : 'outline'}>{Number(r.avg_variance).toFixed(2)}</Badge></TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No cashier data available yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
