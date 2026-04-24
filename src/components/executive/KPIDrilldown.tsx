import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Props { isAr?: boolean }

/**
 * KPIDrilldown — PR2
 * Pick a KPI and drill by Company or Region; renders bar chart + breakdown table.
 */
export function KPIDrilldown({ isAr = false }: Props) {
  const [dimension, setDimension] = useState<'company' | 'region' | 'business_unit'>('company');
  const [selectedKpi, setSelectedKpi] = useState<string>('');

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpi-drilldown-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('executive_kpis' as any).select('*');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['kpi-drilldown-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sap_companies').select('id, company_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const kpiNames = useMemo(() => {
    const seen = new Map<string, string>();
    for (const k of kpis) seen.set(k.kpi_code || k.kpi_name, isAr && k.kpi_name_ar ? k.kpi_name_ar : k.kpi_name);
    return Array.from(seen.entries());
  }, [kpis, isAr]);

  const filtered = useMemo(() => {
    if (!selectedKpi) return [];
    return kpis.filter((k) => (k.kpi_code || k.kpi_name) === selectedKpi);
  }, [kpis, selectedKpi]);

  const breakdown = useMemo(() => {
    const grouped: Record<string, { actual: number; target: number; count: number }> = {};
    for (const k of filtered) {
      let key = '';
      if (dimension === 'company') {
        const c = companies.find((c: any) => c.id === k.company_id);
        key = c ? c.company_name : (isAr ? 'بدون شركة' : 'Unassigned');
      } else if (dimension === 'region') {
        key = k.region || (isAr ? 'بدون منطقة' : 'Unassigned');
      } else {
        key = k.business_unit || (isAr ? 'بدون وحدة' : 'Unassigned');
      }
      grouped[key] = grouped[key] || { actual: 0, target: 0, count: 0 };
      grouped[key].actual += Number(k.actual_value || 0);
      grouped[key].target += Number(k.target_value || 0);
      grouped[key].count += 1;
    }
    return Object.entries(grouped).map(([name, v]) => ({
      name,
      actual: v.actual,
      target: v.target,
      variance: v.target ? ((v.actual - v.target) / v.target) * 100 : 0,
      count: v.count,
    })).sort((a, b) => b.actual - a.actual);
  }, [filtered, dimension, companies, isAr]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />{isAr ? 'تفصيل مؤشرات الأداء' : 'KPI Drill-Down'}
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          <Select value={selectedKpi} onValueChange={setSelectedKpi}>
            <SelectTrigger className="w-64 h-8"><SelectValue placeholder={isAr ? 'اختر مؤشرًا' : 'Select KPI'} /></SelectTrigger>
            <SelectContent>
              {kpiNames.map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dimension} onValueChange={(v: any) => setDimension(v)}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="company">{isAr ? 'حسب الشركة' : 'By Company'}</SelectItem>
              <SelectItem value="region">{isAr ? 'حسب المنطقة' : 'By Region'}</SelectItem>
              <SelectItem value="business_unit">{isAr ? 'حسب الوحدة' : 'By Business Unit'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedKpi ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'اختر مؤشر أداء للبدء.' : 'Select a KPI to drill down.'}</p>
        ) : breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد بيانات.' : 'No data for this KPI.'}</p>
        ) : (
          <div className="space-y-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name={isAr ? 'الهدف' : 'Target'} />
                  <Bar dataKey="actual" fill="hsl(var(--primary))" name={isAr ? 'الفعلي' : 'Actual'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {breakdown.map((b) => (
                <div key={b.name} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span className="font-medium">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {b.actual.toLocaleString()} / {b.target.toLocaleString()}
                    </span>
                    <Badge variant={b.variance >= 0 ? 'default' : 'destructive'}>
                      {b.variance >= 0 ? '+' : ''}{b.variance.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
