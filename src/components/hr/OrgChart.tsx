import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, GitBranch, User, Users } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';

interface OrgNode {
  employee: Employee;
  children: OrgNode[];
}

interface OrgChartProps {
  employees: Employee[];
}

function buildTree(employees: Employee[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  employees.forEach(e => map.set(e.id, { employee: e, children: [] }));

  const roots: OrgNode[] = [];
  employees.forEach(e => {
    if (e.manager_id && map.has(e.manager_id)) {
      map.get(e.manager_id)!.children.push(map.get(e.id)!);
    } else {
      roots.push(map.get(e.id)!);
    }
  });

  return roots;
}

function OrgNodeCard({ node, level = 0 }: { node: OrgNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const e = node.employee;
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-accent/30 transition-colors cursor-pointer ${level === 0 ? 'border-primary/50 shadow-sm' : ''}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-3.5" />
        )}
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">
            {e.first_name.charAt(0)}{e.last_name.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{e.first_name} {e.last_name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {e.position?.title || 'No position'} • {e.department?.name || 'No dept'}
          </p>
        </div>
        {hasChildren && (
          <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">
            {node.children.length}
          </Badge>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="mt-1 space-y-1 relative">
          <div className="absolute left-3 top-0 bottom-0 border-l border-border" style={{ marginLeft: `${level * 24 + 6}px` }} />
          {node.children.map(child => (
            <OrgNodeCard key={child.employee.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgChart({ employees }: OrgChartProps) {
  const tree = useMemo(() => buildTree(employees), [employees]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Organization Chart
          <Badge variant="secondary" className="text-[10px]">{employees.length} employees</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto space-y-1">
        {tree.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">No employees to display</p>
        ) : (
          tree.map(node => <OrgNodeCard key={node.employee.id} node={node} />)
        )}
      </CardContent>
    </Card>
  );
}
