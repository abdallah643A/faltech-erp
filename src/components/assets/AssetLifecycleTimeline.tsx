import React from 'react';
import { useAssetLifecycleEvents, useLifecycleStages } from '@/hooks/useLifecycleSpine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Activity, CircleDollarSign, User } from 'lucide-react';

interface Props {
  assetId?: string;
  equipmentId?: string;
  compact?: boolean;
}

export const AssetLifecycleTimeline: React.FC<Props> = ({ assetId, equipmentId, compact }) => {
  const { data: events = [], isLoading } = useAssetLifecycleEvents({ assetId, equipmentId });
  const { data: stages = [] } = useLifecycleStages();
  const stageMap = Object.fromEntries(stages.map(s => [s.stage_code, s]));

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading lifecycle…</div>;
  if (!events.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No lifecycle events recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans' }}>
          <Activity className="h-4 w-4" /> Asset Lifecycle Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
          {events.map(ev => {
            const stage = stageMap[ev.stage_code];
            const color = stage?.color_hex || '#0066cc';
            return (
              <div key={ev.id} className="relative">
                <span
                  className="absolute -left-4 top-1.5 h-3 w-3 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{ev.title}</span>
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: color, color }}>
                        {stage?.stage_name || ev.stage_code}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{ev.event_type}</Badge>
                    </div>
                    {ev.description && !compact && (
                      <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      <span>{format(new Date(ev.event_date), 'PPp')}</span>
                      {ev.actor_name && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{ev.actor_name}</span>
                      )}
                      {ev.financial_impact != null && Number(ev.financial_impact) !== 0 && (
                        <span className="flex items-center gap-1">
                          <CircleDollarSign className="h-3 w-3" />
                          {Number(ev.financial_impact).toLocaleString()} {ev.currency || ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetLifecycleTimeline;
