import { PMOAlert, usePMOAlerts } from '@/hooks/usePMOAlerts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertSeverityBadge, AlertCategoryBadge, AlertStatusBadge } from './AlertSeverityBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, X, Clock, ArrowUp, MessageSquare, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AlertDetailPanelProps {
  alert: PMOAlert | null;
  open: boolean;
  onClose: () => void;
}

export function AlertDetailPanel({ alert, open, onClose }: AlertDetailPanelProps) {
  const { acknowledgeAlert, dismissAlert, resolveAlert, snoozeAlert, escalateAlert, useAlertActions } = usePMOAlerts();
  const { data: actions = [] } = useAlertActions(alert?.id || null);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  if (!alert) return null;
  const isActive = !['resolved', 'dismissed'].includes(alert.status);

  const handleResolve = () => {
    resolveAlert.mutate({ alertId: alert.id, comment: comment || undefined });
    setComment('');
  };
  const handleDismiss = () => {
    dismissAlert.mutate({ alertId: alert.id, reason: comment || undefined });
    setComment('');
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <AlertSeverityBadge severity={alert.severity} />
            <AlertCategoryBadge category={alert.alert_category} />
            <AlertStatusBadge status={alert.status} />
          </div>
          <SheetTitle className="text-base">{alert.title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="px-6 pb-6 space-y-4">
            {/* Details */}
            {alert.description && <p className="text-sm text-muted-foreground">{alert.description}</p>}

            <div className="grid grid-cols-2 gap-3 text-xs">
              {alert.project?.name && (
                <div><span className="text-muted-foreground">Project</span><p className="font-medium">{alert.project.name}</p></div>
              )}
              {alert.metric_name && (
                <div><span className="text-muted-foreground">{alert.metric_name}</span><p className="font-medium">{alert.metric_value}{alert.threshold_value != null && ` / ${alert.threshold_value}`}</p></div>
              )}
              <div><span className="text-muted-foreground">Created</span><p className="font-medium">{format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}</p></div>
              {alert.acknowledged_at && (
                <div><span className="text-muted-foreground">Acknowledged</span><p className="font-medium">{formatDistanceToNow(new Date(alert.acknowledged_at), { addSuffix: true })}</p></div>
              )}
              {alert.resolved_at && (
                <div><span className="text-muted-foreground">Resolved</span><p className="font-medium">{format(new Date(alert.resolved_at), 'MMM dd HH:mm')}</p></div>
              )}
            </div>

            {alert.root_cause && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium mb-1">Root Cause</p>
                  <p className="text-xs text-muted-foreground">{alert.root_cause}</p>
                </div>
              </>
            )}

            {alert.recommended_actions && Array.isArray(alert.recommended_actions) && alert.recommended_actions.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium mb-1">Recommended Actions</p>
                  <ul className="space-y-1">
                    {(alert.recommended_actions as string[]).map((action, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2"><span>•</span>{action}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {alert.link_url && (
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => { navigate(alert.link_url!); onClose(); }}>
                <ExternalLink className="h-3.5 w-3.5" /> Go to Source
              </Button>
            )}

            {/* Actions */}
            {isActive && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Textarea placeholder="Add a comment (optional)..." value={comment} onChange={e => setComment(e.target.value)} className="text-xs min-h-[60px]" />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="text-xs gap-1" onClick={() => acknowledgeAlert.mutate(alert.id)}>
                      <Check className="h-3 w-3" /> Acknowledge
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleResolve}>
                      <Check className="h-3 w-3" /> Resolve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => snoozeAlert.mutate({ alertId: alert.id, hours: 24 })}>
                      <Clock className="h-3 w-3" /> Snooze 24h
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => escalateAlert.mutate({ alertId: alert.id })}>
                      <ArrowUp className="h-3 w-3" /> Escalate
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={handleDismiss}>
                      <X className="h-3 w-3" /> Dismiss
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Action History */}
            <Separator />
            <div>
              <p className="text-xs font-medium mb-2">Activity Log ({actions.length})</p>
              {actions.length === 0 && <p className="text-xs text-muted-foreground">No actions yet.</p>}
              <div className="space-y-2">
                {actions.map(action => (
                  <div key={action.id} className="flex gap-2 text-xs">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{action.action_type.replace('_', ' ')}</p>
                      {action.comment && <p className="text-muted-foreground">{action.comment}</p>}
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
