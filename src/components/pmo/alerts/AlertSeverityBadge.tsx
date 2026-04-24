import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertOctagon, Info, Bell } from 'lucide-react';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  critical: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800', icon: AlertOctagon, label: 'Critical' },
  high: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800', icon: AlertTriangle, label: 'High' },
  medium: { color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800', icon: Bell, label: 'Medium' },
  low: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', icon: Info, label: 'Low' },
};

export function AlertSeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.bg} ${config.color} gap-1 text-[10px] font-semibold border`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function AlertCategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    budget: 'Budget', schedule: 'Schedule', resource: 'Resource', risk: 'Risk', quality: 'Quality', general: 'General',
  };
  return <Badge variant="secondary" className="text-[10px]">{labels[category] || category}</Badge>;
}

export function AlertStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    new: 'bg-primary/10 text-primary border-primary/20',
    acknowledged: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200',
    snoozed: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200',
    resolved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200',
    dismissed: 'bg-muted text-muted-foreground border-border',
    escalated: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200',
  };
  return <Badge variant="outline" className={`${config[status] || ''} text-[10px] capitalize border`}>{status}</Badge>;
}
