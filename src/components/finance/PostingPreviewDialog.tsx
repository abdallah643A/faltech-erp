import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, FileText, Loader2, Sparkles } from 'lucide-react';
import { useJEAutomation, type DocumentType, type PostingPreview } from '@/hooks/useJEAutomation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { cn } from '@/lib/utils';

/**
 * Posting Preview Dialog — Module 3 / Enhancement #1
 *
 * Drop-in modal that:
 *   1. Generates a JE preview from any source document via rule engine
 *   2. Shows balanced/unbalanced state with Dr/Cr table
 *   3. Lets the user post (or cancel) the preview
 */

interface PostingPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  documentId: string;
  /** Pin a specific rule. Otherwise the highest-priority active rule wins. */
  ruleId?: string;
  onPosted?: (runId: string) => void;
}

export function PostingPreviewDialog({
  open, onOpenChange, documentType, documentId, ruleId, onPosted,
}: PostingPreviewDialogProps) {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const { currencySymbol } = useCompanyCurrency();
  const { previewPosting, post } = useJEAutomation();
  const [preview, setPreview] = useState<PostingPreview | null>(null);

  useEffect(() => {
    if (!open) { setPreview(null); return; }
    previewPosting.mutate(
      { documentType, documentId, ruleId },
      { onSuccess: (p) => setPreview(p) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentType, documentId, ruleId]);

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function handlePost() {
    if (!preview) return;
    post.mutate(preview, {
      onSuccess: (run) => {
        onOpenChange(false);
        onPosted?.(run.id);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isAr ? 'معاينة القيد التلقائي' : 'Auto JE Preview'}
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? 'تم إنشاء القيد بناءً على قواعد التحديد المحاسبي. راجع قبل الترحيل.'
              : 'Generated from accounting determination rules. Review before posting.'}
          </DialogDescription>
        </DialogHeader>

        {previewPosting.isPending || !preview ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{preview.documentType}</span>
                {preview.documentNumber && (
                  <Badge variant="secondary">#{preview.documentNumber}</Badge>
                )}
                {preview.ruleName && (
                  <Badge variant="outline" className="text-[10px]">{preview.ruleName}</Badge>
                )}
              </div>
              <div className={cn(
                'flex items-center gap-1.5 text-xs font-semibold',
                preview.isBalanced ? 'text-success' : 'text-destructive',
              )}>
                {preview.isBalanced
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertTriangle className="h-4 w-4" />}
                {preview.isBalanced
                  ? (isAr ? 'متوازن' : 'Balanced')
                  : (isAr ? 'غير متوازن' : 'Out of balance')}
              </div>
            </div>

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-0.5">
                    {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Lines */}
            <div className="border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{isAr ? 'الحساب' : 'Account'}</TableHead>
                    <TableHead>{isAr ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead className="text-end">{isAr ? 'مدين' : 'Debit'}</TableHead>
                    <TableHead className="text-end">{isAr ? 'دائن' : 'Credit'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        {isAr ? 'لا توجد بنود' : 'No lines generated'}
                      </TableCell>
                    </TableRow>
                  ) : preview.lines.map(l => (
                    <TableRow key={`${l.side}-${l.line_order}`}>
                      <TableCell className="text-muted-foreground">{l.line_order}</TableCell>
                      <TableCell className="font-mono text-xs">{l.acct_code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                        {l.description}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {l.side === 'debit' ? fmt(l.amount) : '—'}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {l.side === 'credit' ? fmt(l.amount) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between bg-muted/30 px-3 py-2 text-sm font-semibold">
                <span>{isAr ? 'الإجماليات' : 'Totals'}</span>
                <div className="flex gap-6 tabular-nums">
                  <span className="text-success">{fmt(preview.totalDebit)}</span>
                  <span className="text-destructive">{fmt(preview.totalCredit)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handlePost}
            disabled={post.isPending || !preview?.isBalanced || (preview?.lines.length ?? 0) === 0}
            className="gap-2"
          >
            {post.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" />
            {isAr ? 'ترحيل القيد' : 'Post Journal Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
