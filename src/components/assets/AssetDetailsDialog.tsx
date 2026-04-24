import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssets, type Asset, type AssetHistoryRecord } from '@/hooks/useAssets';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface AssetDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}

const statusColors: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_transfer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  disposed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  purchased: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  returned: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  requested: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const eventTypeIcons: Record<string, string> = {
  created: '🆕', assigned: '👤', unassigned: '↩️', transferred: '🔄',
  maintenance_start: '🔧', maintenance_end: '✅', status_change: '📋',
  location_change: '📍', condition_change: '⚡', value_change: '💰', disposed: '🗑️',
};

export function AssetDetailsDialog({ open, onOpenChange, asset }: AssetDetailsDialogProps) {
  const { language } = useLanguage();
  const { useAssetHistory } = useAssets();
  const { data: history = [] } = useAssetHistory(asset?.id || null);

  if (!asset) return null;

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const formatCurrency = (v: number | null) => v != null ? new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v) : '-';

  const qrData = JSON.stringify({ id: asset.id, code: asset.asset_code, name: asset.name, serial: asset.serial_number || '' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{asset.asset_code}</span>
            <Badge className={statusColors[asset.status] || 'bg-muted'}>{asset.status.replace(/_/g, ' ')}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details">{t('Details', 'التفاصيل')}</TabsTrigger>
            <TabsTrigger value="history">{t('History', 'السجل')}</TabsTrigger>
            <TabsTrigger value="qr">{t('QR Code', 'رمز QR')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t('Name', 'الاسم')}:</span> <span className="font-medium">{asset.name}</span></div>
              <div><span className="text-muted-foreground">{t('Category', 'الفئة')}:</span> <span className="font-medium">{asset.asset_categories?.name || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Serial', 'التسلسلي')}:</span> <span className="font-medium">{asset.serial_number || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Condition', 'الحالة')}:</span> <span className="font-medium capitalize">{asset.condition || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Vendor', 'المورد')}:</span> <span className="font-medium">{asset.vendor || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Location', 'الموقع')}:</span> <span className="font-medium">{asset.location || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Department', 'القسم')}:</span> <span className="font-medium">{asset.department || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Assigned To', 'مخصص لـ')}:</span> <span className="font-medium">{asset.employees ? `${asset.employees.first_name} ${asset.employees.last_name}` : '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Purchase Date', 'تاريخ الشراء')}:</span> <span className="font-medium">{asset.purchase_date || '-'}</span></div>
              <div><span className="text-muted-foreground">{t('Purchase Value', 'قيمة الشراء')}:</span> <span className="font-medium">{formatCurrency(asset.purchase_value)}</span></div>
              <div><span className="text-muted-foreground">{t('Current Value', 'القيمة الحالية')}:</span> <span className="font-medium">{formatCurrency(asset.current_value)}</span></div>
              <div><span className="text-muted-foreground">{t('Warranty End', 'نهاية الضمان')}:</span> <span className="font-medium">{asset.warranty_end || '-'}</span></div>
            </div>
            {asset.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('Notes', 'ملاحظات')}:</span>
                <p className="mt-1">{asset.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t('No history records', 'لا توجد سجلات')}</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {history.map((h: AssetHistoryRecord) => (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="text-lg">{eventTypeIcons[h.event_type] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{h.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{h.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {format(new Date(h.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="qr" className="flex flex-col items-center py-6">
            <div className="border-2 border-foreground rounded-lg p-4 flex flex-col items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-wider">Asset Management</p>
              <QRCodeSVG value={qrData} size={200} level="H" />
              <p className="text-lg font-bold">{asset.asset_code}</p>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
