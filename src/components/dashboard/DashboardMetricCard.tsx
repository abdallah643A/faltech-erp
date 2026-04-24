import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  sparkData?: number[];
  chartType?: 'bar' | 'area';
  color?: string;
  accentColor?: string;
  onClick?: () => void;
  className?: string;
}

export function DashboardMetricCard({
  title, value, subtitle, icon: Icon, trend, sparkData, chartType = 'bar',
  color = 'hsl(var(--primary))', accentColor, onClick, className,
}: DashboardMetricCardProps) {
  const sparkChartData = sparkData?.map((v, i) => ({ v, i })) || [];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-0 shadow-sm',
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" style={{ background: `linear-gradient(135deg, ${color}, transparent)` }} />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            <p className="text-xl md:text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            {trend && (
              <div className={cn('flex items-center gap-1 mt-1', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-[10px] font-semibold">{Math.abs(trend.value)}% {trend.label}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {Icon && (
              <div className="h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            )}
            {sparkChartData.length > 0 && (
              <div className="w-16 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={sparkChartData}>
                      <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} opacity={0.7} />
                    </BarChart>
                  ) : (
                    <AreaChart data={sparkChartData}>
                      <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
