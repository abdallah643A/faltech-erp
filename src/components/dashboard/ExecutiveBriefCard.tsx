import { useExecutiveBrief } from '@/hooks/useExecutiveBrief';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Sunrise, AlertTriangle, DollarSign, FileCheck, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * ExecutiveBriefCard
 * --------------------------------
 * Compact card mountable on any executive dashboard. Shows the latest
 * snapshot with the 5 brief sections at a glance and a button to open
 * the full brief page or trigger an on-demand refresh.
 */
function fmt(n: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0); }

export function ExecutiveBriefCard() {
  const navigate = useNavigate();
  const { snapshot, refresh } = useExecutiveBrief();
  const s = snapshot.data;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm">Morning Brief</CardTitle>
          {s?.snapshot_date && <Badge variant="outline" className="text-[10px]">{s.snapshot_date}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate('/executive-brief')}>
            Open <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {snapshot.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !s ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No brief yet. <button className="text-primary underline" onClick={() => refresh.mutate()}>Generate now</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <Metric icon={DollarSign} label="Overdue AR" value={fmt(s.ar_overdue_total)} sub={`${s.ar_overdue_count} inv`} danger={s.ar_overdue_total > 0} />
            <Metric icon={FileCheck} label="Approvals" value={String(s.approvals_pending_count)} sub={`${s.approvals_oldest_hours.toFixed(0)}h oldest`} warn={s.approvals_oldest_hours > 48} />
            <Metric icon={AlertTriangle} label="Projects red" value={String(s.projects_red_count)} sub={`${s.projects_amber_count} amber`} danger={s.projects_red_count > 0} />
            <Metric icon={Building2} label="Sales today" value={fmt(s.sales_revenue_today)} sub={`${s.sales_orders_today} orders`} />
            <Metric icon={ShieldCheck} label="ZATCA fails" value={String(s.zatca_failed_24h)} sub="last 24h" danger={s.zatca_failed_24h > 0} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, sub, danger, warn }: any) {
  const color = danger ? 'text-destructive' : warn ? 'text-amber-600' : 'text-foreground';
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" /><span className="text-[10px]">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
