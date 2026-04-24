import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAggregatorWebhooks } from '@/hooks/useRestaurantEnhanced';
import { Webhook, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function RestaurantAggregatorHub() {
  const { data: webhooks } = useAggregatorWebhooks();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/restaurant-aggregator-webhook`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied');
  };

  const providers = ['talabat', 'hungerstation', 'jahez', 'ubereats', 'deliveroo'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6 text-primary" /> Aggregator Hub</h1>
        <p className="text-sm text-muted-foreground">Provider-agnostic webhook ingest for delivery platforms</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Webhook Endpoint</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted rounded font-mono text-xs">
            <code className="flex-1 break-all">{webhookUrl}</code>
            <Button size="sm" variant="ghost" onClick={copyUrl}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.map(p => <Badge key={p} variant="outline" className="capitalize">{p}</Badge>)}
          </div>
          <p className="text-xs text-muted-foreground">
            Configure each aggregator to POST orders to this endpoint. Required body fields: <code>provider</code>, <code>company_id</code>, <code>external_order_id</code>, <code>event_type</code>, <code>order</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Webhooks ({webhooks?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(webhooks || []).map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 p-3 border rounded-lg">
                {w.processed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{w.provider}</Badge>
                    <span className="text-sm font-medium">{w.event_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Ext ID: {w.external_order_id || 'n/a'}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(w.received_at).toLocaleString()}</span>
              </div>
            ))}
            {!webhooks?.length && <p className="text-sm text-muted-foreground text-center py-8">No webhooks received yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
