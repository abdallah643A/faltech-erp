import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialClose } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const ragIcon = (score: number) => {
  if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (score >= 50) return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
};

const ragBg = (score: number) => {
  if (score >= 80) return 'bg-green-50';
  if (score >= 50) return 'bg-amber-50';
  return 'bg-red-50';
};

export default function EntityReadiness() {
  const { periods } = useFinancialClose();

  const { data: companies = [] } = useQuery({
    queryKey: ['close-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('sap_companies').select('id, company_name').eq('is_active', true).order('company_name');
      return data || [];
    },
  });

  // Get latest active period per company
  const activePeriods = periods.filter(p => p.status !== 'completed');
  const latestYear = activePeriods.length ? Math.max(...activePeriods.map(p => p.fiscal_year)) : new Date().getFullYear();
  const latestPeriod = activePeriods.length ? Math.max(...activePeriods.filter(p => p.fiscal_year === latestYear).map(p => p.period_number)) : new Date().getMonth() + 1;

  const entityData = companies.map(c => {
    const period = periods.find(p => p.company_id === c.id && p.fiscal_year === latestYear && p.period_number === latestPeriod);
    return {
      ...c,
      period,
      readiness: period?.readiness_score || 0,
      totalTasks: period?.total_tasks || 0,
      completedTasks: period?.completed_tasks || 0,
      exceptions: period?.exception_count || 0,
      status: period?.status || 'not_started',
    };
  });

  const sortedEntities = entityData.sort((a, b) => a.readiness - b.readiness);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entity Readiness</h1>
        <p className="text-muted-foreground">Close readiness across all entities for {latestYear} P{latestPeriod}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-700">{sortedEntities.filter(e => e.readiness >= 80).length}</p>
            <p className="text-sm text-green-600">Green (≥80%)</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-700">{sortedEntities.filter(e => e.readiness >= 50 && e.readiness < 80).length}</p>
            <p className="text-sm text-amber-600">Amber (50-79%)</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-700">{sortedEntities.filter(e => e.readiness < 50).length}</p>
            <p className="text-sm text-red-600">Red (&lt;50%)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Entity Close Status</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Exceptions</TableHead>
                <TableHead>RAG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntities.map(e => (
                <TableRow key={e.id} className={ragBg(e.readiness)}>
                  <TableCell className="font-medium">{e.company_name}</TableCell>
                  <TableCell><Badge variant="outline">{e.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={e.readiness} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-10">{e.readiness}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{e.completedTasks}/{e.totalTasks}</TableCell>
                  <TableCell>{e.exceptions > 0 ? <Badge variant="destructive">{e.exceptions}</Badge> : '0'}</TableCell>
                  <TableCell>{ragIcon(e.readiness)}</TableCell>
                </TableRow>
              ))}
              {sortedEntities.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entities found. Create close periods first.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
