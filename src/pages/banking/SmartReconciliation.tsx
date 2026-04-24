import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Search, Zap, Link2, XCircle, RefreshCw, PanelRightOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBankStatementLines } from '@/hooks/useBanking';
import { useToast } from '@/hooks/use-toast';
import { ReconciliationAssistant } from '@/components/banking/ReconciliationAssistant';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'bank_transaction', header: 'Bank Transaction' },
  { key: 'matched_with', header: 'Matched With' },
  { key: 'matched_amount', header: 'Matched Amount' },
  { key: 'confidence', header: 'Confidence' },
  { key: 'action', header: 'Action' },
];


interface MatchResult {
  bankLineId: string;
  bankDesc: string;
  bankAmount: number;
  bankDate: string;
  matchedPaymentId?: string;
  matchedDesc?: string;
  matchedAmount?: number;
  matchedDate?: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy_amount' | 'fuzzy_date' | 'partial' | 'none';
}

export default function SmartReconciliation() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [amountTolerance, setAmountTolerance] = useState(1);
  const [dateFlex, setDateFlex] = useState(3);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const { data: statements = [] } = useQuery({
    queryKey: ['smart-recon-statements'],
    queryFn: async () => {
      const { data } = await (supabase.from('bank_statement_lines' as any).select('*').order('line_num').limit(500) as any);
      return (data || []) as any[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['smart-recon-payments'],
    queryFn: async () => {
      const { data: inP } = await supabase.from('incoming_payments').select('id, total_amount, doc_date, status, reference, customer_name').limit(500);
      const { data: outP } = await (supabase.from('outgoing_payments' as any).select('id, total_amount, doc_date, status, reference, vendor_name').limit(500) as any);
      return [...(inP || []).map((p: any) => ({ ...p, source: 'incoming', desc: p.customer_name || p.reference })),
              ...(outP || []).map((p: any) => ({ ...p, source: 'outgoing', desc: p.vendor_name || p.reference }))];
    },
  });

  // Fuzzy matching engine
  const matchResults = useMemo<MatchResult[]>(() => {
    return statements.map((line: any) => {
      const bankAmount = Math.abs(line.amount || line.credit || line.debit || 0);
      const bankDate = line.value_date || line.transaction_date || '';
      const bankDesc = line.description || line.reference || '';

      let bestMatch: any = null;
      let bestConfidence = 0;
      let matchType: MatchResult['matchType'] = 'none';

      payments.forEach((p: any) => {
        const pAmount = Math.abs(p.total_amount || 0);
        const pDate = p.doc_date || '';

        // Exact match
        if (pAmount === bankAmount && pDate === bankDate) {
          if (bestConfidence < 100) {
            bestMatch = p;
            bestConfidence = 100;
            matchType = 'exact';
          }
          return;
        }

        // Fuzzy amount match (within tolerance %)
        const amountDiff = Math.abs(pAmount - bankAmount);
        const amountPercent = bankAmount > 0 ? (amountDiff / bankAmount) * 100 : 100;

        // Date flexibility
        const daysDiff = pDate && bankDate ? Math.abs(new Date(pDate).getTime() - new Date(bankDate).getTime()) / 86400000 : 999;

        let confidence = 0;
        let type: MatchResult['matchType'] = 'none';

        if (amountPercent <= amountTolerance && daysDiff <= dateFlex) {
          confidence = 95 - amountPercent * 5 - daysDiff * 2;
          type = amountPercent === 0 ? 'fuzzy_date' : 'fuzzy_amount';
        } else if (amountPercent <= amountTolerance) {
          confidence = 70 - amountPercent * 10;
          type = 'fuzzy_amount';
        } else if (daysDiff <= dateFlex && amountPercent < 5) {
          confidence = 50;
          type = 'partial';
        }

        if (confidence > bestConfidence) {
          bestMatch = p;
          bestConfidence = confidence;
          matchType = type;
        }
      });

      return {
        bankLineId: line.id,
        bankDesc,
        bankAmount,
        bankDate,
        matchedPaymentId: bestMatch?.id,
        matchedDesc: bestMatch?.desc || bestMatch?.reference,
        matchedAmount: bestMatch?.total_amount,
        matchedDate: bestMatch?.doc_date,
        confidence: Math.round(bestConfidence),
        matchType,
      } as MatchResult;
    });
  }, [statements, payments, amountTolerance, dateFlex]);

  const exactMatches = matchResults.filter(r => r.matchType === 'exact');
  const fuzzyMatches = matchResults.filter(r => r.matchType === 'fuzzy_amount' || r.matchType === 'fuzzy_date');
  const partialMatches = matchResults.filter(r => r.matchType === 'partial');
  const unmatched = matchResults.filter(r => r.matchType === 'none');

  const filtered = matchResults.filter(r =>
    !search || r.bankDesc?.toLowerCase().includes(search.toLowerCase()) || r.matchedDesc?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 2 }).format(v);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 95) return <Badge className="bg-green-600 text-[10px]">{confidence}%</Badge>;
    if (confidence >= 70) return <Badge className="bg-amber-500 text-[10px]">{confidence}%</Badge>;
    if (confidence > 0) return <Badge variant="outline" className="text-[10px]">{confidence}%</Badge>;
    return <Badge variant="destructive" className="text-[10px]">No Match</Badge>;
  };

  const handleAcceptMatch = (result: MatchResult) => {
    toast({ title: 'Match accepted', description: `Bank line matched with payment ${result.matchedDesc}` });
  };

  // Build assistant suggestions from match results
  const assistantSuggestions = useMemo(() =>
    matchResults.filter(r => r.matchType !== 'none').map(r => ({
      bankLineId: r.bankLineId,
      bankDesc: r.bankDesc,
      bankAmount: r.bankAmount,
      matchedDesc: r.matchedDesc,
      matchedAmount: r.matchedAmount,
      confidence: r.confidence,
      matchType: r.matchType,
      ruleName: r.matchType === 'exact' ? 'Exact Match' :
        r.matchType === 'fuzzy_amount' ? 'Amount Tolerance Match' :
        r.matchType === 'fuzzy_date' ? 'Date Flexibility Match' : 'Partial Match',
      ruleExplanation: r.matchType === 'exact'
        ? 'Amount and date match exactly with a payment record.'
        : r.matchType === 'fuzzy_amount'
        ? `Amount is within ${amountTolerance}% tolerance of a payment. Date may differ.`
        : r.matchType === 'fuzzy_date'
        ? `Date is within ${dateFlex} days of a payment. Amount matches exactly.`
        : 'Partial match based on amount proximity and date range.',
      amountTolerance: `${amountTolerance}%`,
      dateTolerance: `${dateFlex} days`,
    })),
  [matchResults, amountTolerance, dateFlex]);

  return (
    <div className="flex h-full">
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Reconciliation Engine</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="smart-reconciliation" title="Smart Reconciliation" />
          <p className="text-sm text-muted-foreground">Intelligent fuzzy matching with confidence scores</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAssistantOpen(!assistantOpen)}>
            <PanelRightOpen className="h-3 w-3 mr-1" /> Assistant
          </Button>
          <Button size="sm" onClick={() => toast({ title: 'Matching refreshed' })}>
            <RefreshCw className="h-3 w-3 mr-1" /> Re-run Matching
          </Button>
        </div>
      </div>

      {/* Match Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle, label: 'Exact Matches', count: exactMatches.length, color: 'text-green-600' },
          { icon: Zap, label: 'Fuzzy Matches', count: fuzzyMatches.length, color: 'text-amber-600' },
          { icon: Link2, label: 'Partial', count: partialMatches.length, color: 'text-blue-600' },
          { icon: XCircle, label: 'Unmatched', count: unmatched.length, color: 'text-destructive' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-8 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Amount Tolerance:</span>
            <Input type="number" min={0} max={10} step={0.5} value={amountTolerance} onChange={e => setAmountTolerance(Number(e.target.value))} className="w-20 h-8 text-xs" />
            <span className="text-xs">%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Date Flexibility:</span>
            <Input type="number" min={0} max={14} value={dateFlex} onChange={e => setDateFlex(Number(e.target.value))} className="w-16 h-8 text-xs" />
            <span className="text-xs">days</span>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Match Results ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No bank statement lines found. Import statements first to run matching.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Bank Transaction</th>
                    <th className="text-right p-2">{t('common.amount')}</th>
                    <th className="text-left p-2">{t('common.date')}</th>
                    <th className="text-left p-2">Matched With</th>
                    <th className="text-right p-2">Matched Amount</th>
                    <th className="text-center p-2">Confidence</th>
                    <th className="text-center p-2">{t('common.type')}</th>
                    <th className="text-center p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-2 max-w-[200px] truncate">{r.bankDesc || '—'}</td>
                      <td className="p-2 text-right font-medium">SAR {fmt(r.bankAmount)}</td>
                      <td className="p-2">{r.bankDate || '—'}</td>
                      <td className="p-2 max-w-[200px] truncate">{r.matchedDesc || '—'}</td>
                      <td className="p-2 text-right">{r.matchedAmount ? `SAR ${fmt(r.matchedAmount)}` : '—'}</td>
                      <td className="p-2 text-center">{getConfidenceBadge(r.confidence)}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">{r.matchType.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-2 text-center">
                        {r.matchType !== 'none' ? (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleAcceptMatch(r)}>
                            Accept
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]">Manual</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Assistant Side Panel */}
    <ReconciliationAssistant
      suggestions={assistantSuggestions}
      onAccept={(id) => handleAcceptMatch(matchResults.find(r => r.bankLineId === id)!)}
      onAcceptAll={(ids) => ids.forEach(id => {
        const m = matchResults.find(r => r.bankLineId === id);
        if (m) handleAcceptMatch(m);
      })}
      isOpen={assistantOpen}
      onClose={() => setAssistantOpen(false)}
    />
    </div>
  );
}
