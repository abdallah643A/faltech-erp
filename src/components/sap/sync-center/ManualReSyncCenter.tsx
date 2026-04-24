import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSAPSync, EntityType } from '@/hooks/useSAPSync';
import { useSyncAdminActions } from '@/hooks/useSyncAdmin';
import { Play, RotateCcw, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const ENTITY_LIST: { value: EntityType; label: string }[] = [
  { value: 'business_partner', label: 'Business Partners' },
  { value: 'item', label: 'Items' },
  { value: 'sales_order', label: 'Sales Orders' },
  { value: 'ar_invoice', label: 'AR Invoices' },
  { value: 'incoming_payment', label: 'Incoming Payments' },
  { value: 'purchase_order', label: 'Purchase Orders' },
  { value: 'goods_receipt', label: 'Goods Receipts' },
  { value: 'ap_invoice_payable', label: 'AP Invoices' },
  { value: 'journal_entry', label: 'Journal Entries' },
  { value: 'delivery_note', label: 'Delivery Notes' },
  { value: 'numbering_series', label: 'Numbering Series' },
  { value: 'sales_employee', label: 'Sales Employees' },
  { value: 'dimension', label: 'Dimensions' },
  { value: 'branch', label: 'Branches' },
  { value: 'chart_of_accounts', label: 'Chart of Accounts' },
  { value: 'activity', label: 'Activities' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'quote', label: 'Quotations' },
];

export function ManualReSyncCenter() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { sync, isLoading } = useSAPSync();
  const { resetWatermark, retryFailed } = useSyncAdminActions();
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('business_partner');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncMode, setSyncMode] = useState<'incremental' | 'full' | 'date_range'>('incremental');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetEntity, setResetEntity] = useState('');

  const handleSync = async () => {
    const ds = syncMode === 'incremental';
    const df = syncMode === 'date_range' ? dateFrom : undefined;
    const dt = syncMode === 'date_range' ? dateTo : undefined;
    await sync(selectedEntity, 'from_sap', undefined, 100, df, dt, ds);
  };

  const handleResetWatermark = () => {
    if (!resetEntity) return;
    resetWatermark.mutate({ entity_name: resetEntity });
    setResetConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isAr ? 'تشغيل المزامنة' : 'Run Sync'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الكيان' : 'Entity'}</Label>
              <Select value={selectedEntity} onValueChange={(v) => setSelectedEntity(v as EntityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_LIST.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isAr ? 'وضع المزامنة' : 'Sync Mode'}</Label>
              <Select value={syncMode} onValueChange={(v: any) => setSyncMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incremental">{isAr ? 'تزايدي (المتغيرات فقط)' : 'Incremental (changed only)'}</SelectItem>
                  <SelectItem value="full">{isAr ? 'كامل (جميع السجلات)' : 'Full (all records)'}</SelectItem>
                  <SelectItem value="date_range">{isAr ? 'نطاق تاريخ' : 'Date Range'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {syncMode === 'date_range' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{isAr ? 'من' : 'From'}</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? 'إلى' : 'To'}</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            )}

            <Button onClick={handleSync} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {isAr ? 'بدء المزامنة' : 'Start Sync'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {isAr ? 'إعادة تعيين نقطة التحقق' : 'Reset Checkpoint'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'إعادة تعيين علامة المزامنة ستجعل المزامنة التالية تجلب جميع السجلات. استخدم بحذر.'
                : 'Resetting the watermark will make the next sync fetch all records. Use with caution.'}
            </p>
            <div className="space-y-2">
              <Label>{isAr ? 'الكيان' : 'Entity'}</Label>
              <Select value={resetEntity} onValueChange={setResetEntity}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الكيان' : 'Select entity'} /></SelectTrigger>
                <SelectContent>
                  {ENTITY_LIST.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="destructive" onClick={() => setResetConfirmOpen(true)} disabled={!resetEntity || resetWatermark.isPending} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" /> {isAr ? 'إعادة تعيين' : 'Reset Watermark'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? 'إعادة محاولة الفاشلة فقط' : 'Retry Failed Records Only'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {isAr
              ? 'إعادة معالجة السجلات التي فشلت سابقاً دون إعادة مزامنة جميع البيانات'
              : 'Re-process previously failed records without re-syncing all data'}
          </p>
          <Button variant="outline" onClick={() => retryFailed.mutate({})} disabled={retryFailed.isPending}>
            <RotateCcw className="h-4 w-4 mr-2" /> {isAr ? 'إعادة محاولة جميع الفاشلة' : 'Retry All Failed'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'تأكيد إعادة التعيين' : 'Confirm Watermark Reset'}</DialogTitle>
            <DialogDescription>
              {isAr
                ? `هل أنت متأكد من إعادة تعيين نقطة التحقق لـ ${resetEntity}؟ المزامنة التالية ستجلب جميع السجلات.`
                : `Are you sure you want to reset the checkpoint for ${resetEntity}? The next sync will fetch all records.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleResetWatermark}>{isAr ? 'إعادة تعيين' : 'Reset'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
