import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, DollarSign, Clock, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProjectClaimsDisputes() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: claims = [] } = useQuery({
    queryKey: ['project-claims-disputes', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('project_claims_disputes' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const totalClaimed = claims.reduce((s: number, c: any) => s + (c.amount_claimed || 0), 0);
  const openClaims = claims.filter((c: any) => c.status === 'open');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" />Claims & Disputes Register</h1>
          <p className="text-muted-foreground">Track claims, disputes, negotiations, and financial impact</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Claim</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Claims', value: claims.length, icon: Scale },
          { label: 'Open', value: openClaims.length, icon: Clock },
          { label: 'Amount Claimed', value: `${totalClaimed.toLocaleString()} SAR`, icon: DollarSign },
          { label: 'High Priority', value: claims.filter((c: any) => c.priority === 'high').length, icon: AlertTriangle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Claims Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Claim #</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Title</TableHead>
              <TableHead>Counterparty</TableHead><TableHead>Claimed</TableHead><TableHead>Awarded</TableHead>
              <TableHead>Priority</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {claims.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.claim_number}</TableCell>
                  <TableCell><Badge variant="outline">{c.claim_type?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.counterparty || '—'}</TableCell>
                  <TableCell>{(c.amount_claimed || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">{(c.amount_awarded || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={c.priority === 'high' ? 'destructive' : 'secondary'}>{c.priority}</Badge></TableCell>
                  <TableCell><Badge variant={c.status === 'resolved' ? 'default' : c.status === 'open' ? 'destructive' : 'secondary'}>{c.status}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                </TableRow>
              ))}
              {claims.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No claims recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
