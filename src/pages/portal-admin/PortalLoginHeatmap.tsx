import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortalLoginAttempts } from '@/hooks/usePortalEnhanced';
import { Activity } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PortalLoginHeatmap() {
  const [params] = useSearchParams();
  const portalId = params.get('portal_id') || '';
  const { data: attempts = [] } = usePortalLoginAttempts(portalId, 30);

  const grid = useMemo(() => {
    const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const a of attempts as any[]) {
      const d = new Date(a.attempted_at);
      m[d.getDay()][d.getHours()]++;
    }
    return m;
  }, [attempts]);

  const max = Math.max(1, ...grid.flat());
  const success = (attempts as any[]).filter(a => a.success).length;
  const fail = (attempts as any[]).length - success;

  if (!portalId) {
    return <div className="container mx-auto py-6"><Card><CardContent className="pt-6 text-center text-muted-foreground">Pass <code>?portal_id=&lt;id&gt;</code> in URL.</CardContent></Card></div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2"><Activity className="h-6 w-6" /><h1 className="text-2xl font-bold">Login Heatmap (last 30 days)</h1></div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total attempts</p><p className="text-2xl font-bold">{attempts.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Successful</p><p className="text-2xl font-bold text-green-600">{success}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-600">{fail}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity by day & hour</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr><th className="w-12" />{HOURS.map(h => <th key={h} className="w-7 text-center text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {DAYS.map((d, di) => (
                  <tr key={d}>
                    <td className="pr-2 text-muted-foreground">{d}</td>
                    {HOURS.map(h => {
                      const c = grid[di][h];
                      const intensity = c / max;
                      return (
                        <td key={h} className="p-0.5">
                          <div
                            className="w-6 h-6 rounded-sm"
                            style={{ backgroundColor: c === 0 ? 'hsl(var(--muted))' : `hsl(var(--primary) / ${0.15 + intensity * 0.85})` }}
                            title={`${d} ${h}:00 — ${c} attempts`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
