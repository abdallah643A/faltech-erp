import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AccountingValidationResult, ValidationIssue } from '@/services/accountingValidator';
import { useNavigate } from 'react-router-dom';

interface PreviewJEModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AccountingValidationResult | null;
  isLoading?: boolean;
  documentType?: string;
}

export function PreviewJEModal({ open, onOpenChange, result, isLoading, documentType }: PreviewJEModalProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (!result && !isLoading) return null;

  const sim = result?.simulation;
  const issues = result?.issues || [];
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'ar' ? 'معاينة القيد المحاسبي' : 'Preview Journal Entry'}
            {result && <AccountingStatusBadgeInline status={result.status} />}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">
              {language === 'ar' ? 'جاري التحقق...' : 'Validating accounting...'}
            </span>
          </div>
        ) : sim ? (
          <div className="space-y-4">
            {/* Rule Info */}
            {sim.matched_rule && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>{language === 'ar' ? 'القاعدة المطابقة:' : 'Matched Rule:'} <strong>{sim.matched_rule.rule_name}</strong></span>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-destructive">
                    <XCircle className="h-4 w-4" />
                    {language === 'ar' ? 'أخطاء تمنع الترحيل' : 'Errors Blocking Action'}
                  </div>
                  {errors.map((issue, i) => (
                    <IssueRow key={i} issue={issue} navigate={navigate} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    {language === 'ar' ? 'تحذيرات' : 'Warnings'}
                  </div>
                  {warnings.map((issue, i) => (
                    <IssueRow key={i} issue={issue} navigate={navigate} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* JE Lines Table */}
            {sim.lines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{language === 'ar' ? 'الحساب' : 'Account'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الغرض' : 'Purpose'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الأبعاد' : 'Dimensions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sim.lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{line.line_order}</TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{line.acct_code || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm">{line.acct_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {line.side === 'debit' ? line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.side === 'credit' ? line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[line.dimension_1, line.dimension_2, line.dimension_3, line.dimension_4]
                            .filter(Boolean).join(', ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow className="bg-muted/30 font-semibold border-t-2">
                      <TableCell colSpan={3} className="text-right">
                        {language === 'ar' ? 'الإجمالي' : 'Total'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {sim.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {sim.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {sim.is_balanced ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'متوازن' : 'Balanced'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            {language === 'ar' ? 'غير متوازن' : 'Unbalanced'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Valid state */}
            {result?.status === 'valid' && (
              <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-900/10">
                <CardContent className="p-4 flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    {language === 'ar'
                      ? 'القيد المحاسبي صالح ومتوازن. يمكنك المتابعة.'
                      : 'Journal entry is valid and balanced. You may proceed.'}
                  </span>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function IssueRow({ issue, navigate }: { issue: ValidationIssue; navigate: any }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5">
        {issue.type === 'error' ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />}
      </span>
      <span className="flex-1">{issue.message}</span>
      {issue.settingsLink && (
        <Button
          variant="ghost" size="sm" className="h-6 px-2 text-xs"
          onClick={() => navigate(issue.settingsLink!)}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Fix
        </Button>
      )}
    </div>
  );
}

// Inline badge for use in headers/forms
export function AccountingStatusBadgeInline({ status }: { status: string }) {
  switch (status) {
    case 'valid':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
        </Badge>
      );
    case 'warning':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3 mr-1" /> Warning
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" /> Blocked
        </Badge>
      );
    case 'no_rule':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          No Rule
        </Badge>
      );
    default:
      return null;
  }
}
