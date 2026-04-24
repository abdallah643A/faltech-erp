import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { useReconciliationMatcher, type BankLine, type MatchCandidate } from '@/hooks/useReconciliationMatcher';
import { Sparkles, Wand2, ArrowRight, AlertTriangle, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  /** Optional: focus on a single line. If omitted, shows all unmatched. */
  focusLineId?: string;
}

export default function AutoMatchSuggestionsDialog({ open, onOpenChange, statementId, focusLineId }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur';
  const { unmatchedLines, scoreCandidates, autoMatch, confirmMatch, createAdjustment } =
    useReconciliationMatcher(statementId);
  const [threshold, setThreshold] = useState(85);
  const [adjustingLine, setAdjustingLine] = useState<BankLine | null>(null);
  const [adjAcct, setAdjAcct] = useState('5810'); // bank charges default
  const [adjMemo, setAdjMemo] = useState('');

  const lines = useMemo(() => {
    const all = unmatchedLines.data || [];
    return focusLineId ? all.filter(l => l.id === focusLineId) : all;
  }, [unmatchedLines.data, focusLineId]);

  const stats = useMemo(() => {
    const all = unmatchedLines.data || [];
    let withSuggestion = 0; let highConfidence = 0;
    all.forEach(l => {
      const top = scoreCandidates(l, { minScore: 40 })[0];
      if (top) {
        withSuggestion++;
        if (top.score >= threshold) highConfidence++;
      }
    });
    return { total: all.length, withSuggestion, highConfidence };
  }, [unmatchedLines.data, threshold, scoreCandidates]);

  const t = (en: string, ar: string) => (isRTL ? ar : en);

  const fmtAmt = (l: BankLine) => {
    const amt = Number(l.credit_amount || 0) - Number(l.debit_amount || 0);
    const sign = amt >= 0 ? '+' : '−';
    return `${sign} ${Math.abs(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('Auto-Match Suggestions', 'اقتراحات المطابقة التلقائية')}
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">{t('Unmatched lines', 'سطور غير مطابقة')}</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">{t('With suggestions', 'مع اقتراحات')}</div>
              <div className="text-2xl font-bold text-blue-600">{stats.withSuggestion}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">{t('Auto-matchable', 'قابلة للمطابقة الآلية')}</div>
              <div className="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs whitespace-nowrap">{t('Confidence threshold', 'حد الثقة')}: {threshold}%</Label>
            <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={50} max={100} step={5} className="flex-1" />
            <Button size="sm" disabled={autoMatch.isPending || stats.highConfidence === 0}
              onClick={() => autoMatch.mutate(threshold)}>
              <Wand2 className="h-4 w-4 mr-1" />
              {t(`Auto-match ${stats.highConfidence}`, `مطابقة ${stats.highConfidence}`)}
            </Button>
          </div>
        </Card>

        {/* Lines + suggestions */}
        <div className="space-y-3">
          {lines.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {t('All lines reconciled 🎉', 'تمت تسوية جميع السطور 🎉')}
            </div>
          )}
          {lines.map(line => {
            const cands = scoreCandidates(line, { minScore: 40 });
            return (
              <Card key={line.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{line.transaction_date}</span>
                      <Badge variant={(line.credit_amount || 0) > 0 ? 'default' : 'secondary'} className="text-[10px]">
                        {(line.credit_amount || 0) > 0 ? t('Inflow', 'وارد') : t('Outflow', 'صادر')}
                      </Badge>
                      <span className="font-semibold tabular-nums">{fmtAmt(line)}</span>
                    </div>
                    <p className="text-sm truncate">{line.description || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {line.counterparty_name} {line.reference && `• ${line.reference}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setAdjustingLine(line); setAdjMemo(line.description || ''); }}>
                    <Plus className="h-3 w-3 mr-1" /> {t('Adjustment', 'تسوية')}
                  </Button>
                </div>

                {cands.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('No matching payment found — consider creating an adjustment.', 'لم يتم العثور على دفعة مطابقة — فكر في إنشاء تسوية.')}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {cands.map(c => <SuggestionRow key={c.id} candidate={c} onConfirm={() => confirmMatch.mutate({ lineId: line.id, candidate: c })} />)}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Adjustment dialog */}
        <Dialog open={!!adjustingLine} onOpenChange={() => setAdjustingLine(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('Create Adjustment Entry', 'إنشاء قيد تسوية')}</DialogTitle></DialogHeader>
            {adjustingLine && (
              <div className="space-y-3">
                <div className="text-sm bg-muted p-2 rounded">
                  {adjustingLine.description} • <strong>{fmtAmt(adjustingLine)}</strong>
                </div>
                <div>
                  <Label className="text-xs">{t('Adjustment account', 'حساب التسوية')}</Label>
                  <Select value={adjAcct} onValueChange={setAdjAcct}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5810">5810 — {t('Bank Charges', 'رسوم بنكية')}</SelectItem>
                      <SelectItem value="7100">7100 — {t('FX Gain/Loss', 'فروق عملة')}</SelectItem>
                      <SelectItem value="4900">4900 — {t('Other Income', 'إيرادات أخرى')}</SelectItem>
                      <SelectItem value="5900">5900 — {t('Other Expense', 'مصروفات أخرى')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t('Memo', 'البيان')}</Label>
                  <Input value={adjMemo} onChange={e => setAdjMemo(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => {
                  const amt = Math.abs(Number(adjustingLine.credit_amount || 0) - Number(adjustingLine.debit_amount || 0));
                  const isInflow = (adjustingLine.credit_amount || 0) > 0;
                  createAdjustment.mutate({
                    lineId: adjustingLine.id, acctCode: adjAcct, amount: amt,
                    side: isInflow ? 'credit' : 'debit', memo: adjMemo || `Adj ${adjustingLine.id}`,
                  });
                  setAdjustingLine(null);
                }}>
                  {t('Post Adjustment', 'ترحيل التسوية')}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionRow({ candidate, onConfirm }: { candidate: MatchCandidate; onConfirm: () => void }) {
  const color = candidate.score >= 85 ? 'bg-green-50 border-green-300'
    : candidate.score >= 65 ? 'bg-blue-50 border-blue-300'
    : 'bg-amber-50 border-amber-300';
  return (
    <div className={`flex items-center gap-2 p-2 rounded border ${color}`}>
      <Badge variant="outline" className="text-[10px] tabular-nums w-12 justify-center">{candidate.score}%</Badge>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          {candidate.source === 'incoming_payment' ? '↓' : '↑'} #{candidate.doc_num} • {candidate.party_name || '—'}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {candidate.doc_date} • {candidate.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} • {candidate.reasons.join(' · ')}
        </div>
      </div>
      <Button size="sm" variant="ghost" className="h-7" onClick={onConfirm}>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
