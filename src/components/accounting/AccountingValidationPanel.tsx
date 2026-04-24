import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileSearch, Shield, CheckCircle2, AlertTriangle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PreviewJEModal, AccountingStatusBadgeInline } from './PreviewJEModal';
import { useAccountingValidation } from '@/hooks/useAccountingValidation';
import { type SimulationInput } from '@/services/postingEngine';
import { useNavigate } from 'react-router-dom';

interface AccountingValidationPanelProps {
  documentType: string;
  getDocumentData: () => SimulationInput;
  documentId?: string;
  onValidationResult?: (canProceed: boolean) => void;
  compact?: boolean;
}

export function AccountingValidationPanel({
  documentType,
  getDocumentData,
  documentId,
  onValidationResult,
  compact = false,
}: AccountingValidationPanelProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { result, isValidating, showPreview, setShowPreview, validate } = useAccountingValidation();

  const handlePreview = useCallback(async () => {
    const input = getDocumentData();
    await validate(input, { documentId });
    setShowPreview(true);
  }, [getDocumentData, validate, documentId, setShowPreview]);

  const handleValidate = useCallback(async () => {
    const input = getDocumentData();
    const res = await validate(input, { documentId });
    onValidationResult?.(res.canProceed);
  }, [getDocumentData, validate, documentId, onValidationResult]);

  const statusConfig = {
    valid: {
      icon: CheckCircle2,
      label: language === 'ar' ? 'صالح ومتوازن' : 'Valid & Balanced',
      className: 'border-green-500/30 bg-green-50/50 dark:bg-green-900/10',
      textClass: 'text-green-700 dark:text-green-400',
    },
    warning: {
      icon: AlertTriangle,
      label: language === 'ar' ? 'تحذير' : 'Warning',
      className: 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10',
      textClass: 'text-yellow-700 dark:text-yellow-400',
    },
    error: {
      icon: XCircle,
      label: language === 'ar' ? 'خطأ محاسبي' : 'Blocked by Accounting Error',
      className: 'border-destructive/30 bg-destructive/5',
      textClass: 'text-destructive',
    },
    no_rule: {
      icon: AlertTriangle,
      label: language === 'ar' ? 'لا توجد قاعدة' : 'No Posting Rule',
      className: 'border-muted bg-muted/30',
      textClass: 'text-muted-foreground',
    },
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={isValidating}>
            {isValidating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSearch className="h-3.5 w-3.5 mr-1" />}
            {language === 'ar' ? 'معاينة القيد' : 'Preview JE'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
            <Shield className="h-3.5 w-3.5 mr-1" />
            {language === 'ar' ? 'تحقق' : 'Validate'}
          </Button>
          {result && <AccountingStatusBadgeInline status={result.status} />}
        </div>
        <PreviewJEModal open={showPreview} onOpenChange={setShowPreview} result={result} isLoading={isValidating} documentType={documentType} />
      </>
    );
  }

  const cfg = result ? statusConfig[result.status as keyof typeof statusConfig] : null;

  return (
    <>
      <Card className={cfg ? cfg.className : 'border-muted'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">
                  {language === 'ar' ? 'التحقق المحاسبي' : 'Accounting Validation'}
                </div>
                {cfg ? (
                  <div className={`text-xs flex items-center gap-1 ${cfg.textClass}`}>
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'جاهز للمعاينة' : 'Ready to Preview'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={isValidating}>
                {isValidating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSearch className="h-4 w-4 mr-1" />}
                {language === 'ar' ? 'معاينة القيد' : 'Preview JE'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
                <Shield className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'تحقق من المحاسبة' : 'Validate Accounting'}
              </Button>
            </div>
          </div>

          {/* Inline errors */}
          {result && result.issues.filter(i => i.type === 'error').length > 0 && (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              {result.issues.filter(i => i.type === 'error').slice(0, 3).map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="flex-1">{issue.message}</span>
                  {issue.settingsLink && (
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => navigate(issue.settingsLink!)}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {result.issues.filter(i => i.type === 'error').length > 3 && (
                <Button variant="link" size="sm" className="text-xs h-5 p-0" onClick={() => setShowPreview(true)}>
                  +{result.issues.filter(i => i.type === 'error').length - 3} more issues...
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <PreviewJEModal open={showPreview} onOpenChange={setShowPreview} result={result} isLoading={isValidating} documentType={documentType} />
    </>
  );
}

// Helper: wrap a document action with accounting validation
export function useAccountingGuard() {
  const { validateAndBlock, result, showPreview, setShowPreview, isValidating } = useAccountingValidation();

  const guardAction = useCallback(async (
    input: SimulationInput,
    action: () => Promise<void> | void,
    options?: { documentId?: string }
  ) => {
    const canProceed = await validateAndBlock(input, options);
    if (canProceed) {
      await action();
    }
    // If blocked, the preview modal will show automatically
  }, [validateAndBlock]);

  return { guardAction, result, showPreview, setShowPreview, isValidating };
}
