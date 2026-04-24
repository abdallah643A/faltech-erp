import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';

interface RAGProject {
  id: string;
  name: string;
  progress: number;
  budget: number;
  actual_cost: number;
  status: string;
}

interface Props {
  projects: RAGProject[];
  evmSnapshots?: any[];
}

function computeRAG(project: RAGProject, evmSnapshots: any[]) {
  const budgetVariance = project.budget > 0 ? (project.actual_cost / project.budget) : 0;
  const snap = evmSnapshots.find(s => s.project_id === project.id);
  const spi = snap?.spi ?? 1;
  const cpi = snap?.cpi ?? 1;

  let schedule: 'green' | 'amber' | 'red' = 'green';
  let cost: 'green' | 'amber' | 'red' = 'green';

  if (spi < 0.8) schedule = 'red';
  else if (spi < 0.95) schedule = 'amber';

  if (cpi < 0.8 || budgetVariance > 1.15) cost = 'red';
  else if (cpi < 0.95 || budgetVariance > 1.05) cost = 'amber';

  const overall = schedule === 'red' || cost === 'red' ? 'red' :
    schedule === 'amber' || cost === 'amber' ? 'amber' : 'green';

  return { schedule, cost, overall, spi, cpi, budgetVariance };
}

const ragColors = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const ragBadgeVariant = {
  green: 'default' as const,
  amber: 'secondary' as const,
  red: 'destructive' as const,
};

export function AutoRAGStatus({ projects, evmSnapshots = [] }: Props) {
  const activeProjects = projects.filter(p => p.status === 'in_progress');
  const ragData = activeProjects.map(p => ({
    ...p,
    rag: computeRAG(p, evmSnapshots),
  }));

  const counts = { green: 0, amber: 0, red: 0 };
  ragData.forEach(p => counts[p.rag.overall]++);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(['green', 'amber', 'red'] as const).map(color => (
          <Card key={color}>
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full ${ragColors[color]} flex items-center justify-center`}>
                {color === 'green' ? <CheckCircle2 className="h-4 w-4 text-white" /> :
                 color === 'amber' ? <MinusCircle className="h-4 w-4 text-white" /> :
                 <AlertTriangle className="h-4 w-4 text-white" />}
              </div>
              <div>
                <p className="text-2xl font-bold">{counts[color]}</p>
                <p className="text-xs text-muted-foreground capitalize">{color} Projects</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Automated RAG Status (SPI/CPI Thresholds)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>SPI</TableHead>
                <TableHead>CPI</TableHead>
                <TableHead>Budget Var.</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ragData.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No active projects</TableCell></TableRow>
              )}
              {ragData.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <div className={`h-4 w-4 rounded-full ${ragColors[p.rag.overall]}`} />
                  </TableCell>
                  <TableCell>
                    <div className={`h-3 w-3 rounded-full ${ragColors[p.rag.schedule]}`} />
                  </TableCell>
                  <TableCell>
                    <div className={`h-3 w-3 rounded-full ${ragColors[p.rag.cost]}`} />
                  </TableCell>
                  <TableCell className={p.rag.spi < 0.95 ? 'text-destructive font-bold' : ''}>{p.rag.spi.toFixed(2)}</TableCell>
                  <TableCell className={p.rag.cpi < 0.95 ? 'text-destructive font-bold' : ''}>{p.rag.cpi.toFixed(2)}</TableCell>
                  <TableCell>{(p.rag.budgetVariance * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={p.progress} className="h-1.5 w-16" />
                      <span className="text-xs">{p.progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
          <p><strong>Thresholds:</strong></p>
          <p>🟢 Green: SPI ≥ 0.95 & CPI ≥ 0.95 & Budget ≤ 105%</p>
          <p>🟡 Amber: SPI 0.80–0.95 or CPI 0.80–0.95 or Budget 105–115%</p>
          <p>🔴 Red: SPI &lt; 0.80 or CPI &lt; 0.80 or Budget &gt; 115%</p>
        </CardContent>
      </Card>
    </div>
  );
}
