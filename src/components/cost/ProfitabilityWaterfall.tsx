import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { DollarSign } from 'lucide-react';

interface Props {
  projects: any[];
}

export function ProfitabilityWaterfall({ projects }: Props) {
  const totalRevenue = projects.reduce((s, p) => s + (p.budget || 0) * 1.15, 0);
  const directLabor = totalRevenue * 0.35;
  const materials = totalRevenue * 0.25;
  const equipment = totalRevenue * 0.08;
  const subcontractors = totalRevenue * 0.1;
  const overhead = totalRevenue * 0.07;
  const grossProfit = totalRevenue - directLabor - materials - equipment - subcontractors;
  const netProfit = grossProfit - overhead;

  const waterfallData = [
    { name: 'Revenue', value: Math.round(totalRevenue / 1000), type: 'positive' },
    { name: 'Labor', value: -Math.round(directLabor / 1000), type: 'negative' },
    { name: 'Materials', value: -Math.round(materials / 1000), type: 'negative' },
    { name: 'Equipment', value: -Math.round(equipment / 1000), type: 'negative' },
    { name: 'Subcontract', value: -Math.round(subcontractors / 1000), type: 'negative' },
    { name: 'Gross Profit', value: Math.round(grossProfit / 1000), type: 'subtotal' },
    { name: 'Overhead', value: -Math.round(overhead / 1000), type: 'negative' },
    { name: 'Net Profit', value: Math.round(netProfit / 1000), type: 'total' },
  ];

  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Per-project profitability
  const projectProfitability = projects.map(p => {
    const rev = (p.budget || 0) * 1.15;
    const cost = p.actual_cost || p.budget * 0.85;
    const profit = rev - cost;
    return {
      name: p.name,
      revenue: Math.round(rev),
      cost: Math.round(cost),
      profit: Math.round(profit),
      margin: rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0',
    };
  }).sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Profitability Waterfall</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">{(totalRevenue / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Gross Profit</p>
          <p className="text-2xl font-bold text-emerald-600">{(grossProfit / 1000).toFixed(0)}K</p>
          <p className="text-xs text-muted-foreground">{grossMargin}% margin</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{(netProfit / 1000).toFixed(0)}K</p>
          <p className="text-xs text-muted-foreground">{netMargin}% margin</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Projects</p>
          <p className="text-2xl font-bold">{projects.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue to Net Profit Waterfall (K SAR)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => `${val}K SAR`} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, i) => (
                  <Cell key={i} fill={entry.type === 'negative' ? 'hsl(var(--destructive))' : entry.type === 'subtotal' ? 'hsl(var(--chart-2))' : entry.type === 'total' ? 'hsl(var(--primary))' : 'hsl(var(--chart-4))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Project-Level Profitability</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectProfitability.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val: number) => `${val.toLocaleString()} SAR`} />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                {projectProfitability.slice(0, 10).map((entry, i) => (
                  <Cell key={i} fill={entry.profit >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
