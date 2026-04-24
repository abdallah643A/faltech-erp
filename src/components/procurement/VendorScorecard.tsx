import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Award, TrendingUp, Clock, ShieldCheck, DollarSign, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

type SortKey = 'overallScore' | 'deliveryRate' | 'qualityScore' | 'costVariance' | 'paymentCompliance' | 'totalSpend';

export function VendorScorecard() {
  const [sortBy, setSortBy] = useState<SortKey>('overallScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['vendor-score-ap'],
    queryFn: async () => {
      const { data } = await supabase.from('ap_invoices').select('id, vendor_name, vendor_code, total, status, doc_date, doc_due_date, posting_date, payment_terms, subtotal, tax_amount').limit(1000);
      return data || [];
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['vendor-score-po'],
    queryFn: async () => {
      const { data } = await supabase.from('purchase_orders').select('id, vendor_name, vendor_code, total, status, delivery_date, doc_date, subtotal, approval_status').limit(1000);
      return data || [];
    },
  });

  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ['vendor-score-grpo'],
    queryFn: async () => {
      const { data } = await supabase.from('goods_receipts').select('id, vendor_name, vendor_code, total, status, doc_date, posting_date, purchase_order_id').limit(1000);
      return data || [];
    },
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['vendor-score-pq'],
    queryFn: async () => {
      const { data } = await supabase.from('purchase_quotations').select('id, vendor_name, vendor_code, total, status').limit(1000);
      return data || [];
    },
  });

  const vendorScores = useMemo(() => {
    const map: Record<string, {
      name: string; code: string | null;
      orders: number; invoices: number; receipts: number; quotes: number;
      totalSpend: number; totalPOValue: number; totalInvoiceValue: number;
      onTimeDelivery: number; totalDeliveries: number;
      onTimePayments: number; totalPayments: number;
      acceptedReceipts: number; rejectedReceipts: number; totalReceipts: number;
      poValues: number[]; invoiceValues: number[];
    }> = {};

    const getVendor = (name: string, code: string | null) => {
      const key = name || 'Unknown';
      if (!map[key]) map[key] = {
        name: key, code: code || null,
        orders: 0, invoices: 0, receipts: 0, quotes: 0,
        totalSpend: 0, totalPOValue: 0, totalInvoiceValue: 0,
        onTimeDelivery: 0, totalDeliveries: 0,
        onTimePayments: 0, totalPayments: 0,
        acceptedReceipts: 0, rejectedReceipts: 0, totalReceipts: 0,
        poValues: [], invoiceValues: [],
      };
      return map[key];
    };

    // Purchase Orders - delivery tracking & cost baseline
    purchaseOrders.forEach(po => {
      const v = getVendor(po.vendor_name, po.vendor_code);
      v.orders++;
      v.totalPOValue += po.total || 0;
      v.poValues.push(po.total || 0);
      if (po.delivery_date && po.status) {
        v.totalDeliveries++;
        const deliveryDate = new Date(po.delivery_date);
        const expectedDate = new Date(new Date(po.doc_date).getTime() + 30 * 86400000);
        if (po.status === 'fully_delivered' || po.status === 'partially_delivered') {
          if (deliveryDate <= expectedDate) v.onTimeDelivery++;
        }
      }
    });

    // AP Invoices - payment compliance & cost variance
    apInvoices.forEach(inv => {
      const v = getVendor(inv.vendor_name, inv.vendor_code);
      v.invoices++;
      v.totalSpend += inv.total || 0;
      v.totalInvoiceValue += inv.total || 0;
      v.invoiceValues.push(inv.total || 0);
      if (inv.doc_due_date && inv.posting_date) {
        v.totalPayments++;
        if (new Date(inv.posting_date) <= new Date(inv.doc_due_date)) {
          v.onTimePayments++;
        }
      } else if (inv.doc_due_date) {
        v.totalPayments++;
        if (inv.status === 'paid' || inv.status === 'closed') v.onTimePayments++;
      }
    });

    // Goods Receipts - quality proxy
    goodsReceipts.forEach(gr => {
      const v = getVendor(gr.vendor_name, gr.vendor_code);
      v.receipts++;
      v.totalReceipts++;
      if (gr.status === 'posted' || gr.status === 'closed') v.acceptedReceipts++;
      if (gr.status === 'rejected' || gr.status === 'returned') v.rejectedReceipts++;
    });

    // Quotations
    quotations.forEach(pq => {
      const v = getVendor(pq.vendor_name, pq.vendor_code);
      v.quotes++;
    });

    return Object.values(map)
      .filter(v => v.orders > 0 || v.invoices > 0)
      .map(v => {
        // On-time delivery rate (0-100)
        const deliveryRate = v.totalDeliveries > 0
          ? Math.round((v.onTimeDelivery / v.totalDeliveries) * 100)
          : 50; // neutral if no data

        // Quality score: based on acceptance rate of goods receipts
        const qualityScore = v.totalReceipts > 0
          ? Math.round(((v.totalReceipts - v.rejectedReceipts) / v.totalReceipts) * 100)
          : 75; // neutral

        // Cost variance: % difference between PO values and invoice values
        const costVariance = v.totalPOValue > 0
          ? Math.round(((v.totalInvoiceValue - v.totalPOValue) / v.totalPOValue) * 100)
          : 0;
        // Score: 100 = exact match, drops for overruns
        const costScore = Math.max(0, Math.min(100, 100 - Math.abs(costVariance) * 2));

        // Payment terms compliance
        const paymentCompliance = v.totalPayments > 0
          ? Math.round((v.onTimePayments / v.totalPayments) * 100)
          : 50;

        // Weighted overall score
        const overallScore = Math.round(
          deliveryRate * 0.30 +
          qualityScore * 0.25 +
          costScore * 0.25 +
          paymentCompliance * 0.20
        );

        const rating = overallScore >= 85 ? 'A+' : overallScore >= 75 ? 'A' : overallScore >= 65 ? 'B' : overallScore >= 50 ? 'C' : 'D';

        return {
          ...v, deliveryRate, qualityScore, costVariance, costScore,
          paymentCompliance, overallScore, rating,
        };
      })
      .sort((a, b) => sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
  }, [apInvoices, purchaseOrders, goodsReceipts, quotations, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0);
  const fmtCurrency = (v: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);

  const ratingColors: Record<string, string> = { 'A+': 'text-green-700', A: 'text-green-600', B: 'text-blue-600', C: 'text-orange-600', D: 'text-red-600' };
  const ratingBg: Record<string, string> = { 'A+': 'bg-green-100 dark:bg-green-900/30', A: 'bg-green-100 dark:bg-green-900/30', B: 'bg-blue-100 dark:bg-blue-900/30', C: 'bg-orange-100 dark:bg-orange-900/30', D: 'bg-red-100 dark:bg-red-900/30' };

  const scoreColor = (v: number) => v >= 80 ? 'text-green-600' : v >= 60 ? 'text-blue-600' : v >= 40 ? 'text-orange-600' : 'text-red-600';

  // Top 5 for radar chart
  const radarData = useMemo(() => {
    const top5 = vendorScores.slice(0, 5);
    return [
      { metric: 'Delivery', ...Object.fromEntries(top5.map(v => [v.name, v.deliveryRate])) },
      { metric: 'Quality', ...Object.fromEntries(top5.map(v => [v.name, v.qualityScore])) },
      { metric: 'Cost', ...Object.fromEntries(top5.map(v => [v.name, v.costScore])) },
      { metric: 'Payment', ...Object.fromEntries(top5.map(v => [v.name, v.paymentCompliance])) },
    ];
  }, [vendorScores]);

  const top5Names = vendorScores.slice(0, 5).map(v => v.name);
  const radarColors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // KPI summary
  const avgDelivery = vendorScores.length > 0 ? Math.round(vendorScores.reduce((s, v) => s + v.deliveryRate, 0) / vendorScores.length) : 0;
  const avgQuality = vendorScores.length > 0 ? Math.round(vendorScores.reduce((s, v) => s + v.qualityScore, 0) / vendorScores.length) : 0;
  const avgPayment = vendorScores.length > 0 ? Math.round(vendorScores.reduce((s, v) => s + v.paymentCompliance, 0) / vendorScores.length) : 0;
  const topRated = vendorScores.filter(v => v.rating === 'A+' || v.rating === 'A').length;

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="inline-flex ml-1 cursor-pointer" onClick={() => toggleSort(col)}>
      {sortBy === col ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Vendors</p>
            <p className="text-xl font-bold text-foreground">{vendorScores.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Top Rated (A/A+)</p>
            <p className="text-xl font-bold text-green-600">{topRated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Clock className="h-3 w-3" /> Avg Delivery</p>
            <p className={`text-xl font-bold ${scoreColor(avgDelivery)}`}>{avgDelivery}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Avg Quality</p>
            <p className={`text-xl font-bold ${scoreColor(avgQuality)}`}>{avgQuality}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><DollarSign className="h-3 w-3" /> Avg Payment</p>
            <p className={`text-xl font-bold ${scoreColor(avgPayment)}`}>{avgPayment}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ranking" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ranking">Vendor Ranking</TabsTrigger>
          <TabsTrigger value="comparison">Radar Comparison</TabsTrigger>
          <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
        </TabsList>

        {/* Full Ranking Table */}
        <TabsContent value="ranking">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Vendor Ranking & Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('overallScore')}>
                        Overall <SortIcon col="overallScore" />
                      </TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('deliveryRate')}>
                        <span className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Delivery <SortIcon col="deliveryRate" /></span>
                      </TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('qualityScore')}>
                        <span className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /> Quality <SortIcon col="qualityScore" /></span>
                      </TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('costVariance')}>
                        <span className="flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" /> Cost Var <SortIcon col="costVariance" /></span>
                      </TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('paymentCompliance')}>
                        Payment <SortIcon col="paymentCompliance" />
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('totalSpend')}>
                        Spend <SortIcon col="totalSpend" />
                      </TableHead>
                      <TableHead className="text-center">POs</TableHead>
                      <TableHead className="text-center">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorScores.map((v, i) => (
                      <TableRow key={v.name} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium truncate max-w-[180px]">{v.name}</p>
                            {v.code && <p className="text-[10px] text-muted-foreground">{v.code}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm font-bold ${scoreColor(v.overallScore)}`}>{v.overallScore}</span>
                            <Progress value={v.overallScore} className="h-1 w-12" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium ${scoreColor(v.deliveryRate)}`}>{v.deliveryRate}%</span>
                          <p className="text-[9px] text-muted-foreground">{v.onTimeDelivery}/{v.totalDeliveries}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium ${scoreColor(v.qualityScore)}`}>{v.qualityScore}%</span>
                          <p className="text-[9px] text-muted-foreground">{v.acceptedReceipts}/{v.totalReceipts} accepted</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium ${v.costVariance > 5 ? 'text-red-600' : v.costVariance < -5 ? 'text-green-600' : 'text-foreground'}`}>
                            {v.costVariance > 0 ? '+' : ''}{v.costVariance}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-medium ${scoreColor(v.paymentCompliance)}`}>{v.paymentCompliance}%</span>
                          <p className="text-[9px] text-muted-foreground">{v.onTimePayments}/{v.totalPayments}</p>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">{fmtCurrency(v.totalSpend)}</TableCell>
                        <TableCell className="text-center text-xs">{v.orders}</TableCell>
                        <TableCell className="text-center">
                          <div className={`h-7 w-7 rounded-full ${ratingBg[v.rating]} flex items-center justify-center mx-auto`}>
                            <span className={`text-xs font-bold ${ratingColors[v.rating]}`}>{v.rating}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {vendorScores.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No vendor data available.</p>
              )}

              {/* Scoring Legend */}
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-[10px] font-medium text-muted-foreground mb-2">Scoring Weights</p>
                <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                  <span>🚚 On-Time Delivery: <b>30%</b></span>
                  <span>✅ Quality (GR Acceptance): <b>25%</b></span>
                  <span>💰 Cost Accuracy (PO vs Invoice): <b>25%</b></span>
                  <span>📋 Payment Terms Compliance: <b>20%</b></span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px]">
                  <span className="text-green-600 font-medium">A+ ≥85</span>
                  <span className="text-green-600 font-medium">A ≥75</span>
                  <span className="text-blue-600 font-medium">B ≥65</span>
                  <span className="text-orange-600 font-medium">C ≥50</span>
                  <span className="text-red-600 font-medium">D &lt;50</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Radar Comparison */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top 5 Vendor Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5Names.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    {top5Names.map((name, i) => (
                      <Radar key={name} name={name} dataKey={name} stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No vendor data to compare.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spend Analysis */}
        <TabsContent value="spend">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Vendor Spend vs Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={vendorScores.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => fmt(v)} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [name === 'totalSpend' ? fmtCurrency(v) : v, name === 'totalSpend' ? 'Spend' : 'Score']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="totalSpend" name="Total Spend" radius={[0, 4, 4, 0]}>
                    {vendorScores.slice(0, 10).map((v, i) => (
                      <Cell key={i} fill={v.rating === 'A+' || v.rating === 'A' ? 'hsl(142, 71%, 45%)' : v.rating === 'B' ? 'hsl(var(--primary))' : v.rating === 'C' ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
