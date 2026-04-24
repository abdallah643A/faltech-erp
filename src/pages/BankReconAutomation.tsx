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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Link2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BankReconAutomation() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedStmt, setSelectedStmt] = useState<string | null>(null);
  const [form, setForm] = useState({ statementDate: '', periodFrom: '', periodTo: '', openingBalance: '0', closingBalance: '0' });

  const { data: statements = [] } = useQuery({
    queryKey: ['bank-recon-statements', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('bank_recon_statements' as any).select('*').order('statement_date', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['bank-recon-entries', selectedStmt],
    queryFn: async () => {
      if (!selectedStmt) return [];
      const { data, error } = await (supabase.from('bank_recon_entries' as any).select('*').eq('statement_id', selectedStmt).order('entry_date') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedStmt,
  });

  const createStatement = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('bank_recon_statements' as any).insert({
        statement_date: f.statementDate, period_from: f.periodFrom, period_to: f.periodTo,
        opening_balance: parseFloat(f.openingBalance) || 0, closing_balance: parseFloat(f.closingBalance) || 0,
        created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-recon-statements'] }); toast.success('Statement created'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const matchEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('bank_recon_entries' as any).update({
        match_status: 'matched', match_type: 'manual', matched_by: user?.id, matched_at: new Date().toISOString(),
      }).eq('id', entryId) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-recon-entries'] }); toast.success('Entry matched'); },
  });

  const matched = entries.filter((e: any) => e.match_status === 'matched').length;
  const unmatched = entries.filter((e: any) => e.match_status === 'unmatched').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Import statements, auto-match transactions, manual matching and audit trail</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Statement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Bank Statement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Statement Date</Label><Input type="date" value={form.statementDate} onChange={e => setForm(f => ({ ...f, statementDate: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Period From</Label><Input type="date" value={form.periodFrom} onChange={e => setForm(f => ({ ...f, periodFrom: e.target.value }))} /></div>
                <div><Label>Period To</Label><Input type="date" value={form.periodTo} onChange={e => setForm(f => ({ ...f, periodTo: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Opening Balance</Label><Input type="number" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} /></div>
                <div><Label>Closing Balance</Label><Input type="number" value={form.closingBalance} onChange={e => setForm(f => ({ ...f, closingBalance: e.target.value }))} /></div>
              </div>
              <Button onClick={() => createStatement.mutate(form)} disabled={createStatement.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Statements</p><p className="text-2xl font-bold">{statements.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Entries</p><p className="text-2xl font-bold">{entries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /><p className="text-sm text-muted-foreground">Matched</p></div><p className="text-2xl font-bold">{matched}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-500" /><p className="text-sm text-muted-foreground">Unmatched</p></div><p className="text-2xl font-bold">{unmatched}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="font-semibold">Statements</h2>
          {statements.map((s: any) => (
            <Card key={s.id} className={`cursor-pointer transition-colors ${selectedStmt === s.id ? 'border-primary' : ''}`} onClick={() => setSelectedStmt(s.id)}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div><p className="font-medium">{s.statement_date}</p><p className="text-sm text-muted-foreground">Opening: {Number(s.opening_balance).toLocaleString()}</p></div>
                  <Badge variant={s.status === 'reconciled' ? 'default' : 'outline'}>{s.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {statements.length === 0 && <p className="text-sm text-muted-foreground">No statements</p>}
        </div>

        <div className="lg:col-span-2">
          {selectedStmt ? (
            <Card>
              <CardHeader><CardTitle>Statement Entries</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>{t('common.date')}</TableHead><TableHead>Reference</TableHead><TableHead>{t('common.description')}</TableHead><TableHead className="text-right">{t('common.amount')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.entry_date}</TableCell>
                        <TableCell className="font-mono text-xs">{e.reference || '—'}</TableCell>
                        <TableCell>{e.description || '—'}</TableCell>
                        <TableCell className={`text-right font-medium ${e.entry_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{e.entry_type === 'credit' ? '+' : '-'}{Number(e.amount).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={e.match_status === 'matched' ? 'default' : 'outline'}>{e.match_status}</Badge></TableCell>
                        <TableCell>{e.match_status === 'unmatched' && <Button size="sm" variant="ghost" onClick={() => matchEntry.mutate(e.id)}><Link2 className="h-4 w-4" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                    {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No entries in this statement</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : <Card><CardContent className="py-12 text-center text-muted-foreground">Select a statement to view entries</CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
