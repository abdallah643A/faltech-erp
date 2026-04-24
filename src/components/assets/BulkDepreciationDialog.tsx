import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calculator, Play, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssetFinance, calculateStraightLine, calculateDecliningBalance, calculateUnitsOfProduction } from '@/hooks/useAssetFinance';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import type { Asset } from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
}

interface DepreciationPreview {
  asset: Asset;
  method: string;
  depreciationAmount: number;
  accumulatedBefore: number;
  accumulatedAfter: number;
  bookValueBefore: number;
  bookValueAfter: number;
  expenseAccount: string;
  accumAccount: string;
}

export function BulkDepreciationDialog({ open, onOpenChange, assets }: Props) {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const { toast } = useToast();
  const { runDepreciation } = useAssetFinance();
  const { createEntry } = useJournalEntries();

  const [periodStart, setPeriodStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [posting, setPosting] = useState(false);

  const activeAssets = useMemo(() =>
    assets.filter(a =>
      a.status !== 'disposed' &&
      a.purchase_value &&
      a.purchase_value > 0 &&
      a.purchase_date
    ),
    [assets]
  );

  const previews = useMemo<DepreciationPreview[]>(() => {
    if (!showPreview) return [];
    return activeAssets.map(asset => {
      const purchaseValue = asset.purchase_value || 0;
      const salvage = (asset as any).salvage_value || 0;
      const usefulLife = (asset as any).useful_life_years || 5;
      const method = asset.depreciation_method || 'straight_line';
      const purchaseDate = new Date(asset.purchase_date!);
      const endDate = new Date(periodEnd);
      const monthsElapsed = Math.max(
        (endDate.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (endDate.getMonth() - purchaseDate.getMonth()),
        1
      );

      let result;
      if (method === 'declining_balance') {
        result = calculateDecliningBalance(purchaseValue, salvage, asset.depreciation_rate || 20, monthsElapsed);
      } else if (method === 'units_of_production') {
        result = calculateUnitsOfProduction(purchaseValue, salvage, (asset as any).total_estimated_units || 1000, (asset as any).units_produced || 0);
      } else {
        result = calculateStraightLine(purchaseValue, salvage, usefulLife, monthsElapsed);
      }

      const prevAccumulated = result.accumulated - result.periodDepreciation;

      return {
        asset,
        method: method.replace(/_/g, ' '),
        depreciationAmount: Math.round(result.periodDepreciation * 100) / 100,
        accumulatedBefore: Math.round(Math.max(prevAccumulated, 0) * 100) / 100,
        accumulatedAfter: Math.round(result.accumulated * 100) / 100,
        bookValueBefore: Math.round((purchaseValue - Math.max(prevAccumulated, 0)) * 100) / 100,
        bookValueAfter: Math.round(result.bookValue * 100) / 100,
        expenseAccount: '6100', // Depreciation Expense
        accumAccount: '1900', // Accumulated Depreciation
      };
    }).filter(p => p.depreciationAmount > 0);
  }, [showPreview, activeAssets, periodEnd]);

  const totalDepreciation = previews.reduce((s, p) => s + p.depreciationAmount, 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

  const handlePost = async () => {
    setPosting(true);
    try {
      // Run depreciation for each asset
      for (const preview of previews) {
        await runDepreciation.mutateAsync({
          asset: preview.asset,
          method: preview.asset.depreciation_method || 'straight_line',
          periodStart,
          periodEnd,
          usefulLifeYears: (preview.asset as any).useful_life_years || 5,
          salvageValue: (preview.asset as any).salvage_value || 0,
        });
      }

      // Create consolidated JE
      if (totalDepreciation > 0) {
        const lines = [
          {
            line_num: 1,
            acct_code: '6100',
            acct_name: 'Depreciation Expense',
            debit: Math.round(totalDepreciation * 100) / 100,
            credit: 0,
            remarks: `Depreciation ${periodStart} to ${periodEnd}`,
          },
          {
            line_num: 2,
            acct_code: '1900',
            acct_name: 'Accumulated Depreciation',
            debit: 0,
            credit: Math.round(totalDepreciation * 100) / 100,
            remarks: `Depreciation ${periodStart} to ${periodEnd}`,
          },
        ];

        createEntry.mutate({
          posting_date: periodEnd,
          reference: `DEP-${periodStart}-${periodEnd}`,
          memo: `Bulk depreciation run for ${previews.length} assets`,
          lines,
        });
      }

      toast({ title: t('Depreciation Posted', 'تم ترحيل الإهلاك'), description: `${previews.length} assets processed, JE created` });
      onOpenChange(false);
      setShowPreview(false);
    } catch (e: any) {
      toast({ title: t('Error', 'خطأ'), description: e.message, variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t('Run Bulk Depreciation', 'تشغيل الإهلاك الجماعي')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Period Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">{t('Period Start', 'بداية الفترة')}</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">{t('Period End', 'نهاية الفترة')}</Label>
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => setShowPreview(true)} size="sm" variant="outline" className="w-full">
                <Calculator className="h-3.5 w-3.5 mr-1" />
                {t('Preview', 'معاينة')} ({activeAssets.length} {t('assets', 'أصول')})
              </Button>
            </div>
          </div>

          {/* Summary */}
          {showPreview && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{t('Assets to Process', 'أصول للمعالجة')}</p>
                  <p className="text-lg font-bold">{previews.length}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{t('Total Depreciation', 'إجمالي الإهلاك')}</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(totalDepreciation)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{t('JE Entry', 'قيد يومية')}</p>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs">{t('Will auto-post', 'سيتم الترحيل تلقائياً')}</span>
                  </div>
                </CardContent></Card>
              </div>

              {/* JE Preview */}
              <Card className="border-primary/30">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {t('Journal Entry Preview', 'معاينة قيد اليومية')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Dr:</span> Depreciation Expense (6100)
                      <span className="float-right font-mono font-semibold">{formatCurrency(totalDepreciation)}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Cr:</span> Accum. Depreciation (1900)
                      <span className="float-right font-mono font-semibold">{formatCurrency(totalDepreciation)}</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">{t('Balanced', 'متوازن')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Detail Table */}
              <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('Asset', 'الأصل')}</TableHead>
                      <TableHead className="text-xs">{t('Method', 'الطريقة')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Book Value Before', 'القيمة الدفترية قبل')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Depreciation', 'الإهلاك')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Book Value After', 'القيمة الدفترية بعد')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previews.map(p => (
                      <TableRow key={p.asset.id}>
                        <TableCell>
                          <div className="text-xs font-medium">{p.asset.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.asset.asset_code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{p.method}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(p.bookValueBefore)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive font-semibold">{formatCurrency(p.depreciationAmount)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(p.bookValueAfter)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3} className="text-xs text-right">{t('Total', 'الإجمالي')}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-destructive">{formatCurrency(totalDepreciation)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel', 'إلغاء')}</Button>
          {showPreview && previews.length > 0 && (
            <Button onClick={handlePost} disabled={posting}>
              <Play className="h-4 w-4 mr-1" />
              {posting ? t('Posting...', 'جاري الترحيل...') : t('Post Depreciation & Create JE', 'ترحيل الإهلاك وإنشاء القيد')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
