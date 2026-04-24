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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Landmark, ArrowLeftRight, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TreasuryWorkspace() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [acctOpen, setAcctOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [acctForm, setAcctForm] = useState({ accountName: '', bankName: '', accountNumber: '', iban: '', currency: 'SAR', currentBalance: '0' });
  const [txForm, setTxForm] = useState({ fromAccount: '', toAccount: '', amount: '', reference: '' });

  const { data: accounts = [] } = useQuery({
    queryKey: ['treasury-accounts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('treasury_accounts' as any).select('*').order('account_name') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['treasury-transfers'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('treasury_transfers' as any).select('*').order('created_at', { ascending: false }).limit(50) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (f: any) => {
      const { error } = await (supabase.from('treasury_accounts' as any).insert({
        account_name: f.accountName, bank_name: f.bankName, account_number: f.accountNumber,
        iban: f.iban, currency: f.currency, current_balance: parseFloat(f.currentBalance) || 0,
        available_balance: parseFloat(f.currentBalance) || 0,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treasury-accounts'] }); toast.success('Account added'); setAcctOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const createTransfer = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('treasury_transfers' as any).insert({
        transfer_number: `TF-${Date.now().toString().slice(-8)}`,
        from_account_id: f.fromAccount, to_account_id: f.toAccount,
        amount: parseFloat(f.amount), reference: f.reference, created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treasury-transfers'] }); toast.success('Transfer created'); setTxOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Treasury Workspace</h1>
          <p className="text-muted-foreground">Cash positions, bank accounts, and inter-account transfers</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={acctOpen} onOpenChange={setAcctOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Account Name</Label><Input value={acctForm.accountName} onChange={e => setAcctForm(f => ({ ...f, accountName: e.target.value }))} /></div>
                <div><Label>Bank Name</Label><Input value={acctForm.bankName} onChange={e => setAcctForm(f => ({ ...f, bankName: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Account Number</Label><Input value={acctForm.accountNumber} onChange={e => setAcctForm(f => ({ ...f, accountNumber: e.target.value }))} /></div>
                  <div><Label>IBAN</Label><Input value={acctForm.iban} onChange={e => setAcctForm(f => ({ ...f, iban: e.target.value }))} /></div>
                </div>
                <div><Label>Opening Balance</Label><Input type="number" value={acctForm.currentBalance} onChange={e => setAcctForm(f => ({ ...f, currentBalance: e.target.value }))} /></div>
                <Button onClick={() => createAccount.mutate(acctForm)} className="w-full">Add Account</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={txOpen} onOpenChange={setTxOpen}>
            <DialogTrigger asChild><Button><ArrowLeftRight className="h-4 w-4 mr-2" />Transfer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Inter-Account Transfer</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>From Account</Label>
                  <Select value={txForm.fromAccount} onValueChange={v => setTxForm(f => ({ ...f, fromAccount: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>To Account</Label>
                  <Select value={txForm.toAccount} onValueChange={v => setTxForm(f => ({ ...f, toAccount: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t('common.amount')}</Label><Input type="number" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div><Label>Reference</Label><Input value={txForm.reference} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value }))} /></div>
                <Button onClick={() => createTransfer.mutate(txForm)} className="w-full">Create Transfer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Total Cash Position</p></div><p className="text-2xl font-bold mt-1">{totalBalance.toLocaleString()} SAR</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Bank Accounts</p></div><p className="text-2xl font-bold mt-1">{accounts.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Pending Transfers</p></div><p className="text-2xl font-bold mt-1">{transfers.filter((t: any) => t.status === 'pending').length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList><TabsTrigger value="accounts">Bank Accounts</TabsTrigger><TabsTrigger value="transfers">Transfers</TabsTrigger></TabsList>
        <TabsContent value="accounts">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Bank</TableHead><TableHead>IBAN</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {accounts.map((a: any) => (
                  <TableRow key={a.id}><TableCell className="font-medium">{a.account_name}</TableCell><TableCell>{a.bank_name}</TableCell><TableCell className="font-mono text-xs">{a.iban}</TableCell><TableCell>{a.currency}</TableCell><TableCell className="text-right font-medium">{Number(a.current_balance).toLocaleString()}</TableCell></TableRow>
                ))}
                {accounts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No accounts</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="transfers">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>{t('common.amount')}</TableHead><TableHead>Reference</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {transfers.map((t: any) => (
                  <TableRow key={t.id}><TableCell className="font-medium">{t.transfer_number}</TableCell><TableCell>{Number(t.amount).toLocaleString()} {t.currency}</TableCell><TableCell>{t.reference || '—'}</TableCell><TableCell><Badge variant="outline">{t.status}</Badge></TableCell><TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell></TableRow>
                ))}
                {transfers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transfers</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
