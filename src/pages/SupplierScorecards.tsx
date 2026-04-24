import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import { RefreshCw, TrendingUp, Award, AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SupplierScorecards() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['supplier-scorecards', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_scorecards' as any).select('*').order('overall_score', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      let poQ = supabase.from('purchase_orders').select('*') as any;
      if (activeCompanyId) poQ = poQ.eq('company_id', activeCompanyId);
      const { data: pos = [] } = await poQ;

      let apQ = supabase.from('ap_invoices').select('*') as any;
      if (activeCompanyId) apQ = apQ.eq('company_id', activeCompanyId);
      const { data: apInvoices = [] } = await apQ;

      const vendorMap: Record<string, any> = {};

      pos.forEach((po: any) => {
        const key = po.vendor_name || 'Unknown';
        if (!vendorMap[key]) vendorMap[key] = { vendor_name: key, vendor_code: po.vendor_code, total_pos: 0, on_time: 0, late: 0, total_spend: 0, quality_issues: 0, invoice_matches: 0, invoice_total: 0 };
        vendorMap[key].total_pos++;
        if (['fully_delivered', 'closed'].includes(po.status)) {
          if (po.delivery_date && po.doc_due_date) {
            new Date(po.delivery_date) <= new Date(po.doc_due_date) ? vendorMap[key].on_time++ : vendorMap[key].late++;
          } else { vendorMap[key].on_time++; }
        }
      });

      apInvoices.forEach((inv: any) => {
        const key = inv.vendor_name || 'Unknown';
        if (!vendorMap[key]) vendorMap[key] = { vendor_name: key, vendor_code: inv.vendor_code, total_pos: 0, on_time: 0, late: 0, total_spend: 0, quality_issues: 0, invoice_matches: 0, invoice_total: 0 };
        vendorMap[key].total_spend += inv.total || 0;
        vendorMap[key].invoice_total++;
        if (inv.purchase_order_id) vendorMap[key].invoice_matches++;
      });

      for (const v of Object.values(vendorMap) as any[]) {
        const delivered = v.on_time + v.late;
        const deliveryScore = delivered > 0 ? (v.on_time / delivered) * 100 : 50;
        const invoiceAccuracy = v.invoice_total > 0 ? (v.invoice_matches / v.invoice_total) * 100 : 50;
        const priceScore = 70; // baseline
        const qualityScore = 85; // baseline
        const responsivenessScore = 75;
        const overall = (deliveryScore * 0.35 + qualityScore * 0.25 + priceScore * 0.2 + responsivenessScore * 0.1 + invoiceAccuracy * 0.1);

        const { data: existing } = await (supabase.from('supplier_scorecards' as any).select('id').eq('vendor_name', v.vendor_name).maybeSingle() as any);
        const record: any = {
          vendor_name: v.vendor_name, vendor_code: v.vendor_code,
          price_score: priceScore, delivery_score: Math.round(deliveryScore * 100) / 100,
          quality_score: qualityScore, responsiveness_score: responsivenessScore,
          invoice_accuracy_score: Math.round(invoiceAccuracy * 100) / 100,
          overall_score: Math.round(overall * 100) / 100,
          total_pos: v.total_pos, total_spend: v.total_spend,
          on_time_count: v.on_time, late_count: v.late,
          period: new Date().toISOString().slice(0, 7), calculated_at: new Date().toISOString(),
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        };
        if (existing) { await (supabase.from('supplier_scorecards' as any).update(record).eq('id', existing.id) as any); }
        else { await (supabase.from('supplier_scorecards' as any).insert(record) as any); }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-scorecards'] });
      toast({ title: 'Supplier scorecards recalculated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = scorecards.filter((s: any) => !search || s.vendor_name?.toLowerCase().includes(search.toLowerCase()));
  const topPerformers = scorecards.filter((s: any) => s.overall_score >= 80).length;
  const lowPerformers = scorecards.filter((s: any) => s.overall_score < 50).length;

  const radarData = selectedVendor ? [
    { metric: 'Price', score: selectedVendor.price_score },
    { metric: 'Delivery', score: selectedVendor.delivery_score },
    { metric: 'Quality', score: selectedVendor.quality_score },
    { metric: 'Response', score: selectedVendor.responsiveness_score },
    { metric: 'Invoice', score: selectedVendor.invoice_accuracy_score },
  ] : [];

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Supplier Performance Scorecards</h1>
          <p className="text-sm text-muted-foreground">Score vendors by delivery, quality, price, and responsiveness</p>
        </div>
        <Button onClick={() => recalculate.mutate()} disabled={recalculate.isPending} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${recalculate.isPending ? 'animate-spin' : ''}`} /> Recalculate
        </Button>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UITooltip><TooltipTrigger asChild>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Suppliers</p><p className="text-2xl font-bold">{scorecards.length}</p></CardContent></Card>
          </TooltipTrigger><TooltipContent>Number of vendors with calculated scorecards</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Top Performers</p><p className="text-2xl font-bold text-primary">{topPerformers}</p></CardContent></Card>
          </TooltipTrigger><TooltipContent>Suppliers scoring 80% or above overall</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low Performers</p><p className="text-2xl font-bold text-destructive">{lowPerformers}</p></CardContent></Card>
          </TooltipTrigger><TooltipContent>Suppliers scoring below 50% — consider review</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Score</p><p className="text-2xl font-bold">{scorecards.length > 0 ? Math.round(scorecards.reduce((s: number, c: any) => s + (c.overall_score || 0), 0) / scorecards.length) : 0}%</p></CardContent></Card>
          </TooltipTrigger><TooltipContent>Average overall score across all suppliers</TooltipContent></UITooltip>
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 10 Suppliers by Score</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <EmptyChartState message="No supplier scorecards available. Click Recalculate to generate." height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={filtered.slice(0, 10)} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="vendor_name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="overall_score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {selectedVendor && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{selectedVendor.vendor_name} - Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Overall</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>POs</TableHead>
              <TableHead className="text-right">Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s: any) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedVendor(s)}>
                <TableCell className="font-medium">{s.vendor_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={s.overall_score} className="h-2 w-16" />
                    <span className="text-xs font-medium">{Math.round(s.overall_score)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{Math.round(s.delivery_score)}%</TableCell>
                <TableCell className="text-sm">{Math.round(s.quality_score)}%</TableCell>
                <TableCell className="text-sm">{Math.round(s.price_score)}%</TableCell>
                <TableCell className="text-sm">{Math.round(s.responsiveness_score)}%</TableCell>
                <TableCell className="text-sm">{Math.round(s.invoice_accuracy_score)}%</TableCell>
                <TableCell className="text-sm">{s.total_pos}</TableCell>
                <TableCell className="text-right text-sm">SAR {(s.total_spend || 0).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
