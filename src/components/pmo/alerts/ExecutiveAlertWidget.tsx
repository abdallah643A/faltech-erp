import { useState } from 'react';
import { usePMOAlerts, PMOAlert } from '@/hooks/usePMOAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCard } from './AlertCard';
import { AlertDetailPanel } from './AlertDetailPanel';
import { Bell, AlertTriangle, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ExecutiveAlertWidget() {
  const {
    alerts, criticalAlerts, activeAlerts, alertsBySeverity,
    acknowledgeAlert, dismissAlert, resolveAlert, snoozeAlert, escalateAlert,
  } = usePMOAlerts();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [selectedAlert, setSelectedAlert] = useState<PMOAlert | null>(null);

  const filteredAlerts = activeAlerts
    .filter(a => filter === 'all' || a.severity === filter)
    .slice(0, 5);

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-destructive" />
            Active Alerts
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{criticalAlerts.length} Critical</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/pmo/alerts')}>
            View All ({activeAlerts.length})
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Summary bar */}
          <div className="flex items-center gap-2 text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-full transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              All ({activeAlerts.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2 py-0.5 rounded-full transition-colors ${filter === 'critical' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Critical ({alertsBySeverity.critical})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-2 py-0.5 rounded-full transition-colors ${filter === 'high' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              High ({alertsBySeverity.high})
            </button>
          </div>

          {/* Alert list */}
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No active alerts
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  compact
                  onAcknowledge={(id) => acknowledgeAlert.mutate(id)}
                  onDismiss={(id) => dismissAlert.mutate({ alertId: id })}
                  onResolve={(id) => resolveAlert.mutate({ alertId: id })}
                  onSnooze={(id, hours) => snoozeAlert.mutate({ alertId: id, hours })}
                  onEscalate={(id) => escalateAlert.mutate({ alertId: id })}
                  onViewDetails={setSelectedAlert}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDetailPanel alert={selectedAlert} open={!!selectedAlert} onClose={() => setSelectedAlert(null)} />
    </>
  );
}

export function AlertSummaryStats() {
  const { activeAlerts, alertsBySeverity, alerts } = usePMOAlerts();
  const resolved = alerts.filter(a => a.status === 'resolved').length;
  const dismissed = alerts.filter(a => a.status === 'dismissed').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Active Alerts" value={activeAlerts.length} color="text-primary" />
      <StatCard label="Critical" value={alertsBySeverity.critical} color="text-destructive" />
      <StatCard label="Resolved" value={resolved} color="text-emerald-600" />
      <StatCard label="Dismissed" value={dismissed} color="text-muted-foreground" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2 px-3 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
