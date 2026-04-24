import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatSAR } from '@/lib/currency';

const SECTION_KEYS = ['revenue', 'cost_of_sales', 'gross_profit', 'operating_expenses', 'ebitda', 'depreciation', 'operating_profit', 'other_income', 'finance_cost', 'net_profit_before_tax', 'tax', 'net_profit'];
const SECTION_LABELS: Record<string, string> = {
  revenue: 'Revenue', cost_of_sales: 'Cost of Sales', gross_profit: 'Gross Profit',
  operating_expenses: 'Operating Expenses', ebitda: 'EBITDA', depreciation: 'D&A',
  operating_profit: 'Operating Profit', other_income: 'Other Income', finance_cost: 'Finance Cost',
  net_profit_before_tax: 'Net Profit Before Tax', tax: 'Tax', net_profit: 'Net Profit After Tax',
};
const CALCULATED = new Set(['gross_profit', 'ebitda', 'operating_profit', 'net_profit_before_tax', 'net_profit']);

function computeCalc(key: string, monthData: Record<string, number>): number {
  const g = (k: string) => monthData[k] || 0;
  if (key === 'gross_profit') return g('revenue') - g('cost_of_sales');
  if (key === 'ebitda') return g('revenue') - g('cost_of_sales') - g('operating_expenses');
  if (key === 'operating_profit') return g('revenue') - g('cost_of_sales') - g('operating_expenses') - g('depreciation');
  if (key === 'net_profit_before_tax') return g('revenue') - g('cost_of_sales') - g('operating_expenses') - g('depreciation') + g('other_income') - g('finance_cost');
  if (key === 'net_profit') return g('revenue') - g('cost_of_sales') - g('operating_expenses') - g('depreciation') + g('other_income') - g('finance_cost') - g('tax');
  return g(key);
}

export function PLMonthlyView({ monthlyData }: { monthlyData: Record<string, Record<string, number>> }) {
  const months = Object.keys(monthlyData).sort();
  const fmt = (n: number) => {
    if (Math.abs(n) < 0.01) return '—';
    const formatted = formatSAR(Math.abs(n));
    return n < 0 ? `(${formatted})` : formatted;
  };

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px]">P&L Line</TableHead>
            {months.map(m => (
              <TableHead key={m} className="text-right min-w-[120px]">
                {new Date(m + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' })}
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[120px] font-bold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SECTION_KEYS.map(key => {
            const isCalc = CALCULATED.has(key);
            const total = months.reduce((sum, m) => sum + computeCalc(key, monthlyData[m] || {}), 0);
            return (
              <TableRow key={key} className={cn(isCalc && 'bg-primary/5 font-bold border-t')}>
                <TableCell className={cn('sticky left-0 bg-background z-10 text-sm', isCalc && 'bg-primary/5 font-bold text-primary')}>
                  {SECTION_LABELS[key]}
                </TableCell>
                {months.map(m => {
                  const val = computeCalc(key, monthlyData[m] || {});
                  return (
                    <TableCell key={m} className={cn('text-right font-mono text-xs', val < 0 && 'text-destructive', isCalc && 'font-bold')}>
                      {fmt(val)}
                    </TableCell>
                  );
                })}
                <TableCell className={cn('text-right font-mono text-xs font-bold', total < 0 && 'text-destructive')}>
                  {fmt(total)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
