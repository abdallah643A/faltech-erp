import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserMinus, CheckCircle, Clock, DollarSign, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OffboardingWorkflow() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: checklists = [] } = useQuery({
    queryKey: ['offboarding-checklists', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('offboarding_checklists' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserMinus className="h-6 w-6" />Offboarding & Clearance</h1>
          <p className="text-muted-foreground">Resignation, clearance checklist, final settlement, and document generation</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Initiate Offboarding</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Offboardings', value: checklists.filter((c: any) => c.status === 'initiated' || c.status === 'in_progress').length, icon: UserMinus },
          { label: 'Pending Settlement', value: checklists.filter((c: any) => c.final_settlement_status === 'pending').length, icon: DollarSign },
          { label: 'Completed', value: checklists.filter((c: any) => c.status === 'completed').length, icon: CheckCircle },
          { label: 'In Progress', value: checklists.filter((c: any) => c.status === 'in_progress').length, icon: Clock },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Offboarding Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('hr.employee')}</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Last Working Day</TableHead>
              <TableHead>Assets</TableHead><TableHead>Finance</TableHead><TableHead>IT</TableHead>
              <TableHead>Settlement</TableHead><TableHead>Exit Interview</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {checklists.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.employee_name}</TableCell>
                  <TableCell><Badge variant="outline">{c.separation_type}</Badge></TableCell>
                  <TableCell>{c.last_working_date || '—'}</TableCell>
                  <TableCell><Badge variant={c.asset_return_status === 'completed' ? 'default' : 'secondary'}>{c.asset_return_status}</Badge></TableCell>
                  <TableCell><Badge variant={c.finance_clearance_status === 'completed' ? 'default' : 'secondary'}>{c.finance_clearance_status}</Badge></TableCell>
                  <TableCell><Badge variant={c.it_clearance_status === 'completed' ? 'default' : 'secondary'}>{c.it_clearance_status}</Badge></TableCell>
                  <TableCell>{c.final_settlement_amount ? `${(c.final_settlement_amount).toLocaleString()} SAR` : '—'}</TableCell>
                  <TableCell>{c.exit_interview_done ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                  <TableCell><Badge variant={c.status === 'completed' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {checklists.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No offboarding records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
