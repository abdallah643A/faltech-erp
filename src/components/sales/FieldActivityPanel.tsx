import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  MapPin, Clock, CheckCircle2, XCircle, LogIn, LogOut, Plus, User,
  Calendar as CalendarIcon, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useSalesVisits, useSalesVisitMutations, summarizeVisits, type SalesVisit,
} from '@/hooks/useSalesVisits';

/**
 * Field Activity Panel — Module 2 / Enhancement #4
 *
 * Daily call report for sales reps. Features:
 *   • Plan visits (customer + purpose)
 *   • One-tap GPS check-in / check-out
 *   • Outcome capture on check-out
 *   • Today / Week / Month tabs with KPI summary
 */

interface FieldActivityPanelProps {
  /** Override the rep being viewed (managers viewing a team member). */
  repUserId?: string;
}

export function FieldActivityPanel({ repUserId }: FieldActivityPanelProps) {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [tab, setTab] = useState<'today' | 'week' | 'month'>('today');
  const [planOpen, setPlanOpen] = useState(false);
  const [checkoutVisit, setCheckoutVisit] = useState<SalesVisit | null>(null);

  const filters =
    tab === 'today' ? { date: today, repUserId } :
    tab === 'week'  ? { from: weekAgo, to: today, repUserId } :
                      { from: monthAgo, to: today, repUserId };

  const { data: visits = [], isLoading } = useSalesVisits(filters);
  const { create, checkIn, cancel } = useSalesVisitMutations();
  const summary = summarizeVisits(visits);

  const T = {
    title: isAr ? 'النشاط الميداني' : 'Field Activity',
    today: isAr ? 'اليوم' : 'Today',
    week: isAr ? 'الأسبوع' : 'This Week',
    month: isAr ? 'الشهر' : 'This Month',
    planVisit: isAr ? 'تخطيط زيارة' : 'Plan Visit',
    visits: isAr ? 'زيارات' : 'visits',
    completed: isAr ? 'مكتملة' : 'Completed',
    minutes: isAr ? 'دقيقة' : 'min',
    none: isAr ? 'لا توجد زيارات' : 'No visits',
    checkIn: isAr ? 'تسجيل دخول' : 'Check In',
    checkOut: isAr ? 'تسجيل خروج' : 'Check Out',
    cancel: isAr ? 'إلغاء' : 'Cancel',
  };

  return (
    <div dir={direction} className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {T.title}
        </h2>
        <Button onClick={() => setPlanOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {T.planVisit}
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPI label={T.visits} value={summary.total} />
        <KPI label={T.completed} value={summary.completed} tone="success" />
        <KPI label={isAr ? 'قيد التنفيذ' : 'In Progress'} value={summary.inProgress} tone="info" />
        <KPI label={isAr ? 'دقائق إجمالاً' : 'Total Minutes'} value={summary.totalMinutes} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          <TabsTrigger value="today">{T.today}</TabsTrigger>
          <TabsTrigger value="week">{T.week}</TabsTrigger>
          <TabsTrigger value="month">{T.month}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-md">
              {T.none}
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map(v => (
                <VisitCard
                  key={v.id}
                  visit={v}
                  isAr={isAr}
                  onCheckIn={() => checkIn.mutate(v.id)}
                  onCheckOut={() => setCheckoutVisit(v)}
                  onCancel={() => cancel.mutate(v.id)}
                  checkingIn={checkIn.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PlanVisitDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        onSubmit={(input) => create.mutate(input, { onSuccess: () => setPlanOpen(false) })}
        submitting={create.isPending}
      />

      <CheckoutDialog
        visit={checkoutVisit}
        onOpenChange={(o) => !o && setCheckoutVisit(null)}
      />
    </div>
  );
}

function KPI({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'success' | 'info' }) {
  const toneClass =
    tone === 'success' ? 'text-success' :
    tone === 'info' ? 'text-primary' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={cn('text-xl font-semibold mt-0.5', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function VisitCard({
  visit, isAr, onCheckIn, onCheckOut, onCancel, checkingIn,
}: {
  visit: SalesVisit;
  isAr: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  checkingIn: boolean;
}) {
  const statusVariant: Record<SalesVisit['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Planned: 'outline',
    'In Progress': 'default',
    Completed: 'secondary',
    Cancelled: 'destructive',
  };

  const statusAr: Record<SalesVisit['status'], string> = {
    Planned: 'مخطط',
    'In Progress': 'جاري',
    Completed: 'مكتمل',
    Cancelled: 'ملغي',
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium truncate">{visit.customer_name}</h4>
              <Badge variant={statusVariant[visit.status]}>
                {isAr ? statusAr[visit.status] : visit.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{visit.visit_purpose}</div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(visit.visit_date), 'PP')}
              </span>
              {visit.contact_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {visit.contact_name}
                </span>
              )}
              {visit.check_in_at && (
                <span className="flex items-center gap-1 text-success">
                  <LogIn className="h-3 w-3" />
                  {format(new Date(visit.check_in_at), 'p')}
                </span>
              )}
              {visit.check_out_at && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <LogOut className="h-3 w-3" />
                  {format(new Date(visit.check_out_at), 'p')}
                </span>
              )}
              {visit.duration_minutes != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {visit.duration_minutes} {isAr ? 'د' : 'min'}
                </span>
              )}
            </div>

            {visit.outcome && (
              <div className="mt-2 text-xs">
                <span className="font-medium">{isAr ? 'النتيجة: ' : 'Outcome: '}</span>
                <span className="text-muted-foreground">{visit.outcome}</span>
              </div>
            )}

            {visit.next_action && (
              <div className="mt-1 text-xs">
                <span className="font-medium">{isAr ? 'الخطوة التالية: ' : 'Next: '}</span>
                <span className="text-muted-foreground">{visit.next_action}</span>
                {visit.next_action_date && ` (${format(new Date(visit.next_action_date), 'PP')})`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {visit.status === 'Planned' && (
              <>
                <Button size="sm" onClick={onCheckIn} disabled={checkingIn} className="gap-1.5">
                  {checkingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                  {isAr ? 'دخول' : 'Check In'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
            {visit.status === 'In Progress' && (
              <Button size="sm" variant="default" onClick={onCheckOut} className="gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                {isAr ? 'خروج' : 'Check Out'}
              </Button>
            )}
            {visit.status === 'Completed' && (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanVisitDialog({
  open, onOpenChange, onSubmit, submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (input: any) => void;
  submitting: boolean;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [customerName, setCustomerName] = useState('');
  const [purpose, setPurpose] = useState('Sales Call');
  const [contactName, setContactName] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    if (!customerName.trim()) return;
    onSubmit({
      customer_name: customerName.trim(),
      visit_purpose: purpose,
      contact_name: contactName || null,
      visit_date: visitDate,
      notes: notes || null,
    });
    setCustomerName(''); setContactName(''); setNotes('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAr ? 'تخطيط زيارة جديدة' : 'Plan New Visit'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{isAr ? 'اسم العميل' : 'Customer Name'} *</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isAr ? 'الغرض' : 'Purpose'}</Label>
              <Input value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <div>
              <Label>{isAr ? 'تاريخ الزيارة' : 'Visit Date'}</Label>
              <Input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{isAr ? 'جهة الاتصال' : 'Contact'}</Label>
            <Input value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div>
            <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !customerName.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isAr ? 'حفظ' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutDialog({
  visit, onOpenChange,
}: {
  visit: SalesVisit | null;
  onOpenChange: (o: boolean) => void;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { checkOut } = useSalesVisitMutations();
  const [outcome, setOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    if (!visit) return;
    checkOut.mutate(
      { visitId: visit.id, outcome, nextAction, nextActionDate: nextDate || undefined, notes },
      {
        onSuccess: () => {
          setOutcome(''); setNextAction(''); setNextDate(''); setNotes('');
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={!!visit} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAr ? 'تسجيل خروج' : 'Check Out'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{isAr ? 'النتيجة' : 'Outcome'}</Label>
            <Textarea rows={2} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder={isAr ? 'ماذا تم خلال الزيارة؟' : 'What was accomplished?'} />
          </div>
          <div>
            <Label>{isAr ? 'الخطوة التالية' : 'Next Action'}</Label>
            <Input value={nextAction} onChange={e => setNextAction(e.target.value)} />
          </div>
          <div>
            <Label>{isAr ? 'تاريخ المتابعة' : 'Follow-up Date'}</Label>
            <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
          </div>
          <div>
            <Label>{isAr ? 'ملاحظات إضافية' : 'Additional Notes'}</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={checkOut.isPending} className="gap-2">
            {checkOut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <LogOut className="h-4 w-4" />
            {isAr ? 'تأكيد الخروج' : 'Confirm Check Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
