import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Lock, Unlock, CheckCircle2, AlertTriangle, Clock, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Period {
  id: string;
  name: string;
  from: string;
  to: string;
  year: string;
  finance: 'open' | 'closed' | 'locked';
  sales: 'open' | 'closed' | 'locked';
  purchasing: 'open' | 'closed' | 'locked';
  inventory: 'open' | 'closed' | 'locked';
  pendingDrafts: number;
  pendingReconciliations: number;
  transactionCount: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const generatePeriods = (year: string): Period[] =>
  MONTHS.map((m, i) => {
    const isCurrent = year === '2026' && i === 3; // April 2026
    const isPast = year === '2025' || (year === '2026' && i < 3);
    const isFuture = year === '2026' && i > 3;
    return {
      id: `${year}-${String(i + 1).padStart(2, '0')}`,
      name: m,
      from: `${year}-${String(i + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(i + 1).padStart(2, '0')}-${new Date(Number(year), i + 1, 0).getDate()}`,
      year,
      finance: isPast ? 'closed' : 'open',
      sales: isPast ? 'closed' : 'open',
      purchasing: isPast ? 'closed' : 'open',
      inventory: isPast ? 'closed' : 'open',
      pendingDrafts: isCurrent ? 5 : isPast ? 0 : 0,
      pendingReconciliations: isCurrent ? 2 : isPast ? 0 : 0,
      transactionCount: isPast ? Math.floor(Math.random() * 500) + 100 : isCurrent ? 234 : 0,
    };
  });

export default function PostingPeriods() {
  const [year, setYear] = useState('2026');
  const [periods, setPeriods] = useState<Period[]>(generatePeriods('2026'));
  const [closeDialog, setCloseDialog] = useState<Period | null>(null);

  const handleYearChange = (y: string) => {
    setYear(y);
    setPeriods(generatePeriods(y));
  };

  const statusIcon = (s: string) => {
    if (s === 'open') return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]"><Unlock className="h-3 w-3 mr-0.5" />Open</Badge>;
    if (s === 'closed') return <Badge variant="secondary" className="text-[10px]"><Lock className="h-3 w-3 mr-0.5" />Closed</Badge>;
    return <Badge variant="destructive" className="text-[10px]"><Lock className="h-3 w-3 mr-0.5" />Locked</Badge>;
  };

  const tryClose = (p: Period) => {
    if (p.pendingDrafts > 0 || p.pendingReconciliations > 0) {
      setCloseDialog(p);
    } else {
      setPeriods(prev => prev.map(x => x.id === p.id ? { ...x, finance: 'closed', sales: 'closed', purchasing: 'closed', inventory: 'closed' } : x));
      toast.success(`${p.name} ${p.year} closed for all modules`);
    }
  };

  const openPeriods = periods.filter(p => p.finance === 'open').length;
  const closedPeriods = periods.filter(p => p.finance === 'closed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Posting Periods</h1>
          <p className="text-sm text-muted-foreground">Control which financial periods are open, closed, or locked per module</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{year}</div><div className="text-xs text-muted-foreground">Fiscal Year</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{openPeriods}</div><div className="text-xs text-muted-foreground">Open Periods</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{closedPeriods}</div><div className="text-xs text-muted-foreground">Closed</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{periods.reduce((s, p) => s + p.transactionCount, 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Transactions</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-center">Finance</TableHead>
                <TableHead className="text-center">Sales</TableHead>
                <TableHead className="text-center">Purchasing</TableHead>
                <TableHead className="text-center">Inventory</TableHead>
                <TableHead className="text-center">Drafts</TableHead>
                <TableHead className="text-center">Recon.</TableHead>
                <TableHead className="text-center">Txn Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map(p => {
                const isCurrent = year === '2026' && p.name === 'April';
                return (
                  <TableRow key={p.id} className={isCurrent ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium text-sm">
                      {p.name} {isCurrent && <Badge className="ml-1 text-[9px] bg-primary/20 text-primary">Current</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{p.from}</TableCell>
                    <TableCell className="text-xs">{p.to}</TableCell>
                    <TableCell className="text-center">{statusIcon(p.finance)}</TableCell>
                    <TableCell className="text-center">{statusIcon(p.sales)}</TableCell>
                    <TableCell className="text-center">{statusIcon(p.purchasing)}</TableCell>
                    <TableCell className="text-center">{statusIcon(p.inventory)}</TableCell>
                    <TableCell className="text-center">{p.pendingDrafts > 0 ? <span className="text-amber-600 font-medium">{p.pendingDrafts}</span> : '—'}</TableCell>
                    <TableCell className="text-center">{p.pendingReconciliations > 0 ? <span className="text-amber-600 font-medium">{p.pendingReconciliations}</span> : '—'}</TableCell>
                    <TableCell className="text-center text-sm">{p.transactionCount > 0 ? p.transactionCount : '—'}</TableCell>
                    <TableCell>
                      {p.finance === 'open' && (
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => tryClose(p)}>
                          <Lock className="h-3 w-3 mr-1" />Close
                        </Button>
                      )}
                      {p.finance === 'closed' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                          setPeriods(prev => prev.map(x => x.id === p.id ? { ...x, finance: 'open', sales: 'open', purchasing: 'open', inventory: 'open' } : x));
                          toast.info(`${p.name} reopened`);
                        }}>
                          <Unlock className="h-3 w-3 mr-1" />Reopen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Close Period Warning Dialog */}
      <Dialog open={!!closeDialog} onOpenChange={() => setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cannot Close Period</DialogTitle></DialogHeader>
          {closeDialog && (
            <div className="space-y-3">
              <p className="text-sm">The following issues must be resolved before closing <strong>{closeDialog.name} {closeDialog.year}</strong>:</p>
              {closeDialog.pendingDrafts > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm"><strong>{closeDialog.pendingDrafts}</strong> unposted draft(s) remaining</span>
                </div>
              )}
              {closeDialog.pendingReconciliations > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm"><strong>{closeDialog.pendingReconciliations}</strong> incomplete reconciliation(s)</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Review Issues</Button>
            <Button variant="destructive" onClick={() => {
              if (closeDialog) {
                setPeriods(prev => prev.map(x => x.id === closeDialog.id ? { ...x, finance: 'closed', sales: 'closed', purchasing: 'closed', inventory: 'closed' } : x));
                toast.warning(`${closeDialog.name} force-closed with pending items`);
                setCloseDialog(null);
              }
            }}>Force Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
