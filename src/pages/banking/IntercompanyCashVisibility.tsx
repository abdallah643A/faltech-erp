import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Camera, Building2, Wallet } from 'lucide-react';
import { useTreasICCash } from '@/hooks/useTreasuryEnhanced';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function IntercompanyCashVisibility() {
  const { data: snapshots = [], snapshot } = useTreasICCash();

  const latest = useMemo(() => {
    if (snapshots.length === 0) return [];
    const latestDate = snapshots[0].snapshot_date;
    return snapshots.filter((s: any) => s.snapshot_date === latestDate);
  }, [snapshots]);

  const totals = useMemo(() => ({
    cash: latest.reduce((s: number, x: any) => s + Number(x.total_cash_base || 0), 0),
    available: latest.reduce((s: number, x: any) => s + Number(x.available_cash || 0), 0),
    restricted: latest.reduce((s: number, x: any) => s + Number(x.restricted_cash || 0), 0),
    icRec: latest.reduce((s: number, x: any) => s + Number(x.ic_receivable || 0), 0),
    icPay: latest.reduce((s: number, x: any) => s + Number(x.ic_payable || 0), 0),
  }), [latest]);

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" />Intercompany Cash Visibility</h1>
          <p className="text-muted-foreground">Group-wide cash position with IC receivables/payables (SAR base)</p>
        </div>
        <Button onClick={() => snapshot.mutate()} disabled={snapshot.isPending}>
          <Camera className="h-4 w-4 mr-2" />{snapshot.isPending ? 'Capturing…' : 'Capture Snapshot'}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Companies</p><p className="text-2xl font-bold">{latest.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Cash (SAR)</p><p className="text-2xl font-bold text-green-600">{fmt(totals.cash)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-bold">{fmt(totals.available)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">IC Receivable</p><p className="text-2xl font-bold text-blue-600">{fmt(totals.icRec)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">IC Payable</p><p className="text-2xl font-bold text-orange-600">{fmt(totals.icPay)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4" />Cash by Entity (Latest)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={latest.map((x: any) => ({ name: x.company_name, cash: x.total_cash_base, available: x.available_cash }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
              <Bar dataKey="cash" fill="hsl(var(--chart-2))" name="Total Cash" />
              <Bar dataKey="available" fill="hsl(var(--chart-1))" name="Available" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Latest Snapshot Detail</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Total Cash</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Restricted</TableHead>
                <TableHead className="text-right">IC Recv</TableHead>
                <TableHead className="text-right">IC Pay</TableHead>
                <TableHead>Accounts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latest.map((x: any) => (
                <TableRow key={x.id}>
                  <TableCell className="font-medium">{x.company_name}</TableCell>
                  <TableCell><Badge variant="outline">{x.currency}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{fmt(x.total_cash)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(x.available_cash)}</TableCell>
                  <TableCell className="text-right font-mono text-orange-600">{fmt(x.restricted_cash)}</TableCell>
                  <TableCell className="text-right font-mono text-blue-600">{fmt(x.ic_receivable)}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{fmt(x.ic_payable)}</TableCell>
                  <TableCell>{x.account_count}</TableCell>
                </TableRow>
              ))}
              {latest.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No snapshots — click "Capture Snapshot"</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
