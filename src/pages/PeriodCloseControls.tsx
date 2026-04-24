import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PeriodCloseControls() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [reopenDialog, setReopenDialog] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const { data: controls = [] } = useQuery({
    queryKey: ['period-close-controls', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('period_close_controls' as any).select('*').order('fiscal_year', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: reopenRequests = [] } = useQuery({
    queryKey: ['period-reopen-requests'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('period_reopen_requests' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const softClose = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('period_close_controls' as any).update({ close_type: 'soft', status: 'soft_closed', soft_closed_by: user?.id, soft_closed_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period-close-controls'] }); toast.success('Period soft closed'); },
  });

  const hardClose = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('period_close_controls' as any).update({ close_type: 'hard', status: 'hard_closed', hard_closed_by: user?.id, hard_closed_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period-close-controls'] }); toast.success('Period hard closed'); },
  });

  const requestReopen = useMutation({
    mutationFn: async ({ controlId, reason }: { controlId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('period_reopen_requests' as any).insert({ control_id: controlId, requester_id: user?.id, reason }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period-reopen-requests'] }); toast.success('Reopen request submitted'); setReopenDialog(null); setReopenReason(''); },
  });

  const createControl = useMutation({
    mutationFn: async () => {
      const year = new Date().getFullYear();
      const period = new Date().getMonth() + 1;
      const { error } = await (supabase.from('period_close_controls' as any).insert({
        fiscal_year: year, period_number: period, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period-close-controls'] }); toast.success('Period control created'); },
  });

  const statusColor = (s: string) => {
    if (s === 'hard_closed') return 'destructive' as const;
    if (s === 'soft_closed') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Period Close Controls</h1>
          <p className="text-muted-foreground">Soft close, hard close, and reopen request workflows</p>
        </div>
        <Button onClick={() => createControl.mutate()}><Plus className="h-4 w-4 mr-2" />Add Current Period</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Period Controls</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Period</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Close Type</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {controls.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.fiscal_year}</TableCell>
                  <TableCell>Period {c.period_number}</TableCell>
                  <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
                  <TableCell>{c.close_type || '—'}</TableCell>
                  <TableCell className="space-x-2">
                    {c.status === 'open' && <Button size="sm" variant="outline" onClick={() => softClose.mutate(c.id)}><Lock className="h-3 w-3 mr-1" />Soft Close</Button>}
                    {c.status === 'soft_closed' && <Button size="sm" variant="outline" onClick={() => hardClose.mutate(c.id)}><ShieldCheck className="h-3 w-3 mr-1" />Hard Close</Button>}
                    {(c.status === 'soft_closed' || c.status === 'hard_closed') && <Button size="sm" variant="ghost" onClick={() => setReopenDialog(c.id)}><Unlock className="h-3 w-3 mr-1" />Request Reopen</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {controls.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No period controls</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {reopenRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Reopen Requests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Reason</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {reopenRequests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!reopenDialog} onOpenChange={() => setReopenDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Period Reopen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Reason</Label><Textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="Explain why this period needs to be reopened..." /></div>
            <Button onClick={() => reopenDialog && requestReopen.mutate({ controlId: reopenDialog, reason: reopenReason })} className="w-full">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
