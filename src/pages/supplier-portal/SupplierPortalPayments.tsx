import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function SupplierPortalPayments({ account }: { account: any }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['sp-payment-status', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_invoice_submissions' as any).select('*').eq('portal_account_id', account.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const statusColors: Record<string, string> = {
    submitted: 'bg-blue-500/20 text-blue-400', approved: 'bg-green-500/20 text-green-400',
    paid: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Payment Status</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Invoice#</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Payment Date</TableHead><TableHead>Reference</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payment records</TableCell></TableRow> :
             invoices.map((inv: any) => (
               <TableRow key={inv.id}>
                 <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                 <TableCell>{inv.total_amount?.toLocaleString()} {inv.currency}</TableCell>
                 <TableCell><Badge className={statusColors[inv.approval_status] || ''}>{inv.approval_status}</Badge></TableCell>
                 <TableCell>{inv.payment_date ? format(new Date(inv.payment_date), 'dd MMM yyyy') : '-'}</TableCell>
                 <TableCell className="font-mono text-sm">{inv.payment_reference || '-'}</TableCell>
                 <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), 'dd MMM yyyy')}</TableCell>
               </TableRow>
             ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
