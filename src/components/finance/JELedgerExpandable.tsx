import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface JELedgerExpandableProps {
  postedJEs: any[];
  docTypeLabel: (dt: string) => string;
  onReverse?: (jeId: string) => void;
}

export default function JELedgerExpandable({ postedJEs, docTypeLabel, onReverse }: JELedgerExpandableProps) {
  const [expandedJE, setExpandedJE] = useState<string | null>(null);
  const [jeLines, setJeLines] = useState<Record<string, any[]>>({});
  const [loadingLines, setLoadingLines] = useState<string | null>(null);

  const toggleExpand = async (jeId: string) => {
    if (expandedJE === jeId) {
      setExpandedJE(null);
      return;
    }

    setExpandedJE(jeId);

    if (!jeLines[jeId]) {
      setLoadingLines(jeId);
      try {
        const { data, error } = await supabase
          .from('finance_journal_entry_lines')
          .select('*')
          .eq('je_id', jeId)
          .order('line_number');
        if (!error && data) {
          setJeLines(prev => ({ ...prev, [jeId]: data }));
        }
      } catch {
        // silent
      } finally {
        setLoadingLines(null);
      }
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>JE Number</TableHead>
          <TableHead>Source Doc Type</TableHead>
          <TableHead>Source Ref</TableHead>
          <TableHead>Posting Date</TableHead>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Debit</TableHead>
          <TableHead className="text-right">Credit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>SAP Sync</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {postedJEs.map((je: any) => (
          <>
            <TableRow
              key={je.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => toggleExpand(je.id)}
            >
              <TableCell>
                {expandedJE === je.id ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell className="font-mono font-medium">{je.je_number}</TableCell>
              <TableCell><Badge variant="outline">{docTypeLabel(je.source_document_type)}</Badge></TableCell>
              <TableCell>{je.source_document_ref}</TableCell>
              <TableCell>{je.posting_date}</TableCell>
              <TableCell>{je.period}</TableCell>
              <TableCell className="text-right font-mono">{Number(je.total_debit).toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{Number(je.total_credit).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={je.status === 'POSTED' ? 'default' : je.status === 'REVERSED' ? 'destructive' : 'secondary'}>
                  {je.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={
                  je.sap_sync_status === 'SYNCED' ? 'default' :
                  je.sap_sync_status === 'FAILED' ? 'destructive' : 'secondary'
                }>
                  {je.sap_sync_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                {je.status === 'POSTED' && onReverse && (
                  <Button size="sm" variant="ghost" onClick={() => onReverse(je.id)} title="Reverse JE">
                    <RotateCcw className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>

            {/* Expanded lines */}
            {expandedJE === je.id && (
              <TableRow key={`${je.id}-lines`}>
                <TableCell colSpan={11} className="p-0 bg-muted/30">
                  {loadingLines === je.id ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading lines...
                    </div>
                  ) : (
                    <div className="px-6 py-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        Journal Entry Lines — {je.je_number}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs w-10">#</TableHead>
                            <TableHead className="text-xs">Account Code</TableHead>
                            <TableHead className="text-xs">Account Name</TableHead>
                            <TableHead className="text-right text-xs">Debit</TableHead>
                            <TableHead className="text-right text-xs">Credit</TableHead>
                            <TableHead className="text-xs">Cost Center</TableHead>
                            <TableHead className="text-xs">Project</TableHead>
                            <TableHead className="text-xs">Partner</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Tax Code</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(jeLines[je.id] || []).map((line: any) => (
                            <TableRow key={line.id} className={line.debit_amount > 0 ? 'bg-green-50/20 dark:bg-green-950/10' : 'bg-red-50/20 dark:bg-red-950/10'}>
                              <TableCell className="text-xs text-muted-foreground">{line.line_number}</TableCell>
                              <TableCell className="font-mono text-xs font-medium">{line.account_code}</TableCell>
                              <TableCell className="text-xs">{line.account_name}</TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                <span className={line.debit_amount > 0 ? 'text-green-700 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                                  {line.debit_amount > 0 ? Number(line.debit_amount).toLocaleString('en', { minimumFractionDigits: 2 }) : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                <span className={line.credit_amount > 0 ? 'text-red-700 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                                  {line.credit_amount > 0 ? Number(line.credit_amount).toLocaleString('en', { minimumFractionDigits: 2 }) : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{line.cost_center || '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{line.project_code || '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{line.partner_id || '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{line.description || '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{line.tax_code || '-'}</TableCell>
                            </TableRow>
                          ))}
                          {(jeLines[je.id] || []).length === 0 && !loadingLines && (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center text-muted-foreground text-xs py-4">
                                No lines found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </>
        ))}
        {postedJEs.length === 0 && (
          <TableRow>
            <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
              No journal entries posted yet. JEs are auto-generated when documents are posted with active mapping rules.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
