import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOpportunities } from '@/hooks/useOpportunities';
import { Clock, AlertTriangle, TrendingUp, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { EmptyChartState } from '@/components/ui/empty-chart-state';
import { ChartSkeleton } from '@/components/ui/skeleton-loaders';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SalesCyclePrediction() {
  const { opportunities } = useOpportunities();

  const predictions = useMemo(() => {
    return opportunities.map(opp => {
      const createdAt = new Date(opp.created_at).getTime();
      const now = Date.now();
      const daysInPipeline = Math.floor((now - createdAt) / 86400000);

      // Simulate prediction based on stage and probability
      const stageWeights: Record<string, number> = {
        'prospect': 0.1, 'qualification': 0.2, 'proposal': 0.4,
        'negotiation': 0.6, 'closed_won': 1, 'closed_lost': 0,
      };
      const stageWeight = stageWeights[opp.stage] || 0.3;
      const closureProbability = Math.round(((opp.probability / 100) * 0.5 + stageWeight * 0.5) * 100);

      // Estimated days to close
      const avgCycleDays = 45;
      const estimatedDaysRemaining = Math.max(1, Math.round(avgCycleDays * (1 - stageWeight)));
      const estimatedCloseDate = new Date(now + estimatedDaysRemaining * 86400000);

      // Risk assessment
      const isStalled = daysInPipeline > 60 && stageWeight < 0.4;
      const isOverdue = opp.expected_close && new Date(opp.expected_close).getTime() < now;
      const riskLevel = isStalled || isOverdue ? 'high' : closureProbability < 40 ? 'medium' : 'low';

      // Bottleneck detection
      let bottleneck = null;
      if (isStalled) bottleneck = 'Deal stalled - no stage progression';
      else if (isOverdue) bottleneck = 'Past expected close date';
      else if (daysInPipeline > 30 && stageWeight < 0.3) bottleneck = 'Slow qualification progress';

      return {
        ...opp, daysInPipeline, closureProbability, estimatedDaysRemaining,
        estimatedCloseDate, riskLevel, bottleneck, isStalled, isOverdue,
      };
    }).sort((a, b) => b.value - a.value);
  }, [opportunities]);

  const atRisk = predictions.filter(p => p.riskLevel === 'high');
  const avgCycle = predictions.length > 0 ? Math.round(predictions.reduce((s, p) => s + p.daysInPipeline, 0) / predictions.length) : 0;
  const totalPipelineValue = predictions.reduce((s, p) => s + p.value, 0);
  const weightedValue = predictions.reduce((s, p) => s + p.value * (p.closureProbability / 100), 0);

  const stageDistribution = useMemo(() => {
    const stages: Record<string, { count: number; value: number }> = {};
    predictions.forEach(p => {
      if (!stages[p.stage]) stages[p.stage] = { count: 0, value: 0 };
      stages[p.stage].count++;
      stages[p.stage].value += p.value;
    });
    return Object.entries(stages).map(([stage, d]) => ({ stage, ...d }));
  }, [predictions]);

  const riskColor = (r: string) => r === 'high' ? 'bg-red-500/10 text-red-600 border-red-200' : r === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-200';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales Cycle Prediction</h1>
        <p className="text-muted-foreground">Predict deal closure dates & identify pipeline bottlenecks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TooltipProvider>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{avgCycle}d</div>
              <p className="text-sm text-muted-foreground">Avg Cycle Length</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Average number of days opportunities spend in the pipeline</p></TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{totalPipelineValue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Total value of all active opportunities</p></TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{weightedValue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Weighted Value</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Pipeline value weighted by closure probability</p></TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="pt-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{atRisk.length}</div>
              <p className="text-sm text-muted-foreground">At Risk Deals</p>
            </CardContent></Card>
          </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Deals stalled or past expected close date</p></TooltipContent></UITooltip>
        </TooltipProvider>
      </div>

      <Card>
        <CardHeader><CardTitle>Pipeline Stage Distribution</CardTitle></CardHeader>
        <CardContent className="h-64">
          {stageDistribution.length === 0 ? (
            <EmptyChartState message="No pipeline data available" height={240} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Deal Predictions</h2>
        {predictions.slice(0, 30).map(p => (
          <Card key={p.id}>
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{p.name}</span>
                  <Badge variant="outline">{p.stage}</Badge>
                  <Badge className={riskColor(p.riskLevel)}>{p.riskLevel} risk</Badge>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{p.company}</span>
                  <span>Value: {p.value.toLocaleString()}</span>
                  <span>{p.daysInPipeline}d in pipeline</span>
                  {p.bottleneck && <span className="text-red-500">⚠ {p.bottleneck}</span>}
                </div>
              </div>
              <div className="text-center w-32">
                <div className="text-xs text-muted-foreground">Closure Prob</div>
                <div className="text-lg font-bold text-foreground">{p.closureProbability}%</div>
                <Progress value={p.closureProbability} className="h-1.5 mt-1" />
              </div>
              <div className="text-center w-28">
                <div className="text-xs text-muted-foreground">Est. Close</div>
                <div className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {p.estimatedCloseDate.toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">{p.estimatedDaysRemaining}d remaining</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {predictions.length === 0 && <p className="text-center text-muted-foreground py-8">No opportunities in pipeline</p>}
      </div>
    </div>
  );
}
