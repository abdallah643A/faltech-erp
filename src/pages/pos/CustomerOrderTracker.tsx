import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type LookupResult = { found: boolean; order_type?: string; data?: Record<string, any> };

export default function CustomerOrderTracker() {
  const { token: routeToken } = useParams();
  const [token, setToken] = useState(routeToken || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (t: string) => {
    if (!t) return;
    setLoading(true); setError(null); setResult(null);
    const { data, error } = await (supabase as any).rpc('pos_lookup_order_status', { p_token: t });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResult(data as LookupResult);
  };

  useEffect(() => { if (routeToken) lookup(routeToken); }, [routeToken]);

  const statusBadge = (s?: string) => {
    if (!s) return null;
    const v = s.toLowerCase();
    const variant = v.includes('ready') || v.includes('completed') || v.includes('paid') ? 'default'
      : v.includes('progress') || v.includes('partial') ? 'secondary'
      : v.includes('cancel') || v.includes('reject') ? 'destructive' : 'outline';
    return <Badge variant={variant as any} className="text-sm">{s}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <Package className="w-10 h-10 mx-auto text-primary mb-2" />
          <h1 className="text-2xl font-bold tracking-tight">Track Your Order</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the tracking code from your receipt or SMS.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="Tracking code" className="font-mono" />
              <Button onClick={() => lookup(token)} disabled={!token || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Track'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />{error}
            </CardContent>
          </Card>
        )}

        {result && !result.found && (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No order found for that code. Check the code or contact the store.
            </CardContent>
          </Card>
        )}

        {result?.found && result.data && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {result.order_type === 'pickup' ? 'Pickup Order' : result.order_type === 'layaway' ? 'Layaway Plan' : 'Repair Order'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {Object.entries(result.data).map(([k, v]) => v != null && v !== '' && (
                <div key={k} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                  {k === 'status' ? statusBadge(String(v))
                    : <span className="font-medium text-right">{String(v)}</span>}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <CheckCircle2 className="w-3 h-3 text-primary" />Updated in real time from the store system.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
