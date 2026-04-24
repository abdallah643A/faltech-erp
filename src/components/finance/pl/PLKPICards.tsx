import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Target, Percent } from 'lucide-react';
import { formatSAR, formatSARShort } from '@/lib/currency';
import type { PLSection } from '@/hooks/useProfitLossData';

function getVal(sections: PLSection[], key: string): number {
  return sections.find(s => s.key === key)?.amount || 0;
}

export function PLKPICards({ sections }: { sections: PLSection[] }) {
  const revenue = getVal(sections, 'revenue');
  const grossProfit = getVal(sections, 'gross_profit');
  const opProfit = getVal(sections, 'operating_profit');
  const ebitda = getVal(sections, 'ebitda');
  const netProfit = getVal(sections, 'net_profit');
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const budgetVar = getVal(sections, 'revenue') - (sections.find(s => s.key === 'revenue')?.budgetAmount || 0);

  const cards = [
    { label: 'Total Revenue', value: formatSARShort(revenue), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Gross Profit', value: formatSARShort(grossProfit), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-500/10' },
    { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%`, icon: Percent, color: grossMargin >= 30 ? 'text-green-600' : 'text-amber-600', bg: grossMargin >= 30 ? 'bg-green-500/10' : 'bg-amber-500/10' },
    { label: 'Operating Profit', value: formatSARShort(opProfit), icon: BarChart3, color: opProfit >= 0 ? 'text-green-600' : 'text-destructive', bg: opProfit >= 0 ? 'bg-green-500/10' : 'bg-destructive/10' },
    { label: 'EBITDA', value: formatSARShort(ebitda), icon: Target, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    { label: 'Net Profit', value: formatSARShort(netProfit), icon: netProfit >= 0 ? TrendingUp : TrendingDown, color: netProfit >= 0 ? 'text-green-600' : 'text-destructive', bg: netProfit >= 0 ? 'bg-green-500/10' : 'bg-destructive/10' },
    { label: 'Net Margin', value: `${netMargin.toFixed(1)}%`, icon: PieChart, color: netMargin >= 10 ? 'text-green-600' : 'text-amber-600', bg: netMargin >= 10 ? 'bg-green-500/10' : 'bg-amber-500/10' },
    { label: 'Budget Variance', value: formatSARShort(budgetVar), icon: Target, color: budgetVar >= 0 ? 'text-green-600' : 'text-destructive', bg: budgetVar >= 0 ? 'bg-green-500/10' : 'bg-destructive/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
      {cards.map(c => (
        <Card key={c.label} className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
              <div className={`p-1 rounded ${c.bg}`}><c.icon className={`h-3 w-3 ${c.color}`} /></div>
            </div>
            <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
