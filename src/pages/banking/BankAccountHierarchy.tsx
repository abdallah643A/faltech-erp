import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Landmark, ChevronRight, ChevronDown } from 'lucide-react';
import { useTreasBankAccounts } from '@/hooks/useTreasuryEnhanced';

export default function BankAccountHierarchy() {
  const { data: accounts = [], upsert } = useTreasBankAccounts();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ account_type: 'operating', currency: 'SAR', status: 'active' });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => {
    const byParent: Record<string, any[]> = {};
    accounts.forEach((a: any) => {
      const k = a.parent_account_id || 'root';
      (byParent[k] ||= []).push(a);
    });
    return byParent;
  }, [accounts]);

  const renderNode = (node: any, depth = 0): JSX.Element => {
    const children = tree[node.id] || [];
    const hasChildren = children.length > 0;
    const isOpen = expanded[node.id] !== false;
    return (
      <div key={node.id}>
        <div className="flex items-center gap-2 py-2 border-b hover:bg-muted/30 px-2" style={{ paddingLeft: depth * 24 + 8 }}>
          {hasChildren ? (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded((e) => ({ ...e, [node.id]: !isOpen }))}>
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          ) : <div className="w-6" />}
          <Landmark className="h-4 w-4 text-primary" />
          <span className="font-medium">{node.account_code}</span>
          <span className="text-muted-foreground">{node.account_name}</span>
          <Badge variant="outline" className="ml-2">{node.account_type}</Badge>
          {node.iban && <span className="text-xs font-mono text-muted-foreground ml-auto">{node.iban}</span>}
          <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>{node.status}</Badge>
          <span className="text-xs">{node.currency}</span>
        </div>
        {hasChildren && isOpen && children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const submit = async () => {
    await upsert.mutateAsync(draft);
    setOpen(false);
    setDraft({ account_type: 'operating', currency: 'SAR', status: 'active' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Bank Account Hierarchy</h1>
          <p className="text-muted-foreground">Master/sub-accounts with sweep, escrow, and virtual structures (SAMA-aligned)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Account</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{accounts.length}</p><p className="text-xs text-muted-foreground">Total Accounts</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{accounts.filter((a: any) => a.account_type === 'master').length}</p><p className="text-xs text-muted-foreground">Master Accounts</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{accounts.filter((a: any) => a.is_sweep_target).length}</p><p className="text-xs text-muted-foreground">Sweep Targets</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{new Set(accounts.map((a: any) => a.bank_code)).size}</p><p className="text-xs text-muted-foreground">Banks</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Hierarchy Tree</CardTitle></CardHeader>
        <CardContent>
          {(tree['root'] || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No accounts yet. Create your first account.</p>
          ) : (
            <div className="rounded-md border">{(tree['root'] || []).map((n: any) => renderNode(n))}</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Bank Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code</Label><Input value={draft.account_code || ''} onChange={(e) => setDraft({ ...draft, account_code: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={draft.account_name || ''} onChange={(e) => setDraft({ ...draft, account_name: e.target.value })} /></div>
            <div><Label>Name (Arabic)</Label><Input dir="rtl" value={draft.account_name_ar || ''} onChange={(e) => setDraft({ ...draft, account_name_ar: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.account_type} onValueChange={(v) => setDraft({ ...draft, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['master', 'operating', 'payroll', 'escrow', 'sweep', 'virtual'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent Account</Label>
              <Select value={draft.parent_account_id || 'none'} onValueChange={(v) => setDraft({ ...draft, parent_account_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None (root)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root)</SelectItem>
                  {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Bank Code</Label><Input value={draft.bank_code || ''} onChange={(e) => setDraft({ ...draft, bank_code: e.target.value })} placeholder="SNB, RJHI, RIBL…" /></div>
            <div><Label>Bank Name</Label><Input value={draft.bank_name || ''} onChange={(e) => setDraft({ ...draft, bank_name: e.target.value })} /></div>
            <div><Label>IBAN</Label><Input value={draft.iban || ''} onChange={(e) => setDraft({ ...draft, iban: e.target.value })} placeholder="SA00…" /></div>
            <div><Label>SWIFT/BIC</Label><Input value={draft.swift_bic || ''} onChange={(e) => setDraft({ ...draft, swift_bic: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></div>
            <div><Label>GL Account</Label><Input value={draft.gl_account_code || ''} onChange={(e) => setDraft({ ...draft, gl_account_code: e.target.value })} /></div>
            <div><Label>Daily Limit</Label><Input type="number" value={draft.daily_payment_limit || ''} onChange={(e) => setDraft({ ...draft, daily_payment_limit: Number(e.target.value) })} /></div>
            <div><Label>Single Txn Limit</Label><Input type="number" value={draft.single_txn_limit || ''} onChange={(e) => setDraft({ ...draft, single_txn_limit: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending || !draft.account_code || !draft.account_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
