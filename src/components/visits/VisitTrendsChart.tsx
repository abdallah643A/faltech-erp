import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface VisitTrendsChartProps {
  monthlyData: { month: string; visits: number }[];
  typeDistribution: { type: string; count: number }[];
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export function VisitTrendsChart({ monthlyData, typeDistribution }: VisitTrendsChartProps) {
  const { t, language } = useLanguage();

  const chartConfig = {
    visits: {
      label: 'Visits',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Trends Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.monthlyTrends') || 'Monthly Visit Trends'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={monthlyData}>
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="visits" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Visit Type Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.visitTypeDistribution') || 'Visit Type Distribution'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            {typeDistribution.length === 0 ? (
              <p className="text-muted-foreground">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="type"
                    label={({ type, percent }: any) => `${type} ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom"
                    formatter={(value) => value.replace('_', ' ')}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
