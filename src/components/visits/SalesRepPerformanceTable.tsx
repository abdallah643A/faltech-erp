import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface SalesRepPerformance {
  salesRepId: string;
  salesRepName: string;
  totalVisits: number;
  completedVisits: number;
  thisMonthVisits: number;
  topVisitType: string;
  avgPerDay: number;
}

interface SalesRepPerformanceTableProps {
  data: SalesRepPerformance[];
  maxVisits: number;
}

export function SalesRepPerformanceTable({ data, maxVisits }: SalesRepPerformanceTableProps) {
  const { t } = useLanguage();

  const getVisitTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'sales': return 'default';
      case 'follow_up': return 'secondary';
      case 'routine': return 'outline';
      case 'support': return 'destructive';
      case 'collection': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.salesRepPerformance') || 'Sales Rep Performance'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('analytics.salesRep') || 'Sales Rep'}</TableHead>
              <TableHead className="text-center">{t('analytics.totalVisits') || 'Total Visits'}</TableHead>
              <TableHead className="text-center">{t('analytics.thisMonth') || 'This Month'}</TableHead>
              <TableHead className="text-center">{t('analytics.completionRate') || 'Completion Rate'}</TableHead>
              <TableHead className="text-center">{t('analytics.topType') || 'Top Type'}</TableHead>
              <TableHead>{t('analytics.performance') || 'Performance'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No performance data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((rep) => {
                const completionRate = rep.totalVisits > 0 
                  ? Math.round((rep.completedVisits / rep.totalVisits) * 100) 
                  : 0;
                const performancePercent = maxVisits > 0 
                  ? Math.round((rep.totalVisits / maxVisits) * 100) 
                  : 0;

                return (
                  <TableRow key={rep.salesRepId}>
                    <TableCell className="font-medium">{rep.salesRepName}</TableCell>
                    <TableCell className="text-center">{rep.totalVisits}</TableCell>
                    <TableCell className="text-center">{rep.thisMonthVisits}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={completionRate >= 80 ? 'default' : completionRate >= 50 ? 'secondary' : 'destructive'}>
                        {completionRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getVisitTypeBadgeVariant(rep.topVisitType)}>
                        {rep.topVisitType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={performancePercent} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground w-12">{performancePercent}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
