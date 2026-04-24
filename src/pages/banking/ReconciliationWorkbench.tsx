import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Check, Split, AlertTriangle, RefreshCw } from 'lucide-react';
import { useImportLines, useCandidates, useAcceptCandidate, useRunAutoRecon } from '@/hooks/useBankRecon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function CandidatePanel({ rawLineId, onClose }: { rawLineId: string; onClose: () => void }) {
  const { data: cands = [] } = useCandidates(rawLineId);
  const accept = useAcceptCandidate();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Match Candidates</DialogTitle></DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doc</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cands.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.ledger_doc_number}</TableCell>
                <TableCell>{Number(c.ledger_amount).toLocaleString()}</TableCell>
                <TableCell>{c.ledger_date}</TableCell>
                <TableCell className="max-w-[200px] truncate">{c.ledger_party}</TableCell>
                <TableCell><Badge variant="outline">{c.match_source}</Badge></TableCell>
                <TableCell>
                  <Badge variant={c.confidence_band === 'high' ? 'default' : c.confidence_band === 'medium' ? 'secondary' : 'outline'}>
                    {c.confidence_score}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => accept.mutate({ candidateId: c.id, rawLineId }, { onSuccess: onClose })}>
                    <Check className="h-3 w-3 mr-1" />Accept
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {cands.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">No candidates</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {cands[0]?.rationale && (
          <p className="text-sm text-muted-foreground italic mt-2">Top: {cands[0].rationale}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ReconciliationWorkbench() {
  const { importId } = useParams<{ importId: string }>();
  const { data: lines = [], isLoading } = useImportLines(importId);
  const recon = useRunAutoRecon();
  const [activeLine, setActiveLine] = useState<string | null>(null);

  const counts = lines.reduce((acc: any, l: any) => {
    acc[l.match_status] = (acc[l.match_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation Workbench</h1>
          <p className="text-muted-foreground">Review candidates, accept matches, and resolve exceptions</p>
        </div>
        <Button onClick={() => recon.mutate({ import_id: importId! })} disabled={recon.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${recon.isPending ? 'animate-spin' : ''}`} />Re-run Auto-Recon
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {['unmatched', 'suggested', 'matched', 'split', 'exception'].map((s) => (
          <Card key={s}>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{counts[s] ?? 0}</p>
              <p className="text-xs text-muted-foreground capitalize">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Statement Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Dir</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Counterparty / Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6">Loading…</TableCell></TableRow>
              ) : lines.map((l: any) => (
                <TableRow key={l.id} className={l.is_duplicate ? 'opacity-60' : ''}>
                  <TableCell>{l.line_number}</TableCell>
                  <TableCell>{l.value_date}</TableCell>
                  <TableCell className="font-mono">{Number(l.amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={l.direction === 'credit' ? 'default' : 'secondary'}>{l.direction}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{l.bank_reference ?? l.customer_reference ?? '—'}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{l.counterparty_name ?? l.description}</TableCell>
                  <TableCell>
                    {l.is_duplicate ? <Badge variant="outline">duplicate</Badge> :
                     l.match_status === 'matched' ? <Badge><Check className="h-3 w-3 mr-1" />matched</Badge> :
                     l.match_status === 'exception' ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />exception</Badge> :
                     l.match_status === 'suggested' ? <Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" />suggested</Badge> :
                     <Badge variant="outline">{l.match_status}</Badge>}
                  </TableCell>
                  <TableCell>
                    {!l.is_duplicate && l.match_status !== 'matched' && (
                      <Button size="sm" variant="ghost" onClick={() => setActiveLine(l.id)}>Review</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeLine && <CandidatePanel rawLineId={activeLine} onClose={() => setActiveLine(null)} />}
    </div>
  );
}
