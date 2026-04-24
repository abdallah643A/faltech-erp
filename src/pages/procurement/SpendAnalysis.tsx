import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MapPin, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useProcurementRegions } from '@/hooks/useProcurementStrategic';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SpendAnalysis() {
  const { activeCompanyId } = useActiveCompany();
  const { data: regions } = useProcurementRegions();

  const { data: pos } = useQuery({
    queryKey: ['spend-pos', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('purchase_orders' as any).select('id,total,vendor_name,vendor_code,doc_date,status').limit(2000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const orders = pos || [];
  const totalSpend = orders.reduce((s: number, p: any) => s + Number(p.total || 0), 0);
  const byVendor = Object.entries(
    orders.reduce((acc: any, p: any) => { acc[p.vendor_name || 'Unknown'] = (acc[p.vendor_name || 'Unknown'] || 0) + Number(p.total || 0); return acc; }, {})
  ).map(([name, value]) => ({ name, value: value as number })).sort((a,b)=>b.value-a.value).slice(0, 10);

  const byMonth = Object.entries(
    orders.reduce((acc: any, p: any) => { const m = p.doc_date?.slice(0,7) || 'unknown'; acc[m] = (acc[m] || 0) + Number(p.total || 0); return acc; }, {})
  ).map(([month, value]) => ({ month, value: value as number })).sort((a,b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Spend Analysis</h1>
        <p className="text-xs text-muted-foreground">PO spend analytics by vendor, month, and region</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Spend (SAR)</div><div className="text-2xl font-bold tabular-nums">{totalSpend.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active POs</div><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Avg PO Value</div><div className="text-2xl font-bold tabular-nums">{orders.length ? Math.round(totalSpend / orders.length).toLocaleString() : 0}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="vendor">
        <TabsList>
          <TabsTrigger value="vendor"><TrendingUp className="h-3 w-3 mr-1" />By Vendor</TabsTrigger>
          <TabsTrigger value="trend"><BarChart3 className="h-3 w-3 mr-1" />Monthly Trend</TabsTrigger>
          <TabsTrigger value="region"><MapPin className="h-3 w-3 mr-1" />By Region</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className="mt-4">
          <Card><CardHeader><CardTitle>Top 10 Suppliers by Spend</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byVendor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <Card><CardHeader><CardTitle>Monthly Spend Trend</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="region" className="mt-4">
          <Card><CardHeader><CardTitle>Configured Regions</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Region</TableHead><TableHead>Country</TableHead><TableHead>Tier</TableHead></TableRow></TableHeader>
              <TableBody>
                {(regions || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.region_code}</TableCell>
                    <TableCell>{r.region_name} <span className="text-muted-foreground text-xs ml-2">{r.region_name_ar}</span></TableCell>
                    <TableCell>{r.country_code}</TableCell>
                    <TableCell><Badge variant="outline">{r.market_tier}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">💡 Tag POs with a region_code on the sourcing event or vendor master to enable regional spend rollups.</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
