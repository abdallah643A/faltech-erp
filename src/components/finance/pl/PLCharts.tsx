import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PLSection } from '@/hooks/useProfitLossData';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#6366f1'];

function getVal(sections: PLSection[], key: string): number {
  return sections.find(s => s.key === key)?.amount || 0;
}

export function PLCharts({ sections, monthlyData }: { sections: PLSection[]; monthlyData?: Record<string, Record<string, number>> }) {
  const revenue = getVal(sections, 'revenue');
  const cogs = getVal(sections, 'cost_of_sales');
  const grossProfit = getVal(sections, 'gross_profit');
  const opEx = getVal(sections, 'operating_expenses');
  const depreciation = getVal(sections, 'depreciation');
  const otherIncome = getVal(sections, 'other_income');
  const financeCost = getVal(sections, 'finance_cost');
  const tax = getVal(sections, 'tax');
  const netProfit = getVal(sections, 'net_profit');

  // Waterfall data
  const waterfall = [
    { name: 'Revenue', value: revenue, fill: 'hsl(var(--primary))' },
    { name: 'COGS', value: -cogs, fill: 'hsl(var(--destructive))' },
    { name: 'Gross Profit', value: grossProfit, fill: '#10b981' },
    { name: 'OpEx', value: -opEx, fill: '#f59e0b' },
    { name: 'D&A', value: -depreciation, fill: '#8b5cf6' },
    { name: 'Other', value: otherIncome, fill: '#06b6d4' },
    { name: 'Finance', value: -financeCost, fill: '#ec4899' },
    { name: 'Tax', value: -tax, fill: '#6366f1' },
    { name: 'Net Profit', value: netProfit, fill: netProfit >= 0 ? '#10b981' : 'hsl(var(--destructive))' },
  ];

  // Expense breakdown
  const expenses = sections
    .filter(s => s.type === 'normal' && s.key !== 'revenue' && s.key !== 'other_income' && s.amount > 0)
    .map((s, i) => ({ name: s.label, value: s.amount, fill: COLORS[i % COLORS.length] }));

  // Monthly trend
  const months = monthlyData ? Object.keys(monthlyData).sort() : [];
  const monthlyTrend = months.map(m => ({
    month: m.substring(5),
    revenue: monthlyData?.[m]?.revenue || 0,
    grossProfit: (monthlyData?.[m]?.revenue || 0) - (monthlyData?.[m]?.cost_of_sales || 0),
    opEx: monthlyData?.[m]?.operating_expenses || 0,
  }));

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Waterfall */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue to Net Profit Waterfall</CardTitle></CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfall}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfall.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expense donut */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={expenses} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2}>
                {expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly trend */}
      {monthlyTrend.length > 1 && (
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue & Gross Profit Trend</CardTitle></CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                <Line type="monotone" dataKey="grossProfit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Gross Profit" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
