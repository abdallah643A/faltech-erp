import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useBankPOS, type InitiatePaymentParams, type BankPOSPayment } from '@/hooks/useBankPOS';
import {
  CreditCard, Loader2, CheckCircle2, XCircle, Smartphone,
  Wifi, WifiOff, Ban, Printer, Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface BankPOSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: string;
  sourceModule: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  customerName?: string;
  branchId?: string;
  onPaymentComplete?: (payment: BankPOSPayment) => void;
  onPaymentFailed?: () => void;
}

type PaymentStage = 'ready' | 'connecting' | 'waiting_card' | 'processing' | 'approved' | 'declined' | 'error' | 'cancelled' | 'timeout';

const stageConfig: Record<PaymentStage, { label: string; labelAr: string; icon: React.ElementType; color: string }> = {
  ready: { label: 'Ready to Send', labelAr: 'جاهز للإرسال', icon: CreditCard, color: 'text-primary' },
  connecting: { label: 'Connecting to Terminal...', labelAr: 'جاري الاتصال بالجهاز...', icon: Wifi, color: 'text-yellow-500' },
  waiting_card: { label: 'Waiting for Card...', labelAr: 'في انتظار البطاقة...', icon: Smartphone, color: 'text-blue-500' },
  processing: { label: 'Processing Payment...', labelAr: 'جاري معالجة الدفع...', icon: Loader2, color: 'text-orange-500' },
  approved: { label: 'Payment Approved ✓', labelAr: 'تمت الموافقة على الدفع ✓', icon: CheckCircle2, color: 'text-green-500' },
  declined: { label: 'Payment Declined', labelAr: 'تم رفض الدفع', icon: XCircle, color: 'text-destructive' },
  error: { label: 'Connection Error', labelAr: 'خطأ في الاتصال', icon: WifiOff, color: 'text-destructive' },
  cancelled: { label: 'Payment Cancelled', labelAr: 'تم إلغاء الدفع', icon: Ban, color: 'text-muted-foreground' },
  timeout: { label: 'Payment Timeout', labelAr: 'انتهت مهلة الدفع', icon: WifiOff, color: 'text-destructive' },
};

export default function BankPOSPaymentDialog({
  open, onOpenChange, amount, currency = 'SAR', sourceModule,
  sourceDocumentId, sourceDocumentNumber, customerName, branchId,
  onPaymentComplete, onPaymentFailed,
}: BankPOSPaymentDialogProps) {
  const { language } = useLanguage();
  const { terminals, loading, initiatePayment } = useBankPOS();
  const [stage, setStage] = useState<PaymentStage>('ready');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('');
  const [paymentResult, setPaymentResult] = useState<BankPOSPayment | null>(null);
  const [editableAmount, setEditableAmount] = useState(amount);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setStage('ready');
      setPaymentResult(null);
      setEditableAmount(amount);
      sendingRef.current = false;
      if (terminals.length > 0 && !selectedTerminal) setSelectedTerminal(terminals[0].id);
    }
  }, [open, amount, terminals]);

  const playApprovalSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(); osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => { const o2 = ctx.createOscillator(); o2.connect(gain); o2.frequency.value = 1320; o2.start(); o2.stop(ctx.currentTime + 0.2); }, 150);
    } catch {}
  };

  const handleSendToTerminal = useCallback(async () => {
    if (editableAmount <= 0 || sendingRef.current) return;
    sendingRef.current = true;

    setStage('connecting');
    await new Promise(r => setTimeout(r, 600));
    setStage('waiting_card');
    await new Promise(r => setTimeout(r, 800));
    setStage('processing');

    const params: InitiatePaymentParams = {
      amount: editableAmount, currency,
      terminal_id: selectedTerminal || undefined,
      source_module: sourceModule,
      source_document_id: sourceDocumentId,
      source_document_number: sourceDocumentNumber,
      customer_name: customerName,
      branch_id: branchId,
      idempotency_key: `${sourceModule}-${sourceDocumentNumber || ''}-${editableAmount}-${Date.now()}`,
    };

    const result = await initiatePayment(params);

    if (result && result.status === 'approved') {
      setStage('approved');
      setPaymentResult(result);
      playApprovalSound();
      onPaymentComplete?.(result);
    } else if (result && result.status === 'declined') {
      setStage('declined');
      setPaymentResult(result);
      onPaymentFailed?.();
    } else {
      setStage('error');
      onPaymentFailed?.();
    }
    sendingRef.current = false;
  }, [editableAmount, currency, selectedTerminal, sourceModule, sourceDocumentId, sourceDocumentNumber, customerName, branchId]);

  const handleCancel = () => { setStage('cancelled'); onOpenChange(false); };
  const stageInfo = stageConfig[stage];
  const StageIcon = stageInfo.icon;
  const isAnimating = ['connecting', 'waiting_card', 'processing'].includes(stage);
  const lang = language === 'ar' ? 'ar' : 'en';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isAnimating) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            {lang === 'ar' ? 'الدفع عبر جهاز نقاط البيع' : 'Bank POS Payment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{lang === 'ar' ? 'مبلغ الدفع' : 'Payment Amount'}</p>
              {stage === 'ready' ? (
                <div className="flex items-center justify-center gap-2">
                  <Input type="number" value={editableAmount} onChange={(e) => setEditableAmount(Number(e.target.value))} className="text-center text-2xl font-bold w-40 h-12 bg-background" step="0.01" />
                  <span className="text-lg font-semibold text-muted-foreground">{currency}</span>
                </div>
              ) : (
                <p className="text-3xl font-bold text-foreground">{editableAmount.toLocaleString('en-SA', { minimumFractionDigits: 2 })} <span className="text-lg">{currency}</span></p>
              )}
              {customerName && <p className="text-sm text-muted-foreground mt-1">{lang === 'ar' ? 'العميل' : 'Customer'}: {customerName}</p>}
              {sourceDocumentNumber && <Badge variant="outline" className="mt-1">{sourceDocumentNumber}</Badge>}
            </CardContent>
          </Card>

          {stage === 'ready' && (
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'اختر الجهاز' : 'Select Terminal'}</Label>
              <Select value={selectedTerminal} onValueChange={setSelectedTerminal}>
                <SelectTrigger><SelectValue placeholder={lang === 'ar' ? 'اختر جهاز POS' : 'Select POS terminal'} /></SelectTrigger>
                <SelectContent>
                  {terminals.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        {t.terminal_name}
                        {t.is_mock && <Badge variant="secondary" className="text-[10px] h-4">MOCK</Badge>}
                        <span className="text-xs text-muted-foreground">{t.provider}</span>
                        {t.location && <span className="text-xs text-muted-foreground">– {t.location}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status stages */}
          <Card className={cn("border-2 transition-all duration-500",
            stage === 'approved' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' :
            ['declined', 'error', 'timeout'].includes(stage) ? 'border-destructive/50 bg-destructive/5' :
            isAnimating ? 'border-primary/50 bg-primary/5' : 'border-border'
          )}>
            <CardContent className="p-6 flex flex-col items-center gap-3">
              <div className={cn("h-16 w-16 rounded-full flex items-center justify-center transition-all",
                stage === 'approved' ? 'bg-green-100 dark:bg-green-900/30' :
                ['declined', 'error', 'timeout'].includes(stage) ? 'bg-destructive/10' :
                isAnimating ? 'bg-primary/10' : 'bg-muted'
              )}>
                <StageIcon className={cn("h-8 w-8 transition-all", stageInfo.color, isAnimating && 'animate-pulse', stage === 'processing' && 'animate-spin')} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{stageInfo.label}</p>
                <p className="text-xs text-muted-foreground">{stageInfo.labelAr}</p>
              </div>
              {isAnimating && (
                <div className="flex gap-1.5 mt-2">
                  {[0, 1, 2].map(i => (<div key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />))}
                </div>
              )}
              {stage === 'approved' && <Volume2 className="h-4 w-4 text-green-500 animate-pulse" />}
            </CardContent>
          </Card>

          {paymentResult && stage === 'approved' && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-muted-foreground text-xs">{lang === 'ar' ? 'نوع البطاقة' : 'Card Type'}</p><p className="font-medium">{paymentResult.card_type}</p></div>
                  <div><p className="text-muted-foreground text-xs">{lang === 'ar' ? 'رقم البطاقة' : 'Card Number'}</p><p className="font-medium">**** {paymentResult.card_last_four}</p></div>
                  <div><p className="text-muted-foreground text-xs">{lang === 'ar' ? 'رمز التفويض' : 'Auth Code'}</p><p className="font-medium font-mono">{paymentResult.auth_code}</p></div>
                  <div><p className="text-muted-foreground text-xs">RRN</p><p className="font-medium font-mono text-xs">{paymentResult.rrn}</p></div>
                  <div><p className="text-muted-foreground text-xs">{lang === 'ar' ? 'رقم الإيصال' : 'Receipt #'}</p><p className="font-medium">{paymentResult.receipt_number}</p></div>
                  <div><p className="text-muted-foreground text-xs">{lang === 'ar' ? 'المرجع' : 'Reference'}</p><p className="font-medium text-xs">{paymentResult.transaction_ref}</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex justify-between">
            {stage === 'ready' && (
              <>
                <Button variant="outline" onClick={handleCancel}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleSendToTerminal} disabled={loading || editableAmount <= 0} className="gap-2">
                  <Smartphone className="h-4 w-4" />{lang === 'ar' ? 'إرسال للجهاز' : 'Send to Terminal'}
                </Button>
              </>
            )}
            {isAnimating && (
              <Button variant="destructive" onClick={handleCancel} className="w-full gap-2"><Ban className="h-4 w-4" />{lang === 'ar' ? 'إلغاء الدفع' : 'Cancel Payment'}</Button>
            )}
            {stage === 'approved' && (
              <>
                <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" />{lang === 'ar' ? 'طباعة' : 'Print'}</Button>
                <Button onClick={() => onOpenChange(false)} className="gap-2"><CheckCircle2 className="h-4 w-4" />{lang === 'ar' ? 'تم' : 'Done'}</Button>
              </>
            )}
            {['declined', 'error', 'timeout'].includes(stage) && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>{lang === 'ar' ? 'إغلاق' : 'Close'}</Button>
                <Button onClick={() => { setStage('ready'); sendingRef.current = false; }} className="gap-2"><CreditCard className="h-4 w-4" />{lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
