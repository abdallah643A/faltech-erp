import { useEffect, useState } from 'react';
import { useExecutiveBrief } from '@/hooks/useExecutiveBrief';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sunrise, RefreshCw, Mail, Bell } from 'lucide-react';

/**
 * ExecutiveBriefPage
 * --------------------------------
 * Full-screen view of today's brief plus subscription preferences (email +
 * in-app channels). The brief is generated daily by the
 * `executive-brief-dispatch` edge function via pg_cron at 07:00 KSA.
 */
export default function ExecutiveBriefPage() {
  const { user } = useAuth();
  const { snapshot, subscription, refresh, upsertSubscription } = useExecutiveBrief();
  const s = snapshot.data;
  const sub = subscription.data;

  const [email, setEmail] = useState('');
  const [chEmail, setChEmail] = useState(true);
  const [chInapp, setChInapp] = useState(true);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (sub) {
      setEmail(sub.email ?? user?.email ?? '');
      setChEmail(!!sub.channel_email);
      setChInapp(!!sub.channel_inapp);
      setActive(!!sub.is_active);
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [sub, user?.email]);

  const Row = ({ label, value, danger }: { label: string; value: string; danger?: boolean }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${danger ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
  const fmt = (n: number) => new Intl.NumberFormat().format(n || 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sunrise className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold">Executive Morning Brief</h1>
          {s?.snapshot_date && <Badge variant="outline">{s.snapshot_date}</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending} className="gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {!s ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          No brief generated yet. Click Refresh to compute now, or wait for the 7am scheduled run.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">💰 Cash & Receivables</CardTitle></CardHeader>
            <CardContent>
              <Row label="Open AR" value={fmt(s.ar_open_total)} />
              <Row label="Overdue AR" value={fmt(s.ar_overdue_total)} danger={s.ar_overdue_total > 0} />
              <Row label="Overdue invoices" value={String(s.ar_overdue_count)} />
              {s.ar_top_overdue_customer && <Row label={`Top: ${s.ar_top_overdue_customer}`} value={fmt(s.ar_top_overdue_amount)} danger />}
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">📥 Payables</CardTitle></CardHeader>
            <CardContent>
              <Row label="Open AP" value={fmt(s.ap_open_total)} />
              <Row label="Overdue AP" value={fmt(s.ap_overdue_total)} danger={s.ap_overdue_total > 0} />
              <Row label="Overdue invoices" value={String(s.ap_overdue_count)} />
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">📝 Approvals Waiting</CardTitle></CardHeader>
            <CardContent>
              <Row label="Pending requests" value={String(s.approvals_pending_count)} danger={s.approvals_pending_count > 0} />
              <Row label="Oldest waiting (hrs)" value={s.approvals_oldest_hours.toFixed(1)} danger={s.approvals_oldest_hours > 48} />
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">🚧 Projects at Risk</CardTitle></CardHeader>
            <CardContent>
              <Row label="Red (overdue)" value={String(s.projects_red_count)} danger={s.projects_red_count > 0} />
              <Row label="Amber" value={String(s.projects_amber_count)} />
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">📈 Sales</CardTitle></CardHeader>
            <CardContent>
              <Row label="Orders today" value={String(s.sales_orders_today)} />
              <Row label="Revenue today" value={fmt(s.sales_revenue_today)} />
              <Row label="Revenue MTD" value={fmt(s.sales_revenue_mtd)} />
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">🇸🇦 ZATCA</CardTitle></CardHeader>
            <CardContent>
              <Row label="Clearance failures (24h)" value={String(s.zatca_failed_24h)} danger={s.zatca_failed_24h > 0} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> My Brief Subscription</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="h-8" />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2"><Switch checked={chEmail} onCheckedChange={setChEmail} /><Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label></div>
              <div className="flex items-center gap-2"><Switch checked={chInapp} onCheckedChange={setChInapp} /><Label className="text-xs flex items-center gap-1"><Bell className="h-3 w-3" /> In-app</Label></div>
              <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label className="text-xs">Active</Label></div>
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={() => upsertSubscription.mutate({ email, channel_email: chEmail, channel_inapp: chInapp, is_active: active })} disabled={!email || upsertSubscription.isPending}>
                Save preferences
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The brief runs daily at 07:00 Riyadh time and is delivered to your enabled channels. You can also click Refresh above to regenerate the snapshot on demand.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
