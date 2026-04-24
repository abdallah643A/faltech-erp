import { useFinancialClose } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const statusStyle = (s: string) => {
  switch (s) {
    case 'completed': return 'bg-green-100 border-green-400 text-green-800';
    case 'in_progress': return 'bg-blue-100 border-blue-400 text-blue-800';
    case 'review': return 'bg-amber-100 border-amber-400 text-amber-800';
    default: return 'bg-muted border-border text-muted-foreground';
  }
};

export default function CloseCalendar() {
  const { periods } = useFinancialClose();
  const years = [...new Set(periods.map(p => p.fiscal_year))].sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Close Calendar</h1>
        <p className="text-muted-foreground">Timeline view of close periods by fiscal year</p>
      </div>
      {years.map(year => (
        <Card key={year}>
          <CardHeader><CardTitle>{year}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2">
              {months.map((m, i) => {
                const period = periods.find(p => p.fiscal_year === year && p.period_number === i + 1 && p.period_type === 'month_end');
                return (
                  <div key={i} className={`p-3 rounded-lg border-2 text-center text-sm ${period ? statusStyle(period.status) : 'bg-muted/30 border-dashed border-muted'}`}>
                    <div className="font-medium">{m}</div>
                    {period && (
                      <>
                        <div className="text-xs mt-1">{period.readiness_score || 0}%</div>
                        <Badge variant="outline" className="mt-1 text-[10px] px-1">{period.status.replace('_', ' ')}</Badge>
                      </>
                    )}
                    {!period && <div className="text-xs mt-1 opacity-50">—</div>}
                  </div>
                );
              })}
            </div>
            {/* Quarter markers */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[1, 2, 3, 4].map(q => {
                const qp = periods.find(p => p.fiscal_year === year && p.period_number === q && p.period_type === 'quarter_end');
                return (
                  <div key={q} className={`p-2 rounded border text-center text-sm ${qp ? statusStyle(qp.status) : 'bg-muted/20 border-dashed'}`}>
                    <span className="font-medium">Q{q}</span>
                    {qp && <Badge variant="outline" className="ml-2 text-[10px]">{qp.readiness_score}%</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
