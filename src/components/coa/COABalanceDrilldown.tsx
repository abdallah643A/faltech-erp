import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { Account } from './COATreeItem';

interface COABalanceDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function COABalanceDrilldown({ open, onOpenChange, account }: COABalanceDrilldownProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: journalLines, isLoading } = useQuery({
    queryKey: ['coa-balance-drilldown', account?.acct_code, dateFrom, dateTo],
    enabled: open && !!account,
    queryFn: async () => {
      // First get matching journal entry IDs if date filter is applied
      let journalEntryIds: string[] | null = null;
      if (dateFrom || dateTo) {
        let jeQuery = supabase.from('journal_entries').select('id');
        if (dateFrom) jeQuery = jeQuery.gte('doc_date', dateFrom);
        if (dateTo) jeQuery = jeQuery.lte('doc_date', dateTo);
        const { data: jeData } = await jeQuery;
        journalEntryIds = (jeData || []).map((je: any) => je.id);
        if (journalEntryIds.length === 0) return [];
      }

      let q = supabase
        .from('journal_entry_lines')
        .select('id, line_num, acct_code, acct_name, debit, credit, remarks, journal_entry_id, journal_entries(doc_date, doc_num)')
        .eq('acct_code', account!.acct_code);

      if (journalEntryIds) {
        q = q.in('journal_entry_id', journalEntryIds);
      }

      q = q.limit(500);

      const { data, error } = await q;
      if (error) throw error;
      
      const mapped = (data || []).map((line: any) => ({
        ...line,
        doc_date: line.journal_entries?.doc_date || '',
        doc_num: line.journal_entries?.doc_num || '',
      }));
      mapped.sort((a: any, b: any) => (a.doc_date || '').localeCompare(b.doc_date || ''));
      return mapped;
    },
  });

  // Opening balance: sum of all transactions BEFORE dateFrom
  const { data: openingBalance } = useQuery({
    queryKey: ['coa-opening-balance', account?.acct_code, dateFrom],
    enabled: open && !!account && !!dateFrom,
    queryFn: async () => {
      // Get journal entries before dateFrom
      const { data: jeData } = await supabase
        .from('journal_entries')
        .select('id')
        .lt('doc_date', dateFrom);
      const jeIds = (jeData || []).map((je: any) => je.id);
      if (jeIds.length === 0) return 0;

      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit')
        .eq('acct_code', account!.acct_code)
        .in('journal_entry_id', jeIds);

      if (error) throw error;
      const totalDebit = (data || []).reduce((s: number, l: any) => s + (l.debit || 0), 0);
      const totalCredit = (data || []).reduce((s: number, l: any) => s + (l.credit || 0), 0);
      return totalDebit - totalCredit;
    },
  });

  if (!account) return null;

  const totalDebit = journalLines?.reduce((s, l) => s + (l.debit || 0), 0) || 0;
  const totalCredit = journalLines?.reduce((s, l) => s + (l.credit || 0), 0) || 0;
  const hasDateFilter = !!dateFrom;
  const openBal = hasDateFilter ? (openingBalance ?? 0) : 0;
  const closingBalance = openBal + totalDebit - totalCredit;

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">
            Balance Details: {account.acct_code} - {account.acct_name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Date Filter */}
          <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-md border">
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground uppercase">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground uppercase">To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={handleClearFilter} className="h-8 text-xs">Clear</Button>
            )}
          </div>

          {/* Summary */}
          <div className={`grid gap-3 ${hasDateFilter ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {hasDateFilter && (
              <div className="bg-muted/50 rounded-md p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Opening Balance</p>
                <p className="text-base font-bold text-foreground">
                  {openBal.toLocaleString('en', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <div className="bg-muted/50 rounded-md p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{hasDateFilter ? 'Closing Balance' : 'Balance'}</p>
              <p className="text-base font-bold text-foreground">
                {hasDateFilter
                  ? closingBalance.toLocaleString('en', { minimumFractionDigits: 2 })
                  : (account.balance || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-md p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total Debit</p>
              <p className="text-base font-semibold text-success">
                {totalDebit.toLocaleString('en', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-md p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total Credit</p>
              <p className="text-base font-semibold text-destructive">
                {totalCredit.toLocaleString('en', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Journal lines table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-muted/60 border-b">
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Doc Date</th>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Debit</th>
                  <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row when filtered */}
                {hasDateFilter && (
                  <tr className="bg-primary/5 border-b font-semibold">
                    <td className="px-2 py-1.5" colSpan={3}>Opening Balance</td>
                    <td className="px-2 py-1.5 text-right font-mono">{openBal >= 0 ? openBal.toLocaleString('en', { minimumFractionDigits: 2 }) : ''}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{openBal < 0 ? Math.abs(openBal).toLocaleString('en', { minimumFractionDigits: 2 }) : ''}</td>
                  </tr>
                )}
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-6"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading...</td></tr>
                ) : !journalLines?.length ? (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No journal entries found for this account.</td></tr>
                ) : (
                  journalLines.map((line: any, idx: number) => (
                    <tr key={line.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{line.doc_date || '-'}</td>
                      <td className="px-2 py-1.5 truncate max-w-[180px]">{line.remarks || '-'}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{(line.debit || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{(line.credit || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
                {/* Closing balance row when filtered */}
                {hasDateFilter && journalLines && journalLines.length > 0 && (
                  <tr className="bg-primary/5 border-t font-semibold">
                    <td className="px-2 py-1.5" colSpan={3}>Closing Balance</td>
                    <td className="px-2 py-1.5 text-right font-mono">{closingBalance >= 0 ? closingBalance.toLocaleString('en', { minimumFractionDigits: 2 }) : ''}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{closingBalance < 0 ? Math.abs(closingBalance).toLocaleString('en', { minimumFractionDigits: 2 }) : ''}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {journalLines && journalLines.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">
              Showing latest {journalLines.length} entries
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
