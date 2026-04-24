import { AlertTriangle, Wrench, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveDowntime } from '@/hooks/useHospitalEquipment';

interface Props {
  /** Filter banner to a category: 'or' | 'radiology' | 'icu' | 'lab' */
  category?: string;
  onManage?: () => void;
}

/**
 * Operational banner that surfaces equipment currently down or in maintenance,
 * so OR/Radiology schedulers see scheduling impact at a glance.
 */
export function EquipmentAvailabilityBanner({ category, onManage }: Props) {
  const { data: active = [] } = useActiveDowntime();
  const filtered = category
    ? active.filter((d: any) => d.equipment?.category === category)
    : active;

  if (filtered.length === 0) return null;

  const critical = filtered.filter((d: any) => d.severity === 'critical');
  const unplanned = filtered.filter((d: any) => d.severity === 'unplanned');

  return (
    <Card
      className={
        critical.length > 0
          ? 'border-destructive/40 bg-destructive/5'
          : unplanned.length > 0
          ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-900/10'
          : 'border-muted bg-muted/30'
      }
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {critical.length > 0 ? (
              <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            ) : unplanned.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {filtered.length} equipment {filtered.length === 1 ? 'item' : 'items'} unavailable
                {category ? ` in ${category.toUpperCase()}` : ''}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {filtered.slice(0, 6).map((d: any) => (
                  <Badge
                    key={d.id}
                    variant="outline"
                    className={
                      d.severity === 'critical'
                        ? 'border-destructive/40 text-destructive'
                        : d.severity === 'unplanned'
                        ? 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                        : ''
                    }
                  >
                    {d.equipment?.name || 'Equipment'} — {d.reason}
                  </Badge>
                ))}
                {filtered.length > 6 && (
                  <Badge variant="outline">+{filtered.length - 6} more</Badge>
                )}
              </div>
            </div>
          </div>
          {onManage && (
            <Button variant="outline" size="sm" onClick={onManage}>
              Manage
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
