import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Target, CheckCircle, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PerformanceAppraisals() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: appraisals = [] } = useQuery({
    queryKey: ['performance-appraisals', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('performance_appraisals' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const avgRating = appraisals.length > 0 ? (appraisals.reduce((s: number, a: any) => s + (a.final_rating || 0), 0) / appraisals.filter((a: any) => a.final_rating).length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6" />Performance Appraisals</h1>
          <p className="text-muted-foreground">Appraisal cycles, goals, KPIs, reviews, and calibration</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Appraisal</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Appraisals', value: appraisals.length, icon: Star },
          { label: 'In Progress', value: appraisals.filter((a: any) => a.status === 'in_progress').length, icon: Clock },
          { label: 'Completed', value: appraisals.filter((a: any) => a.status === 'completed').length, icon: CheckCircle },
          { label: 'Avg Rating', value: avgRating, icon: Target },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Appraisal Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('hr.employee')}</TableHead><TableHead>Cycle</TableHead><TableHead>Year</TableHead>
              <TableHead>Self Score</TableHead><TableHead>Manager Score</TableHead><TableHead>Final Rating</TableHead>
              <TableHead>Calibration</TableHead><TableHead>Promotion</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {appraisals.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.employee_name}</TableCell>
                  <TableCell>{a.appraisal_cycle}</TableCell>
                  <TableCell>{a.cycle_year}</TableCell>
                  <TableCell>{a.self_assessment_score || '—'}</TableCell>
                  <TableCell>{a.manager_score || '—'}</TableCell>
                  <TableCell className="font-bold">{a.final_rating || '—'} {a.rating_label && <span className="text-xs text-muted-foreground ml-1">({a.rating_label})</span>}</TableCell>
                  <TableCell><Badge variant={a.calibration_status === 'calibrated' ? 'default' : 'secondary'}>{a.calibration_status}</Badge></TableCell>
                  <TableCell>{a.promotion_recommended ? <CheckCircle className="h-4 w-4 text-green-600" /> : '—'}</TableCell>
                  <TableCell><Badge variant={a.status === 'completed' ? 'default' : a.status === 'in_progress' ? 'secondary' : 'outline'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {appraisals.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No appraisals</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
