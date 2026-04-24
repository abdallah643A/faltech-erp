import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface VisitAnalyticsCardsProps {
  totalVisits: number;
  totalSalesReps: number;
  visitsThisMonth: number;
  avgVisitsPerRep: number;
  visitsTrend: number;
}

export function VisitAnalyticsCards({
  totalVisits,
  totalSalesReps,
  visitsThisMonth,
  avgVisitsPerRep,
  visitsTrend,
}: VisitAnalyticsCardsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const cards = [
    {
      title: t('analytics.totalVisits') || 'Total Visits',
      value: totalVisits,
      icon: MapPin,
      color: 'bg-primary',
      change: null,
    },
    {
      title: t('analytics.activeSalesReps') || 'Active Sales Reps',
      value: totalSalesReps,
      icon: Users,
      color: 'bg-success',
      change: null,
    },
    {
      title: t('analytics.visitsThisMonth') || 'Visits This Month',
      value: visitsThisMonth,
      icon: TrendingUp,
      color: 'bg-warning',
      change: visitsTrend,
    },
    {
      title: t('analytics.avgVisitsPerRep') || 'Avg Visits/Rep',
      value: avgVisitsPerRep.toFixed(1),
      icon: Clock,
      color: 'bg-info',
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/visits')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold">{card.value}</h3>
                {card.change !== null && (
                  <p className={`text-sm mt-1 ${card.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}% vs last month
                  </p>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-lg text-white`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
