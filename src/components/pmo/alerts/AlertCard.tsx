import { PMOAlert } from '@/hooks/usePMOAlerts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertSeverityBadge, AlertCategoryBadge, AlertStatusBadge } from './AlertSeverityBadge';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Clock, ArrowUp, Eye, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface AlertCardProps {
  alert: PMOAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  onEscalate: (id: string) => void;
  onViewDetails?: (alert: PMOAlert) => void;
  compact?: boolean;
}

export function AlertCard({ alert, onAcknowledge, onDismiss, onResolve, onSnooze, onEscalate, onViewDetails, compact }: AlertCardProps) {
  const navigate = useNavigate();
  const isActive = !['resolved', 'dismissed'].includes(alert.status);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
          alert.severity === 'critical' ? 'border-destructive/30 bg-destructive/5' :
          alert.severity === 'high' ? 'border-orange-300/30 bg-orange-50/50 dark:bg-orange-900/10' : 'border-border'
        }`}
        onClick={() => onViewDetails?.(alert)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <AlertSeverityBadge severity={alert.severity} />
            <AlertCategoryBadge category={alert.alert_category} />
          </div>
          <p className="text-sm font-medium truncate">{alert.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {alert.project?.name && <span>{alert.project.name} · </span>}
            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
          </p>
        </div>
        {isActive && (
          <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`transition-shadow hover:shadow-md ${
      alert.severity === 'critical' ? 'border-destructive/40 shadow-destructive/10' :
      alert.severity === 'high' ? 'border-orange-300/40' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <AlertSeverityBadge severity={alert.severity} />
              <AlertCategoryBadge category={alert.alert_category} />
              <AlertStatusBadge status={alert.status} />
            </div>
            <h4 className="text-sm font-semibold mb-1">{alert.title}</h4>
            {alert.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{alert.description}</p>}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {alert.project?.name && <span className="font-medium">{alert.project.name}</span>}
              {alert.metric_name && (
                <span>
                  {alert.metric_name}: <strong className="text-foreground">{alert.metric_value}</strong>
                  {alert.threshold_value != null && <span> / {alert.threshold_value}</span>}
                </span>
              )}
              <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
            </div>
            {alert.recommended_actions && Array.isArray(alert.recommended_actions) && alert.recommended_actions.length > 0 && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                <p className="font-medium mb-1 text-[10px] text-muted-foreground">Recommended Actions:</p>
                <ul className="space-y-0.5">
                  {(alert.recommended_actions as string[]).slice(0, 3).map((action, i) => (
                    <li key={i} className="text-xs">• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {isActive && (
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onAcknowledge(alert.id)} title="Acknowledge">
                <Check className="h-3 w-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-1.5">⋯</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(alert)}><Eye className="h-3.5 w-3.5 mr-2" />View Details</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResolve(alert.id)}><Check className="h-3.5 w-3.5 mr-2" />Mark Resolved</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSnooze(alert.id, 1)}><Clock className="h-3.5 w-3.5 mr-2" />Snooze 1 hour</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSnooze(alert.id, 24)}><Clock className="h-3.5 w-3.5 mr-2" />Snooze 24 hours</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSnooze(alert.id, 168)}><Clock className="h-3.5 w-3.5 mr-2" />Snooze 1 week</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEscalate(alert.id)}><ArrowUp className="h-3.5 w-3.5 mr-2" />Escalate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDismiss(alert.id)} className="text-destructive"><X className="h-3.5 w-3.5 mr-2" />Dismiss</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {alert.link_url && (
                <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => navigate(alert.link_url!)} title="Go to source">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
