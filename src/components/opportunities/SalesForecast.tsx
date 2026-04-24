import { useLanguage } from '@/contexts/LanguageContext';
import { type Opportunity } from '@/hooks/useOpportunities';
import { TrendingUp, Target, Trophy, XCircle, DollarSign, BarChart3 } from 'lucide-react';

interface SalesForecastProps {
  opportunities: Opportunity[];
  formatCurrency: (value: number) => string;
}

export function SalesForecast({ opportunities, formatCurrency }: SalesForecastProps) {
  const { language } = useLanguage();

  const totalPipeline = opportunities.reduce((sum, o) => sum + o.value, 0);
  const weightedPipeline = opportunities.reduce((sum, o) => sum + (o.value * o.probability / 100), 0);
  const wonDeals = opportunities.filter(o => o.stage === 'Closed Won');
  const lostDeals = opportunities.filter(o => o.stage === 'Closed Lost');
  const activeDeals = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage));
  const wonValue = wonDeals.reduce((sum, o) => sum + o.value, 0);
  const lostValue = lostDeals.reduce((sum, o) => sum + o.value, 0);
  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
  const avgDealSize = activeDeals.length > 0 ? activeDeals.reduce((sum, o) => sum + o.value, 0) / activeDeals.length : 0;

  const cards = [
    {
      label: language === 'ar' ? 'إجمالي خط المبيعات' : 'Total Pipeline',
      value: formatCurrency(totalPipeline),
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: language === 'ar' ? 'التنبؤ المرجح' : 'Weighted Forecast',
      value: formatCurrency(weightedPipeline),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      label: language === 'ar' ? 'الصفقات المربوحة' : 'Won Deals',
      value: `${wonDeals.length} (${formatCurrency(wonValue)})`,
      icon: Trophy,
      color: 'text-green-600',
      bg: 'bg-green-500/10',
    },
    {
      label: language === 'ar' ? 'نسبة الفوز' : 'Win Rate',
      value: `${winRate}%`,
      icon: Target,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: language === 'ar' ? 'الصفقات المفقودة' : 'Lost Deals',
      value: `${lostDeals.length} (${formatCurrency(lostValue)})`,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: language === 'ar' ? 'متوسط حجم الصفقة' : 'Avg Deal Size',
      value: formatCurrency(avgDealSize),
      icon: BarChart3,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="enterprise-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-md ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="text-sm font-bold mt-0.5">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
