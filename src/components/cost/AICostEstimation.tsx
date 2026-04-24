import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, DollarSign, Loader2 } from 'lucide-react';

export function AICostEstimation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    project_type: 'commercial', scope: '', duration_months: '', team_size: '', location: 'Riyadh',
  });

  const handleEstimate = () => {
    setLoading(true);
    // Simulate AI estimation based on inputs
    setTimeout(() => {
      const baseCost = Number(form.duration_months) * Number(form.team_size) * 15000;
      const locationMultiplier = form.location === 'Riyadh' ? 1.2 : form.location === 'Jeddah' ? 1.15 : 1.0;
      const typeMultiplier = form.project_type === 'industrial' ? 1.4 : form.project_type === 'infrastructure' ? 1.6 : 1.0;
      const estimated = Math.round(baseCost * locationMultiplier * typeMultiplier);
      
      setResult({
        estimated_cost: estimated,
        confidence: 78,
        low_range: Math.round(estimated * 0.85),
        high_range: Math.round(estimated * 1.2),
        breakdown: [
          { category: 'Labor', amount: Math.round(estimated * 0.45), pct: 45 },
          { category: 'Materials', amount: Math.round(estimated * 0.3), pct: 30 },
          { category: 'Equipment', amount: Math.round(estimated * 0.12), pct: 12 },
          { category: 'Overhead', amount: Math.round(estimated * 0.08), pct: 8 },
          { category: 'Contingency', amount: Math.round(estimated * 0.05), pct: 5 },
        ],
        insights: [
          'Similar projects averaged 10% over initial estimates in the last 12 months',
          'Material costs in this region have increased 8% YoY',
          'Consider adding 5% buffer for regulatory compliance costs',
        ],
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">AI-Powered Cost Estimation</h3>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['commercial', 'residential', 'industrial', 'infrastructure', 'renovation'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Scope / Description" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} />
            <Input type="number" placeholder="Duration (months)" value={form.duration_months} onChange={e => setForm(f => ({ ...f, duration_months: e.target.value }))} />
            <Input type="number" placeholder="Team Size" value={form.team_size} onChange={e => setForm(f => ({ ...f, team_size: e.target.value }))} />
            <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Riyadh', 'Jeddah', 'Dammam', 'NEOM', 'Other'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleEstimate} disabled={loading || !form.duration_months || !form.team_size}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
            {loading ? 'Analyzing...' : 'Generate Estimate'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-primary/30"><CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1 mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Estimated Cost</span></div>
              <p className="text-2xl font-bold text-primary">{result.estimated_cost.toLocaleString()} SAR</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <p className="text-2xl font-bold">{result.confidence}%</p>
              <Progress value={result.confidence} className="h-1.5 mt-1" />
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4">
              <span className="text-xs text-muted-foreground">Low Range</span>
              <p className="text-2xl font-bold">{result.low_range.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 px-4">
              <span className="text-xs text-muted-foreground">High Range</span>
              <p className="text-2xl font-bold">{result.high_range.toLocaleString()}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cost Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.breakdown.map((b: any) => (
                  <div key={b.category} className="flex items-center justify-between">
                    <span className="text-sm">{b.category}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={b.pct} className="h-1.5 w-24" />
                      <span className="text-sm font-medium w-20 text-right">{b.amount.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground w-8">{b.pct}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><TrendingUp className="h-4 w-4" /> AI Insights</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.insights.map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{i + 1}</Badge>
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
