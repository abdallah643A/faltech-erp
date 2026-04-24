import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Copy, FileX, Clock, CheckCircle, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';

const REASON_CODES = [
  { code: 'DUP', label: 'Duplicate Transaction' },
  { code: 'MISS', label: 'Missing Transaction' },
  { code: 'AMT', label: 'Amount Mismatch' },
  { code: 'TIME', label: 'Timing Difference' },
  { code: 'FEE', label: 'Bank Fee/Charge' },
  { code: 'FX', label: 'Exchange Rate Difference' },
  { code: 'OTHER', label: 'Other' },
];

export default function ReconExceptions() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: statementLines = [] } = useQuery({
    queryKey: ['recon-exception-lines'],
    queryFn: async () => {
      const { data } = await (supabase.from('bank_statement_lines' as any).select('*').order('line_num').limit(1000) as any);
      return (data || []) as any[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['recon-exception-payments'],
    queryFn: async () => {
      const { data: inP } = await supabase.from('incoming_payments').select('id, total_amount, doc_date, reference').limit(1000);
      const { data: outP } = await (supabase.from('outgoing_payments' as any).select('id, total_amount, doc_date, reference').limit(1000) as any);
      return [...(inP || []), ...(outP || [])] as any[];
    },
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(v);

  // Detect exceptions
  const exceptions = useMemo(() => {
    const results: { id: string; type: string; description: string; amount: number; date: string; severity: 'high' | 'medium' | 'low'; lineId?: string; status: string }[] = [];

    // Duplicate detection in bank lines
    const amountDateMap = new Map<string, any[]>();
    statementLines.forEach((l: any) => {
      const key = `${Math.abs(l.amount || l.credit || l.debit || 0)}-${l.value_date || l.transaction_date}`;
      if (!amountDateMap.has(key)) amountDateMap.set(key, []);
      amountDateMap.get(key)!.push(l);
    });
    amountDateMap.forEach((lines, key) => {
      if (lines.length > 1) {
        lines.forEach((l: any, i: number) => {
          if (i > 0) {
            results.push({
              id: `dup-${l.id}`, type: 'DUP', description: `Possible duplicate: ${l.description || 'Transaction'} — same amount & date as another line`,
              amount: Math.abs(l.amount || l.credit || l.debit || 0), date: l.value_date || l.transaction_date || '', severity: 'high', lineId: l.id, status: 'open',
            });
          }
        });
      }
    });

    // Amount mismatches (unmatched lines with close-but-not-exact matches)
    statementLines.filter((l: any) => !l.reconciliation_status || l.reconciliation_status === 'unmatched').forEach((l: any) => {
      const bankAmt = Math.abs(l.amount || l.credit || l.debit || 0);
      const closeMatches = payments.filter((p: any) => {
        const diff = Math.abs(Math.abs(p.total_amount || 0) - bankAmt);
        return diff > 0 && diff < bankAmt * 0.05;
      });
      if (closeMatches.length > 0) {
        results.push({
          id: `amt-${l.id}`, type: 'AMT', description: `Amount mismatch: Bank ${fmt(bankAmt)} vs Payment ${fmt(closeMatches[0].total_amount)}`,
          amount: bankAmt, date: l.value_date || '', severity: 'medium', lineId: l.id, status: 'open',
        });
      }
    });

    // Missing transactions (payments without matching bank lines)
    payments.forEach((p: any) => {
      const pAmt = Math.abs(p.total_amount || 0);
      const hasMatch = statementLines.some((l: any) => {
        const bankAmt = Math.abs(l.amount || l.credit || l.debit || 0);
        return Math.abs(bankAmt - pAmt) < 0.01;
      });
      if (!hasMatch && pAmt > 0) {
        results.push({
          id: `miss-${p.id}`, type: 'MISS', description: `Payment ${p.reference || p.id.slice(0, 8)} not found in bank statements`,
          amount: pAmt, date: p.doc_date || '', severity: 'medium', lineId: undefined, status: 'open',
        });
      }
    });

    return results;
  }, [statementLines, payments]);

  const filtered = exceptions.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const dupCount = exceptions.filter(e => e.type === 'DUP').length;
  const amtCount = exceptions.filter(e => e.type === 'AMT').length;
  const missCount = exceptions.filter(e => e.type === 'MISS').length;
  const highCount = exceptions.filter(e => e.severity === 'high').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exception Handling</h1>
        <p className="text-sm text-muted-foreground">Auto-detected reconciliation discrepancies</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Exceptions</p><p className="text-2xl font-bold">{exceptions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-1"><Copy className="h-3 w-3 text-destructive" /><p className="text-xs text-muted-foreground">Duplicates</p></div><p className="text-2xl font-bold text-destructive">{dupCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" /><p className="text-xs text-muted-foreground">Amount Mismatches</p></div><p className="text-2xl font-bold text-amber-600">{amtCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-1"><FileX className="h-3 w-3 text-blue-600" /><p className="text-xs text-muted-foreground">Missing</p></div><p className="text-2xl font-bold text-blue-600">{missCount}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search exceptions..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-8 text-xs" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Filter by type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {REASON_CODES.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Exception List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Exceptions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">No exceptions detected. All clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.slice(0, 30).map(e => (
                <div key={e.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant={e.severity === 'high' ? 'destructive' : e.severity === 'medium' ? 'secondary' : 'outline'} className="text-[10px]">
                      {e.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {REASON_CODES.find(r => r.code === e.type)?.label || e.type}
                    </Badge>
                    <div>
                      <p className="text-xs">{e.description}</p>
                      <p className="text-[10px] text-muted-foreground">{e.date} • SAR {fmt(e.amount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">Resolve</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <p className="text-sm">{e.description}</p>
                          <Select>
                            <SelectTrigger className="text-xs"><SelectValue placeholder="Select reason code" /></SelectTrigger>
                            <SelectContent>
                              {REASON_CODES.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Textarea placeholder="Notes..." className="text-xs" />
                          <div className="flex gap-2">
                            <Button size="sm" className="text-xs" onClick={() => toast({ title: 'Exception resolved' })}>Create Adjustment Entry</Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => toast({ title: 'Marked as exception' })}>Mark as Exception</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
