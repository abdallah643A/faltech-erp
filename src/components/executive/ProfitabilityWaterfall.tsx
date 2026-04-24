import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface Props { isAr?: boolean }

/**
 * ProfitabilityWaterfall — PR2
 * Revenue → COGS → Gross Profit → Opex → EBITDA → Tax → Net Income.
 * Pulls from journal_entry_lines aggregated via account_code prefix conventions:
 *   4xxx revenue, 5xxx COGS, 6xxx Opex, 7xxx Tax/Other.
 */
export function ProfitabilityWaterfall({ isAr = false }: Props) {
  const { activeCompanyId } = useActiveCompany();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = now.toISOString();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['profitability-waterfall', activeCompanyId, start, end],
    queryFn: async () => {
      let q = supabase
        .from('journal_entry_lines' as any)
        .select('account_code, debit_amount, credit_amount, posting_date')
        .gte('posting_date', start)
        .lte('posting_date', end);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!activeCompanyId,
  });

  const buckets = useMemo(() => {
    let revenue = 0, cogs = 0, opex = 0, tax = 0;
    for (const r of rows) {
      const code = String(r.account_code || '');
      const debit = Number(r.debit_amount || 0);
      const credit = Number(r.credit_amount || 0);
      if (code.startsWith('4')) revenue += credit - debit;
      else if (code.startsWith('5')) cogs += debit - credit;
      else if (code.startsWith('6')) opex += debit - credit;
      else if (code.startsWith('7')) tax += debit - credit;
    }
    const grossProfit = revenue - cogs;
    const ebitda = grossProfit - opex;
    const netIncome = ebitda - tax;
    return { revenue, cogs, grossProfit, opex, ebitda, tax, netIncome };
  }, [rows]);

  // Build waterfall data with running totals for stacked floating bars
  const data = useMemo(() => {
    const steps = [
      { name: isAr ? 'الإيرادات' : 'Revenue', value: buckets.revenue, kind: 'positive' as const },
      { name: isAr ? 'تكلفة المبيعات' : 'COGS', value: -buckets.cogs, kind: 'negative' as const },
      { name: isAr ? 'الربح الإجمالي' : 'Gross Profit', value: buckets.grossProfit, kind: 'subtotal' as const, absolute: true },
      { name: isAr ? 'المصاريف التشغيلية' : 'Opex', value: -buckets.opex, kind: 'negative' as const },
      { name: isAr ? 'EBITDA' : 'EBITDA', value: buckets.ebitda, kind: 'subtotal' as const, absolute: true },
      { name: isAr ? 'الضرائب' : 'Tax/Other', value: -buckets.tax, kind: 'negative' as const },
      { name: isAr ? 'صافي الدخل' : 'Net Income', value: buckets.netIncome, kind: 'subtotal' as const, absolute: true },
    ];
    let running = 0;
    return steps.map((s) => {
      if (s.absolute) {
        const out = { name: s.name, base: 0, bar: s.value, kind: s.kind, displayValue: s.value };
        running = s.value;
        return out;
      }
      const start = running;
      const next = running + s.value;
      const base = Math.min(start, next);
      const bar = Math.abs(s.value);
      running = next;
      return { name: s.name, base, bar, kind: s.kind, displayValue: s.value };
    });
  }, [buckets, isAr]);

  const colorFor = (kind: string) =>
    kind === 'positive' ? 'hsl(142 76% 36%)'
    : kind === 'negative' ? 'hsl(0 72% 51%)'
    : 'hsl(var(--primary))';

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />{isAr ? 'شلال الربحية (الشهر الحالي)' : 'Profitability Waterfall (MTD)'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جارِ التحميل...' : 'Loading...'}</p>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(_v, _n, p: any) => fmt(p.payload.displayValue)} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="base" stackId="w" fill="transparent" />
                  <Bar dataKey="bar" stackId="w">
                    {data.map((d, i) => <Cell key={i} fill={colorFor(d.kind)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <Stat label={isAr ? 'الإيرادات' : 'Revenue'} value={fmt(buckets.revenue)} />
              <Stat label={isAr ? 'الربح الإجمالي' : 'Gross Profit'} value={fmt(buckets.grossProfit)} />
              <Stat label="EBITDA" value={fmt(buckets.ebitda)} />
              <Stat label={isAr ? 'صافي الدخل' : 'Net Income'} value={fmt(buckets.netIncome)} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 border rounded">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
