import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, FileText, ShoppingCart, Truck, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentConversion, type ConversionTarget } from '@/hooks/useDocumentConversion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';

/**
 * Convert-To Dialog — Module 2 / Enhancement #3
 *
 * Generic conversion modal: pick lines + quantities, then convert
 * to the next document in the sales flow (SO / Delivery / Invoice).
 */

export type SourceType = 'sales_quotation' | 'sales_order' | 'delivery';

const SOURCE_LINE_TABLE: Record<SourceType, { table: string; fk: string }> = {
  sales_quotation: { table: 'sales_quotation_lines', fk: 'quotation_id' },
  sales_order:     { table: 'sales_order_lines',     fk: 'sales_order_id' },
  delivery:        { table: 'delivery_lines',        fk: 'delivery_id' },
};

const TARGET_ROUTE: Record<ConversionTarget, string> = {
  sales_order: '/sales-orders',
  delivery:    '/deliveries',
  ar_invoice:  '/ar-invoices',
};

const TARGET_ICON: Record<ConversionTarget, any> = {
  sales_order: ShoppingCart,
  delivery: Truck,
  ar_invoice: Receipt,
};

const SOURCE_ICON: Record<SourceType, any> = {
  sales_quotation: FileText,
  sales_order: ShoppingCart,
  delivery: Truck,
};

interface ConvertToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: SourceType;
  sourceId: string;
  target: ConversionTarget;
  /** Optional callback after successful conversion. Receives new doc id. */
  onConverted?: (newId: string) => void;
}

export function ConvertToDialog({
  open, onOpenChange, sourceType, sourceId, target, onConverted,
}: ConvertToDialogProps) {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const { currencySymbol } = useCompanyCurrency();
  const convert = useDocumentConversion();
  const navigate = useNavigate();

  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Record<string, { selected: boolean; qty: number }>>({});

  useEffect(() => {
    if (!open || !sourceId) return;
    setLoading(true);
    const cfg = SOURCE_LINE_TABLE[sourceType];
    (supabase as any)
      .from(cfg.table)
      .select('*')
      .eq(cfg.fk, sourceId)
      .order('line_num')
      .then(({ data }: any) => {
        const arr = (data ?? []) as any[];
        setLines(arr);
        const init: Record<string, { selected: boolean; qty: number }> = {};
        arr.forEach(l => { init[l.id] = { selected: true, qty: Number(l.quantity) || 0 }; });
        setSelection(init);
        setLoading(false);
      });
  }, [open, sourceId, sourceType]);

  const summary = useMemo(() => {
    let qty = 0; let total = 0;
    lines.forEach(l => {
      const s = selection[l.id];
      if (!s?.selected) return;
      qty += s.qty;
      total += (Number(l.unit_price) || 0) * s.qty * (1 - (Number(l.discount_percent) || 0) / 100);
    });
    return { qty, total, count: Object.values(selection).filter(s => s.selected).length };
  }, [lines, selection]);

  const labels: Record<ConversionTarget, { en: string; ar: string }> = {
    sales_order: { en: 'Sales Order', ar: 'أمر مبيعات' },
    delivery:    { en: 'Delivery',    ar: 'تسليم' },
    ar_invoice:  { en: 'AR Invoice',  ar: 'فاتورة مبيعات' },
  };
  const sourceLabels: Record<SourceType, { en: string; ar: string }> = {
    sales_quotation: { en: 'Quotation', ar: 'عرض سعر' },
    sales_order:     { en: 'Sales Order', ar: 'أمر مبيعات' },
    delivery:        { en: 'Delivery', ar: 'تسليم' },
  };
  const TargetIcon = TARGET_ICON[target];
  const SourceIcon = SOURCE_ICON[sourceType];

  function handleConvert() {
    const sel = lines
      .filter(l => selection[l.id]?.selected && selection[l.id].qty > 0)
      .map(l => ({ sourceLineId: l.id, quantity: selection[l.id].qty }));

    if (sel.length === 0) return;

    convert.mutate(
      { sourceType, sourceId, target, lines: sel },
      {
        onSuccess: (res) => {
          onOpenChange(false);
          onConverted?.(res.id);
          navigate(`${TARGET_ROUTE[target]}/${res.id}`);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SourceIcon className="h-5 w-5 text-muted-foreground" />
            <span>{isAr ? sourceLabels[sourceType].ar : sourceLabels[sourceType].en}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <TargetIcon className="h-5 w-5 text-primary" />
            <span>{isAr ? labels[target].ar : labels[target].en}</span>
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? 'حدد البنود والكميات المراد تحويلها. يدعم التحويل الجزئي.'
              : 'Select lines and quantities to convert. Partial conversion supported.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : lines.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {isAr ? 'لا توجد بنود قابلة للتحويل' : 'No lines available'}
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>{isAr ? 'الصنف' : 'Item'}</TableHead>
                  <TableHead className="text-end">{isAr ? 'الكمية الأصلية' : 'Source Qty'}</TableHead>
                  <TableHead className="w-32 text-end">{isAr ? 'كمية التحويل' : 'Convert Qty'}</TableHead>
                  <TableHead className="text-end">{isAr ? 'السعر' : 'Price'}</TableHead>
                  <TableHead className="text-end">{isAr ? 'الإجمالي' : 'Total'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(l => {
                  const s = selection[l.id] ?? { selected: false, qty: 0 };
                  const lineTotal = (Number(l.unit_price) || 0) * s.qty * (1 - (Number(l.discount_percent) || 0) / 100);
                  return (
                    <TableRow key={l.id} className={!s.selected ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={s.selected}
                          onCheckedChange={(v) =>
                            setSelection(prev => ({ ...prev, [l.id]: { ...s, selected: !!v } }))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{l.item_code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {l.description ?? l.item_description}
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{Number(l.quantity)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={Number(l.quantity)}
                          step="any"
                          value={s.qty}
                          disabled={!s.selected}
                          onChange={(e) => {
                            const v = Math.min(Number(l.quantity), Math.max(0, Number(e.target.value) || 0));
                            setSelection(prev => ({ ...prev, [l.id]: { ...s, qty: v } }));
                          }}
                          className="h-8 text-end tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {currencySymbol}{Number(l.unit_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end font-semibold tabular-nums">
                        {currencySymbol}{lineTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{summary.count} {isAr ? 'بنود' : 'lines'}</Badge>
            <span className="text-muted-foreground">{isAr ? 'إجمالي الكمية' : 'Total qty'}: <strong>{summary.qty}</strong></span>
          </div>
          <div className="font-semibold tabular-nums">
            {currencySymbol}{summary.total.toFixed(2)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleConvert}
            disabled={convert.isPending || summary.count === 0 || summary.qty === 0}
            className="gap-2"
          >
            {convert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <TargetIcon className="h-4 w-4" />
            {isAr ? `إنشاء ${labels[target].ar}` : `Create ${labels[target].en}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
