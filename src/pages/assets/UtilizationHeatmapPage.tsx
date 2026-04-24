import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Sparkles } from 'lucide-react';
import { useUtilizationHeatmap } from '@/hooks/useAssetEnhanced';

export default function UtilizationHeatmapPage() {
  const { data: cells = [], generateDemo } = useUtilizationHeatmap(14);

  const grid = useMemo(() => {
    const days: Record<string, Record<number, number>> = {};
    cells.forEach((c: any) => {
      days[c.day_date] ||= {};
      // average if multiple assets
      const cur = days[c.day_date][c.hour_of_day];
      days[c.day_date][c.hour_of_day] = cur != null ? (cur + Number(c.utilization_pct)) / 2 : Number(c.utilization_pct);
    });
    return days;
  }, [cells]);

  const sortedDays = Object.keys(grid).sort().reverse();
  const cellColor = (v: number) => {
    if (v == null) return 'hsl(var(--muted))';
    if (v >= 80) return 'hsl(142 71% 45%)';
    if (v >= 60) return 'hsl(142 60% 60%)';
    if (v >= 40) return 'hsl(48 96% 53%)';
    if (v >= 20) return 'hsl(25 95% 60%)';
    return 'hsl(var(--muted))';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Utilization Heatmap</h1>
          <p className="text-muted-foreground">14-day hourly utilization across assets</p>
        </div>
        <Button onClick={() => generateDemo.mutate(undefined)} disabled={generateDemo.isPending} variant="outline"><Sparkles className="h-4 w-4 mr-2" />Generate Demo Data</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Heatmap (rows = days, cols = hours)</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(var(--muted))' }} />0-20%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(25 95% 60%)' }} />20-40%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(48 96% 53%)' }} />40-60%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(142 60% 60%)' }} />60-80%</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(142 71% 45%)' }} />80-100%</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto">
          {sortedDays.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data — click "Generate Demo Data"</p>
          ) : (
            <div className="inline-block">
              <div className="flex gap-1 mb-1 ml-20">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-6 text-[9px] text-center text-muted-foreground">{h}</div>
                ))}
              </div>
              {sortedDays.map(day => (
                <div key={day} className="flex gap-1 mb-1 items-center">
                  <div className="w-20 text-[10px] text-muted-foreground font-mono">{day.slice(5)}</div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const v = grid[day]?.[h];
                    return (
                      <div
                        key={h}
                        title={`${day} ${h}:00 → ${v != null ? Math.round(v) : '–'}%`}
                        className="w-6 h-6 rounded"
                        style={{ background: cellColor(v) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
