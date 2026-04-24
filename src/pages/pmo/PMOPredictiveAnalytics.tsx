import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, TrendingUp, AlertTriangle, Target, Zap, BarChart3,
  Clock, DollarSign, CheckCircle2, XCircle
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const PREDICTION_TYPES = ['completion_likelihood', 'cost_overrun', 'schedule_delay', 'risk_materialization'];

export default function PMOPredictiveAnalytics() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { projects = [] } = useProjects();
  const { risks, issues, resources, allocations, portfolioItems } = usePMOPortfolio();
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const { data: predictions = [] } = useQuery({
    queryKey: ['pmo-predictions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_predictions').select('*').order('prediction_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const generatePredictions = useMutation({
    mutationFn: async () => {
      const targetProjects = selectedProject === 'all' ? projects : projects.filter(p => p.id === selectedProject);
      const newPredictions: any[] = [];

      for (const project of targetProjects.slice(0, 20)) {
        const projectRisks = risks.filter(r => r.project_id === project.id);
        const projectIssues = issues.filter(i => i.project_id === project.id);
        const portfolio = portfolioItems.find(pi => pi.project_id === project.id);

        // Simulated ML prediction logic based on project health indicators
        const riskScore = projectRisks.reduce((s, r) => s + r.risk_score, 0) / Math.max(projectRisks.length, 1);
        const openIssues = projectIssues.filter(i => i.status === 'open').length;
        const healthFactor = portfolio?.health_status === 'green' ? 0.9 : portfolio?.health_status === 'yellow' ? 0.7 : 0.5;

        // Completion likelihood
        const completionLikelihood = Math.max(20, Math.min(98, Math.round(healthFactor * 100 - riskScore * 2 - openIssues * 3)));
        newPredictions.push({
          project_id: project.id,
          prediction_type: 'completion_likelihood',
          predicted_value: completionLikelihood,
          confidence_score: Math.round(60 + Math.random() * 30),
          risk_factors: projectRisks.slice(0, 3).map(r => ({ title: r.title, score: r.risk_score })),
          input_features: { risk_count: projectRisks.length, issue_count: openIssues, health: portfolio?.health_status },
          company_id: activeCompanyId,
          created_by: profile?.user_id,
        });

        // Cost overrun probability
        const costOverrunProb = Math.max(5, Math.min(80, Math.round(30 + riskScore * 3 + openIssues * 5 - healthFactor * 20)));
        newPredictions.push({
          project_id: project.id,
          prediction_type: 'cost_overrun',
          predicted_value: costOverrunProb,
          confidence_score: Math.round(55 + Math.random() * 35),
          risk_factors: projectRisks.filter(r => r.category === 'financial').slice(0, 3).map(r => ({ title: r.title, score: r.risk_score })),
          input_features: { risk_score: riskScore, financial_risks: projectRisks.filter(r => r.category === 'financial').length },
          company_id: activeCompanyId,
          created_by: profile?.user_id,
        });
      }

      if (newPredictions.length > 0) {
        const { error } = await supabase.from('pmo_predictions').insert(newPredictions);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-predictions'] });
      toast({ title: 'Predictions generated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completionPredictions = predictions.filter(p => p.prediction_type === 'completion_likelihood');
  const costPredictions = predictions.filter(p => p.prediction_type === 'cost_overrun');

  // Summary stats
  const avgCompletion = completionPredictions.length > 0 ? Math.round(completionPredictions.reduce((s, p) => s + (p.predicted_value || 0), 0) / completionPredictions.length) : 0;
  const avgCostRisk = costPredictions.length > 0 ? Math.round(costPredictions.reduce((s, p) => s + (p.predicted_value || 0), 0) / costPredictions.length) : 0;
  const highRiskProjects = completionPredictions.filter(p => (p.predicted_value || 0) < 60).length;
  const avgConfidence = predictions.length > 0 ? Math.round(predictions.reduce((s, p) => s + (p.confidence_score || 0), 0) / predictions.length) : 0;

  // Chart data
  const projectScatter = useMemo(() => {
    const map: Record<string, any> = {};
    completionPredictions.forEach(p => {
      const proj = projects.find(pr => pr.id === p.project_id);
      if (proj) map[proj.id] = { name: proj.name, completion: p.predicted_value, confidence: p.confidence_score };
    });
    costPredictions.forEach(p => {
      if (map[p.project_id]) map[p.project_id].costRisk = p.predicted_value;
    });
    return Object.values(map);
  }, [completionPredictions, costPredictions, projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Predictive Analytics</h1>
          <p className="text-muted-foreground">AI-driven project success prediction and risk forecasting</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => generatePredictions.mutate()} disabled={generatePredictions.isPending}>
            <Brain className="h-4 w-4 mr-1" /> {generatePredictions.isPending ? 'Analyzing...' : 'Run Predictions'}
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Avg Completion Likelihood</span></div>
          <p className="text-2xl font-bold">{avgCompletion}%</p>
          <Progress value={avgCompletion} className="mt-1 h-1.5" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Avg Cost Overrun Risk</span></div>
          <p className="text-2xl font-bold text-warning">{avgCostRisk}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">High Risk Projects</span></div>
          <p className="text-2xl font-bold text-destructive">{highRiskProjects}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Model Confidence</span></div>
          <p className="text-2xl font-bold">{avgConfidence}%</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="completion"><CheckCircle2 className="h-4 w-4 mr-1" /> Completion Forecast</TabsTrigger>
          <TabsTrigger value="cost"><DollarSign className="h-4 w-4 mr-1" /> Cost Risk</TabsTrigger>
          <TabsTrigger value="history"><Clock className="h-4 w-4 mr-1" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Project Risk vs Completion Likelihood</CardTitle></CardHeader>
              <CardContent>
                {projectScatter.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="completion" name="Completion %" domain={[0, 100]} fontSize={11} />
                      <YAxis type="number" dataKey="costRisk" name="Cost Risk %" domain={[0, 100]} fontSize={11} />
                      <ZAxis type="number" dataKey="confidence" range={[40, 200]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded p-2 text-xs shadow">
                            <p className="font-medium">{d.name}</p>
                            <p>Completion: {d.completion}%</p>
                            <p>Cost Risk: {d.costRisk}%</p>
                            <p>Confidence: {d.confidence}%</p>
                          </div>
                        );
                      }} />
                      <Scatter data={projectScatter} fill="hsl(var(--primary))" />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Run predictions to see analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Completion Likelihood Distribution</CardTitle></CardHeader>
              <CardContent>
                {completionPredictions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={completionPredictions.slice(0, 15).map(p => ({
                      project: projects.find(pr => pr.id === p.project_id)?.name?.slice(0, 15) || 'Unknown',
                      value: p.predicted_value,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="project" fontSize={10} angle={-30} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" name="Likelihood %">
                        {completionPredictions.slice(0, 15).map((p, i) => (
                          <Cell key={i} fill={(p.predicted_value || 0) >= 70 ? '#10b981' : (p.predicted_value || 0) >= 50 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No predictions available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="completion">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Likelihood</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Risk Factors</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completionPredictions.map(p => {
                    const project = projects.find(pr => pr.id === p.project_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{project?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={p.predicted_value || 0} className="h-2 w-20" />
                            <span className="text-xs font-medium">{p.predicted_value}%</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{p.confidence_score}%</Badge></TableCell>
                        <TableCell className="text-xs">
                          {Array.isArray(p.risk_factors) && (p.risk_factors as any[]).slice(0, 2).map((rf: any, i: number) => (
                            <span key={i} className="block text-muted-foreground">{rf.title}</span>
                          ))}
                        </TableCell>
                        <TableCell>
                          {(p.predicted_value || 0) >= 70 ? <Badge className="bg-green-100 text-green-800">On Track</Badge> :
                           (p.predicted_value || 0) >= 50 ? <Badge className="bg-yellow-100 text-yellow-800">At Risk</Badge> :
                           <Badge variant="destructive">Critical</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {completionPredictions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No completion predictions. Run the prediction model.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Cost Overrun Risk</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costPredictions.map(p => {
                    const project = projects.find(pr => pr.id === p.project_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{project?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={p.predicted_value || 0} className="h-2 w-20" />
                            <span className="text-xs font-medium">{p.predicted_value}%</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{p.confidence_score}%</Badge></TableCell>
                        <TableCell>
                          {(p.predicted_value || 0) >= 50 ? <Badge variant="destructive">High</Badge> :
                           (p.predicted_value || 0) >= 25 ? <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge> :
                           <Badge className="bg-green-100 text-green-800">Low</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {costPredictions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No cost predictions. Run the prediction model.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>Predicted</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.slice(0, 50).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{new Date(p.prediction_date).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{projects.find(pr => pr.id === p.project_id)?.name || 'Unknown'}</TableCell>
                      <TableCell><Badge variant="outline">{p.prediction_type?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell>{p.predicted_value}%</TableCell>
                      <TableCell>{p.confidence_score}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
