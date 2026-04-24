import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PredictiveCollections() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: scores = [] } = useQuery({
    queryKey: ['pred-collections', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('predictive_collection_scores' as any).select('*').order('risk_score', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const high = scores.filter((s: any) => s.risk_level === 'high');
  const medium = scores.filter((s: any) => s.risk_level === 'medium');
  const totalAtRisk = high.reduce((s: number, r: any) => s + (r.invoice_amount || 0), 0);

  const riskColor = (l: string) => l === 'high' ? 'destructive' : l === 'medium' ? 'default' : 'secondary';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" />Predictive Collections</h1>
        <p className="text-muted-foreground">AI-estimated payment risk and recommended collection actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'High Risk Invoices', value: high.length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Medium Risk', value: medium.length, icon: Clock, color: 'text-orange-600' },
          { label: 'Total At Risk', value: `${(totalAtRisk / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-primary' },
          { label: 'Scored Invoices', value: scores.length, icon: TrendingUp, color: 'text-green-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className={`h-4 w-4 ${s.color}`} /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Collection Risk Scores</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead><TableHead>Invoice</TableHead><TableHead>{t('common.amount')}</TableHead><TableHead>Days Overdue</TableHead><TableHead>Risk Score</TableHead><TableHead>Risk Level</TableHead><TableHead>Predicted Pay</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {scores.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.customer_name || '—'}</TableCell>
                  <TableCell className="text-sm">{s.invoice_number || '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{Number(s.invoice_amount || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={s.days_overdue > 60 ? 'destructive' : 'outline'}>{s.days_overdue}d</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={Math.min(100, (s.risk_score || 0) * 100)} className="w-16" /><span className="text-sm font-bold">{Math.round((s.risk_score || 0) * 100)}%</span></div></TableCell>
                  <TableCell><Badge variant={riskColor(s.risk_level)}>{s.risk_level}</Badge></TableCell>
                  <TableCell className="text-sm">{s.predicted_pay_date || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{s.recommended_action || '—'}</TableCell>
                </TableRow>
              ))}
              {scores.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No predictive scores generated yet. The system will analyze AR invoices automatically.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
