import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export default function SupplierResponses() {
  const { activeCompanyId } = useActiveCompany();
  const { data: responses, isLoading } = useQuery({
    queryKey: ['supplier-rfq-responses', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('supplier_rfq_responses' as any).select('*').order('created_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Supplier Responses</h1>
        <p className="text-xs text-muted-foreground">Vendor quotation responses to outgoing RFQs</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Responses ({responses?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : !responses?.length ? (
            <div className="text-center text-muted-foreground py-8">No supplier responses recorded yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>RFQ</TableHead><TableHead>Vendor</TableHead><TableHead>Received</TableHead>
                <TableHead className="text-right">Quoted</TableHead><TableHead>Currency</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {responses.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.rfq_id?.slice(0,8) || '—'}</TableCell>
                    <TableCell className="font-medium">{r.vendor_name || r.vendor_code}</TableCell>
                    <TableCell className="text-xs">{r.response_date ? new Date(r.response_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.total_amount ? Number(r.total_amount).toLocaleString() : '—'}</TableCell>
                    <TableCell>{r.currency || 'SAR'}</TableCell>
                    <TableCell><Badge variant="outline">{r.status || 'received'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
