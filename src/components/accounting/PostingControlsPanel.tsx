import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Clock, Shield, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface PostingControl {
  docType: string;
  label: string;
  postingTiming: string;
  autoPost: boolean;
  requireApproval: boolean;
  allowOverride: boolean;
  overrideApproval: boolean;
  createCommitment: boolean;
  summarizeLines: boolean;
}

const DEFAULT_CONTROLS: PostingControl[] = [
  { docType: 'ar_invoice', label: 'A/R Invoice', postingTiming: 'on_submit', autoPost: true, requireApproval: false, allowOverride: true, overrideApproval: true, createCommitment: false, summarizeLines: false },
  { docType: 'ap_invoice', label: 'A/P Invoice', postingTiming: 'on_submit', autoPost: true, requireApproval: true, allowOverride: true, overrideApproval: true, createCommitment: false, summarizeLines: false },
  { docType: 'goods_receipt_po', label: 'Goods Receipt PO', postingTiming: 'on_goods_receipt', autoPost: true, requireApproval: false, allowOverride: false, overrideApproval: false, createCommitment: false, summarizeLines: false },
  { docType: 'delivery', label: 'Delivery Note', postingTiming: 'on_submit', autoPost: true, requireApproval: false, allowOverride: false, overrideApproval: false, createCommitment: false, summarizeLines: false },
  { docType: 'incoming_payment', label: 'Incoming Payment', postingTiming: 'on_submit', autoPost: true, requireApproval: false, allowOverride: false, overrideApproval: false, createCommitment: false, summarizeLines: false },
  { docType: 'outgoing_payment', label: 'Outgoing Payment', postingTiming: 'on_approval', autoPost: false, requireApproval: true, allowOverride: false, overrideApproval: true, createCommitment: false, summarizeLines: false },
  { docType: 'sales_order', label: 'Sales Order', postingTiming: 'none', autoPost: false, requireApproval: false, allowOverride: false, overrideApproval: false, createCommitment: true, summarizeLines: false },
  { docType: 'purchase_order', label: 'Purchase Order', postingTiming: 'none', autoPost: false, requireApproval: true, allowOverride: false, overrideApproval: false, createCommitment: true, summarizeLines: false },
  { docType: 'payroll_posting', label: 'Payroll Posting', postingTiming: 'on_approval', autoPost: false, requireApproval: true, allowOverride: false, overrideApproval: true, createCommitment: false, summarizeLines: true },
  { docType: 'depreciation', label: 'Depreciation Run', postingTiming: 'on_period_close', autoPost: true, requireApproval: true, allowOverride: false, overrideApproval: false, createCommitment: false, summarizeLines: true },
  { docType: 'progress_billing', label: 'Progress Billing', postingTiming: 'on_approval', autoPost: false, requireApproval: true, allowOverride: true, overrideApproval: true, createCommitment: false, summarizeLines: false },
  { docType: 'landed_cost', label: 'Landed Cost', postingTiming: 'on_submit', autoPost: true, requireApproval: false, allowOverride: true, overrideApproval: true, createCommitment: false, summarizeLines: false },
  { docType: 'manual_je', label: 'Manual Journal Entry', postingTiming: 'on_submit', autoPost: true, requireApproval: false, allowOverride: true, overrideApproval: false, createCommitment: false, summarizeLines: false },
  { docType: 'accrual_entry', label: 'Accrual Entry', postingTiming: 'on_period_close', autoPost: true, requireApproval: false, allowOverride: false, overrideApproval: false, createCommitment: false, summarizeLines: false },
  { docType: 'fx_revaluation', label: 'FX Revaluation', postingTiming: 'on_period_close', autoPost: true, requireApproval: true, allowOverride: false, overrideApproval: false, createCommitment: false, summarizeLines: true },
];

const TIMING_OPTIONS = [
  { value: 'on_submit', label: 'On Submit', icon: '⚡' },
  { value: 'on_approval', label: 'On Approval', icon: '✓' },
  { value: 'on_goods_receipt', label: 'On Goods Receipt', icon: '📦' },
  { value: 'on_invoice', label: 'On Invoice', icon: '📄' },
  { value: 'on_period_close', label: 'On Period Close', icon: '📅' },
  { value: 'manual', label: 'Manual Review', icon: '👁' },
  { value: 'none', label: 'No Posting', icon: '—' },
];

const DIMENSION_SOURCES = [
  { key: 'source_line', label: 'Source Document Line' },
  { key: 'source_header', label: 'Source Document Header' },
  { key: 'master_data', label: 'Related Master Data' },
  { key: 'rule_default', label: 'Account Rule Default' },
  { key: 'company_default', label: 'Company Default' },
];

export default function PostingControlsPanel() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [controls, setControls] = useState(DEFAULT_CONTROLS);

  return (
    <div className="space-y-4">
      {/* Posting Timing Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isAr ? 'توقيت وسلوك الترحيل' : 'Posting Timing & Behavior'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'تحكم في متى وكيف يتم إنشاء القيود المحاسبية لكل نوع معاملة' : 'Control when and how journal entries are generated for each transaction type'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{isAr ? 'نوع المعاملة' : 'Transaction Type'}</TableHead>
                  <TableHead className="w-[160px]">{isAr ? 'توقيت الترحيل' : 'Posting Timing'}</TableHead>
                  <TableHead className="w-[80px] text-center">{isAr ? 'تلقائي' : 'Auto Post'}</TableHead>
                  <TableHead className="w-[80px] text-center">{isAr ? 'موافقة' : 'Approval'}</TableHead>
                  <TableHead className="w-[80px] text-center">{isAr ? 'تعديل' : 'Override'}</TableHead>
                  <TableHead className="w-[100px] text-center">{isAr ? 'موافقة التعديل' : 'Ovr. Appr.'}</TableHead>
                  <TableHead className="w-[80px] text-center">{isAr ? 'التزام' : 'Commit'}</TableHead>
                  <TableHead className="w-[80px] text-center">{isAr ? 'تلخيص' : 'Summ.'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((ctrl, idx) => (
                  <TableRow key={ctrl.docType}>
                    <TableCell className="font-medium text-sm">{ctrl.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TIMING_OPTIONS.find(t => t.value === ctrl.postingTiming)?.icon}{' '}
                        {TIMING_OPTIONS.find(t => t.value === ctrl.postingTiming)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center"><Switch checked={ctrl.autoPost} disabled className="scale-75" /></TableCell>
                    <TableCell className="text-center"><Switch checked={ctrl.requireApproval} disabled className="scale-75" /></TableCell>
                    <TableCell className="text-center"><Switch checked={ctrl.allowOverride} disabled className="scale-75" /></TableCell>
                    <TableCell className="text-center"><Switch checked={ctrl.overrideApproval} disabled className="scale-75" /></TableCell>
                    <TableCell className="text-center"><Switch checked={ctrl.createCommitment} disabled className="scale-75" /></TableCell>
                    <TableCell className="text-center"><Switch checked={ctrl.summarizeLines} disabled className="scale-75" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Propagation Priority */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {isAr ? 'أولوية مصدر الأبعاد' : 'Dimension Source Priority'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {DIMENSION_SOURCES.map((src, i) => (
              <div key={src.key} className="flex items-center gap-2">
                <div className="bg-muted rounded-md px-3 py-2 text-xs font-medium">
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>
                  {src.label}
                </div>
                {i < DIMENSION_SOURCES.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isAr ? 'يتم البحث عن البعد من المصدر الأعلى أولوية أولاً، ثم ينتقل للمصدر التالي' : 'Dimensions are resolved from highest priority source first, falling back to the next source if not found'}
          </p>
        </CardContent>
      </Card>

      {/* Reversal Logic */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {isAr ? 'منطق الإلغاء والعكس' : 'Reversal & Cancellation Logic'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{isAr ? 'العكس الكامل عند إلغاء المستند' : 'Full reversal on document cancellation'}</span></div>
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{isAr ? 'عكس جزئي عند المرتجعات والإشعارات الدائنة' : 'Partial reversal on returns / credit notes'}</span></div>
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{isAr ? 'تاريخ العكس = تاريخ المستند أو التاريخ الحالي' : 'Reversal date = document date or current date'}</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{isAr ? 'الحفاظ على رابط القيد الأصلي' : 'Preserve original JE link in reversal'}</span></div>
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{isAr ? 'وضع علامة "معكوس" على القيد المرتبط' : 'Mark JE as reversed with cross-reference'}</span></div>
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{isAr ? 'إنشاء قيد تسوية بدلاً من تعديل القيد المنشور' : 'Amendments create adjustment JE, never modify posted'}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {isAr ? 'قواعد منع الترحيل' : 'Posting Validation Rules'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { en: 'Block if account determination is missing', ar: 'منع الترحيل إذا لم يتم تحديد الحساب' },
              { en: 'Block if account is inactive', ar: 'منع الترحيل إذا كان الحساب غير نشط' },
              { en: 'Block if required dimensions are missing', ar: 'منع إذا كانت الأبعاد الإلزامية ناقصة' },
              { en: 'Block if document is unapproved (when approval required)', ar: 'منع إذا لم يتم اعتماد المستند' },
              { en: 'Block if JE is unbalanced', ar: 'منع إذا كان القيد غير متوازن' },
              { en: 'Block if posting period is locked', ar: 'منع إذا كانت الفترة مغلقة' },
              { en: 'Block if source transaction is incomplete', ar: 'منع إذا كانت المعاملة المصدر غير مكتملة' },
              { en: 'Block if tax mapping is missing', ar: 'منع إذا كان تعيين الضريبة ناقص' },
              { en: 'Block if branch/company mismatch exists', ar: 'منع إذا كان هناك عدم تطابق في الفرع/الشركة' },
              { en: 'Block duplicate posting for same source', ar: 'منع الترحيل المكرر لنفس المصدر' },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/40 rounded">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span>{isAr ? rule.ar : rule.en}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
