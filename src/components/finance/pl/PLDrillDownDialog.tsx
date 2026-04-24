import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatSAR } from '@/lib/currency';
import { useNavigate } from 'react-router-dom';

interface PLDrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acctCode: string;
  acctName: string;
  dateFrom: string;
  dateTo: string;
  companyIds: string[];
}

export function PLDrillDownDialog({ open, onOpenChange, acctCode, acctName, dateFrom, dateTo, companyIds }: PLDrillDownDialogProps) {
  const navigate = useNavigate();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['pl-drill-down', acctCode, dateFrom, dateTo, companyIds],
    enabled: open && !!acctCode,
    queryFn: async () => {
      // Get JE IDs in period
      let jeQ = supabase.from('journal_entries').select('id, doc_num, posting_date, reference, memo, status');
      if (dateFrom) jeQ = jeQ.gte('posting_date', dateFrom);
      if (dateTo) jeQ = jeQ.lte('posting_date', dateTo);
      if (companyIds.length > 0) jeQ = jeQ.in('company_id', companyIds);
      jeQ = jeQ.eq('status', 'posted').order('posting_date', { ascending: false });

      const allJEs: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await jeQ.range(from, from + 999);
        if (error) throw error;
        allJEs.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }

      // Build map
      const jeMap: Record<string, any> = {};
      for (const je of allJEs) jeMap[je.id] = je;
      const jeIds = allJEs.map(j => j.id);
      if (jeIds.length === 0) return [];

      // Get lines for this account
      const result: any[] = [];
      for (let i = 0; i < jeIds.length; i += 100) {
        const chunk = jeIds.slice(i, i + 100);
        const { data, error } = await supabase.from('journal_entry_lines').select('*').in('journal_entry_id', chunk).eq('acct_code', acctCode);
        if (error) throw error;
        for (const line of (data || [])) {
          const je = jeMap[line.journal_entry_id];
          if (je) result.push({ ...line, je });
        }
      }
      return result.sort((a, b) => b.je.posting_date.localeCompare(a.je.posting_date));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{acctCode}</span>
            <span>{acctName}</span>
            <Badge variant="secondary" className="text-xs">{entries.length} entries</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading journal entries...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>JE #</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>BP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e: any, i: number) => (
                <TableRow
                  key={i}
                  className="cursor-pointer hover:bg-accent/30"
                  onClick={() => { onOpenChange(false); navigate('/journal-entries'); }}
                >
                  <TableCell className="text-xs">{new Date(e.je.posting_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs font-mono">JE-{e.je.doc_num}</TableCell>
                  <TableCell className="text-xs">{e.je.reference || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{e.remarks || e.je.memo || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{Number(e.debit) > 0 ? formatSAR(e.debit) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{Number(e.credit) > 0 ? formatSAR(e.credit) : '—'}</TableCell>
                  <TableCell className="text-xs">{e.bp_name || e.bp_code || '—'}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No journal entries found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
