import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Lightbulb, CheckCircle, X, ExternalLink, TrendingUp, Clock, AlertTriangle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SmartRecommendations() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');

  const { data: recs = [] } = useQuery({
    queryKey: ['smart-recommendations', activeCompanyId, tab],
    queryFn: async () => {
      let q = (supabase.from('smart_recommendations' as any).select('*').order('created_at', { ascending: false }).limit(50) as any);
      if (tab === 'pending') q = q.eq('status', 'pending');
      else if (tab === 'acted') q = q.in('status', ['acted', 'dismissed']);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateRec = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === 'acted') update.acted_at = new Date().toISOString();
      if (status === 'dismissed') update.dismissed_at = new Date().toISOString();
      const { error } = await (supabase.from('smart_recommendations' as any).update(update).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['smart-recommendations'] }); toast({ title: 'Updated' }); },
  });

  const priorityIcon = (p: string) => {
    if (p === 'high') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (p === 'medium') return <Clock className="h-4 w-4 text-orange-500" />;
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  const typeColor = (t: string) => {
    const map: Record<string, string> = { follow_up: 'default', collect: 'destructive', approve: 'secondary', reorder: 'outline' };
    return (map[t] || 'outline') as any;
  };

  const pending = recs.filter((r: any) => r.status === 'pending');
  const acted = recs.filter((r: any) => r.status === 'acted');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6" />Smart Recommendations</h1>
        <p className="text-muted-foreground">AI-suggested next best actions based on your ERP activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Pending Actions', value: pending.length, icon: Zap, color: 'text-primary' },
          { label: 'High Priority', value: recs.filter((r: any) => r.priority === 'high' && r.status === 'pending').length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Acted On', value: acted.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Generated', value: recs.length, icon: Lightbulb, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-5 w-5 ${s.color}`} /><div><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="pending">{t('common.pending')}</TabsTrigger><TabsTrigger value="acted">History</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          <div className="grid gap-3">
            {recs.map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {priorityIcon(r.priority)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{r.title}</span>
                          <Badge variant={typeColor(r.recommendation_type)} className="text-[10px]">{r.recommendation_type}</Badge>
                          {r.confidence_score && <Badge variant="outline" className="text-[10px]">{Math.round(r.confidence_score * 100)}%</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'dd MMM yyyy HH:mm')}</div>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        {r.action_url && <Button size="sm" variant="outline" onClick={() => window.location.href = r.action_url}><ExternalLink className="h-3 w-3 mr-1" />Go</Button>}
                        <Button size="sm" onClick={() => updateRec.mutate({ id: r.id, status: 'acted' })}><CheckCircle className="h-3 w-3 mr-1" />Done</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateRec.mutate({ id: r.id, status: 'dismissed' })}><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                    {r.status !== 'pending' && <Badge variant={r.status === 'acted' ? 'default' : 'secondary'}>{r.status}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {recs.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No recommendations at this time. The system analyzes your ERP activity continuously.</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
