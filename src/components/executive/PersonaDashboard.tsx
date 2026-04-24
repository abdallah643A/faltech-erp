import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Landmark, Activity, Briefcase, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type ExecPersona = 'ceo' | 'cfo' | 'coo' | 'bu_leader';

const PERSONA_META: Record<ExecPersona, {
  label: string;
  labelAr: string;
  icon: any;
  categories: string[];
  description: string;
}> = {
  ceo: {
    label: 'CEO Cockpit',
    labelAr: 'لوحة الرئيس التنفيذي',
    icon: Crown,
    categories: ['financial', 'strategic', 'customer', 'growth'],
    description: 'Group revenue, growth, strategic objectives, customer health',
  },
  cfo: {
    label: 'CFO Cockpit',
    labelAr: 'لوحة المدير المالي',
    icon: Landmark,
    categories: ['financial', 'cash', 'compliance', 'risk'],
    description: 'Cash, profitability, AR/AP, compliance, finance risks',
  },
  coo: {
    label: 'COO Cockpit',
    labelAr: 'لوحة المدير التشغيلي',
    icon: Activity,
    categories: ['operational', 'delivery', 'quality', 'productivity'],
    description: 'Delivery, project health, manufacturing, quality, productivity',
  },
  bu_leader: {
    label: 'Business Unit Leader',
    labelAr: 'قائد وحدة الأعمال',
    icon: Briefcase,
    categories: ['operational', 'financial', 'customer'],
    description: 'BU revenue, margin, pipeline, customer satisfaction',
  },
};

interface PersonaDashboardProps {
  persona: ExecPersona;
  isAr?: boolean;
}

/**
 * PersonaDashboard — PR1
 * Renders KPIs from `executive_kpis` filtered by persona's relevant categories,
 * grouped by category with RAG indicators and trend arrows.
 */
export function PersonaDashboard({ persona, isAr = false }: PersonaDashboardProps) {
  const { activeCompanyId } = useActiveCompany();
  const meta = PERSONA_META[persona];
  const Icon = meta.icon;

  const { data: kpis = [] } = useQuery({
    queryKey: ['executive_kpis', persona, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('executive_kpis' as any).select('*').in('category', meta.categories);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const k of kpis) {
      const cat = k.category || 'other';
      g[cat] = g[cat] || [];
      g[cat].push(k);
    }
    return g;
  }, [kpis]);

  const ragColor = (status: string) =>
    status === 'on_track' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
    : status === 'at_risk' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
    : status === 'off_track' ? 'bg-red-500/10 text-red-700 border-red-500/30'
    : 'bg-muted text-muted-foreground';

  const TrendIcon = (trend: string) =>
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const fmt = (v: number, unit?: string) => {
    if (unit === 'SAR' || unit === '$' || unit === 'USD') {
      return new Intl.NumberFormat('en-SA', {
        style: 'currency', currency: unit === 'SAR' ? 'SAR' : 'USD', maximumFractionDigits: 0,
      }).format(v || 0);
    }
    if (unit === '%') return `${(v || 0).toFixed(1)}%`;
    return new Intl.NumberFormat().format(v || 0);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{isAr ? meta.labelAr : meta.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
        </CardHeader>
        <CardContent>
          {kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لم يتم تسجيل مؤشرات أداء بعد لهذه الفئة.' : 'No KPIs registered yet for this persona. Add entries in the KPI registry.'}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((k) => {
                      const T = TrendIcon(k.trend);
                      const variance = k.target_value
                        ? ((Number(k.actual_value) - Number(k.target_value)) / Number(k.target_value)) * 100
                        : 0;
                      return (
                        <Card key={k.id} className={`border ${ragColor(k.status)}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-medium">{isAr && k.kpi_name_ar ? k.kpi_name_ar : k.kpi_name}</div>
                              <T className="h-4 w-4 opacity-70" />
                            </div>
                            <div className="text-xl font-bold mt-1">{fmt(Number(k.actual_value), k.unit)}</div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {isAr ? 'الهدف' : 'Target'}: {fmt(Number(k.target_value), k.unit)}
                              </span>
                              <Badge variant="outline" className="text-[10px] h-4">
                                {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                              </Badge>
                            </div>
                            {k.region && (
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {k.region}{k.business_unit ? ` • ${k.business_unit}` : ''}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
