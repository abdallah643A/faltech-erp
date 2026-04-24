import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecipeVariance } from '@/hooks/useRestaurantEnhanced';
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export default function RestaurantRecipeVariance() {
  const { data: variance } = useRecipeVariance();

  const totalLoss = (variance || []).reduce((s: number, v: any) => s + Math.max(0, Number(v.variance_cost)), 0);
  const criticalCount = (variance || []).filter((v: any) => Math.abs(Number(v.variance_pct || 0)) > 10).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-primary" /> Recipe Variance</h1>
        <p className="text-sm text-muted-foreground">Theoretical vs actual ingredient consumption</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Items Tracked</p><p className="text-2xl font-bold">{variance?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Loss Value (SAR)</p><p className="text-2xl font-bold text-red-600">{totalLoss.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical (&gt;10%)</p><p className="text-2xl font-bold text-orange-600">{criticalCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Top Variances</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(variance || []).map((v: any) => {
              const pct = Number(v.variance_pct || 0);
              const isLoss = pct > 0;
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isLoss ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {isLoss ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{v.ingredient_name || v.ingredient_item_code}</p>
                    <p className="text-xs text-muted-foreground">
                      Theory: {Number(v.theoretical_qty).toFixed(2)} {v.uom} · Actual: {Number(v.actual_qty).toFixed(2)} {v.uom}
                    </p>
                  </div>
                  <Badge variant={Math.abs(pct) > 10 ? 'destructive' : 'secondary'}>
                    {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                  </Badge>
                  <div className="text-right text-sm font-mono w-24">SAR {Number(v.variance_cost).toFixed(2)}</div>
                </div>
              );
            })}
            {!variance?.length && <p className="text-sm text-muted-foreground text-center py-8">No variance data — run variance calculation first</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
