import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, CheckCircle, Clock, FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function InterimPaymentCerts() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: certs = [] } = useQuery({
    queryKey: ['interim-payment-certs', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('interim_payment_certificates' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalCertified = certs.reduce((s: number, c: any) => s + (c.net_certified || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" />Interim Payment Certificates</h1>
          <p className="text-muted-foreground">Progress billing certification with engineer approval and retention</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Certificate</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Certificates', value: certs.length, icon: FileText },
          { label: 'Approved', value: certs.filter((c: any) => c.status === 'approved').length, icon: CheckCircle },
          { label: 'Pending', value: certs.filter((c: any) => c.status === 'draft' || c.status === 'submitted').length, icon: Clock },
          { label: 'Total Certified', value: `${totalCertified.toLocaleString()} SAR`, icon: Receipt },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Payment Certificates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Certificate #</TableHead><TableHead>Period</TableHead><TableHead>Work Done</TableHead>
              <TableHead>Previous</TableHead><TableHead>This Period</TableHead><TableHead>Retention</TableHead>
              <TableHead>Net Certified</TableHead><TableHead>Engineer</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {certs.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.certificate_number}</TableCell>
                  <TableCell className="text-sm">{c.period_from && c.period_to ? `${format(new Date(c.period_from), 'dd MMM')} - ${format(new Date(c.period_to), 'dd MMM yyyy')}` : '—'}</TableCell>
                  <TableCell>{(c.work_done_to_date || 0).toLocaleString()}</TableCell>
                  <TableCell>{(c.previous_certified || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{(c.this_period_amount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-orange-600">{(c.retention_held || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-primary">{(c.net_certified || 0).toLocaleString()}</TableCell>
                  <TableCell>{c.engineer_approved ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                  <TableCell><Badge variant={c.status === 'approved' ? 'default' : c.status === 'submitted' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {certs.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payment certificates</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
