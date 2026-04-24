import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface PipelineStage {
  name: string;
  count: number;
  value?: number;
  color: string;
  href?: string;
}

interface PipelineKanbanWidgetProps {
  title: string;
  stages: PipelineStage[];
  className?: string;
}

export function PipelineKanbanWidget({ title, stages, className }: PipelineKanbanWidgetProps) {
  const navigate = useNavigate();
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {stages.map((stage) => (
            <div
              key={stage.name}
              onClick={() => stage.href && navigate(stage.href)}
              className="relative rounded-lg border bg-card p-3 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: stage.color }} />
              <div className="mt-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{stage.name}</p>
                <p className="text-xl font-bold mt-1">{stage.count}</p>
                {stage.value !== undefined && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {new Intl.NumberFormat('en-SA', { notation: 'compact', maximumFractionDigits: 1 }).format(stage.value)}
                  </p>
                )}
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(stage.count / maxCount) * 100}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
