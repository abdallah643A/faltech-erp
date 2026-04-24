import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { useLanguage } from '@/contexts/LanguageContext';
import { Smartphone, WifiOff, Wifi, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';

export default function MobileFieldPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { enqueue, online } = useOfflineMutation();
  const { pending, syncing, sync } = useSyncEngine();

  const [daily, setDaily] = useState<any>({ report_date: new Date().toISOString().slice(0, 10), weather: 'clear', notes: '' });
  const [qa, setQa] = useState<any>({ checklist_name: '', status: 'pending' });
  const [hse, setHse] = useState<any>({ observation_type: 'unsafe_act', severity: 'low', description: '' });

  const submit = async (entity: string, table: string, payload: any, reset?: () => void) => {
    if (!payload.project_id) { toast.error('Project ID required'); return; }
    await enqueue({ module: 'cpms', entity, table, operation: 'insert', payload });
    reset?.();
  };

  return (
    <div className="space-y-6 page-enter max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Smartphone className="h-6 w-6 text-primary" />{isAr ? 'تنفيذ ميداني (دون اتصال)' : 'Mobile Field Execution'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'يعمل بدون إنترنت ويُزامن لاحقاً' : 'Works offline. Syncs when reconnected.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={online ? 'default' : 'destructive'} className="gap-1">
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? (isAr ? 'متصل' : 'Online') : (isAr ? 'غير متصل' : 'Offline')}
          </Badge>
          {pending > 0 && (
            <Button size="sm" variant="outline" onClick={() => sync()} disabled={syncing}>
              <CloudUpload className={`h-4 w-4 mr-1 ${syncing ? 'animate-pulse' : ''}`} /> {pending}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="daily">{isAr ? 'تقرير يومي' : 'Daily'}</TabsTrigger>
          <TabsTrigger value="qa">{isAr ? 'فحص الجودة' : 'QA/QC'}</TabsTrigger>
          <TabsTrigger value="hse">HSE</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card><CardHeader><CardTitle>{isAr ? 'تقرير يومي' : 'Daily Site Report'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Project ID</Label><Input value={daily.project_id || ''} onChange={e => setDaily({ ...daily, project_id: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={daily.report_date} onChange={e => setDaily({ ...daily, report_date: e.target.value })} /></div>
              <div><Label>Weather</Label>
                <Select value={daily.weather} onValueChange={v => setDaily({ ...daily, weather: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['clear','cloudy','rain','windy','hot','sandstorm'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={daily.notes} onChange={e => setDaily({ ...daily, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={() => submit('daily_report', 'cpms_daily_reports', daily, () => setDaily({ ...daily, notes: '' }))}>
                {isAr ? 'حفظ' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa">
          <Card><CardHeader><CardTitle>{isAr ? 'فحص الجودة' : 'QA/QC Checklist'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Project ID</Label><Input value={qa.project_id || ''} onChange={e => setQa({ ...qa, project_id: e.target.value })} /></div>
              <div><Label>Checklist Name</Label><Input value={qa.checklist_name} onChange={e => setQa({ ...qa, checklist_name: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={qa.status} onValueChange={v => setQa({ ...qa, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['pending','in_progress','passed','failed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => submit('qa_checklist', 'cpms_quality_checklists', qa, () => setQa({ ...qa, checklist_name: '' }))}>
                {isAr ? 'حفظ' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hse">
          <Card><CardHeader><CardTitle>HSE Observation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Project ID</Label><Input value={hse.project_id || ''} onChange={e => setHse({ ...hse, project_id: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={hse.observation_type} onValueChange={v => setHse({ ...hse, observation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['unsafe_act','unsafe_condition','near_miss','incident'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={hse.severity} onValueChange={v => setHse({ ...hse, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea rows={3} value={hse.description} onChange={e => setHse({ ...hse, description: e.target.value })} /></div>
              <Button className="w-full" onClick={() => submit('hse_observation', 'cpms_hse_observations', hse, () => setHse({ ...hse, description: '' }))}>
                {isAr ? 'حفظ' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-center text-muted-foreground">
        {online ? (isAr ? 'سيتم الحفظ مباشرةً ومزامنة الأرشيف' : 'Saved directly + audited')
                : (isAr ? 'محفوظ محلياً — سيتم المزامنة تلقائياً عند الاتصال' : 'Saved locally — will sync automatically when online')}
      </p>
    </div>
  );
}
