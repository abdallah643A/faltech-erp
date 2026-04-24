import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface FunnelStage {
  name: string;
  actual: number;
  target?: number;
}

interface FunnelChartWidgetProps {
  title: string;
  stages: FunnelStage[];
  actualLabel?: string;
  targetLabel?: string;
  actualColor?: string;
  targetColor?: string;
  className?: string;
}

export function FunnelChartWidget({
  title, stages, actualLabel = 'Actual', targetLabel = 'Target',
  actualColor = 'hsl(var(--primary))', targetColor = 'hsl(var(--chart-2))',
  className,
}: FunnelChartWidgetProps) {
  const hasTargets = stages.some(s => s.target !== undefined);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stages} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
              formatter={(v: number) => new Intl.NumberFormat('en-SA', { notation: 'compact' }).format(v)}
            />
            {hasTargets && <Legend wrapperStyle={{ fontSize: 11 }} />}
            <Bar dataKey="actual" name={actualLabel} fill={actualColor} radius={[4, 4, 0, 0]} />
            {hasTargets && <Bar dataKey="target" name={targetLabel} fill={targetColor} radius={[4, 4, 0, 0]} opacity={0.5} />}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
