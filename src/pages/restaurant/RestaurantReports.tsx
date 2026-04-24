import { useState } from 'react';
import { useRestaurantDashboardKPIs } from '@/hooks/useRestaurantData';
import { useRestaurantMenuEngineering } from '@/hooks/useRestaurantPhase2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, LineChart, Line } from 'recharts';
import { BarChart3, Star, TrendingUp, Target, PieChart as PieChartIcon, Layers } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const classColors: Record<string, string> = {
  star: 'bg-yellow-100 text-yellow-800', puzzle: 'bg-purple-100 text-purple-800', plow_horse: 'bg-blue-100 text-blue-800', dog: 'bg-red-100 text-red-800',
};

export default function RestaurantReports() {
  const { data: kpis } = useRestaurantDashboardKPIs();
  const { data: engineering } = useRestaurantMenuEngineering();

  const channelData = Object.entries(kpis?.byChannel || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  const hourlyData = Object.entries(kpis?.byHour || {}).map(([hour, count]) => ({ hour: `${hour}:00`, orders: count })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  const engByClass: Record<string, number> = {};
  (engineering || []).forEach((e: any) => { engByClass[e.classification || 'unclassified'] = (engByClass[e.classification || 'unclassified'] || 0) + 1; });
  const classData = Object.entries(engByClass).map(([name, value]) => ({ name, value }));

  const scatterData = (engineering || []).map((e: any) => ({
    name: e.rest_menu_items?.item_name || '?',
    popularity: Number(e.popularity_index || 0),
    margin: Number(e.margin_percent || 0),
    revenue: Number(e.gross_revenue || 0),
    classification: e.classification,
  }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Menu engineering, sales analytics, kitchen performance, and profitability</p>
      </div>

      <Tabs defaultValue="menu-eng">
        <TabsList className="flex-wrap">
          <TabsTrigger value="menu-eng" className="gap-1"><Target className="h-3.5 w-3.5" /> Menu Engineering</TabsTrigger>
          <TabsTrigger value="sales" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Sales Analysis</TabsTrigger>
          <TabsTrigger value="channel" className="gap-1"><PieChartIcon className="h-3.5 w-3.5" /> Channel Mix</TabsTrigger>
        </TabsList>

        {/* Menu Engineering */}
        <TabsContent value="menu-eng" className="mt-3 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['star', 'puzzle', 'plow_horse', 'dog'] as const).map(cls => (
              <Card key={cls} className="border">
                <CardContent className="p-3 flex items-center gap-3">
                  <Star className={`h-5 w-5 ${cls === 'star' ? 'text-yellow-500' : cls === 'puzzle' ? 'text-purple-500' : cls === 'plow_horse' ? 'text-blue-500' : 'text-red-500'}`} />
                  <div>
                    <p className="text-sm font-bold capitalize">{cls.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{engByClass[cls] || 0} items</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {scatterData.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Menu Matrix (Popularity vs Margin)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="popularity" name="Popularity" type="number" fontSize={11} />
                    <YAxis dataKey="margin" name="Margin %" type="number" fontSize={11} />
                    <ZAxis dataKey="revenue" range={[40, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any, name: string) => [name === 'Margin %' ? `${v}%` : v, name]} />
                    <Scatter data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="border">
            <CardHeader><CardTitle className="text-sm">Item Performance Table</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-right py-2 px-3">Units Sold</th>
                  <th className="text-right py-2 px-3">Revenue</th>
                  <th className="text-right py-2 px-3">Food Cost</th>
                  <th className="text-right py-2 px-3">Margin %</th>
                  <th className="text-left py-2 px-3">Class</th>
                  <th className="text-right py-2 px-3">Rank</th>
                </tr></thead>
                <tbody>
                  {(engineering || []).map((e: any) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-2 px-3 font-medium">{e.rest_menu_items?.item_name || '-'}</td>
                      <td className="py-2 px-3 text-xs">{e.rest_menu_items?.rest_menu_categories?.category_name || '-'}</td>
                      <td className="py-2 px-3 text-right">{e.units_sold}</td>
                      <td className="py-2 px-3 text-right">SAR {Number(e.gross_revenue || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">SAR {Number(e.food_cost || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold"><span className={Number(e.margin_percent) < 60 ? 'text-red-600' : 'text-green-600'}>{Number(e.margin_percent || 0).toFixed(1)}%</span></td>
                      <td className="py-2 px-3"><Badge className={`${classColors[e.classification] || ''} text-xs capitalize`}>{e.classification?.replace('_', ' ') || '-'}</Badge></td>
                      <td className="py-2 px-3 text-right">{e.rank_in_category || '-'}</td>
                    </tr>
                  ))}
                  {!(engineering || []).length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">No menu engineering data. Run analysis to populate.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Analysis */}
        <TabsContent value="sales" className="mt-3 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Gross Sales', value: `SAR ${(kpis?.totalSales || 0).toFixed(2)}` },
              { label: 'Orders', value: kpis?.totalOrders || 0 },
              { label: 'Avg Ticket', value: `SAR ${(kpis?.avgOrder || 0).toFixed(2)}` },
              { label: 'Discounts', value: `SAR ${(kpis?.totalDiscount || 0).toFixed(2)}` },
            ].map(k => (
              <Card key={k.label} className="border">
                <CardContent className="p-3">
                  <p className="text-lg font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Hourly Sales Trend</CardTitle></CardHeader>
            <CardContent>
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Mix */}
        <TabsContent value="channel" className="mt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Channel</CardTitle></CardHeader>
              <CardContent>
                {channelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `SAR ${v.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No data</p>}
              </CardContent>
            </Card>

            {classData.length > 0 && (
              <Card className="border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Menu Classification Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={classData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
