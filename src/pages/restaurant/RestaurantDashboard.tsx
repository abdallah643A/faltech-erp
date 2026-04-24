import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRestaurantDashboardKPIs } from '@/hooks/useRestaurantData';
import { DollarSign, ShoppingCart, TrendingUp, Users, Clock, Utensils, Truck, Coffee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const channelIcons: Record<string, any> = { dine_in: Utensils, takeaway: Coffee, delivery: Truck, drive_thru: ShoppingCart };

export default function RestaurantDashboard() {
  const { data: kpis } = useRestaurantDashboardKPIs();

  const channelData = Object.entries(kpis?.byChannel || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  const hourlyData = Object.entries(kpis?.byHour || {}).map(([hour, count]) => ({ hour: `${hour}:00`, orders: count })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  const kpiCards = [
    { title: "Today's Sales", value: `SAR ${(kpis?.totalSales || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-600' },
    { title: 'Total Orders', value: kpis?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-600' },
    { title: 'Avg Order Value', value: `SAR ${(kpis?.avgOrder || 0).toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600' },
    { title: 'Tax Collected', value: `SAR ${(kpis?.totalTax || 0).toFixed(2)}`, icon: DollarSign, color: 'text-orange-600' },
    { title: 'Total Discounts', value: `SAR ${(kpis?.totalDiscount || 0).toFixed(2)}`, icon: Users, color: 'text-red-600' },
    { title: 'Tips', value: `SAR ${(kpis?.totalTips || 0).toFixed(2)}`, icon: Clock, color: 'text-teal-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time overview of restaurant operations</p>
        </div>
        <Badge variant="outline" className="text-xs">Live</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <Card key={k.title} className="border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-lg font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sales by Channel</CardTitle></CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `SAR ${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No sales data yet today</p>}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Orders by Hour</CardTitle></CardHeader>
          <CardContent>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No orders yet today</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {Object.entries(channelIcons).map(([ch, Icon]) => {
          const val = kpis?.byChannel?.[ch] || 0;
          return (
            <Card key={ch} className="border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{ch.replace('_', ' ')}</p>
                  <p className="text-lg font-bold">SAR {Number(val).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
