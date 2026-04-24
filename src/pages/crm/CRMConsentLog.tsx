import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Plus, Mail, MessageSquare, Phone, Megaphone, Ban, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

interface Consent {
  id: string; business_partner_id?: string; contact_email?: string; contact_phone?: string;
  channel: string; consent_status: string; source?: string; basis?: string;
  granted_at?: string; revoked_at?: string; expires_at?: string; notes?: string; created_at: string;
}

const CHANNEL_ICON: Record<string, any> = { email: Mail, sms: MessageSquare, whatsapp: MessageSquare, call: Phone, marketing: Megaphone, all: ShieldCheck };

export default function CRMConsentLog() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Consent>>({ channel: 'email', consent_status: 'granted', source: 'manual' });
  const [filter, setFilter] = useState<string>('all');

  const { data: bps = [] } = useQuery({
    queryKey: ['bps-for-consent'],
    queryFn: async () => {
      const { data } = await supabase.from('business_partners').select('id, card_name, email, phone').limit(1000);
      return data ?? [];
    },
  });

  const { data: log = [], isLoading } = useQuery({
    queryKey: ['crm-consent-log'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('crm_consent_log' as any).select('*').order('created_at', { ascending: false }).limit(500) as any);
      if (error) throw error;
      return (data ?? []) as Consent[];
    },
  });

  const bpMap = useMemo(() => new Map(bps.map((b: any) => [b.id, b])), [bps]);
  const filtered = useMemo(() => filter === 'all' ? log : log.filter(c => c.consent_status === filter), [log, filter]);

  const counts = useMemo(() => ({
    granted: log.filter(c => c.consent_status === 'granted').length,
    revoked: log.filter(c => c.consent_status === 'revoked').length,
    pending: log.filter(c => c.consent_status === 'pending').length,
    expired: log.filter(c => c.consent_status === 'expired').length,
  }), [log]);

  const save = useMutation({
    mutationFn: async (c: Partial<Consent>) => {
      const payload: any = { ...c };
      if (c.consent_status === 'granted' && !c.granted_at) payload.granted_at = new Date().toISOString();
      if (c.consent_status === 'revoked' && !c.revoked_at) payload.revoked_at = new Date().toISOString();
      const { error } = await (supabase.from('crm_consent_log' as any).insert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-consent-log'] }); setOpen(false); setForm({ channel: 'email', consent_status: 'granted', source: 'manual' }); toast.success(isAr ? 'تم التسجيل' : 'Logged'); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadge = (s: string) => {
    if (s === 'granted') return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />{isAr ? 'ممنوح' : 'Granted'}</Badge>;
    if (s === 'revoked') return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />{isAr ? 'ملغي' : 'Revoked'}</Badge>;
    if (s === 'pending') return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{isAr ? 'معلق' : 'Pending'}</Badge>;
    return <Badge variant="secondary" className="gap-1">{isAr ? 'منتهي' : 'Expired'}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" />{isAr ? 'سجل الموافقات' : 'Contact Consent Log'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'تتبع موافقات الاتصال للامتثال (PDPL/GDPR)' : 'Track communication consent for compliance (PDPL/GDPR)'}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />{isAr ? 'تسجيل موافقة' : 'Log Consent'}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label={isAr ? 'ممنوحة' : 'Granted'} value={counts.granted} color="text-emerald-600" />
        <StatCard icon={Ban} label={isAr ? 'ملغاة' : 'Revoked'} value={counts.revoked} color="text-destructive" />
        <StatCard icon={Clock} label={isAr ? 'معلقة' : 'Pending'} value={counts.pending} color="text-amber-600" />
        <StatCard icon={ShieldCheck} label={isAr ? 'منتهية' : 'Expired'} value={counts.expired} color="text-muted-foreground" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{isAr ? 'السجلات' : 'Records'} ({filtered.length})</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="granted">{isAr ? 'ممنوحة' : 'Granted'}</SelectItem>
              <SelectItem value="revoked">{isAr ? 'ملغاة' : 'Revoked'}</SelectItem>
              <SelectItem value="pending">{isAr ? 'معلقة' : 'Pending'}</SelectItem>
              <SelectItem value="expired">{isAr ? 'منتهية' : 'Expired'}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">{isAr ? 'جارِ التحميل...' : 'Loading...'}</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isAr ? 'جهة الاتصال' : 'Contact'}</TableHead>
                <TableHead>{isAr ? 'القناة' : 'Channel'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'الأساس' : 'Basis'}</TableHead>
                <TableHead>{isAr ? 'المصدر' : 'Source'}</TableHead>
                <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const bp: any = c.business_partner_id ? bpMap.get(c.business_partner_id) : null;
                  const Icon = CHANNEL_ICON[c.channel] || ShieldCheck;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{bp?.card_name || c.contact_email || c.contact_phone || '—'}</div>
                        <div className="text-[11px] text-muted-foreground">{c.contact_email || c.contact_phone}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="gap-1"><Icon className="h-3 w-3" />{c.channel}</Badge></TableCell>
                      <TableCell>{statusBadge(c.consent_status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.basis || '—'}</TableCell>
                      <TableCell className="text-xs">{c.source || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(c.created_at), 'PP')}</TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isAr ? 'تسجيل موافقة' : 'Log Consent'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{isAr ? 'الحساب' : 'Account'}</Label>
              <Select value={form.business_partner_id} onValueChange={(v) => setForm({ ...form, business_partner_id: v })}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختياري' : 'Optional'} /></SelectTrigger>
                <SelectContent>{bps.slice(0, 500).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.card_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{isAr ? 'البريد' : 'Email'}</Label><Input value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>{isAr ? 'الهاتف' : 'Phone'}</Label><Input value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div><Label>{isAr ? 'القناة' : 'Channel'}</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['email','sms','whatsapp','call','marketing','all'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{isAr ? 'الحالة' : 'Status'}</Label>
                <Select value={form.consent_status} onValueChange={(v) => setForm({ ...form, consent_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['granted','revoked','pending','expired'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{isAr ? 'المصدر' : 'Source'}</Label><Input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="webform, manual, import..." /></div>
              <div><Label>{isAr ? 'الأساس القانوني' : 'Legal basis'}</Label><Input value={form.basis || ''} onChange={(e) => setForm({ ...form, basis: e.target.value })} placeholder="opt-in, contract, legitimate interest..." /></div>
            </div>
            <div><Label>{isAr ? 'ملاحظات' : 'Notes'}</Label><Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card><CardContent className="p-3 flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <div><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className={`text-xl font-bold ${color}`}>{value}</div></div>
    </CardContent></Card>
  );
}
