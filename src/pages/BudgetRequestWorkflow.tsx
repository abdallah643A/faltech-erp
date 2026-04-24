import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BudgetRequestWorkflow() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fiscalYear: new Date().getFullYear(), department: '', accountCode: '', accountName: '', requestedAmount: '', justification: '' });

  const { data: requests = [] } = useQuery({
    queryKey: ['budget-requests', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('budget_requests' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const reqNum = `BR-${Date.now().toString().slice(-8)}`;
      const { error } = await (supabase.from('budget_requests' as any).insert({
        request_number: reqNum, fiscal_year: f.fiscalYear, department: f.department,
        account_code: f.accountCode, account_name: f.accountName,
        requested_amount: parseFloat(f.requestedAmount) || 0,
        justification: f.justification, submitted_by: user?.id, created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-requests'] }); toast.success('Budget request created'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from('budget_requests' as any).update({ status: 'approved', approved_amount: amount }).eq('id', id) as any);
      await (supabase.from('budget_request_approvals' as any).insert({
        request_id: id, approver_id: user?.id, action: 'approved', approved_amount: amount,
      }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-requests'] }); toast.success('Approved'); },
  });

  const rejectRequest = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from('budget_requests' as any).update({ status: 'rejected' }).eq('id', id) as any);
      await (supabase.from('budget_request_approvals' as any).insert({ request_id: id, approver_id: user?.id, action: 'rejected' }) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-requests'] }); toast.success('Rejected'); },
  });

  const totalRequested = requests.reduce((s: number, r: any) => s + Number(r.requested_amount || 0), 0);
  const totalApproved = requests.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + Number(r.approved_amount || 0), 0);

  const statusColor = (s: string) => s === 'approved' ? 'default' as const : s === 'rejected' ? 'destructive' as const : 'outline' as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget Request Workflow</h1>
          <p className="text-muted-foreground">Request, approve and track budgets by department, project and account</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Budget Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscalYear} onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))} /></div>
                <div><Label>{t('hr.department')}</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Account Code</Label><Input value={form.accountCode} onChange={e => setForm(f => ({ ...f, accountCode: e.target.value }))} /></div>
                <div><Label>Account Name</Label><Input value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} /></div>
              </div>
              <div><Label>Requested Amount</Label><Input type="number" value={form.requestedAmount} onChange={e => setForm(f => ({ ...f, requestedAmount: e.target.value }))} /></div>
              <div><Label>Justification</Label><Textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} /></div>
              <Button onClick={() => createRequest.mutate(form)} disabled={createRequest.isPending} className="w-full">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Requests</p><p className="text-2xl font-bold">{requests.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t('common.pending')}</p><p className="text-2xl font-bold">{requests.filter((r: any) => r.status === 'draft').length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Requested</p><p className="text-2xl font-bold">{totalRequested.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Approved</p><p className="text-2xl font-bold">{totalApproved.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Budget Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Request #</TableHead><TableHead>Year</TableHead><TableHead>{t('hr.department')}</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Requested</TableHead><TableHead className="text-right">Approved</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {requests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.request_number}</TableCell>
                  <TableCell>{r.fiscal_year}</TableCell>
                  <TableCell>{r.department || '—'}</TableCell>
                  <TableCell>{r.account_code} {r.account_name}</TableCell>
                  <TableCell className="text-right">{Number(r.requested_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.approved_amount ? Number(r.approved_amount).toLocaleString() : '—'}</TableCell>
                  <TableCell><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    {r.status === 'draft' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => approveRequest.mutate({ id: r.id, amount: r.requested_amount })}><CheckCircle className="h-4 w-4 text-green-500" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => rejectRequest.mutate(r.id)}><XCircle className="h-4 w-4 text-red-500" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No budget requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
