import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SupplierPortalPOs({ account }: { account: any }) {
  const queryClient = useQueryClient();

  const { data: pos = [] } = useQuery({
    queryKey: ['sp-po-ack', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_po_acknowledgements' as any).select('*').eq('portal_account_id', account.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const acknowledge = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('supplier_po_acknowledgements' as any).update({ acknowledgement_status: status, acknowledged_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await supabase.from('supplier_portal_interactions' as any).insert({ portal_account_id: account.id, company_id: account.company_id, interaction_type: 'po_acknowledgement', entity_type: 'purchase_order' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sp-po-ack'] }); toast.success('PO updated'); },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Purchase Orders</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>PO#</TableHead><TableHead>Status</TableHead><TableHead>Original Delivery</TableHead><TableHead>Confirmed Delivery</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {pos.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow> :
               pos.map((p: any) => (
                 <TableRow key={p.id}>
                   <TableCell className="font-mono">{p.po_number || '-'}</TableCell>
                   <TableCell><Badge variant="outline">{p.acknowledgement_status}</Badge></TableCell>
                   <TableCell>{p.original_delivery_date ? format(new Date(p.original_delivery_date), 'dd MMM yyyy') : '-'}</TableCell>
                   <TableCell>{p.confirmed_delivery_date ? format(new Date(p.confirmed_delivery_date), 'dd MMM yyyy') : '-'}</TableCell>
                   <TableCell className="text-sm text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
                   <TableCell>
                     {p.acknowledgement_status === 'pending' && <div className="flex gap-1">
                       <Button size="sm" variant="outline" onClick={() => acknowledge.mutate({ id: p.id, status: 'acknowledged' })}><CheckCircle className="h-3 w-3 mr-1" />Accept</Button>
                       <Button size="sm" variant="outline" onClick={() => acknowledge.mutate({ id: p.id, status: 'rejected' })}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                     </div>}
                   </TableCell>
                 </TableRow>
               ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
