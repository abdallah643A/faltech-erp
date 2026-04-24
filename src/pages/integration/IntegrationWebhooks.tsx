import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useIntegrationMutations, useIntegrationWebhookDeliveries, useIntegrationWebhooks } from '@/hooks/useIntegrationLayer';
import { Webhook, Plus, RotateCcw } from 'lucide-react';

export default function IntegrationWebhooks() {
  const { data } = useIntegrationWebhooks();
  const { data: deliveries } = useIntegrationWebhookDeliveries();
  const { createSubscription, upsertTopic, replayDelivery } = useIntegrationMutations();
  const [sub, setSub] = useState({ subscription_name: '', endpoint_url: '', topics: 'sales_order.created,business_partner.updated' });
  const [topic, setTopic] = useState({ topic: '', module: '', description: '' });

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6 text-primary" /> Webhook Events</h1><p className="text-sm text-muted-foreground">Topic subscriptions, signed payloads, retry queue, dead-letter, and replay</p></div>

    <div className="grid lg:grid-cols-2 gap-4">
      <Card><CardHeader className="flex-row justify-between items-center"><CardTitle className="text-sm">Topics</CardTitle><Dialog><DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Topic</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Event Topic</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Topic</Label><Input value={topic.topic} onChange={(e) => setTopic({ ...topic, topic: e.target.value })} placeholder="sales_order.created" /></div><div><Label>Module</Label><Input value={topic.module} onChange={(e) => setTopic({ ...topic, module: e.target.value })} /></div><div><Label>Description</Label><Textarea value={topic.description} onChange={(e) => setTopic({ ...topic, description: e.target.value })} /></div><Button onClick={() => upsertTopic.mutate(topic)} className="w-full">Save</Button></div></DialogContent></Dialog></CardHeader><CardContent className="space-y-2">{(data?.topics || []).map((t: any) => <div key={t.id} className="p-3 border rounded-md"><p className="font-medium text-sm">{t.topic}</p><p className="text-xs text-muted-foreground">{t.module} · {t.description}</p></div>)}{!data?.topics?.length && <p className="text-sm text-muted-foreground text-center py-8">No topics yet</p>}</CardContent></Card>

      <Card><CardHeader className="flex-row justify-between items-center"><CardTitle className="text-sm">Subscriptions</CardTitle><Dialog><DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Subscription</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Name</Label><Input value={sub.subscription_name} onChange={(e) => setSub({ ...sub, subscription_name: e.target.value })} /></div><div><Label>Endpoint URL</Label><Input value={sub.endpoint_url} onChange={(e) => setSub({ ...sub, endpoint_url: e.target.value })} /></div><div><Label>Topics</Label><Textarea value={sub.topics} onChange={(e) => setSub({ ...sub, topics: e.target.value })} /></div><Button onClick={() => createSubscription.mutate({ ...sub, topics: sub.topics.split(',').map((x) => x.trim()).filter(Boolean) })} className="w-full">Create</Button></div></DialogContent></Dialog></CardHeader><CardContent className="space-y-2">{(data?.subscriptions || []).map((s: any) => <div key={s.id} className="p-3 border rounded-md"><div className="flex justify-between"><p className="font-medium text-sm">{s.subscription_name}</p><Badge>{s.status}</Badge></div><p className="text-xs text-muted-foreground break-all">{s.endpoint_url}</p><div className="flex flex-wrap gap-1 mt-2">{(s.topics || []).map((t: string) => <Badge key={t} variant="outline">{t}</Badge>)}</div></div>)}{!data?.subscriptions?.length && <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet</p>}</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="text-sm">Delivery Queue</CardTitle></CardHeader><CardContent className="space-y-2">{(deliveries || []).map((d: any) => <div key={d.id} className="flex items-center gap-3 p-3 border rounded-md"><Badge variant={d.status === 'delivered' ? 'default' : d.status === 'dead_letter' ? 'destructive' : 'secondary'}>{d.status}</Badge><div className="flex-1"><p className="font-medium text-sm">{d.topic}</p><p className="text-xs text-muted-foreground">{d.integration_webhook_subscriptions?.subscription_name || 'Subscription'} · attempts {d.attempt_count}/{d.max_attempts}</p></div><Button variant="outline" size="sm" onClick={() => replayDelivery.mutate(d.id)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Replay</Button></div>)}{!deliveries?.length && <p className="text-sm text-muted-foreground text-center py-8">No deliveries queued</p>}</CardContent></Card>
  </div>;
}
