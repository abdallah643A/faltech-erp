import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RecurringDocuments() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ templateName: '', documentType: 'ar_invoice', frequency: 'monthly', startDate: '', endDate: '', requiresApproval: false });

  const { data: templates = [] } = useQuery({
    queryKey: ['recurring-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('recurring_document_templates' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('recurring_document_templates' as any).insert({
        template_name: f.templateName, document_type: f.documentType, frequency: f.frequency,
        start_date: f.startDate, end_date: f.endDate || null, next_run_date: f.startDate,
        requires_approval: f.requiresApproval, created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring-templates'] }); toast.success('Template created'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePause = useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const { error } = await (supabase.from('recurring_document_templates' as any).update({ is_paused: paused }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring-templates'] }); toast.success('Updated'); },
  });

  const docTypes = [
    { value: 'ar_invoice', label: 'AR Invoice' }, { value: 'ap_invoice', label: 'AP Invoice' },
    { value: 'journal_entry', label: 'Journal Entry' }, { value: 'payroll', label: 'Payroll' },
    { value: 'rent_charge', label: 'Rent Charge' }, { value: 'subscription', label: 'Subscription' },
    { value: 'project_billing', label: 'Project Billing' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recurring Documents</h1>
          <p className="text-muted-foreground">Auto-generate invoices, journals, rent charges and subscriptions on schedule</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Template</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Recurring Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Template Name</Label><Input value={form.templateName} onChange={e => setForm(f => ({ ...f, templateName: e.target.value }))} /></div>
              <div><Label>Document Type</Label>
                <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docTypes.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><Label>End Date (optional)</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.requiresApproval} onCheckedChange={v => setForm(f => ({ ...f, requiresApproval: v }))} /><Label>Requires Approval</Label></div>
              <Button onClick={() => create.mutate(form)} disabled={create.isPending} className="w-full">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: 'Total Templates', val: templates.length }, { label: 'Active', val: templates.filter((t: any) => t.is_active && !t.is_paused).length }, { label: 'Paused', val: templates.filter((t: any) => t.is_paused).length }, { label: 'Total Runs', val: templates.reduce((s: number, t: any) => s + (t.total_runs || 0), 0) }].map(k => (
          <Card key={k.label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold">{k.val}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Frequency</TableHead><TableHead>Next Run</TableHead><TableHead>Runs</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.template_name}</TableCell>
                  <TableCell><Badge variant="outline">{t.document_type}</Badge></TableCell>
                  <TableCell>{t.frequency}</TableCell>
                  <TableCell>{t.next_run_date || '—'}</TableCell>
                  <TableCell>{t.total_runs}</TableCell>
                  <TableCell><Badge variant={t.is_paused ? 'secondary' : 'default'}>{t.is_paused ? 'Paused' : 'Active'}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => togglePause.mutate({ id: t.id, paused: !t.is_paused })}>
                      {t.is_paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No recurring templates</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
