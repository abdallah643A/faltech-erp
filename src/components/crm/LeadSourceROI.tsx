import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';

const SOURCE_COLORS: Record<string, string> = {
  Website: 'hsl(var(--primary))',
  Referral: 'hsl(var(--chart-2))',
  LinkedIn: 'hsl(var(--chart-3))',
  'Trade Show': 'hsl(var(--chart-4))',
  'Cold Call': 'hsl(var(--chart-5))',
  Direct: 'hsl(var(--accent))',
  Other: 'hsl(var(--muted-foreground))',
};

export function LeadSourceROI() {
  const { data: leads = [] } = useQuery({
    queryKey: ['lead-source-roi'],
    queryFn: async () => {
      const { data } = await supabase.from('business_partners').select('id, source, card_type, status').limit(1000);
      return data || [];
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['lead-source-roi-opps'],
    queryFn: async () => {
      const { data } = await supabase.from('opportunities').select('id, business_partner_id, value, stage').limit(1000);
      return data || [];
    },
  });

  const sourceAnalysis = useMemo(() => {
    const sourceMap: Record<string, { leads: number; customers: number; opportunities: number; value: number }> = {};
    
    leads.forEach(l => {
      const src = l.source || 'Direct';
      if (!sourceMap[src]) sourceMap[src] = { leads: 0, customers: 0, opportunities: 0, value: 0 };
      sourceMap[src].leads++;
      if (l.card_type === 'customer') sourceMap[src].customers++;
    });

    opportunities.forEach(o => {
      const bp = leads.find(l => l.id === o.business_partner_id);
      const src = bp?.source || 'Direct';
      if (!sourceMap[src]) sourceMap[src] = { leads: 0, customers: 0, opportunities: 0, value: 0 };
      sourceMap[src].opportunities++;
      sourceMap[src].value += o.value || 0;
    });

    return Object.entries(sourceMap)
      .map(([source, data]) => ({
        source,
        ...data,
        conversionRate: data.leads > 0 ? Math.round((data.customers / data.leads) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads, opportunities]);

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Lead Source Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourceAnalysis.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sourceAnalysis}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="customers" name="Converted" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Source ROI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Source</th>
                <th className="text-right p-2">Leads</th>
                <th className="text-right p-2">Conv. %</th>
                <th className="text-right p-2">Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {sourceAnalysis.map(s => (
                <tr key={s.source} className="border-t hover:bg-accent/30">
                  <td className="p-2 font-medium">{s.source}</td>
                  <td className="p-2 text-right">{s.leads}</td>
                  <td className="p-2 text-right">
                    <Badge variant={s.conversionRate >= 30 ? 'default' : s.conversionRate >= 15 ? 'secondary' : 'outline'} className="text-[10px]">
                      {s.conversionRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-right font-mono">SAR {fmt(s.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
