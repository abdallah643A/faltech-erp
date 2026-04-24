import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useOpportunities } from '@/hooks/useOpportunities';
import { Bell, AlertTriangle, TrendingUp, Clock, DollarSign, Users, Zap, Star } from 'lucide-react';
import { KPICard } from '@/components/ui/kpi-card';

interface SalesAlert {
  id: string;
  type: 'high_value' | 'overdue_followup' | 'performance' | 'stalled_deal' | 'new_opportunity' | 'payment_risk';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: Date;
  actionUrl?: string;
}

export default function SalesInsightsAlerts() {
  const { t } = useLanguage();

  const { activeCompanyId } = useActiveCompany();
  const { opportunities } = useOpportunities();

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-alerts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['inv-alerts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('customer_name, customer_code, total, balance_due, status, doc_due_date').in('status', ['open', 'overdue']);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(200);
      return data || [];
    },
  });

  const alerts = useMemo<SalesAlert[]>(() => {
    const result: SalesAlert[] = [];
    const now = Date.now();

    // High-value opportunities
    opportunities.filter(o => o.value > 50000 && o.stage !== 'closed_won' && o.stage !== 'closed_lost').forEach(o => {
      result.push({
        id: `hv-${o.id}`, type: 'high_value', priority: 'high',
        title: `High-value opportunity: ${o.name}`,
        description: `${o.company} - ${o.value.toLocaleString()} SAR at ${o.stage} stage (${o.probability}% probability)`,
        timestamp: new Date(o.created_at),
      });
    });

    // Stalled deals (>30 days no update)
    opportunities.filter(o => {
      const daysSinceUpdate = (now - new Date(o.updated_at).getTime()) / 86400000;
      return daysSinceUpdate > 30 && o.stage !== 'closed_won' && o.stage !== 'closed_lost';
    }).forEach(o => {
      const days = Math.floor((now - new Date(o.updated_at).getTime()) / 86400000);
      result.push({
        id: `st-${o.id}`, type: 'stalled_deal', priority: 'critical',
        title: `Stalled deal: ${o.name}`,
        description: `No updates for ${days} days. Value: ${o.value.toLocaleString()} SAR`,
        timestamp: new Date(o.updated_at),
      });
    });

    // Overdue follow-ups
    activities.filter((a: any) => a.status === 'open' && a.due_date && new Date(a.due_date).getTime() < now).forEach((a: any) => {
      const days = Math.floor((now - new Date(a.due_date).getTime()) / 86400000);
      result.push({
        id: `of-${a.id}`, type: 'overdue_followup', priority: days > 7 ? 'critical' : 'high',
        title: `Overdue follow-up: ${a.subject}`,
        description: `${days} days overdue. ${a.card_code || ''}`,
        timestamp: new Date(a.due_date),
      });
    });

    // Payment risk
    invoices.filter((i: any) => i.status === 'overdue').forEach((i: any) => {
      result.push({
        id: `pr-${i.customer_code}-${i.doc_due_date}`, type: 'payment_risk', priority: 'high',
        title: `Overdue payment: ${i.customer_name}`,
        description: `Balance due: ${(i.balance_due || 0).toLocaleString()} SAR`,
        timestamp: new Date(i.doc_due_date || Date.now()),
      });
    });

    return result.sort((a, b) => {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  }, [opportunities, activities, invoices]);

  const priorityColor = (p: string) => p === 'critical' ? 'bg-red-500/10 text-red-600 border-red-200' : p === 'high' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : p === 'medium' ? 'bg-blue-500/10 text-blue-600 border-blue-200' : 'bg-muted text-muted-foreground';
  const typeIcon = (t: string) => {
    switch (t) {
      case 'high_value': return <Star className="h-5 w-5 text-amber-500" />;
      case 'overdue_followup': return <Clock className="h-5 w-5 text-red-500" />;
      case 'stalled_deal': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'payment_risk': return <DollarSign className="h-5 w-5 text-amber-500" />;
      case 'new_opportunity': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      default: return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const criticalCount = alerts.filter(a => a.priority === 'critical').length;
  const highCount = alerts.filter(a => a.priority === 'high').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Insights & Alerts</h1>
          <p className="text-muted-foreground">Real-time alerts for opportunities, follow-ups & performance anomalies</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">{alerts.length} Active Alerts</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          icon={<Zap className="h-4 w-4 text-red-500" />}
          label="Critical"
          value={criticalCount}
          tooltip="Alerts requiring immediate attention — stalled high-value deals or severely overdue follow-ups"
        />
        <KPICard
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          label="High Priority"
          value={highCount}
          tooltip="Important alerts for high-value opportunities, overdue tasks, or payment risks"
        />
        <KPICard
          icon={<Star className="h-4 w-4 text-amber-400" />}
          label="High Value Opps"
          value={alerts.filter(a => a.type === 'high_value').length}
          tooltip="Open opportunities exceeding SAR 50,000 that need active management"
        />
        <KPICard
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          label="Overdue Follow-ups"
          value={alerts.filter(a => a.type === 'overdue_followup').length}
          tooltip="Activities past their due date that need immediate attention to avoid losing momentum"
        />
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <Card key={alert.id}>
            <CardContent className="py-4 flex items-center gap-4">
              {typeIcon(alert.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{alert.title}</span>
                  <Badge className={priorityColor(alert.priority)}>{alert.priority}</Badge>
                  <Badge variant="outline" className="text-xs">{alert.type.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.timestamp.toLocaleDateString()}</span>
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 && <p className="text-center text-muted-foreground py-12">No active alerts — everything looks good!</p>}
      </div>
    </div>
  );
}
