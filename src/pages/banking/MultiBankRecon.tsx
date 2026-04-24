import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Landmark, CheckCircle, Clock, AlertTriangle, Eye, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MultiBankRecon() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();

  const { data: statements = [] } = useQuery({
    queryKey: ['multi-bank-statements', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('bank_statements' as any).select('*').order('statement_date', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: statementLines = [] } = useQuery({
    queryKey: ['multi-bank-lines'],
    queryFn: async () => {
      const { data } = await (supabase.from('bank_statement_lines' as any).select('*').limit(1000) as any);
      return (data || []) as any[];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  // Group by bank account
  const bankAccounts = useMemo(() => {
    const groups: Record<string, { statements: any[]; lines: any[]; bank: string }> = {};
    statements.forEach((s: any) => {
      const bank = s.bank_code || s.account_number || 'Unknown Bank';
      if (!groups[bank]) groups[bank] = { statements: [], lines: [], bank };
      groups[bank].statements.push(s);
    });
    statementLines.forEach((l: any) => {
      const stmt = statements.find((s: any) => s.id === l.statement_id);
      const bank = stmt?.bank_code || stmt?.account_number || 'Unknown Bank';
      if (groups[bank]) groups[bank].lines.push(l);
    });
    return Object.values(groups);
  }, [statements, statementLines]);

  const totalLines = statementLines.length;
  const reconciledLines = statementLines.filter((l: any) => l.reconciliation_status === 'matched' || l.reconciliation_status === 'reconciled').length;
  const pendingLines = totalLines - reconciledLines;
  const overallPct = totalLines > 0 ? Math.round((reconciledLines / totalLines) * 100) : 0;

  const chartData = bankAccounts.map(acc => {
    const matched = acc.lines.filter((l: any) => l.reconciliation_status === 'matched' || l.reconciliation_status === 'reconciled').length;
    const unmatched = acc.lines.length - matched;
    return { bank: acc.bank.substring(0, 15), matched, unmatched, total: acc.lines.length };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Multi-Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Consolidated reconciliation status across all bank accounts</p>
        </div>
        <Button size="sm" onClick={() => navigate('/banking/smart-reconciliation')}>
          <Landmark className="h-3 w-3 mr-1" /> Smart Matching
        </Button>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Bank Accounts</p>
            <p className="text-2xl font-bold">{bankAccounts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
            <p className="text-2xl font-bold">{totalLines}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <p className="text-xs text-muted-foreground">Reconciled</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{reconciledLines}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-amber-600" />
              <p className="text-xs text-muted-foreground">{t('common.pending')}</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingLines}</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Reconciliation Progress</span>
            <Badge variant={overallPct === 100 ? 'default' : 'outline'}>{overallPct}%</Badge>
          </div>
          <Progress value={overallPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reconciliation by Bank Account</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bank" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="matched" name="Reconciled" fill="hsl(var(--chart-2))" stackId="a" />
                <Bar dataKey="unmatched" name="Pending" fill="hsl(var(--chart-4))" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bank Account Details */}
      <div className="space-y-4">
        {bankAccounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Landmark className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No bank statements imported yet. Go to Bank Statements to import.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/banking/statements')}>
                Import Statements
              </Button>
            </CardContent>
          </Card>
        ) : (
          bankAccounts.map((acc, i) => {
            const matched = acc.lines.filter((l: any) => l.reconciliation_status === 'matched' || l.reconciliation_status === 'reconciled').length;
            const pct = acc.lines.length > 0 ? Math.round((matched / acc.lines.length) * 100) : 0;
            const totalAmount = acc.lines.reduce((s: number, l: any) => s + Math.abs(l.amount || l.credit || l.debit || 0), 0);
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Landmark className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{acc.bank}</p>
                        <p className="text-xs text-muted-foreground">{acc.statements.length} statement(s) • {acc.lines.length} transactions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">SAR {fmt(totalAmount)}</span>
                      <Badge variant={pct === 100 ? 'default' : pct > 50 ? 'secondary' : 'destructive'} className="text-xs">
                        {pct}% Reconciled
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/banking/reconciliation')}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
