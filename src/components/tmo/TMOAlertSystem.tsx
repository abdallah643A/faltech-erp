import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, ShieldAlert, TrendingDown, Calendar, Bell, BellOff, X } from 'lucide-react';
import { useState } from 'react';
import type { TMOTechAsset, TMORoadmapItem, TMOArchitectureDecision, TMOVendor } from '@/hooks/useTMOPortfolio';

interface TMOAlert {
  id: string;
  type: 'eol' | 'tco' | 'compliance' | 'vendor' | 'roadmap';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entity: string;
  icon: React.ElementType;
}

interface Props {
  techAssets: TMOTechAsset[];
  roadmapItems: TMORoadmapItem[];
  decisions: TMOArchitectureDecision[];
  vendors: TMOVendor[];
}

export function TMOAlertSystem({ techAssets, roadmapItems, decisions, vendors }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const alerts: TMOAlert[] = [];
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);
  const ninetyDays = new Date(now.getTime() + 90 * 86400000);

  // EOL assets approaching retirement
  techAssets.forEach(a => {
    if (a.lifecycle_status === 'end_of_life') {
      alerts.push({ id: `eol-${a.id}`, type: 'eol', severity: 'critical', title: 'End-of-Life Asset', description: `${a.name} is at EOL status. Plan retirement or replacement.`, entity: a.name, icon: Clock });
    }
    if (a.end_of_support_date && new Date(a.end_of_support_date) <= ninetyDays && new Date(a.end_of_support_date) >= now) {
      alerts.push({ id: `eos-${a.id}`, type: 'eol', severity: 'warning', title: 'Support Ending Soon', description: `${a.name} support ends ${new Date(a.end_of_support_date).toLocaleDateString()}.`, entity: a.name, icon: Calendar });
    }
  });

  // TCO overages (assets with TCO > 50K as threshold)
  techAssets.filter(a => a.total_cost_of_ownership > 50000).forEach(a => {
    if (a.health_score < 3) {
      alerts.push({ id: `tco-${a.id}`, type: 'tco', severity: 'warning', title: 'High TCO / Low Health', description: `${a.name}: TCO ${(a.total_cost_of_ownership / 1000).toFixed(0)}K but health score only ${a.health_score}/5.`, entity: a.name, icon: TrendingDown });
    }
  });

  // Compliance violations
  decisions.filter(d => d.compliance_score < 50).forEach(d => {
    alerts.push({ id: `comp-${d.id}`, type: 'compliance', severity: 'critical', title: 'Low Compliance Score', description: `ADR "${d.title}" has compliance score of ${d.compliance_score}%.`, entity: d.title, icon: ShieldAlert });
  });

  // Vendor performance issues
  vendors.filter(v => v.overall_score < 2.5).forEach(v => {
    alerts.push({ id: `vend-${v.id}`, type: 'vendor', severity: 'warning', title: 'Vendor Performance Issue', description: `${v.name} has overall score of ${v.overall_score}/5.`, entity: v.name, icon: AlertTriangle });
  });

  // Vendor contracts expiring
  vendors.filter(v => v.contract_end_date && new Date(v.contract_end_date) <= thirtyDays && new Date(v.contract_end_date) >= now).forEach(v => {
    alerts.push({ id: `vexp-${v.id}`, type: 'vendor', severity: 'critical', title: 'Contract Expiring', description: `${v.name} contract expires ${new Date(v.contract_end_date!).toLocaleDateString()}.`, entity: v.name, icon: Calendar });
  });

  // Roadmap delays
  roadmapItems.filter(r => r.status === 'in_progress' && r.end_date && new Date(r.end_date) < now).forEach(r => {
    alerts.push({ id: `road-${r.id}`, type: 'roadmap', severity: 'warning', title: 'Roadmap Item Overdue', description: `"${r.title}" was due ${new Date(r.end_date!).toLocaleDateString()}.`, entity: r.title, icon: Clock });
  });

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const displayed = showAll ? visible : visible.slice(0, 5);
  const criticalCount = visible.filter(a => a.severity === 'critical').length;
  const warningCount = visible.filter(a => a.severity === 'warning').length;

  if (visible.length === 0) return null;

  const severityColors = {
    critical: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Active Alerts
            {criticalCount > 0 && <Badge variant="destructive" className="text-[10px] h-5">{criticalCount} Critical</Badge>}
            {warningCount > 0 && <Badge className="text-[10px] h-5 bg-amber-500">{warningCount} Warning</Badge>}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}>
            <BellOff className="h-3 w-3 mr-1" />Dismiss All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayed.map(alert => {
          const Icon = alert.icon;
          return (
            <div key={alert.id} className={`p-2.5 rounded-lg border flex items-start gap-2 ${severityColors[alert.severity]}`}>
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{alert.title}</p>
                <p className="text-[11px] opacity-80 truncate">{alert.description}</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">{alert.type}</Badge>
              <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))} className="shrink-0 opacity-50 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {visible.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less' : `Show All (${visible.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
