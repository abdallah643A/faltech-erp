import { useLanguage } from '@/contexts/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { month: 'Jan', sales: 4000, target: 3500 },
  { month: 'Feb', sales: 3000, target: 3500 },
  { month: 'Mar', sales: 5000, target: 4000 },
  { month: 'Apr', sales: 4500, target: 4000 },
  { month: 'May', sales: 6000, target: 4500 },
  { month: 'Jun', sales: 5500, target: 5000 },
  { month: 'Jul', sales: 7000, target: 5500 },
  { month: 'Aug', sales: 6500, target: 6000 },
  { month: 'Sep', sales: 8000, target: 6500 },
  { month: 'Oct', sales: 7500, target: 7000 },
  { month: 'Nov', sales: 9000, target: 7500 },
  { month: 'Dec', sales: 8500, target: 8000 },
];

export function SalesChart() {
  const { t } = useLanguage();

  return (
    <div className="enterprise-card">
      <div className="enterprise-card-header">
        <h3 className="text-lg font-semibold">{t('dashboard.salesPerformance')}</h3>
      </div>
      <div className="enterprise-card-body">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(214, 72%, 23%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(214, 72%, 23%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(43, 65%, 49%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(43, 65%, 49%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-muted-foreground text-xs" />
              <YAxis className="text-muted-foreground text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="hsl(43, 65%, 49%)"
                strokeWidth={2}
                fill="url(#targetGradient)"
                name="Target"
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(214, 72%, 23%)"
                strokeWidth={2}
                fill="url(#salesGradient)"
                name="Sales"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Actual Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-secondary" />
            <span className="text-sm text-muted-foreground">Target</span>
          </div>
        </div>
      </div>
    </div>
  );
}
