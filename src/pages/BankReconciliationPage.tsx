import { useState } from 'react';
import { useBankReconciliations } from '@/hooks/useBankReconciliation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Link2, CheckCircle, MoreHorizontal, Landmark, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BankReconciliation() {
  const { t } = useLanguage();
  const { reconciliations, isLoading, createReconciliation, updateReconciliation } = useBankReconciliations();
  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ bank_account: '', statement_date: '', statement_balance: 0, book_balance: 0 });

  const filtered = (reconciliations || []).filter(r =>
    !searchTerm || r.recon_number?.toLowerCase().includes(searchTerm.toLowerCase()) || r.bank_account?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: reconciliations?.length || 0,
    inProgress: reconciliations?.filter(r => r.status === 'in_progress').length || 0,
    completed: reconciliations?.filter(r => r.status === 'completed').length || 0,
    totalDiff: reconciliations?.reduce((s, r) => s + Math.abs(r.difference || 0), 0) || 0,
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Match bank statements with book entries</p>
        </div>
        <Button onClick={() => { setForm({ bank_account: '', statement_date: new Date().toISOString().split('T')[0], statement_balance: 0, book_balance: 0 }); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Reconciliation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Recons</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Link2 className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.totalDiff.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Difference</p></div></div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search reconciliations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Recon #</TableHead><TableHead>Bank Account</TableHead><TableHead>Statement Date</TableHead>
            <TableHead>Statement Bal.</TableHead><TableHead>Book Bal.</TableHead><TableHead>Difference</TableHead>
            <TableHead>Matched</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-[50px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
             filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No reconciliations found</TableCell></TableRow> :
             filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.recon_number}</TableCell>
                <TableCell className="font-medium">{r.bank_account}</TableCell>
                <TableCell>{format(new Date(r.statement_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{(r.statement_balance || 0).toLocaleString()}</TableCell>
                <TableCell>{(r.book_balance || 0).toLocaleString()}</TableCell>
                <TableCell className={Math.abs(r.difference || 0) > 0 ? 'text-destructive font-bold' : 'text-green-600 font-bold'}>{(r.difference || 0).toLocaleString()}</TableCell>
                <TableCell>{r.matched_count || 0}/{(r.matched_count || 0) + (r.unmatched_count || 0)}</TableCell>
                <TableCell><Badge variant={r.status === 'completed' ? 'default' : 'outline'}>{r.status}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.status === 'in_progress' && <DropdownMenuItem onClick={() => updateReconciliation.mutate({ id: r.id, status: 'completed', reconciled_at: new Date().toISOString() })}><CheckCircle className="h-4 w-4 mr-2" />Complete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
             ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Bank Reconciliation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Bank Account</Label><Input value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})} placeholder="e.g. Main Business Account" /></div>
            <div><Label>Statement Date</Label><Input type="date" value={form.statement_date} onChange={e => setForm({...form, statement_date: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Statement Balance</Label><Input type="number" value={form.statement_balance} onChange={e => setForm({...form, statement_balance: +e.target.value})} /></div>
              <div><Label>Book Balance</Label><Input type="number" value={form.book_balance} onChange={e => setForm({...form, book_balance: +e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!form.bank_account || !form.statement_date} onClick={() => {
              createReconciliation.mutate({ ...form, difference: form.statement_balance - form.book_balance });
              setFormOpen(false);
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
