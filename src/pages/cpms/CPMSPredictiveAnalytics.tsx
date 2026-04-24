import { useState } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSPredictive, Prediction } from '@/hooks/useCPMSPredictive';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Brain, TrendingUp, TrendingDown, Calendar, DollarSign, AlertTriangle,
  RefreshCw, Zap, Target, BarChart3, ArrowRight,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSPredictiveAnalytics() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { predictions, loading, generatePrediction, whatIfScenario } = useCPMSPredictive(selectedProjectId || undefined);

  const [spiAdjust, setSpiAdjust] = useState(0);
  const [cpiAdjust, setCpiAdjust] = useState(0);
  const [generating, setGenerating] = useState(false);

  const latest = predictions[0] as Prediction | undefined;

  const handleGenerate = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    await generatePrediction(selectedProjectId);
    setGenerating(false);
  };

  const scenario = latest ? whatIfScenario(latest, { spiChange: spiAdjust / 100, cpiChange: cpiAdjust / 100 }) : null;

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const riskColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const riskLabel = (score?: number) => {
    if (!score) return 'N/A';
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Predictive Analytics
          </h1>
          <p className="text-sm text-muted-foreground">التحليلات التنبؤية – Forecasting & What-If</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={!selectedProjectId || generating}>
            <Zap className="h-4 w-4 mr-1" />{generating ? 'Generating...' : 'Generate Forecast'}
          </Button>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Select a project to view predictive analytics</CardContent></Card>
      ) : !latest ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No predictions yet. Generate a forecast based on current project data.</p>
            <Button onClick={handleGenerate} disabled={generating}><Zap className="h-4 w-4 mr-1" />Generate Now</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Predicted Completion</p>
                <p className="text-lg font-bold mt-1">{latest.predicted_completion ? format(new Date(latest.predicted_completion), 'dd MMM yyyy') : 'N/A'}</p>
                {selectedProject?.end_date && latest.predicted_completion && (
                  <p className="text-xs mt-1">
                    {new Date(latest.predicted_completion) > new Date(selectedProject.end_date)
                      ? <span className="text-red-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" />Late by {Math.round((new Date(latest.predicted_completion).getTime() - new Date(selectedProject.end_date).getTime()) / 86400000)} days</span>
                      : <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />On schedule</span>
                    }
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Predicted Final Cost</p>
                <p className="text-lg font-bold mt-1">{latest.predicted_final_cost ? `${(latest.predicted_final_cost / 1000000).toFixed(1)}M` : 'N/A'}</p>
                {selectedProject?.contract_value && latest.predicted_final_cost && (
                  <p className="text-xs mt-1">
                    {latest.predicted_final_cost > selectedProject.contract_value
                      ? <span className="text-red-600">{((latest.predicted_final_cost / selectedProject.contract_value - 1) * 100).toFixed(0)}% over budget</span>
                      : <span className="text-green-600">Within budget</span>
                    }
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Cost Overrun Risk</p>
                <p className="text-lg font-bold mt-1">{latest.cost_overrun_probability ?? 'N/A'}%</p>
                <Progress value={latest.cost_overrun_probability || 0} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${(latest.schedule_risk_score || 0) >= 70 ? 'border-l-red-500' : (latest.schedule_risk_score || 0) >= 40 ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Schedule Risk</p>
                <p className={`text-lg font-bold mt-1 ${riskColor(latest.schedule_risk_score)}`}>{riskLabel(latest.schedule_risk_score)}</p>
                <p className="text-xs text-muted-foreground">Score: {latest.schedule_risk_score ?? 'N/A'}/100</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="forecast">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="forecast"><Target className="h-4 w-4 mr-1" />Forecast</TabsTrigger>
              <TabsTrigger value="burndown"><BarChart3 className="h-4 w-4 mr-1" />Burndown</TabsTrigger>
              <TabsTrigger value="whatif"><Zap className="h-4 w-4 mr-1" />What-If</TabsTrigger>
            </TabsList>

            {/* Forecast Tab */}
            <TabsContent value="forecast" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Confidence Intervals */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Completion Confidence Intervals</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-xs"><span className="font-medium">80% Confidence</span><Badge variant="secondary">Most Likely</Badge></div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{latest.confidence_80_early ? format(new Date(latest.confidence_80_early), 'dd MMM yyyy') : '?'}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{latest.confidence_80_late ? format(new Date(latest.confidence_80_late), 'dd MMM yyyy') : '?'}</span>
                        </div>
                      </div>
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-xs"><span className="font-medium">95% Confidence</span><Badge variant="outline">Conservative</Badge></div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{latest.confidence_95_early ? format(new Date(latest.confidence_95_early), 'dd MMM yyyy') : '?'}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{latest.confidence_95_late ? format(new Date(latest.confidence_95_late), 'dd MMM yyyy') : '?'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SPI/CPI Trends */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Trends (SPI/CPI)</CardTitle></CardHeader>
                  <CardContent>
                    {latest.trend_data && (latest.trend_data as any[]).length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={latest.trend_data as any[]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={10} tickFormatter={d => d?.slice(5)} />
                          <YAxis fontSize={10} domain={[0.5, 1.5]} />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Target" />
                          <Line type="monotone" dataKey="spi" stroke="hsl(217, 91%, 60%)" strokeWidth={2} name="SPI" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="cpi" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="CPI" dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground text-sm">No trend data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Burndown Tab */}
            <TabsContent value="burndown" className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Project Burndown Chart</CardTitle><CardDescription>Planned vs Actual remaining work</CardDescription></CardHeader>
                <CardContent>
                  {latest.burndown_data && (latest.burndown_data as any[]).length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={latest.burndown_data as any[]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={10} tickFormatter={d => d?.slice(5)} />
                        <YAxis fontSize={10} label={{ value: 'Remaining %', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="planned" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" name="Planned" />
                        <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} name="Actual" connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-12 text-muted-foreground">No burndown data</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* What-If Tab */}
            <TabsContent value="whatif" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Scenario Adjustments</CardTitle><CardDescription>Drag sliders to model changes</CardDescription></CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Schedule Performance (SPI) Change</Label>
                        <Badge variant={spiAdjust > 0 ? 'default' : spiAdjust < 0 ? 'destructive' : 'secondary'}>{spiAdjust > 0 ? '+' : ''}{spiAdjust}%</Badge>
                      </div>
                      <Slider value={[spiAdjust]} onValueChange={v => setSpiAdjust(v[0])} min={-50} max={50} step={5} />
                      <p className="text-xs text-muted-foreground mt-1">Positive = faster execution, Negative = slower</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Cost Performance (CPI) Change</Label>
                        <Badge variant={cpiAdjust > 0 ? 'default' : cpiAdjust < 0 ? 'destructive' : 'secondary'}>{cpiAdjust > 0 ? '+' : ''}{cpiAdjust}%</Badge>
                      </div>
                      <Slider value={[cpiAdjust]} onValueChange={v => setCpiAdjust(v[0])} min={-50} max={50} step={5} />
                      <p className="text-xs text-muted-foreground mt-1">Positive = cost savings, Negative = cost increase</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Scenario Results</CardTitle></CardHeader>
                  <CardContent>
                    {scenario ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">New Completion Date</p>
                          <p className="text-lg font-bold">{format(new Date(scenario.newCompletion), 'dd MMM yyyy')}</p>
                          <p className={`text-xs ${scenario.daysDifference > 0 ? 'text-red-600' : scenario.daysDifference < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {scenario.daysDifference > 0 ? `+${scenario.daysDifference} days` : scenario.daysDifference < 0 ? `${scenario.daysDifference} days (earlier)` : 'No change'}
                          </p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">New Final Cost</p>
                          <p className="text-lg font-bold">{(scenario.newCost / 1000000).toFixed(2)}M SAR</p>
                          <p className={`text-xs ${scenario.costDifference > 0 ? 'text-red-600' : scenario.costDifference < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {scenario.costDifference > 0 ? `+${(scenario.costDifference / 1000000).toFixed(2)}M` : scenario.costDifference < 0 ? `${(scenario.costDifference / 1000000).toFixed(2)}M (savings)` : 'No change'}
                          </p>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <p className="text-xs font-medium mb-1">Impact Summary</p>
                          <p className="text-xs text-muted-foreground">
                            {spiAdjust !== 0 && `A ${Math.abs(spiAdjust)}% ${spiAdjust > 0 ? 'improvement' : 'decline'} in schedule performance `}
                            {spiAdjust !== 0 && cpiAdjust !== 0 && 'combined with '}
                            {cpiAdjust !== 0 && `a ${Math.abs(cpiAdjust)}% ${cpiAdjust > 0 ? 'improvement' : 'decline'} in cost performance `}
                            {(spiAdjust !== 0 || cpiAdjust !== 0) ? `would result in completion on ${scenario.newCompletion} with a final cost of ${(scenario.newCost / 1000000).toFixed(2)}M SAR.` : 'Adjust the sliders to model scenarios.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">Adjust sliders to see scenario results</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Prediction History */}
          {predictions.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Prediction History</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {predictions.map((p, i) => (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded text-sm ${i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
                      <div className="flex items-center gap-3">
                        <Badge variant={i === 0 ? 'default' : 'secondary'} className="text-[10px]">{i === 0 ? 'Latest' : `v${predictions.length - i}`}</Badge>
                        <span className="text-xs">{p.prediction_date}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span>Completion: {p.predicted_completion || '—'}</span>
                        <span>Cost: {p.predicted_final_cost ? `${(p.predicted_final_cost / 1000000).toFixed(1)}M` : '—'}</span>
                        <span className={riskColor(p.schedule_risk_score)}>Risk: {riskLabel(p.schedule_risk_score)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
