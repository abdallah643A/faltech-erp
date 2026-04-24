import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

export default function ApprovedVendors() {
  const { activeCompanyId } = useActiveCompany();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['approved-vendors', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('business_partners' as any).select('id,card_code,card_name,group_code,balance,active').eq('card_type', 'S').limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: approvedCats } = useQuery({
    queryKey: ['vendor-approved-categories'],
    queryFn: async () => {
      const { data } = await (supabase.from('vendor_approved_categories' as any).select('*') as any);
      return (data || []) as any[];
    },
  });

  const catByVendor: Record<string, string[]> = {};
  for (const c of (approvedCats || [])) {
    const k = (c as any).vendor_id || (c as any).vendor_code;
    if (!k) continue;
    catByVendor[k] = catByVendor[k] || [];
    catByVendor[k].push((c as any).category_name || (c as any).category_code);
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Approved Vendor List</h1>
        <p className="text-xs text-muted-foreground">Qualified suppliers with category authorization</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Suppliers ({vendors?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground">Loading…</div> : !vendors?.length ? (
            <div className="text-center text-muted-foreground py-8">No suppliers found.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead>
                <TableHead>Group</TableHead><TableHead>Categories</TableHead>
                <TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {vendors.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.card_code}</TableCell>
                    <TableCell className="font-medium">{v.card_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{v.group_code || '—'}</TableCell>
                    <TableCell className="text-xs">{(catByVendor[v.id] || catByVendor[v.card_code] || []).slice(0,3).join(', ') || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(v.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>{v.active === 'Y' || v.active === true ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
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
