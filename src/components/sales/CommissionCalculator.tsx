import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Trophy, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const COMMISSION_RATE = 0.03; // 3% default

export function CommissionCalculator() {
  const { data: salesOrders = [] } = useQuery({
    queryKey: ['commission-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('sales_orders').select('id, total, status, created_by, customer_name').limit(1000);
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['commission-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, email').limit(100);
      return data || [];
    },
  });

  const commissionData = useMemo(() => {
    const repMap: Record<string, { name: string; sales: number; orders: number }> = {};

    salesOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      const userId = o.created_by || 'unknown';
      if (!repMap[userId]) {
        const profile = profiles.find(p => p.user_id === userId);
        repMap[userId] = { name: profile?.full_name || profile?.email || 'Unknown Rep', sales: 0, orders: 0 };
      }
      repMap[userId].sales += o.total || 0;
      repMap[userId].orders++;
    });

    return Object.entries(repMap)
      .map(([id, data]) => ({
        id,
        ...data,
        commission: data.sales * COMMISSION_RATE,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [salesOrders, profiles]);

  const totalCommission = commissionData.reduce((s, r) => s + r.commission, 0);
  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Sales Rep Commission ({(COMMISSION_RATE * 100).toFixed(0)}% rate)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={commissionData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Bar dataKey="commission" name="Commission" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-sm text-muted-foreground">No sales data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Commission Summary
            <Badge variant="secondary" className="text-[10px]">Total: SAR {fmt(totalCommission)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Sales Rep</th>
                <th className="text-right p-2">Orders</th>
                <th className="text-right p-2">Sales</th>
                <th className="text-right p-2">Commission</th>
              </tr>
            </thead>
            <tbody>
              {commissionData.map((rep, i) => (
                <tr key={rep.id} className="border-t hover:bg-accent/30">
                  <td className="p-2 font-medium flex items-center gap-1">
                    {i === 0 && <Trophy className="h-3 w-3 text-amber-500" />}
                    {rep.name}
                  </td>
                  <td className="p-2 text-right">{rep.orders}</td>
                  <td className="p-2 text-right font-mono">{fmt(rep.sales)}</td>
                  <td className="p-2 text-right font-mono font-bold text-primary">{fmt(rep.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
