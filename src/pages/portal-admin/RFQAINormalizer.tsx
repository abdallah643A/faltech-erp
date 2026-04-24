import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';
import { useRfqNormalize, useRfqNormalizations } from '@/hooks/usePortalEnhanced';

export default function RFQAINormalizer() {
  const [rfqId, setRfqId] = useState('');
  const [responsesJson, setResponsesJson] = useState('');
  const normalize = useRfqNormalize();
  const { data: history = [] } = useRfqNormalizations(rfqId || undefined);

  const run = () => {
    if (!rfqId) return;
    let responses: any[] = [];
    try { responses = JSON.parse(responsesJson); } catch { return; }
    normalize.mutate({ rfq_id: rfqId, responses });
  };

  const last = (history as any[])[0];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2"><Sparkles className="h-6 w-6" /><h1 className="text-2xl font-bold">RFQ AI Bid Normalization</h1></div>

      <Card>
        <CardHeader><CardTitle>Run normalization</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>RFQ ID</Label><Input value={rfqId} onChange={e => setRfqId(e.target.value)} placeholder="UUID of the RFQ" /></div>
          <div>
            <Label>Bids JSON (array)</Label>
            <Textarea
              rows={8}
              value={responsesJson}
              onChange={e => setResponsesJson(e.target.value)}
              placeholder='[{"supplier":"Acme","quoted_price":12000,"currency":"USD","lead_time_days":21,"notes":"includes shipping"}]'
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={run} disabled={normalize.isPending || !rfqId}>
            {normalize.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Normalize bids with AI
          </Button>
        </CardContent>
      </Card>

      {last && (
        <Card>
          <CardHeader><CardTitle>Latest scorecard</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(last.scorecard ?? []).map((s: any, i: number) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between"><p className="font-semibold">{s.supplier}</p><Badge>{Math.round(s.score)}</Badge></div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.normalized_price?.toLocaleString()} {s.currency} · {s.lead_time_days} days · {Math.round(s.scope_coverage_pct ?? 0)}% scope
                  </p>
                  {s.notes && <p className="text-xs mt-2">{s.notes}</p>}
                </div>
              ))}
            </div>
            {last.recommendations?.winner && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-900">🏆 Recommended: {last.recommendations.winner}</p>
                <p className="text-sm text-green-800 mt-1">{last.recommendations.reasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
