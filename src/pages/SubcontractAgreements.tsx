import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, DollarSign, FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SubcontractAgreements() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: agreements = [] } = useQuery({
    queryKey: ['subcontract-agreements', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('subcontract_agreements' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalValue = agreements.reduce((s: number, a: any) => s + (a.contract_value || 0), 0);
  const totalPaid = agreements.reduce((s: number, a: any) => s + (a.total_paid || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />Subcontract Agreements</h1>
          <p className="text-muted-foreground">Manage subcontractor contracts, claims, retention, and payments</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Agreement</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Agreements', value: agreements.length, icon: FileText },
          { label: 'Total Value', value: `${totalValue.toLocaleString()} SAR`, icon: DollarSign },
          { label: 'Total Paid', value: `${totalPaid.toLocaleString()} SAR`, icon: DollarSign },
          { label: 'Active', value: agreements.filter((a: any) => a.status === 'active').length, icon: Users },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Agreements Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Agreement #</TableHead><TableHead>Subcontractor</TableHead><TableHead>Trade</TableHead>
              <TableHead>Value</TableHead><TableHead>Claimed</TableHead><TableHead>Paid</TableHead><TableHead>Retention</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {agreements.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.agreement_number}</TableCell>
                  <TableCell>{a.subcontractor_name}</TableCell>
                  <TableCell><Badge variant="outline">{a.trade || '—'}</Badge></TableCell>
                  <TableCell>{(a.contract_value || 0).toLocaleString()}</TableCell>
                  <TableCell>{(a.total_claimed || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">{(a.total_paid || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-orange-600">{(a.total_retention || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.status === 'active' ? 'default' : a.status === 'completed' ? 'secondary' : 'outline'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {agreements.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No agreements</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
