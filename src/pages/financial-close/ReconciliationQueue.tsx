import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReconItem {
  id: string;
  area: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  count: number;
  amount?: number;
  link: string;
}

export default function ReconciliationQueue() {
  const { activeCompanyId } = useActiveCompany();
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recon-queue', activeCompanyId],
    queryFn: async () => {
      const queue: ReconItem[] = [];

      // Unmatched bank transactions
      const { count: unmatchedBank } = await supabase.from('bank_statement_lines' as any).select('*', { count: 'exact', head: true }).eq('is_matched', false);
      if (unmatchedBank && unmatchedBank > 0) {
        queue.push({ id: 'bank', area: 'Bank Reconciliation', description: 'Unmatched bank statement lines', severity: 'high', count: unmatchedBank, link: '/bank-reconciliation' });
      }

      // Open AR invoices
      const { data: openAR } = await supabase.from('ar_invoices').select('balance_due').eq('status', 'open').gt('balance_due', 0);
      if (openAR?.length) {
        const total = openAR.reduce((s, i) => s + (i.balance_due || 0), 0);
        queue.push({ id: 'ar', area: 'Accounts Receivable', description: 'Open invoices with balance', severity: total > 500000 ? 'high' : 'medium', count: openAR.length, amount: total, link: '/ar-invoices' });
      }

      // Pending AP invoices
      const { count: pendingAP } = await supabase.from('ap_invoices').select('*', { count: 'exact', head: true }).eq('status', 'open');
      if (pendingAP && pendingAP > 0) {
        queue.push({ id: 'ap', area: 'Accounts Payable', description: 'Open AP invoices pending posting', severity: 'medium', count: pendingAP, link: '/ap-invoices' });
      }

      // Draft journal entries
      const { count: draftJE } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true }).eq('status', 'draft');
      if (draftJE && draftJE > 0) {
        queue.push({ id: 'je', area: 'Journal Entries', description: 'Unposted draft journal entries', severity: 'high', count: draftJE, link: '/journal-entries' });
      }

      return queue.sort((a, b) => { const o = { high: 0, medium: 1, low: 2 }; return (o[a.severity] || 2) - (o[b.severity] || 2); });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation Queue</h1>
        <p className="text-muted-foreground">Outstanding reconciliation items requiring attention before close</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-red-600">{items.filter(i => i.severity === 'high').length}</p>
          <p className="text-sm text-muted-foreground">High Priority</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold text-amber-600">{items.filter(i => i.severity === 'medium').length}</p>
          <p className="text-sm text-muted-foreground">Medium Priority</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-3xl font-bold">{items.length}</p>
          <p className="text-sm text-muted-foreground">Total Items</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Reconciliation Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.area}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'secondary' : 'outline'}>
                      {item.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.count}</TableCell>
                  <TableCell>{item.amount ? item.amount.toLocaleString() + ' SAR' : '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => navigate(item.link)}>
                      <ExternalLink className="h-3 w-3 mr-1" />Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">All reconciliations are up to date</p>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
