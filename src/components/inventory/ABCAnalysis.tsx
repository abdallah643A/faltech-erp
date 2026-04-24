import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Package } from 'lucide-react';

const ABC_COLORS = {
  A: 'hsl(var(--primary))',
  B: 'hsl(var(--chart-2))',
  C: 'hsl(var(--chart-4))',
};

export function ABCAnalysis() {
  const { data: items = [] } = useQuery({
    queryKey: ['abc-items'],
    queryFn: async () => {
      const { data } = await supabase.from('items').select('id, item_code, item_description, on_hand, unit_price, item_group').limit(1000);
      return (data || []) as any[];
    },
  });

  const { classification, chartData, summary } = useMemo(() => {
    // Calculate inventory value for each item
    const valued = items
      .map((i: any) => ({
        ...i,
        item_name: i.item_description || i.item_code,
        value: (i.on_hand || 0) * (i.unit_price || 0),
      }))
      .sort((a, b) => b.value - a.value);

    const totalValue = valued.reduce((s, i) => s + i.value, 0);
    let cumValue = 0;

    const classified = valued.map(item => {
      cumValue += item.value;
      const cumPct = totalValue > 0 ? (cumValue / totalValue) * 100 : 0;
      const cls: 'A' | 'B' | 'C' = cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C';
      return { ...item, class: cls, cumPct };
    });

    const summary = {
      A: { count: classified.filter(i => i.class === 'A').length, value: classified.filter(i => i.class === 'A').reduce((s, i) => s + i.value, 0) },
      B: { count: classified.filter(i => i.class === 'B').length, value: classified.filter(i => i.class === 'B').reduce((s, i) => s + i.value, 0) },
      C: { count: classified.filter(i => i.class === 'C').length, value: classified.filter(i => i.class === 'C').reduce((s, i) => s + i.value, 0) },
    };

    const chartData = [
      { name: 'A (Critical)', value: summary.A.count, inventoryValue: summary.A.value },
      { name: 'B (Important)', value: summary.B.count, inventoryValue: summary.B.value },
      { name: 'C (Standard)', value: summary.C.count, inventoryValue: summary.C.value },
    ].filter(d => d.value > 0);

    return { classification: classified, chartData, summary };
  }, [items]);

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            ABC Classification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} label={({ name, percent }) => `${name.charAt(0)} ${(percent * 100).toFixed(0)}%`}>
                  {chartData.map((_, i) => <Cell key={i} fill={Object.values(ABC_COLORS)[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {(['A', 'B', 'C'] as const).map(cls => (
                <div key={cls} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ABC_COLORS[cls] }} />
                    <span className="text-xs font-medium">Class {cls}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{summary[cls].count} items</p>
                    <p className="text-[10px] text-muted-foreground">SAR {fmt(summary[cls].value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Top Class A Items (Critical)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Value</th>
                <th className="text-center p-2">Class</th>
              </tr>
            </thead>
            <tbody>
              {classification.filter(i => i.class === 'A').slice(0, 10).map(item => (
                <tr key={item.id} className="border-t hover:bg-accent/30">
                  <td className="p-2">
                    <p className="font-medium truncate max-w-[180px]">{item.item_name || item.item_code}</p>
                    <p className="text-[10px] text-muted-foreground">{item.item_code}</p>
                  </td>
                  <td className="p-2 text-right font-mono">{item.on_hand}</td>
                  <td className="p-2 text-right font-mono font-bold">SAR {fmt(item.value)}</td>
                  <td className="p-2 text-center">
                    <Badge className="text-[10px] bg-primary/10 text-primary">A</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
