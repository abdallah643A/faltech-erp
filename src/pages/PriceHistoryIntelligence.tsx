import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Search, TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Building2, Target, Download, AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, subMonths, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

interface PriceRecord {
  item_code: string;
  item_description: string;
  unit_price: number;
  quantity: number;
  vendor_name: string;
  vendor_id: string | null;
  project_id: string | null;
  project_name: string | null;
  doc_date: string;
  po_number: string;
  line_total: number;
  discount_percent: number | null;
}

interface ItemAnalysis {
  item_code: string;
  description: string;
  lastPrice: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  totalQty: number;
  totalSpend: number;
  transactionCount: number;
  priceStdDev: number;
  inflationPct: number;
  records: PriceRecord[];
}

const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 }).format(n);
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

function calcMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calcStdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

function calcInflation(records: PriceRecord[]): number {
  if (records.length < 2) return 0;
  const sorted = [...records].sort((a, b) => a.doc_date.localeCompare(b.doc_date));
  const sixMonthsAgo = subMonths(new Date(), 6);
  const oldRecords = sorted.filter(r => parseISO(r.doc_date) < sixMonthsAgo);
  const newRecords = sorted.filter(r => parseISO(r.doc_date) >= sixMonthsAgo);
  if (oldRecords.length === 0 || newRecords.length === 0) {
    const first = sorted[0].unit_price;
    const last = sorted[sorted.length - 1].unit_price;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }
  const oldAvg = oldRecords.reduce((s, r) => s + r.unit_price, 0) / oldRecords.length;
  const newAvg = newRecords.reduce((s, r) => s + r.unit_price, 0) / newRecords.length;
  return oldAvg > 0 ? ((newAvg - oldAvg) / oldAvg) * 100 : 0;
}

function getNegotiationRange(analysis: ItemAnalysis): { low: number; target: number; high: number; confidence: string } {
  const { minPrice, avgPrice, medianPrice, priceStdDev, inflationPct } = analysis;
  const inflationAdj = 1 + Math.max(inflationPct, 0) / 100;
  const low = Math.max(minPrice * inflationAdj, avgPrice - priceStdDev);
  const target = medianPrice * inflationAdj;
  const high = avgPrice * inflationAdj;
  const confidence = analysis.transactionCount >= 10 ? 'High' : analysis.transactionCount >= 5 ? 'Medium' : 'Low';
  return { low: Math.round(low * 100) / 100, target: Math.round(target * 100) / 100, high: Math.round(high * 100) / 100, confidence };
}

export default function PriceHistoryIntelligence() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [tab, setTab] = useState('search');
  const [periodMonths, setPeriodMonths] = useState('24');

  // Fetch all PO line prices with vendor and project info
  const { data: priceData = [], isLoading } = useQuery({
    queryKey: ['price-history', activeCompanyId, periodMonths],
    queryFn: async () => {
      const since = format(subMonths(new Date(), Number(periodMonths)), 'yyyy-MM-dd');
      let q = supabase
        .from('purchase_order_lines')
        .select(`
          item_code, item_description, unit_price, quantity, line_total, discount_percent,
          purchase_orders!inner(po_number, doc_date, vendor_name, vendor_id, project_id, company_id, projects(name))
        `)
        .gt('unit_price', 0)
        .gte('purchase_orders.doc_date', since)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (activeCompanyId) {
        q = q.eq('purchase_orders.company_id', activeCompanyId);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((d: any) => ({
        item_code: d.item_code,
        item_description: d.item_description,
        unit_price: Number(d.unit_price),
        quantity: Number(d.quantity),
        line_total: Number(d.line_total || 0),
        discount_percent: d.discount_percent,
        vendor_name: d.purchase_orders?.vendor_name || '',
        vendor_id: d.purchase_orders?.vendor_id,
        project_id: d.purchase_orders?.project_id,
        project_name: d.purchase_orders?.projects?.name || null,
        doc_date: d.purchase_orders?.doc_date || '',
        po_number: d.purchase_orders?.po_number || '',
      })) as PriceRecord[];
    },
  });

  // Also fetch quotation prices for comparison
  const { data: quotationData = [] } = useQuery({
    queryKey: ['quotation-prices', activeCompanyId, periodMonths],
    queryFn: async () => {
      const since = format(subMonths(new Date(), Number(periodMonths)), 'yyyy-MM-dd');
      let q = supabase
        .from('purchase_quotation_lines')
        .select(`
          item_code, item_description, unit_price, quantity, line_total, vendor_code,
          purchase_quotations!inner(pq_number, doc_date, vendor_name, vendor_id, project_id, company_id)
        `)
        .gt('unit_price', 0)
        .gte('purchase_quotations.doc_date', since)
        .limit(3000);

      if (activeCompanyId) {
        q = q.eq('purchase_quotations.company_id', activeCompanyId);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data || []).map((d: any) => ({
        item_code: d.item_code,
        vendor_name: d.purchase_quotations?.vendor_name || '',
        unit_price: Number(d.unit_price),
        doc_date: d.purchase_quotations?.doc_date || '',
        type: 'quotation',
      }));
    },
  });

  // Build item analysis map
  const itemAnalysis = useMemo(() => {
    const map: Record<string, ItemAnalysis> = {};
    priceData.forEach(r => {
      const key = r.item_code;
      if (!map[key]) {
        map[key] = {
          item_code: key, description: r.item_description,
          lastPrice: 0, avgPrice: 0, minPrice: Infinity, maxPrice: 0, medianPrice: 0,
          totalQty: 0, totalSpend: 0, transactionCount: 0, priceStdDev: 0, inflationPct: 0,
          records: [],
        };
      }
      map[key].records.push(r);
      map[key].totalQty += r.quantity;
      map[key].totalSpend += r.line_total || r.unit_price * r.quantity;
      map[key].transactionCount++;
      if (r.unit_price < map[key].minPrice) map[key].minPrice = r.unit_price;
      if (r.unit_price > map[key].maxPrice) map[key].maxPrice = r.unit_price;
    });

    Object.values(map).forEach(item => {
      const prices = item.records.map(r => r.unit_price);
      item.avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      item.medianPrice = calcMedian(prices);
      item.priceStdDev = calcStdDev(prices);
      item.inflationPct = calcInflation(item.records);
      // Last price = most recent by date
      const sorted = [...item.records].sort((a, b) => b.doc_date.localeCompare(a.doc_date));
      item.lastPrice = sorted[0]?.unit_price || 0;
      if (item.minPrice === Infinity) item.minPrice = 0;
    });

    return map;
  }, [priceData]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return Object.values(itemAnalysis)
      .filter(i => i.item_code.toLowerCase().includes(term) || i.description.toLowerCase().includes(term))
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 50);
  }, [itemAnalysis, searchTerm]);

  // Selected item detail
  const selected = selectedItem ? itemAnalysis[selectedItem] : null;

  // Vendor comparison for selected item
  const vendorComparison = useMemo(() => {
    if (!selected) return [];
    const map: Record<string, { vendor: string; count: number; avgPrice: number; minPrice: number; maxPrice: number; lastPrice: number; lastDate: string; prices: number[] }> = {};
    selected.records.forEach(r => {
      const key = r.vendor_name || 'Unknown';
      if (!map[key]) map[key] = { vendor: key, count: 0, avgPrice: 0, minPrice: Infinity, maxPrice: 0, lastPrice: 0, lastDate: '', prices: [] };
      map[key].prices.push(r.unit_price);
      map[key].count++;
      if (r.unit_price < map[key].minPrice) map[key].minPrice = r.unit_price;
      if (r.unit_price > map[key].maxPrice) map[key].maxPrice = r.unit_price;
      if (r.doc_date > map[key].lastDate) { map[key].lastDate = r.doc_date; map[key].lastPrice = r.unit_price; }
    });
    return Object.values(map).map(v => ({
      ...v, avgPrice: v.prices.reduce((a, b) => a + b, 0) / v.prices.length,
      minPrice: v.minPrice === Infinity ? 0 : v.minPrice,
    })).sort((a, b) => a.avgPrice - b.avgPrice);
  }, [selected]);

  // Project-specific pricing
  const projectPricing = useMemo(() => {
    if (!selected) return [];
    const map: Record<string, { project: string; count: number; avgPrice: number; totalQty: number; prices: number[] }> = {};
    selected.records.forEach(r => {
      const key = r.project_name || 'No Project';
      if (!map[key]) map[key] = { project: key, count: 0, avgPrice: 0, totalQty: 0, prices: [] };
      map[key].prices.push(r.unit_price);
      map[key].count++;
      map[key].totalQty += r.quantity;
    });
    return Object.values(map).map(p => ({
      ...p, avgPrice: p.prices.reduce((a, b) => a + b, 0) / p.prices.length,
    })).sort((a, b) => b.count - a.count);
  }, [selected]);

  // Price trend chart data
  const trendData = useMemo(() => {
    if (!selected) return [];
    const sorted = [...selected.records].sort((a, b) => a.doc_date.localeCompare(b.doc_date));
    // Group by month
    const monthly: Record<string, { prices: number[]; count: number }> = {};
    sorted.forEach(r => {
      const month = r.doc_date.substring(0, 7);
      if (!monthly[month]) monthly[month] = { prices: [], count: 0 };
      monthly[month].prices.push(r.unit_price);
      monthly[month].count++;
    });
    return Object.entries(monthly).map(([month, d]) => ({
      month,
      avgPrice: Math.round((d.prices.reduce((a, b) => a + b, 0) / d.prices.length) * 100) / 100,
      minPrice: Math.min(...d.prices),
      maxPrice: Math.max(...d.prices),
      transactions: d.count,
    }));
  }, [selected]);

  const negotiation = selected ? getNegotiationRange(selected) : null;

  // Top items by spend
  const topItems = useMemo(() => {
    return Object.values(itemAnalysis).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 20);
  }, [itemAnalysis]);

  // Items with high inflation
  const inflationAlerts = useMemo(() => {
    return Object.values(itemAnalysis)
      .filter(i => i.inflationPct > 10 && i.transactionCount >= 3)
      .sort((a, b) => b.inflationPct - a.inflationPct)
      .slice(0, 15);
  }, [itemAnalysis]);

  const exportExcel = () => {
    const rows = Object.values(itemAnalysis).map(i => ({
      'Item Code': i.item_code, 'Description': i.description,
      'Last Price': i.lastPrice, 'Avg Price': Math.round(i.avgPrice * 100) / 100,
      'Min Price': i.minPrice, 'Max Price': i.maxPrice, 'Median': i.medianPrice,
      'Std Dev': Math.round(i.priceStdDev * 100) / 100,
      'Inflation %': Math.round(i.inflationPct * 10) / 10,
      'Transactions': i.transactionCount, 'Total Qty': i.totalQty,
      'Total Spend': Math.round(i.totalSpend * 100) / 100,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Price Intelligence');
    XLSX.writeFile(wb, `price_intelligence_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Price History Intelligence
          </h1>
          <p className="text-muted-foreground">Analyze purchase prices, vendor comparison, inflation trends & negotiation ranges</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={periodMonths} onValueChange={setPeriodMonths}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
              <SelectItem value="24">Last 24 months</SelectItem>
              <SelectItem value="36">Last 36 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{Object.keys(itemAnalysis).length}</p>
          <p className="text-xs text-muted-foreground">Unique Items</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <BarChart3 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{priceData.length.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Price Records</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Users className="h-5 w-5 mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold">{new Set(priceData.map(r => r.vendor_name)).size}</p>
          <p className="text-xs text-muted-foreground">Vendors</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold">{inflationAlerts.length}</p>
          <p className="text-xs text-muted-foreground">Inflation Alerts</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold">{fmt(priceData.reduce((s, r) => s + (r.line_total || r.unit_price * r.quantity), 0))}</p>
          <p className="text-xs text-muted-foreground">Total Spend</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="search">Item Lookup</TabsTrigger>
          <TabsTrigger value="topSpend">Top Spend</TabsTrigger>
          <TabsTrigger value="inflation">Inflation Alerts</TabsTrigger>
        </TabsList>

        {/* Item Lookup */}
        <TabsContent value="search" className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Search Item Code or Description</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Type at least 2 characters..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setSelectedItem(null); }} />
              </div>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && !selectedItem && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Item Code</TableHead><TableHead>Description</TableHead>
                    <TableHead>Last Price</TableHead><TableHead>Avg Price</TableHead><TableHead>Min</TableHead>
                    <TableHead>Trend</TableHead><TableHead>Txns</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {searchResults.map(item => (
                      <TableRow key={item.item_code} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedItem(item.item_code); setTab('search'); }}>
                        <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell>{fmt(item.lastPrice)}</TableCell>
                        <TableCell>{fmt(item.avgPrice)}</TableCell>
                        <TableCell className="text-green-600">{fmt(item.minPrice)}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 text-xs font-medium ${item.inflationPct > 5 ? 'text-destructive' : item.inflationPct < -5 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {item.inflationPct > 1 ? <ArrowUp className="h-3 w-3" /> : item.inflationPct < -1 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {fmtPct(item.inflationPct)}
                          </span>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{item.transactionCount}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="outline">Analyze</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Item Detail */}
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {selected.item_code} — {selected.description}
                  </h2>
                  <p className="text-sm text-muted-foreground">{selected.transactionCount} transactions across {vendorComparison.length} vendors</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>← Back</Button>
              </div>

              {/* Price Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card><CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Last Price</p>
                  <p className="text-lg font-bold">{fmt(selected.lastPrice)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Avg Price</p>
                  <p className="text-lg font-bold">{fmt(selected.avgPrice)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Lowest</p>
                  <p className="text-lg font-bold text-green-600">{fmt(selected.minPrice)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Highest</p>
                  <p className="text-lg font-bold text-destructive">{fmt(selected.maxPrice)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Median</p>
                  <p className="text-lg font-bold">{fmt(selected.medianPrice)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 text-center">
                  <p className="text-xs text-muted-foreground">Inflation</p>
                  <p className={`text-lg font-bold ${selected.inflationPct > 5 ? 'text-destructive' : selected.inflationPct < -5 ? 'text-green-600' : ''}`}>{fmtPct(selected.inflationPct)}</p>
                </CardContent></Card>
              </div>

              {/* Negotiation Range */}
              {negotiation && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Recommended Negotiation Range</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Floor (Best Case)</p>
                        <p className="text-lg font-bold text-green-600">{fmt(negotiation.low)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Target Price</p>
                        <p className="text-lg font-bold text-primary">{fmt(negotiation.target)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ceiling (Walk Away)</p>
                        <p className="text-lg font-bold text-amber-600">{fmt(negotiation.high)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <Badge className={`mt-1 ${negotiation.confidence === 'High' ? 'bg-green-100 text-green-800' : negotiation.confidence === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                          {negotiation.confidence}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">({selected.transactionCount} txns)</p>
                      </div>
                    </div>
                    <div className="mt-3 relative h-3 bg-muted rounded-full overflow-hidden">
                      {selected.maxPrice > 0 && (() => {
                        const range = selected.maxPrice - selected.minPrice || 1;
                        const lowPct = ((negotiation.low - selected.minPrice) / range) * 100;
                        const highPct = ((negotiation.high - selected.minPrice) / range) * 100;
                        const targetPct = ((negotiation.target - selected.minPrice) / range) * 100;
                        return (
                          <>
                            <div className="absolute h-full bg-green-200" style={{ left: `${Math.max(lowPct, 0)}%`, width: `${Math.max(highPct - lowPct, 1)}%` }} />
                            <div className="absolute h-full w-0.5 bg-primary" style={{ left: `${targetPct}%` }} />
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{fmt(selected.minPrice)}</span><span>{fmt(selected.maxPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Price Trend */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Price Trend (Monthly)</CardTitle></CardHeader>
                  <CardContent>
                    {trendData.length > 1 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend />
                          <Line type="monotone" dataKey="avgPrice" stroke="hsl(var(--primary))" name="Avg" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="minPrice" stroke="hsl(142 76% 36%)" name="Min" strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="maxPrice" stroke="hsl(0 72% 51%)" name="Max" strokeDasharray="5 5" />
                          {negotiation && <ReferenceLine y={negotiation.target} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="Target" />}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground py-8">Not enough data for trend</p>}
                  </CardContent>
                </Card>

                {/* Vendor Comparison */}
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Vendor Comparison</CardTitle></CardHeader>
                  <CardContent>
                    {vendorComparison.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={vendorComparison} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" fontSize={10} />
                          <YAxis dataKey="vendor" type="category" width={120} fontSize={10} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend />
                          <Bar dataKey="avgPrice" fill="hsl(var(--primary))" name="Avg Price" />
                          <Bar dataKey="minPrice" fill="hsl(142 76% 36%)" name="Min Price" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground py-8">No vendor data</p>}
                  </CardContent>
                </Card>
              </div>

              {/* Vendor Detail Table */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Vendor Price Detail</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Vendor</TableHead><TableHead>Orders</TableHead><TableHead>Avg Price</TableHead>
                      <TableHead>Min</TableHead><TableHead>Max</TableHead><TableHead>Last Price</TableHead><TableHead>Last Date</TableHead>
                      <TableHead>vs Best</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {vendorComparison.map((v, i) => {
                        const bestAvg = vendorComparison[0]?.avgPrice || 1;
                        const pctAbove = bestAvg > 0 ? ((v.avgPrice - bestAvg) / bestAvg) * 100 : 0;
                        return (
                          <TableRow key={v.vendor} className={i === 0 ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                            <TableCell className="font-medium">{v.vendor} {i === 0 && <Badge className="ml-1 bg-green-100 text-green-800 text-xs">Best</Badge>}</TableCell>
                            <TableCell>{v.count}</TableCell>
                            <TableCell>{fmt(v.avgPrice)}</TableCell>
                            <TableCell className="text-green-600">{fmt(v.minPrice)}</TableCell>
                            <TableCell>{fmt(v.maxPrice)}</TableCell>
                            <TableCell>{fmt(v.lastPrice)}</TableCell>
                            <TableCell className="text-xs">{v.lastDate}</TableCell>
                            <TableCell className={pctAbove > 0 ? 'text-destructive' : 'text-green-600'}>{pctAbove === 0 ? '—' : fmtPct(pctAbove)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Project-specific pricing */}
              {projectPricing.length > 1 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Project-Specific Pricing</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Project</TableHead><TableHead>Orders</TableHead><TableHead>Avg Price</TableHead>
                        <TableHead>Total Qty</TableHead><TableHead>vs Overall Avg</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {projectPricing.map(p => {
                          const diff = selected.avgPrice > 0 ? ((p.avgPrice - selected.avgPrice) / selected.avgPrice) * 100 : 0;
                          return (
                            <TableRow key={p.project}>
                              <TableCell className="font-medium">{p.project}</TableCell>
                              <TableCell>{p.count}</TableCell>
                              <TableCell>{fmt(p.avgPrice)}</TableCell>
                              <TableCell>{p.totalQty.toLocaleString()}</TableCell>
                              <TableCell className={diff > 5 ? 'text-destructive' : diff < -5 ? 'text-green-600' : ''}>{fmtPct(diff)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Top Spend */}
        <TabsContent value="topSpend" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top 20 Items by Spend</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Item Code</TableHead><TableHead>Description</TableHead>
                  <TableHead>Last Price</TableHead><TableHead>Avg Price</TableHead><TableHead>Min</TableHead>
                  <TableHead>Trend</TableHead><TableHead>Total Spend</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {topItems.map((item, i) => (
                    <TableRow key={item.item_code}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell>{fmt(item.lastPrice)}</TableCell>
                      <TableCell>{fmt(item.avgPrice)}</TableCell>
                      <TableCell className="text-green-600">{fmt(item.minPrice)}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-xs ${item.inflationPct > 5 ? 'text-destructive' : item.inflationPct < -5 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {item.inflationPct > 1 ? <ArrowUp className="h-3 w-3" /> : item.inflationPct < -1 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {fmtPct(item.inflationPct)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{fmt(item.totalSpend)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => { setSelectedItem(item.item_code); setTab('search'); }}>View</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inflation Alerts */}
        <TabsContent value="inflation" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Items with Significant Price Increases (&gt;10%)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item Code</TableHead><TableHead>Description</TableHead>
                  <TableHead>6m Ago Avg</TableHead><TableHead>Recent Avg</TableHead>
                  <TableHead>Increase</TableHead><TableHead>Spend Impact</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {inflationAlerts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-green-600 py-8">No significant inflation detected</TableCell></TableRow>
                  ) : inflationAlerts.map(item => {
                    const oldAvg = item.avgPrice / (1 + item.inflationPct / 100);
                    return (
                      <TableRow key={item.item_code} className="bg-amber-50/50 dark:bg-amber-950/10">
                        <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell>{fmt(oldAvg)}</TableCell>
                        <TableCell>{fmt(item.avgPrice)}</TableCell>
                        <TableCell className="text-destructive font-bold flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />{fmtPct(item.inflationPct)}
                        </TableCell>
                        <TableCell>{fmt(item.totalSpend)}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => { setSelectedItem(item.item_code); setTab('search'); }}>Analyze</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
