import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Receipt, Coins } from 'lucide-react';

function useTable(name: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: [name, activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from(name as any).select('*').order('created_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export default function RebateTracking() {
  const agreements = useTable('rebate_agreements');
  const accruals = useTable('rebate_accruals');
  const claims = useTable('rebate_claims');

  const totalAccrued = (accruals.data || []).reduce((s, a: any) => s + Number(a.accrued_amount || 0), 0);
  const totalClaimed = (claims.data || []).reduce((s, c: any) => s + Number(c.claimed_amount || 0), 0);
  const totalSettled = (claims.data || []).reduce((s, c: any) => s + Number(c.settled_amount || 0), 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Rebate Tracking</h1>
        <p className="text-xs text-muted-foreground">Volume & value rebate agreements with accrual and claim lifecycle</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Accrued</div><div className="text-2xl font-bold tabular-nums">{totalAccrued.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Claimed</div><div className="text-2xl font-bold tabular-nums">{totalClaimed.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Settled</div><div className="text-2xl font-bold tabular-nums">{totalSettled.toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="agreements">
        <TabsList>
          <TabsTrigger value="agreements"><Award className="h-3 w-3 mr-1" />Agreements</TabsTrigger>
          <TabsTrigger value="accruals"><Coins className="h-3 w-3 mr-1" />Accruals</TabsTrigger>
          <TabsTrigger value="claims"><Receipt className="h-3 w-3 mr-1" />Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="agreements" className="mt-4">
          <Card><CardHeader><CardTitle>Rebate Agreements</CardTitle></CardHeader><CardContent>
            {!agreements.data?.length ? <div className="text-center text-muted-foreground py-8">No agreements.</div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Agreement #</TableHead><TableHead>Supplier</TableHead><TableHead>Type</TableHead>
                  <TableHead>Period</TableHead><TableHead className="text-right">Threshold</TableHead>
                  <TableHead className="text-right">Rate %</TableHead><TableHead className="text-right">Earned</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {agreements.data.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.agreement_number}</TableCell>
                      <TableCell>{a.supplier_name}</TableCell>
                      <TableCell><Badge variant="outline">{a.rebate_type}</Badge></TableCell>
                      <TableCell className="text-xs">{a.start_date} → {a.end_date}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(a.value_threshold || a.volume_threshold || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.rebate_percentage}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(a.total_earned || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge>{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="accruals" className="mt-4">
          <Card><CardHeader><CardTitle>Accruals</CardTitle></CardHeader><CardContent>
            {!accruals.data?.length ? <div className="text-center text-muted-foreground py-8">No accruals.</div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Period</TableHead><TableHead className="text-right">Eligible Spend</TableHead>
                  <TableHead className="text-right">Accrued</TableHead><TableHead className="text-right">Cumulative</TableHead><TableHead>Tier</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {accruals.data.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{a.period}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(a.eligible_spend).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{Number(a.accrued_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(a.cumulative_accrual).toLocaleString()}</TableCell>
                      <TableCell>{a.tier_applied || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <Card><CardHeader><CardTitle>Claims</CardTitle></CardHeader><CardContent>
            {!claims.data?.length ? <div className="text-center text-muted-foreground py-8">No claims.</div> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Claim #</TableHead><TableHead>Period</TableHead>
                  <TableHead className="text-right">Claimed</TableHead><TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Settled</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {claims.data.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                      <TableCell className="text-xs">{c.period_from} → {c.period_to}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(c.claimed_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(c.approved_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(c.settled_amount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
