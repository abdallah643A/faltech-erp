import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronDown, FolderOpen, FileText, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

interface DrillNode {
  id: string; name: string; level: 'portfolio' | 'project' | 'phase' | 'work_package' | 'line_item';
  budget: number; actual: number; variance: number; variancePct: number; pctComplete: number;
  children?: DrillNode[];
}

export function CostDrillDownReports({ projects }: { projects: any[] }) {
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'Portfolio' }]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [costFilter, setCostFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');

  const phases = ['Preconstruction', 'Foundation', 'Structure', 'MEP', 'Finishing', 'Closeout'];
  const workPackages = ['Civil Works', 'Concrete', 'Steel', 'Electrical', 'Plumbing', 'HVAC', 'Painting', 'Landscaping'];

  const tree = useMemo((): DrillNode[] => {
    return projects.map(p => {
      const budget = p.budget || 100000;
      const actual = p.actual_cost || budget * 0.90;
      const phaseNodes: DrillNode[] = phases.map((ph, pi) => {
        const phBudget = budget * (0.1 + (pi * 0.03));
        const phActual = phBudget * (0.8 + (pi * 0.05) % 0.35);
        const wpCount = 3 + (pi % 4);
        const wpNodes: DrillNode[] = workPackages.slice(0, wpCount).map((wp, wi) => {
          const wpBudget = phBudget * (0.15 + (wi * 0.04) % 0.2);
          const wpActual = wpBudget * (0.7 + ((pi + wi) * 0.05) % 0.5);
          const liCount = 2 + (wi % 3);
          const lineItems: DrillNode[] = Array.from({ length: liCount }, (_, li) => {
            const liBudget = wpBudget * (0.2 + (li * 0.05) % 0.2);
            const liActual = liBudget * (0.6 + ((wi + li) * 0.08) % 0.6);
            return {
              id: `${p.id}-${pi}-${wi}-${li}`, name: `${wp} - Item ${li + 1}`, level: 'line_item' as const,
              budget: Math.round(liBudget), actual: Math.round(liActual),
              variance: Math.round(liActual - liBudget), variancePct: Math.round(((liActual - liBudget) / liBudget) * 100),
              pctComplete: Math.round(40 + (pi * 7 + wi * 5 + li * 3) % 55),
            };
          });
          return {
            id: `${p.id}-${pi}-${wi}`, name: wp, level: 'work_package' as const,
            budget: Math.round(wpBudget), actual: Math.round(wpActual),
            variance: Math.round(wpActual - wpBudget), variancePct: Math.round(((wpActual - wpBudget) / wpBudget) * 100),
            pctComplete: Math.round(30 + (pi * 9 + wi * 6) % 60), children: lineItems,
          };
        });
        return {
          id: `${p.id}-${pi}`, name: ph, level: 'phase' as const,
          budget: Math.round(phBudget), actual: Math.round(phActual),
          variance: Math.round(phActual - phBudget), variancePct: Math.round(((phActual - phBudget) / phBudget) * 100),
          pctComplete: Math.round(20 + (pi * 11) % 70), children: wpNodes,
        };
      });
      return {
        id: p.id, name: p.name || 'Unnamed', level: 'project' as const,
        budget: Math.round(budget), actual: Math.round(actual),
        variance: Math.round(actual - budget), variancePct: Math.round(((actual - budget) / budget) * 100),
        pctComplete: p.percent_complete || 50, children: phaseNodes,
      };
    });
  }, [projects]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;
  const levelIcon = (level: string) => level === 'line_item' ? <FileText className="h-3.5 w-3.5 text-muted-foreground" /> : <FolderOpen className="h-3.5 w-3.5 text-primary" />;
  const levelColor = (level: string) => level === 'portfolio' ? 'bg-primary/10' : level === 'project' ? 'bg-chart-2/5' : '';

  const renderNode = (node: DrillNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const filtered = costFilter === 'overrun' ? node.variance > 0 : costFilter === 'under' ? node.variance <= 0 : true;
    if (!filtered && !hasChildren) return null;

    return (
      <div key={node.id}>
        <div className={`flex items-center gap-2 py-2 px-3 border-b border-border hover:bg-muted/50 cursor-pointer ${levelColor(node.level)}`} style={{ paddingLeft: `${depth * 24 + 12}px` }} onClick={() => hasChildren && toggleExpand(node.id)}>
          <div className="w-5 flex-shrink-0">
            {hasChildren && (isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
          </div>
          {levelIcon(node.level)}
          <span className="flex-1 text-sm font-medium text-foreground truncate">{node.name}</span>
          <Badge variant="outline" className="text-xs">{node.level.replace('_', ' ')}</Badge>
          <div className="w-20 text-right font-mono text-xs text-foreground">{fmt(node.budget)}</div>
          <div className="w-20 text-right font-mono text-xs text-foreground">{fmt(node.actual)}</div>
          <div className={`w-20 text-right font-mono text-xs font-bold ${node.variance <= 0 ? 'text-chart-2' : 'text-destructive'}`}>
            {node.variance > 0 ? '+' : ''}{fmt(node.variance)}
          </div>
          <Badge variant={node.variancePct <= 0 ? 'default' : node.variancePct <= 5 ? 'secondary' : 'destructive'} className="w-14 justify-center text-xs">
            {node.variancePct > 0 ? '+' : ''}{node.variancePct}%
          </Badge>
          <div className="w-24 flex items-center gap-1">
            <Progress value={node.pctComplete} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground w-8">{node.pctComplete}%</span>
          </div>
        </div>
        {isExpanded && hasChildren && node.children!.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  // Summary stats
  const totalBudget = tree.reduce((s, n) => s + n.budget, 0);
  const totalActual = tree.reduce((s, n) => s + n.actual, 0);
  const totalVariance = totalActual - totalBudget;

  const flatExport = useMemo(() => {
    const flat: any[] = [];
    const flatten = (node: DrillNode, path: string) => {
      flat.push({ path: path + '/' + node.name, level: node.level, budget: node.budget, actual: node.actual, variance: node.variance, variancePct: node.variancePct, pctComplete: node.pctComplete });
      node.children?.forEach(c => flatten(c, path + '/' + node.name));
    };
    tree.forEach(n => flatten(n, 'Portfolio'));
    return flat;
  }, [tree]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Cost Drill-Down Reports</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={costFilter} onValueChange={setCostFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="overrun">Over Budget</SelectItem>
              <SelectItem value="under">Under Budget</SelectItem>
            </SelectContent>
          </Select>
          <ExportImportButtons data={flatExport} columns={[
            { key: 'path', header: 'Path', width: 35 },
            { key: 'level', header: 'Level', width: 12 },
            { key: 'budget', header: 'Budget', width: 12 },
            { key: 'actual', header: 'Actual', width: 12 },
            { key: 'variance', header: 'Variance', width: 12 },
            { key: 'variancePct', header: 'Variance %', width: 10 },
          ]} filename="Cost_DrillDown" title="Cost Drill-Down" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Budget</div>
          <div className="text-xl font-bold text-foreground">{fmt(totalBudget)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Actual</div>
          <div className="text-xl font-bold text-primary">{fmt(totalActual)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Variance</div>
          <div className={`text-xl font-bold ${totalVariance <= 0 ? 'text-chart-2' : 'text-destructive'}`}>
            {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}
          </div>
        </Card>
      </div>

      {/* Drill-Down Tree */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Cost Hierarchy (click to expand)</CardTitle>
            <div className="flex gap-4 text-xs text-muted-foreground font-medium">
              <span className="w-20 text-right">Budget</span>
              <span className="w-20 text-right">Actual</span>
              <span className="w-20 text-right">Variance</span>
              <span className="w-14 text-center">Var %</span>
              <span className="w-24">Progress</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {tree.map(node => renderNode(node))}
          {tree.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No projects to display</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
