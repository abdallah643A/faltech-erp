import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Shield, CheckCircle, Eye, XCircle, Brain } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AIAnomalyDetection() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('new');

  const { data: alerts = [] } = useQuery({
    queryKey: ['ai-anomaly-alerts', activeCompanyId, tab],
    queryFn: async () => {
      let q = (supabase.from('ai_anomaly_alerts' as any).select('*').order('created_at', { ascending: false }).limit(100) as any);
      if (tab === 'new') q = q.eq('status', 'new');
      else if (tab === 'investigated') q = q.in('status', ['investigated', 'resolved']);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, status, isFP }: { id: string; status: string; isFP?: boolean }) => {
      const update: any = { status };
      if (status === 'investigated') { update.investigated_at = new Date().toISOString(); }
      if (isFP !== undefined) update.is_false_positive = isFP;
      const { error } = await (supabase.from('ai_anomaly_alerts' as any).update(update).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-anomaly-alerts'] }); toast({ title: 'Alert updated' }); },
  });

  const severityColor = (s: string) => s === 'critical' ? 'text-red-600' : s === 'high' ? 'text-orange-600' : s === 'medium' ? 'text-yellow-600' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6" />AI Anomaly Detection</h1>
        <p className="text-muted-foreground">Automated flagging of unusual patterns across the ERP</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'New Alerts', value: alerts.filter((a: any) => a.status === 'new').length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Critical', value: alerts.filter((a: any) => a.severity === 'critical').length, icon: Shield, color: 'text-red-600' },
          { label: 'Investigated', value: alerts.filter((a: any) => a.status === 'investigated').length, icon: Eye, color: 'text-primary' },
          { label: 'False Positives', value: alerts.filter((a: any) => a.is_false_positive).length, icon: XCircle, color: 'text-muted-foreground' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className={`h-5 w-5 ${s.color}`} /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="new">New Alerts</TabsTrigger><TabsTrigger value="investigated">Investigated</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Module</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Title</TableHead>
                <TableHead>Severity</TableHead><TableHead>Reference</TableHead><TableHead>Confidence</TableHead>
                <TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell><Badge variant="outline">{a.module}</Badge></TableCell>
                    <TableCell className="text-sm">{a.anomaly_type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                    <TableCell><span className={`font-bold capitalize ${severityColor(a.severity)}`}>{a.severity}</span></TableCell>
                    <TableCell className="text-sm">{a.record_reference || '—'}</TableCell>
                    <TableCell>{a.confidence_score ? `${Math.round(a.confidence_score * 100)}%` : '—'}</TableCell>
                    <TableCell><Badge variant={a.status === 'new' ? 'destructive' : a.status === 'investigated' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                    <TableCell className="text-sm">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      {a.status === 'new' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateAlert.mutate({ id: a.id, status: 'investigated' })}><Eye className="h-3 w-3 mr-1" />Investigate</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateAlert.mutate({ id: a.id, status: 'resolved', isFP: true })}><XCircle className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {alerts.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No anomaly alerts</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
