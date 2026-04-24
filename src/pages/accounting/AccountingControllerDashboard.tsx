/**
 * Controller Dashboard — at-a-glance KPIs across the foundation:
 * open vs closed periods, posting volume, exception count, IC health,
 * and the next due recurring entries.
 */
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  BarChart3, CalendarClock, AlertOctagon, Repeat, Building2, History, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { acctTables } from '@/integrations/supabase/acct-tables';
import type {
  AcctPeriod, AcctPostingLogEntry, AcctRecurringTemplate, AcctIntercompanyLink,
} from '@/types/accounting-contracts';

interface Kpis {
  openPeriods: number;
  softClosed: number;
  closedPeriods: number;
  postsLast7d: number;
  reversalsLast7d: number;
  unbalancedAttempts: number;
  activeRecurring: number;
  dueRecurring: number;
  activeIcLinks: number;
}

export default function AccountingControllerDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const [periods, setPeriods] = useState<AcctPeriod[]>([]);
  const [log, setLog] = useState<AcctPostingLogEntry[]>([]);
  const [recurring, setRecurring] = useState<AcctRecurringTemplate[]>([]);
  const [ic, setIc] = useState<AcctIntercompanyLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, l, r, i] = await Promise.all([
        acctTables.periods().select('*').order('start_date', { ascending: false }).limit(60),
        acctTables.postingLog().select('*').order('performed_at', { ascending: false }).limit(500),
        acctTables.recurringTemplates().select('*').order('next_run_date').limit(50),
        acctTables.intercompanyLinks().select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setPeriods((p.data ?? []) as AcctPeriod[]);
      setLog((l.data ?? []) as AcctPostingLogEntry[]);
      setRecurring((r.data ?? []) as AcctRecurringTemplate[]);
      setIc((i.data ?? []) as AcctIntercompanyLink[]);
      setLoading(false);
    })();
  }, []);

  const kpis: Kpis = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const today = new Date().toISOString().split('T')[0];
    return {
      openPeriods:        periods.filter((p) => p.status === 'open').length,
      softClosed:         periods.filter((p) => p.status === 'soft_closed').length,
      closedPeriods:      periods.filter((p) => p.status === 'closed').length,
      postsLast7d:        log.filter((e) => e.action === 'post' && new Date(e.performed_at).getTime() >= sevenDaysAgo).length,
      reversalsLast7d:    log.filter((e) => e.action === 'reverse' && new Date(e.performed_at).getTime() >= sevenDaysAgo).length,
      unbalancedAttempts: log.filter((e) => e.is_balanced === false).length,
      activeRecurring:    recurring.filter((t) => t.is_active).length,
      dueRecurring:       recurring.filter((t) => t.is_active && t.next_run_date <= today).length,
      activeIcLinks:      ic.filter((l) => l.status === 'active').length,
    };
  }, [periods, log, recurring, ic]);

  const recentLog = log.slice(0, 8);
  const dueRecurring = recurring.filter((t) => t.is_active).slice(0, 6);

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7" />
          {isAr ? 'لوحة المراقب المالي' : 'Controller Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAr ? 'صحة الحوكمة المحاسبية في لمحة.' : 'Accounting governance health at a glance.'}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={CalendarClock} label={isAr ? 'فترات مفتوحة' : 'Open periods'}
          value={kpis.openPeriods} hint={`${kpis.softClosed} soft · ${kpis.closedPeriods} closed`} />
        <KpiCard icon={History} label={isAr ? 'ترحيلات (7 أيام)' : 'Posts (7d)'}
          value={kpis.postsLast7d} hint={`${kpis.reversalsLast7d} ${isAr ? 'عكس' : 'reversals'}`} />
        <KpiCard icon={AlertOctagon} label={isAr ? 'محاولات غير متوازنة' : 'Unbalanced attempts'}
          value={kpis.unbalancedAttempts} hint={isAr ? 'مرفوضة من قاعدة البيانات' : 'rejected at DB'}
          variant={kpis.unbalancedAttempts > 0 ? 'destructive' : 'default'} />
        <KpiCard icon={Repeat} label={isAr ? 'قوالب نشطة' : 'Active recurring'}
          value={kpis.activeRecurring} hint={`${kpis.dueRecurring} ${isAr ? 'مستحق' : 'due'}`}
          variant={kpis.dueRecurring > 0 ? 'secondary' : 'default'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{isAr ? 'آخر سجلات الترحيل' : 'Recent posting activity'}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate('/accounting/posting-log')}>
              {isAr ? 'الكل' : 'View all'} <ArrowRight className="ms-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</p>
            ) : recentLog.length === 0 ? (
              <p className="text-muted-foreground">{isAr ? 'لا توجد سجلات بعد' : 'No activity yet'}</p>
            ) : recentLog.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{e.action}</Badge>
                    <span className="font-mono text-xs truncate">{e.doc_number ?? e.je_id?.slice(0, 8) ?? '—'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.performed_by_name ?? 'system'} · {format(new Date(e.performed_at), 'MMM d HH:mm')}
                  </div>
                </div>
                {e.total_debit !== null && (
                  <div className="font-mono text-xs">{e.total_debit?.toLocaleString()}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{isAr ? 'القوالب القادمة' : 'Upcoming recurring runs'}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate('/accounting/recurring')}>
              {isAr ? 'إدارة' : 'Manage'} <ArrowRight className="ms-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading…'}</p>
            ) : dueRecurring.length === 0 ? (
              <p className="text-muted-foreground">{isAr ? 'لا توجد قوالب نشطة' : 'No active templates'}</p>
            ) : dueRecurring.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium">{t.template_name}</div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="me-1 text-[10px]">{t.frequency}</Badge>
                    {isAr ? 'التشغيل التالي' : 'next'}: {format(new Date(t.next_run_date), 'yyyy-MM-dd')}
                  </div>
                </div>
                {t.auto_post && <Badge variant="secondary" className="text-xs">{isAr ? 'تلقائي' : 'auto'}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {isAr ? 'صحة بين الشركات' : 'Intercompany health'}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => navigate('/accounting/intercompany')}>
            {isAr ? 'فتح' : 'Open'} <ArrowRight className="ms-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {kpis.activeIcLinks > 0
              ? (isAr ? `${kpis.activeIcLinks} رابط نشط بين الشركات.`
                      : `${kpis.activeIcLinks} active intercompany links across the group.`)
              : (isAr ? 'لا توجد روابط نشطة بين الشركات.' : 'No active intercompany links.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, hint, variant = 'default',
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  hint?: string;
  variant?: 'default' | 'secondary' | 'destructive';
}) {
  const variantClass =
    variant === 'destructive' ? 'text-destructive' :
    variant === 'secondary' ? 'text-secondary-foreground' :
    'text-primary';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${variantClass}`}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <Icon className={`h-5 w-5 ${variantClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}
