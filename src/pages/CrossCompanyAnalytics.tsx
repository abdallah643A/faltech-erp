import { useQuery } from '@tanstack/react-query';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, TrendingUp, DollarSign, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CrossCompanyAnalytics() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { data: snapshots = [] } = useQuery({
    queryKey: ['cross-company-snapshots', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('cross_company_snapshots' as any).select('*').order('snapshot_date', { ascending: false }).limit(50) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const latest = snapshots.reduce((acc: any[], s: any) => {
    if (!acc.find((a: any) => a.company_name === s.company_name)) acc.push(s);
    return acc;
  }, []);

  const totalRevenue = latest.reduce((s: number, c: any) => s + (c.revenue || 0), 0);
  const totalHeadcount = latest.reduce((s: number, c: any) => s + (c.headcount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />Cross-Company Analytics</h1>
        <p className="text-muted-foreground">Compare performance across companies and branches</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Companies', value: latest.length, icon: Building2 },
          { label: 'Total Revenue', value: `${(totalRevenue / 1e6).toFixed(1)}M`, icon: DollarSign },
          { label: 'Total Headcount', value: totalHeadcount, icon: Users },
          { label: 'Avg GP%', value: latest.length > 0 ? `${Math.round(latest.reduce((s: number, c: any) => s + (c.revenue > 0 ? (c.gross_profit / c.revenue) * 100 : 0), 0) / latest.length)}%` : '—', icon: TrendingUp },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      {latest.length > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="text-sm">Revenue & Gross Profit Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={latest}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="company_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                <Bar dataKey="gross_profit" name="Gross Profit" fill="hsl(var(--primary) / 0.6)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader><CardTitle className="text-sm">Company Comparison</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Revenue</TableHead><TableHead>Gross Profit</TableHead><TableHead>Overdue AR</TableHead><TableHead>Payroll</TableHead><TableHead>Cash</TableHead><TableHead>Headcount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {latest.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.company_name || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{Number(c.revenue || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm">{Number(c.gross_profit || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm text-red-600">{Number(c.overdue_ar || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm">{Number(c.payroll_cost || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm">{Number(c.cash_position || 0).toLocaleString()}</TableCell>
                  <TableCell>{c.headcount}</TableCell>
                </TableRow>
              ))}
              {latest.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cross-company snapshots available</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
