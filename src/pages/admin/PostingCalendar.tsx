import { useState } from 'react';
import { Calendar, Plus, Lock, Unlock, CircleDot, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanies, useCountries } from '@/hooks/useGroupStructure';
import {
  useFiscalCalendars, useCreateFiscalCalendar, usePostingPeriods,
  useGeneratePeriods, useUpdatePeriodStatus, PostingPeriod,
} from '@/hooks/useAdminSetup';
import { cn } from '@/lib/utils';

const STATUS_META: Record<PostingPeriod['status'], { label: string; cls: string; icon: any }> = {
  open: { label: 'Open', cls: 'bg-success/10 text-success border-success/30', icon: Unlock },
  soft_close: { label: 'Soft Close', cls: 'bg-warning/10 text-warning border-warning/30', icon: CircleDot },
  closed: { label: 'Closed', cls: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
  locked: { label: 'Locked', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: Lock },
};

const NEXT: Record<PostingPeriod['status'], PostingPeriod['status']> = {
  open: 'soft_close', soft_close: 'closed', closed: 'locked', locked: 'open',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PostingCalendar() {
  const { data: calendars = [] } = useFiscalCalendars();
  const { data: countries = [] } = useCountries();
  const { data: companies = [] } = useCompanies();
  const [calendarId, setCalendarId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [companyId, setCompanyId] = useState<string>('');

  const effectiveCal = calendarId || calendars[0]?.id || '';
  const { data: periods = [], isLoading } = usePostingPeriods(effectiveCal, year);
  const generate = useGeneratePeriods();
  const updateStatus = useUpdatePeriodStatus();
  const create = useCreateFiscalCalendar();

  const [openNew, setOpenNew] = useState(false);
  const [draft, setDraft] = useState({ name: '', country_code: '', start_month: 1, period_count: 12 });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" /> Posting Calendar
        </h1>
        <p className="text-sm text-muted-foreground">Country-aware fiscal calendars and period status (open · soft close · closed · locked).</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium block mb-1">Calendar</label>
          <Select value={effectiveCal} onValueChange={setCalendarId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select calendar" /></SelectTrigger>
            <SelectContent>
              {calendars.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.country_code && `(${c.country_code})`}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Fiscal Year</label>
          <Input type="number" className="w-28" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Company</label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="(All / shared)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">— All companies —</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={!effectiveCal || generate.isPending}
          onClick={() => generate.mutate({ calendarId: effectiveCal, companyId: companyId && companyId !== '__all__' ? companyId : null, year })}
        >
          Generate {year} Periods
        </Button>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Calendar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Fiscal Calendar</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Calendar name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
              <Select value={draft.country_code} onValueChange={(v) => setDraft({ ...draft, country_code: v })}>
                <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  {countries.map(co => <SelectItem key={co.code} value={co.code}>{co.code} · {co.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select value={String(draft.start_month)} onValueChange={(v) => setDraft({ ...draft, start_month: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(draft.period_count)} onValueChange={(v) => setDraft({ ...draft, period_count: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 periods</SelectItem>
                    <SelectItem value="13">13 periods (4-4-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
              <Button disabled={!draft.name} onClick={() => { create.mutate(draft); setOpenNew(false); setDraft({ name: '', country_code: '', start_month: 1, period_count: 12 }); }}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="enterprise-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-6">Loading…</TableCell></TableRow>
            ) : periods.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-6">No periods. Pick a calendar and click "Generate".</TableCell></TableRow>
            ) : periods.map(p => {
              const meta = STATUS_META[p.status];
              const Icon = meta.icon;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.period_number}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.start_date}</TableCell>
                  <TableCell>{p.end_date}</TableCell>
                  <TableCell>
                    <Badge className={cn('gap-1', meta.cls)} variant="outline">
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: p.id, status: NEXT[p.status] })}>
                      → {STATUS_META[NEXT[p.status]].label}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
