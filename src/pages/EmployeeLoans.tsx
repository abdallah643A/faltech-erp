import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EmployeeLoans() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: loans = [] } = useQuery({
    queryKey: ['employee-loans', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('employee_loans' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalOutstanding = loans.reduce((s: number, l: any) => s + (l.outstanding_balance || 0), 0);
  const activeLoans = loans.filter((l: any) => l.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" />Employee Loans & Advances</h1>
          <p className="text-muted-foreground">Loan requests, approvals, repayment schedules, and payroll deductions</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Request</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Loans', value: activeLoans.length, icon: DollarSign },
          { label: 'Pending Approval', value: loans.filter((l: any) => l.approval_status === 'pending').length, icon: Clock },
          { label: 'Outstanding', value: `${totalOutstanding.toLocaleString()} SAR`, icon: AlertTriangle },
          { label: 'Fully Repaid', value: loans.filter((l: any) => l.status === 'completed').length, icon: CheckCircle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Loan Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('hr.employee')}</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>{t('common.amount')}</TableHead>
              <TableHead>Approved</TableHead><TableHead>Installment</TableHead><TableHead>Paid</TableHead>
              <TableHead>Outstanding</TableHead><TableHead>Approval</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loans.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.employee_name}</TableCell>
                  <TableCell><Badge variant="outline">{l.loan_type?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{(l.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{(l.approved_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{(l.installment_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{l.paid_installments || 0}/{l.installments_count || 0}</TableCell>
                  <TableCell className="text-orange-600 font-medium">{(l.outstanding_balance || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={l.approval_status === 'approved' ? 'default' : l.approval_status === 'rejected' ? 'destructive' : 'secondary'}>{l.approval_status}</Badge></TableCell>
                  <TableCell><Badge variant={l.status === 'active' ? 'default' : l.status === 'completed' ? 'secondary' : 'outline'}>{l.status}</Badge></TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No loans</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
