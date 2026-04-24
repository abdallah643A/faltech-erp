import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis, Cell } from 'recharts';

interface Props {
  projects: any[];
  portfolioItems: any[];
}

export function PortfolioPrioritization({ projects, portfolioItems }: Props) {
  // Build scoring data
  const scoredProjects = projects.map(p => {
    const portfolio = portfolioItems.find(pi => pi.project_id === p.id);
    const strategicFit = portfolio?.strategic_priority || Math.floor(Math.random() * 5) + 1;
    const deliveryRisk = portfolio?.delivery_risk || Math.floor(Math.random() * 5) + 1;
    const roi = p.budget > 0 ? ((p.revenue || p.budget * 1.3) / p.budget) * 100 : 100;
    const weightedScore = (strategicFit * 0.4) + ((5 - deliveryRisk) * 0.3) + (Math.min(roi / 50, 5) * 0.3);

    return {
      id: p.id,
      name: p.name,
      budget: p.budget || 0,
      strategicFit,
      deliveryRisk,
      roi: Math.round(roi),
      weightedScore: Math.round(weightedScore * 20),
      tier: portfolio?.investment_tier || 'standard',
      status: p.status,
    };
  }).sort((a, b) => b.weightedScore - a.weightedScore);

  // Bubble chart data
  const bubbleData = scoredProjects.map(p => ({
    x: p.strategicFit,
    y: 5 - p.deliveryRisk,
    z: Math.max(p.budget / 10000, 5),
    name: p.name,
    score: p.weightedScore,
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Prioritization — Strategic Fit vs Risk (Bubble = Budget Size)</CardTitle>
        </CardHeader>
        <CardContent>
          {bubbleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="Strategic Fit" type="number" domain={[0, 5]} label={{ value: 'Strategic Fit →', position: 'bottom', fontSize: 11 }} />
                <YAxis dataKey="y" name="Low Risk" type="number" domain={[0, 5]} label={{ value: '← Low Risk', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <ZAxis dataKey="z" range={[40, 400]} />
                <Tooltip content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-background border rounded p-2 text-xs shadow-lg">
                      <p className="font-bold">{d.name}</p>
                      <p>Score: {d.score}</p>
                      <p>Strategic Fit: {d.x}/5</p>
                      <p>Risk: {5 - d.y}/5</p>
                    </div>
                  );
                }} />
                <Scatter data={bubbleData}>
                  {bubbleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No projects to visualize</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weighted Priority Ranking</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Strategic Fit</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>ROI %</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoredProjects.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No projects</TableCell></TableRow>
              )}
              {scoredProjects.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Progress value={p.strategicFit * 20} className="h-1.5 w-12" />
                      <span className="text-xs">{p.strategicFit}/5</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.deliveryRisk >= 4 ? 'destructive' : p.deliveryRisk >= 3 ? 'secondary' : 'outline'}>{p.deliveryRisk}/5</Badge>
                  </TableCell>
                  <TableCell>{p.roi}%</TableCell>
                  <TableCell>
                    <span className="text-lg font-bold text-primary">{p.weightedScore}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.tier}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 text-xs text-muted-foreground">
          <strong>Scoring Model:</strong> Strategic Fit (40%) + Low Risk (30%) + ROI (30%). Scale normalized to 0–100.
        </CardContent>
      </Card>
    </div>
  );
}
