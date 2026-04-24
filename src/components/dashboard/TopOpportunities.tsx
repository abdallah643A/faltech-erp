import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const opportunities = [
  {
    id: 1,
    name: 'Enterprise Software License',
    company: 'Al-Faisal Group',
    value: 450000,
    probability: 85,
    stage: 'Negotiation',
  },
  {
    id: 2,
    name: 'Cloud Migration Project',
    company: 'Tech Solutions Ltd',
    value: 320000,
    probability: 70,
    stage: 'Proposal',
  },
  {
    id: 3,
    name: 'IT Infrastructure Upgrade',
    company: 'Saudi Manufacturing Co',
    value: 280000,
    probability: 60,
    stage: 'Qualification',
  },
  {
    id: 4,
    name: 'ERP Implementation',
    company: 'Gulf Trading Est',
    value: 550000,
    probability: 45,
    stage: 'Discovery',
  },
];

const stageColors: Record<string, string> = {
  'Discovery': 'bg-info/10 text-info',
  'Qualification': 'bg-warning/10 text-warning',
  'Proposal': 'bg-primary/10 text-primary',
  'Negotiation': 'bg-success/10 text-success',
};

export function TopOpportunities() {
  const { t, language } = useLanguage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="enterprise-card">
      <div className="enterprise-card-header flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('dashboard.topOpportunities')}</h3>
        <button className="text-sm text-primary hover:underline">
          {t('common.viewAll')}
        </button>
      </div>
      <div className="divide-y divide-border">
        {opportunities.map((opp) => (
          <div key={opp.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-foreground">{opp.name}</h4>
                <p className="text-sm text-muted-foreground">{opp.company}</p>
              </div>
              <Badge className={stageColors[opp.stage]}>{opp.stage}</Badge>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(opp.value)}
              </span>
              <div className="flex items-center gap-2">
                <Progress value={opp.probability} className="w-20 h-2" />
                <span className="text-sm text-muted-foreground">{opp.probability}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
