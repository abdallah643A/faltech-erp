import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCorrespondenceKPIs, useCorrespondenceList } from '@/hooks/useCorrespondence';
import { Inbox, Send, AlertTriangle, Cloud, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CorrStatusBadge, CorrPriorityBadge } from '@/components/correspondence/CorrBadges';
import { format } from 'date-fns';

export default function CorrespondenceDashboardPage() {
  const { data: kpis } = useCorrespondenceKPIs();
  const { data: recent = [] } = useCorrespondenceList({ limit: 8 });

  const tile = (label: string, value: number | string, Icon: any, color: string) => (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Correspondence Dashboard</h1>
          <p className="text-muted-foreground" dir="rtl">لوحة المراسلات</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/correspondence/incoming/new">New Incoming</Link></Button>
          <Button asChild><Link to="/correspondence/outgoing/new">New Outgoing</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {tile('Total', kpis?.total ?? 0, FileText, 'bg-primary/10 text-primary')}
        {tile('Incoming', kpis?.incoming ?? 0, Inbox, 'bg-blue-500/10 text-blue-600')}
        {tile('Outgoing', kpis?.outgoing ?? 0, Send, 'bg-emerald-500/10 text-emerald-600')}
        {tile('Open', kpis?.open ?? 0, Clock, 'bg-amber-500/10 text-amber-600')}
        {tile('Overdue', kpis?.overdue ?? 0, AlertTriangle, 'bg-destructive/10 text-destructive')}
        {tile('Urgent', kpis?.urgent ?? 0, AlertTriangle, 'bg-orange-500/10 text-orange-600')}
        {tile('ECM Failed', kpis?.ecmFailed ?? 0, Cloud, 'bg-destructive/10 text-destructive')}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Correspondence</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recent.map((r) => (
              <Link key={r.id} to={`/correspondence/${r.id}`} className="flex items-center justify-between p-3 rounded hover:bg-muted/50 border">
                <div>
                  <div className="font-medium">{r.subject}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.reference_no ?? 'draft'} • {r.direction}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <CorrPriorityBadge p={r.priority} />
                  <CorrStatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'PP')}</span>
                </div>
              </Link>
            ))}
            {recent.length === 0 && <div className="text-center py-12 text-muted-foreground">No correspondence yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
