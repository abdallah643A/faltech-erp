import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, ArrowDown, ArrowUp, ArrowLeftRight, Loader2 } from 'lucide-react';
import { useSAPSync, EntityType, SyncDirection } from '@/hooks/useSAPSync';
import { useLanguage } from '@/contexts/LanguageContext';
import { SAPSyncProgressBar } from './SAPSyncProgressBar';

interface SAPSyncButtonProps {
  entity: EntityType;
  entityId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function SAPSyncButton({ 
  entity, 
  entityId, 
  variant = 'outline', 
  size = 'default',
  showLabel = true,
  className 
}: SAPSyncButtonProps) {
  const { language } = useLanguage();
  const { sync, isLoading, lastResult } = useSAPSync();
  const [open, setOpen] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [pendingDirection, setPendingDirection] = useState<SyncDirection | null>(null);
  const [recordLimit, setRecordLimit] = useState('100');
  const [syncDateFrom, setSyncDateFrom] = useState('');
  const [syncDateTo, setSyncDateTo] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [deltaSync, setDeltaSync] = useState(true);

  const supportsDateRange = entity === 'journal_entry' || entity === 'journal_voucher';

  const handleSync = async (direction: SyncDirection, showLimitOption = false) => {
    if (showLimitOption && direction !== 'to_sap') {
      setPendingDirection(direction);
      setShowLimitDialog(true);
      setOpen(false);
      return;
    }
    
    setOpen(false);
    const limit = parseInt(recordLimit) || 100;
    await sync(entity, direction, entityId, limit, undefined, undefined, deltaSync);
  };

  const handleConfirmSync = async () => {
    if (pendingDirection) {
      setShowLimitDialog(false);
      const limit = parseInt(recordLimit) || 100;
      if (supportsDateRange && useDateRange && (syncDateFrom || syncDateTo)) {
        await sync(entity, pendingDirection, entityId, limit, syncDateFrom || undefined, syncDateTo || undefined, deltaSync);
      } else {
        await sync(entity, pendingDirection, entityId, limit, undefined, undefined, deltaSync);
      }
      setPendingDirection(null);
    }
  };

  const entityLabels: Record<EntityType, { en: string; ar: string }> = {
    business_partner: { en: 'Business Partners', ar: 'شركاء الأعمال' },
    item: { en: 'Items', ar: 'الأصناف' },
    sales_order: { en: 'Sales Orders', ar: 'أوامر البيع' },
    incoming_payment: { en: 'Incoming Payments', ar: 'المدفوعات الواردة' },
    ar_invoice: { en: 'AR Invoices', ar: 'فواتير المبيعات' },
    purchase_request: { en: 'Purchase Requests', ar: 'طلبات الشراء' },
    purchase_quotation: { en: 'Purchase Quotations', ar: 'عروض أسعار الشراء' },
    purchase_order: { en: 'Purchase Orders', ar: 'أوامر الشراء' },
    goods_receipt: { en: 'Goods Receipts', ar: 'استلام البضائع' },
    ap_invoice_payable: { en: 'AP Invoices', ar: 'فواتير الموردين' },
    numbering_series: { en: 'Numbering Series', ar: 'سلسلة الترقيم' },
    sales_employee: { en: 'Sales Employees', ar: 'موظفو المبيعات' },
    opportunity: { en: 'Opportunities', ar: 'الفرص' },
    activity: { en: 'Activities', ar: 'الأنشطة' },
    quote: { en: 'Quotes', ar: 'عروض الأسعار' },
    dimension: { en: 'Dimensions', ar: 'الأبعاد' },
    dimension_levels: { en: 'Dimension Levels', ar: 'مستويات الأبعاد' },
    cost_center: { en: 'Cost Centers', ar: 'مراكز التكلفة' },
    distribution_rule: { en: 'Distribution Rules', ar: 'قواعد التوزيع' },
    inventory_goods_receipt: { en: 'Goods Receipts (Inv)', ar: 'استلام بضاعة' },
    inventory_goods_issue: { en: 'Goods Issues (Inv)', ar: 'صرف بضاعة' },
    stock_transfer: { en: 'Stock Transfers', ar: 'تحويل مخزون' },
    finance_alert: { en: 'Finance Alerts', ar: 'تنبيهات مالية' },
    payment_verification: { en: 'Payment Verifications', ar: 'تحققات الدفع' },
    financial_clearance: { en: 'Financial Clearances', ar: 'التصاريح المالية' },
    sales_target: { en: 'Sales Targets', ar: 'أهداف المبيعات' },
    fixed_asset: { en: 'Fixed Assets', ar: 'الأصول الثابتة' },
    delivery_note: { en: 'Delivery Notes', ar: 'مذكرات التسليم' },
    service_order: { en: 'Service Orders', ar: 'أوامر الخدمة' },
    service_contract: { en: 'Service Contracts', ar: 'عقود الخدمة' },
    service_equipment: { en: 'Service Equipment', ar: 'معدات الخدمة' },
    pm_plan: { en: 'PM Plans', ar: 'خطط الصيانة الوقائية' },
    warranty_claim: { en: 'Warranty Claims', ar: 'مطالبات الضمان' },
    user_defaults: { en: 'User Defaults', ar: 'إعدادات المستخدم' },
    sap_user: { en: 'SAP Users', ar: 'مستخدمو SAP' },
    budget: { en: 'Budgets', ar: 'الموازنات' },
    chart_of_accounts: { en: 'Chart of Accounts', ar: 'دليل الحسابات' },
    cpms_invoice: { en: 'CPMS Invoices', ar: 'فواتير المشاريع' },
    cpms_collection: { en: 'CPMS Collections', ar: 'تحصيلات المشاريع' },
    branch: { en: 'Branches (Warehouses)', ar: 'الفروع (المستودعات)' },
    journal_entry: { en: 'Journal Entries', ar: 'قيود اليومية' },
    journal_voucher: { en: 'Journal Vouchers', ar: 'سندات القيد' },
  };

  const currentLabel = entityLabels[entity]?.[language === 'ar' ? 'ar' : 'en'] || entity;

  return (
    <>
      <div className="space-y-2">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant={variant} size={size} disabled={isLoading} className={className}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {showLabel && <span className="ml-2">{language === 'ar' ? 'مزامنة SAP' : 'Sync SAP'}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleSync('from_sap', true)}>
              <ArrowDown className="mr-2 h-4 w-4" />
              <span>{language === 'ar' ? 'سحب من SAP B1' : 'Pull from SAP B1'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSync('to_sap')}>
              <ArrowUp className="mr-2 h-4 w-4" />
              <span>{language === 'ar' ? 'دفع إلى SAP B1' : 'Push to SAP B1'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSync('bidirectional', true)}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span>{language === 'ar' ? 'مزامنة ثنائية الاتجاه' : 'Two-way Sync'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SAPSyncProgressBar
          isLoading={isLoading}
          entityLabel={currentLabel}
          result={lastResult}
        />
      </div>

      {/* Record Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'إعدادات المزامنة' : 'Sync Settings'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `اختر عدد السجلات الأخيرة التي تريد سحبها من SAP لـ ${entityLabels[entity].ar}`
                : `Choose how many latest records to pull from SAP for ${entityLabels[entity].en}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              {/* Delta Sync Toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deltaSync"
                    checked={deltaSync}
                    onChange={(e) => setDeltaSync(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="deltaSync" className="cursor-pointer font-medium">
                    {language === 'ar' ? 'مزامنة تزايدية (التغييرات فقط)' : 'Delta Sync (changed only)'}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'عند التفعيل، سيتم جلب السجلات المعدلة فقط منذ آخر مزامنة ناجحة مما يسرّع العملية بشكل كبير'
                    : 'When enabled, only records modified since the last successful sync are fetched — significantly faster for large datasets'
                  }
                </p>
              </div>

              {supportsDateRange && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useDateRange"
                      checked={useDateRange}
                      onChange={(e) => setUseDateRange(e.target.checked)}
                      className="rounded border-input"
                    />
                    <Label htmlFor="useDateRange" className="cursor-pointer">
                      {language === 'ar' ? 'استخدام نطاق تاريخ' : 'Use Date Range'}
                    </Label>
                  </div>
                  {useDateRange && (
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{language === 'ar' ? 'من تاريخ' : 'From Date'}</Label>
                        <Input
                          type="date"
                          value={syncDateFrom}
                          onChange={(e) => setSyncDateFrom(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{language === 'ar' ? 'إلى تاريخ' : 'To Date'}</Label>
                        <Input
                          type="date"
                          value={syncDateTo}
                          onChange={(e) => setSyncDateTo(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                  {useDateRange && (
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar'
                        ? 'عند تحديد النطاق، سيتم جلب جميع السجلات في هذا النطاق بغض النظر عن العدد'
                        : 'When date range is set, all records in that range will be fetched regardless of the record limit'}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
              <Label htmlFor="recordLimit">
                {language === 'ar' ? 'عدد السجلات' : 'Number of Records'}
              </Label>
              <Input
                id="recordLimit"
                type="number"
                min="1"
                step="100"
                value={recordLimit}
                onChange={(e) => setRecordLimit(e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? 'أدخل عدد السجلات المطلوب جلبها (بدون حد أقصى)'
                  : 'Enter the number of records to fetch (no upper limit)'
                }
              </p>
              </div>
            </div>

          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowLimitDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleConfirmSync} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pendingDirection === 'from_sap' 
                ? (language === 'ar' ? 'سحب' : 'Pull')
                : (language === 'ar' ? 'مزامنة' : 'Sync')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
