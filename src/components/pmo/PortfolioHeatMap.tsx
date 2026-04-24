import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PMOProjectPortfolio } from '@/hooks/usePMOPortfolio';

interface Props {
  portfolioItems: PMOProjectPortfolio[];
  projects: any[];
}

const priorityLabels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Critical'];
const riskLabels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];

function getCellColor(priority: number, risk: number) {
  const score = priority + risk;
  if (score <= 4) return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300';
  if (score <= 6) return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300';
  if (score <= 8) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300';
  return 'bg-red-100 dark:bg-red-900/30 border-red-300';
}

export function PortfolioHeatMap({ portfolioItems, projects }: Props) {
  // Build a 5x5 matrix
  const matrix: Record<string, PMOProjectPortfolio[]> = {};
  for (let p = 1; p <= 5; p++) {
    for (let r = 1; r <= 5; r++) {
      matrix[`${p}-${r}`] = [];
    }
  }
  portfolioItems.forEach(item => {
    const key = `${item.strategic_priority}-${item.delivery_risk}`;
    if (matrix[key]) matrix[key].push(item);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Portfolio Heat Map — Strategic Priority vs Delivery Risk</CardTitle>
      </CardHeader>
      <CardContent>
        {portfolioItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No portfolio items yet. Add projects to the portfolio to see the heat map.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-1 mb-1">
                <div className="text-xs font-medium text-muted-foreground text-center p-2">Priority ↓ / Risk →</div>
                {[1,2,3,4,5].map(r => (
                  <div key={r} className="text-xs font-medium text-muted-foreground text-center p-2">
                    {riskLabels[r]}
                  </div>
                ))}
              </div>
              {/* Matrix rows - priority 5 (Critical) at top */}
              {[5,4,3,2,1].map(p => (
                <div key={p} className="grid grid-cols-6 gap-1 mb-1">
                  <div className="text-xs font-medium text-muted-foreground flex items-center justify-center p-2">
                    {priorityLabels[p]}
                  </div>
                  {[1,2,3,4,5].map(r => {
                    const items = matrix[`${p}-${r}`] || [];
                    return (
                      <div key={r} className={`min-h-[60px] rounded border p-1 ${getCellColor(p, r)}`}>
                        {items.map(item => (
                          <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] mb-0.5 cursor-pointer truncate max-w-full block">
                                {item.project?.name || 'Project'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{item.project?.name}</p>
                                <p>Classification: {item.classification}</p>
                                <p>Methodology: {item.methodology}</p>
                                <p>Investment: {item.investment_tier}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
