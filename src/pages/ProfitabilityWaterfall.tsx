import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfitabilityWaterfall() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();

  const { data: records = [] } = useQuery({
    queryKey: ['profitability-waterfall', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('profitability_waterfall_data' as any).select('*').order('period_start', { ascending: false }).limit(20) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const latest = records[0];
  const waterfallData = latest ? [
    { name: 'Revenue', value: latest.revenue, color: 'hsl(var(--primary))' },
    { name: 'Discounts', value: -(latest.discount_impact || 0), color: '#ef4444' },
    { name: 'COGS', value: -(latest.cogs || 0), color: '#f97316' },
    { name: 'Procurement Var.', value: -(latest.procurement_variance || 0), color: '#eab308' },
    { name: 'Payroll', value: -(latest.payroll_allocation || 0), color: '#8b5cf6' },
    { name: 'Overhead', value: -(latest.overhead || 0), color: '#6b7280' },
    { name: 'Project Overruns', value: -(latest.project_overruns || 0), color: '#dc2626' },
    { name: 'Net Margin', value: latest.net_margin, color: '#22c55e' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-6 w-6" />Profitability Waterfall</h1>
        <p className="text-muted-foreground">Revenue-to-net-margin breakdown showing each cost component impact</p>
      </div>

      {waterfallData.length > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="text-sm">Current Period Waterfall</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => Number(v).toLocaleString()} />
                <Bar dataKey="value" name="Amount">
                  {waterfallData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader><CardTitle className="text-sm">Period Data</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Period</TableHead><TableHead>Revenue</TableHead><TableHead>Discounts</TableHead><TableHead>COGS</TableHead><TableHead>Payroll</TableHead><TableHead>Overhead</TableHead><TableHead>Net Margin</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{r.period_start} — {r.period_end}</TableCell>
                  <TableCell className="font-mono text-sm">{Number(r.revenue || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm text-red-600">({Number(r.discount_impact || 0).toLocaleString()})</TableCell>
                  <TableCell className="font-mono text-sm">({Number(r.cogs || 0).toLocaleString()})</TableCell>
                  <TableCell className="font-mono text-sm">({Number(r.payroll_allocation || 0).toLocaleString()})</TableCell>
                  <TableCell className="font-mono text-sm">({Number(r.overhead || 0).toLocaleString()})</TableCell>
                  <TableCell className="font-mono text-sm font-bold text-green-600">{Number(r.net_margin || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No profitability data available</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
