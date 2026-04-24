import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface WizardStep {
  id: string;
  title: string;
  titleAr: string;
  icon: React.ReactNode;
  description?: string;
  optional?: boolean;
}

interface OnboardingWizardShellProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onFinish: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  title: string;
  titleAr: string;
  loading?: boolean;
  finishLabel?: string;
  finishLabelAr?: string;
  validateStep?: (step: number) => boolean | string;
  showConfirmOnFinish?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
}

export function OnboardingWizardShell({
  steps,
  currentStep,
  onStepChange,
  onFinish,
  onCancel,
  children,
  title,
  titleAr,
  loading,
  finishLabel = 'Create Company',
  finishLabelAr = 'إنشاء الشركة',
  validateStep,
  showConfirmOnFinish = true,
  confirmTitle = 'Confirm Company Creation',
  confirmDescription = 'Are you sure you want to create this company? This action will initialize all selected settings and data structures.',
}: OnboardingWizardShellProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (validateStep) {
      const result = validateStep(currentStep);
      if (result !== true) {
        setValidationError(typeof result === 'string' ? result : 'Please fill in all required fields.');
        return;
      }
    }
    setValidationError('');
    if (isLastStep) {
      if (showConfirmOnFinish) {
        setShowConfirm(true);
      } else {
        onFinish();
      }
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    setValidationError('');
    if (currentStep > 0) onStepChange(currentStep - 1);
  };

  const handleStepClick = (idx: number) => {
    if (idx < currentStep) {
      setValidationError('');
      onStepChange(idx);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Left Sidebar - Step Navigation */}
      <div className="hidden lg:flex w-80 bg-card border-r flex-col">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-foreground">{isAr ? titleAr : title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isAr ? `الخطوة ${currentStep + 1} من ${steps.length}` : `Step ${currentStep + 1} of ${steps.length}`}
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(idx)}
                disabled={idx > currentStep}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all text-sm',
                  isActive && 'bg-primary/10 text-primary font-medium border border-primary/20',
                  isCompleted && 'text-foreground hover:bg-muted cursor-pointer',
                  !isActive && !isCompleted && 'text-muted-foreground cursor-not-allowed opacity-60'
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  !isActive && !isCompleted && 'border-muted-foreground/30 text-muted-foreground'
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{isAr ? step.titleAr : step.title}</div>
                  {step.optional && (
                    <span className="text-[10px] text-muted-foreground">{isAr ? 'اختياري' : 'Optional'}</span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" onClick={onCancel} className="w-full text-muted-foreground">
            {isAr ? 'إلغاء وخروج' : 'Cancel & Exit'}
          </Button>
        </div>
      </div>

      {/* Mobile Step Indicator */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <span className="text-sm font-medium">
            {isAr ? steps[currentStep].titleAr : steps[currentStep].title}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pt-0 pt-20">
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Step Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {steps[currentStep].icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {isAr ? steps[currentStep].titleAr : steps[currentStep].title}
                  </h1>
                  {steps[currentStep].description && (
                    <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
                  )}
                </div>
              </div>
            </div>

            {validationError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Step Content */}
            {children}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t bg-card px-4 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
              className="gap-2"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {isAr ? 'السابق' : 'Previous'}
            </Button>

            <div className="flex items-center gap-3">
              {steps[currentStep].optional && !isLastStep && (
                <Button
                  variant="ghost"
                  onClick={() => onStepChange(currentStep + 1)}
                  disabled={loading}
                  className="text-muted-foreground"
                >
                  {isAr ? 'تخطي' : 'Skip'}
                </Button>
              )}
              <Button onClick={handleNext} disabled={loading} className="gap-2 min-w-[140px]">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLastStep
                  ? (isAr ? finishLabelAr : finishLabel)
                  : (isAr ? 'التالي' : 'Next')}
                {!isLastStep && (isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'رجوع' : 'Go Back'}</AlertDialogCancel>
            <AlertDialogAction onClick={onFinish}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isAr ? 'تأكيد الإنشاء' : 'Confirm & Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
