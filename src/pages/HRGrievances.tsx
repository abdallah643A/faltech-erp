import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Lock, Clock, CheckCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HRGrievances() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: cases = [] } = useQuery({
    queryKey: ['hr-grievances', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('hr_grievances' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6" />Grievance & Case Management</h1>
          <p className="text-muted-foreground">Confidential case records, investigations, and resolutions</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Case</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Cases', value: cases.length, icon: ShieldAlert },
          { label: 'Open', value: cases.filter((c: any) => c.status === 'open').length, icon: Clock },
          { label: 'Resolved', value: cases.filter((c: any) => c.status === 'resolved').length, icon: CheckCircle },
          { label: 'Confidential', value: cases.filter((c: any) => c.is_confidential).length, icon: Lock },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Case Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Case #</TableHead><TableHead>{t('hr.employee')}</TableHead><TableHead>Category</TableHead>
              <TableHead>Subject</TableHead><TableHead>Severity</TableHead><TableHead>Investigator</TableHead>
              <TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {cases.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.case_number} {c.is_confidential && <Lock className="h-3 w-3 inline text-orange-500 ml-1" />}</TableCell>
                  <TableCell>{c.employee_name}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.subject}</TableCell>
                  <TableCell><Badge variant={c.severity === 'high' ? 'destructive' : c.severity === 'medium' ? 'secondary' : 'outline'}>{c.severity}</Badge></TableCell>
                  <TableCell>{c.investigator_name || '—'}</TableCell>
                  <TableCell><Badge variant={c.status === 'resolved' ? 'default' : c.status === 'investigating' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                </TableRow>
              ))}
              {cases.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No cases recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
