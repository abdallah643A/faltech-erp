import { useState, useMemo } from 'react';
import { usePMOAlerts, PMOAlert } from '@/hooks/usePMOAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCard } from '@/components/pmo/alerts/AlertCard';
import { AlertDetailPanel } from '@/components/pmo/alerts/AlertDetailPanel';
import { AlertAnalytics } from '@/components/pmo/alerts/AlertAnalytics';
import { AlertRulesManager } from '@/components/pmo/alerts/AlertRulesManager';
import { AlertSubscriptions } from '@/components/pmo/alerts/AlertSubscriptions';
import { AlertSummaryStats } from '@/components/pmo/alerts/ExecutiveAlertWidget';
import { AlertSeverityBadge, AlertStatusBadge, AlertCategoryBadge } from '@/components/pmo/alerts/AlertSeverityBadge';
import {
  Bell, Search, Filter, ArrowLeft, AlertTriangle, LayoutGrid, List, BarChart3, Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'severity', header: 'Severity' },
  { key: 'title', header: 'Title' },
  { key: 'category', header: 'Category' },
  { key: 'project', header: 'Project' },
  { key: 'created', header: 'Created' },
];


const KANBAN_COLUMNS = [
  { key: 'new', label: 'New', color: 'border-primary/40' },
  { key: 'acknowledged', label: 'Acknowledged', color: 'border-blue-400/40' },
  { key: 'escalated', label: 'Escalated', color: 'border-red-400/40' },
  { key: 'snoozed', label: 'Snoozed', color: 'border-yellow-400/40' },
  { key: 'resolved', label: 'Resolved', color: 'border-emerald-400/40' },
  { key: 'dismissed', label: 'Dismissed', color: 'border-muted-foreground/40' },
];

export default function PMOAlertCenter() {
  const { t } = useLanguage();
  const {
    alerts, loadingAlerts, activeAlerts, criticalAlerts,
    acknowledgeAlert, dismissAlert, resolveAlert, snoozeAlert, escalateAlert,
  } = usePMOAlerts();
  const navigate = useNavigate();

  const [view, setView] = useState<'kanban' | 'table' | 'analytics' | 'rules' | 'preferences'>('kanban');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('__all__');
  const [categoryFilter, setCategoryFilter] = useState('__all__');
  const [selectedAlert, setSelectedAlert] = useState<PMOAlert | null>(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (severityFilter !== '__all__' && a.severity !== severityFilter) return false;
      if (categoryFilter !== '__all__' && a.alert_category !== categoryFilter) return false;
      return true;
    });
  }, [alerts, search, severityFilter, categoryFilter]);

  const handleAction = {
    ack: (id: string) => acknowledgeAlert.mutate(id),
    dismiss: (id: string) => dismissAlert.mutate({ alertId: id }),
    resolve: (id: string) => resolveAlert.mutate({ alertId: id }),
    snooze: (id: string, hours: number) => snoozeAlert.mutate({ alertId: id, hours }),
    escalate: (id: string) => escalateAlert.mutate({ alertId: id }),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pmo/executive')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5" /> PMO Alert Center
              {criticalAlerts.length > 0 && <Badge variant="destructive" className="text-[10px]">{criticalAlerts.length} Critical</Badge>}
            </h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="pmoalert-center" title="P M O Alert Center" />
            <p className="text-xs text-muted-foreground">Monitor, manage, and respond to project alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <Button variant={view === 'kanban' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setView('kanban')}>
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setView('table')}>
            <List className="h-3.5 w-3.5" /> Table
          </Button>
          <Button variant={view === 'analytics' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setView('analytics')}>
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </Button>
          <Button variant={view === 'rules' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setView('rules')}>
            <Settings2 className="h-3.5 w-3.5" /> Rules
          </Button>
          <Button variant={view === 'preferences' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setView('preferences')}>
            <Bell className="h-3.5 w-3.5" /> Prefs
          </Button>
        </div>
      </div>

      <AlertSummaryStats />

      {/* Filters */}
      {(view === 'kanban' || view === 'table') && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search alerts..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
              <SelectItem value="resource">Resource</SelectItem>
              <SelectItem value="risk">Risk</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {KANBAN_COLUMNS.map(col => {
            const colAlerts = filteredAlerts.filter(a => a.status === col.key);
            return (
              <div key={col.key} className={`border-t-2 ${col.color} rounded-lg bg-muted/30 p-2`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold capitalize">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">{colAlerts.length}</Badge>
                </div>
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1.5">
                    {colAlerts.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">No alerts</p>}
                    {colAlerts.map(a => (
                      <AlertCard key={a.id} alert={a} compact
                        onAcknowledge={handleAction.ack} onDismiss={handleAction.dismiss}
                        onResolve={handleAction.resolve} onSnooze={handleAction.snooze}
                        onEscalate={handleAction.escalate} onViewDetails={setSelectedAlert}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2.5 font-medium text-muted-foreground">Severity</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground">Project</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground">{t('common.status')}</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-2.5 font-medium text-muted-foreground">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No alerts found</td></tr>
                  )}
                  {filteredAlerts.map(a => (
                    <tr key={a.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedAlert(a)}>
                      <td className="p-2.5"><AlertSeverityBadge severity={a.severity} /></td>
                      <td className="p-2.5 font-medium max-w-[200px] truncate">{a.title}</td>
                      <td className="p-2.5"><AlertCategoryBadge category={a.alert_category} /></td>
                      <td className="p-2.5 text-muted-foreground">{a.project?.name || '—'}</td>
                      <td className="p-2.5"><AlertStatusBadge status={a.status} /></td>
                      <td className="p-2.5 text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</td>
                      <td className="p-2.5">
                        {!['resolved', 'dismissed'].includes(a.status) && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); handleAction.ack(a.id); }}>Ack</Button>
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); handleAction.resolve(a.id); }}>Resolve</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics View */}
      {view === 'analytics' && <AlertAnalytics />}

      {/* Rules View */}
      {view === 'rules' && <AlertRulesManager />}

      {/* Preferences View */}
      {view === 'preferences' && <AlertSubscriptions />}

      <AlertDetailPanel alert={selectedAlert} open={!!selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  );
}
