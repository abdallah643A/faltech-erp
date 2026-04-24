import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8b5cf6', '#06b6d4', '#ec4899',
];

interface DonutItem {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartWidgetProps {
  title: string;
  data: DonutItem[];
  centerValue?: string | number;
  centerLabel?: string;
  colors?: string[];
  className?: string;
  size?: 'sm' | 'md';
  formatValue?: (v: number) => string;
}

export function DonutChartWidget({
  title, data, centerValue, centerLabel, colors = DEFAULT_COLORS,
  className, size = 'md', formatValue,
}: DonutChartWidgetProps) {
  const outerR = size === 'sm' ? 60 : 80;
  const innerR = size === 'sm' ? 35 : 50;
  const h = size === 'sm' ? 160 : 200;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="relative" style={{ width: outerR * 2 + 20, height: h }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={innerR}
                  outerRadius={outerR}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color || colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  formatter={(v: number) => formatValue ? formatValue(v) : v.toLocaleString()}
                />
              </PieChart>
            </ResponsiveContainer>
            {centerValue !== undefined && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold">{centerValue}</span>
                {centerLabel && <span className="text-[9px] text-muted-foreground">{centerLabel}</span>}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            {data.map((item, i) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={item.name} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || colors[i % colors.length] }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
