import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award } from 'lucide-react';
import { format } from 'date-fns';
import { useScorecardPublications } from '@/hooks/useSupplierPortalEnhanced';

export default function SupplierPortalScorecard({ account }: { account: any }) {
  const { data: scorecards = [] } = useScorecardPublications(account.vendor_id, account.id);
  const latest: any = scorecards[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Performance Scorecard</h2>
        <p className="text-sm text-muted-foreground">Your performance metrics published by the buyer</p>
      </div>

      {latest && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" />Latest Period: {latest.period_start} → {latest.period_end}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-primary">{latest.overall_score?.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-muted-foreground">Overall Score (out of 100)</p>
            </div>
            {latest.metrics && Object.keys(latest.metrics).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(latest.metrics).map(([k, v]: any) => (
                  <div key={k} className="p-3 border rounded">
                    <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="text-lg font-semibold">{typeof v === 'number' ? v.toFixed(1) : String(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" />History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {scorecards.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No published scorecards yet</p> :
            scorecards.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border-b last:border-0 py-2">
                <div>
                  <p className="text-sm font-medium">{s.period_start} → {s.period_end}</p>
                  <p className="text-xs text-muted-foreground">Published {format(new Date(s.published_at), 'dd MMM yyyy')}</p>
                </div>
                <Badge variant="outline">{s.overall_score?.toFixed(1) || '-'}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
