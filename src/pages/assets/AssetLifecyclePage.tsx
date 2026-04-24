import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCompanyLifecycleEvents, useLifecycleStages, useLogLifecycleEvent } from '@/hooks/useLifecycleSpine';
import { AssetLifecycleTimeline } from '@/components/assets/AssetLifecycleTimeline';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Workflow } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function AssetLifecyclePage() {
  const { data: stages = [] } = useLifecycleStages();
  const { data: recent = [] } = useCompanyLifecycleEvents(50);
  const log = useLogLifecycleEvent();

  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    equipment_id: '',
    stage_code: 'in_service',
    event_type: 'manual',
    title: '',
    description: '',
    financial_impact: '',
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-list-lifecycle'],
    queryFn: async () => {
      const { data } = await supabase.from('cpms_equipment' as any).select('id, name, code, current_lifecycle_stage').order('name').limit(500);
      return (data || []) as any[];
    },
  });

  const stageMap = Object.fromEntries(stages.map(s => [s.stage_code, s]));
  const stageCounts = stages.map(s => ({
    ...s,
    count: equipment.filter((e: any) => e.current_lifecycle_stage === s.stage_code).length,
  }));

  const handleSubmit = async () => {
    if (!form.equipment_id || !form.title) return;
    await log.mutateAsync({
      equipment_id: form.equipment_id,
      stage_code: form.stage_code,
      event_type: form.event_type,
      title: form.title,
      description: form.description || undefined,
      financial_impact: form.financial_impact ? Number(form.financial_impact) : 0,
      source_table: 'manual',
    });
    setShowAdd(false);
    setForm({ ...form, title: '', description: '', financial_impact: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans' }}>
            <Workflow className="h-6 w-6" style={{ color: '#0066cc' }} /> Asset Lifecycle Spine
          </h1>
          <p className="text-sm text-muted-foreground">
            Unified timeline across acquisition, capitalization, maintenance, transfers, warranty, insurance, and disposal
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: '#0066cc' }}><Plus className="h-4 w-4 mr-1" /> Log Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Lifecycle Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.equipment_id} onValueChange={v => setForm({ ...form, equipment_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select asset *" /></SelectTrigger>
                <SelectContent>
                  {equipment.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.code} — {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.stage_code} onValueChange={v => setForm({ ...form, stage_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.stage_code} value={s.stage_code}>{s.stage_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Event type (e.g. inspection, transfer)" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} />
              <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Input type="number" placeholder="Financial impact (SAR)" value={form.financial_impact} onChange={e => setForm({ ...form, financial_impact: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={log.isPending} style={{ backgroundColor: '#0066cc' }}>Log Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {stageCounts.map(s => (
          <Card key={s.stage_code}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color_hex || '#0066cc' }} />
                <span className="text-2xl font-bold">{s.count}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.stage_name}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="asset">By Asset</TabsTrigger>
        </TabsList>
        <TabsContent value="recent">
          <Card>
            <CardHeader><CardTitle className="text-base">Latest Lifecycle Events</CardTitle></CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No lifecycle events recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {recent.map(ev => {
                    const stage = stageMap[ev.stage_code];
                    return (
                      <div key={ev.id} className="flex items-start gap-3 p-2 rounded border hover:bg-muted/50">
                        <span className="h-2 w-2 mt-1.5 rounded-full" style={{ backgroundColor: stage?.color_hex || '#0066cc' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{ev.title}</span>
                            <Badge variant="outline" className="text-[10px]">{stage?.stage_name || ev.stage_code}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{format(new Date(ev.event_date), 'PPp')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="asset" className="space-y-3">
          <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Select an asset" /></SelectTrigger>
            <SelectContent>
              {equipment.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.code} — {e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedEquipment && <AssetLifecycleTimeline equipmentId={selectedEquipment} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
