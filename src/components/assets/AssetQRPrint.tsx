import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Asset } from '@/hooks/useAssets';
import { format } from 'date-fns';

interface AssetQRPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}

export function AssetQRPrint({ open, onOpenChange, asset }: AssetQRPrintProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Asset_QR_${asset?.asset_code || 'Unknown'}`,
  });

  if (!asset) return null;

  // Full spec QR data
  const qrData = JSON.stringify({
    id: asset.id,
    code: asset.asset_code,
    name: asset.name,
    serial: asset.serial_number || '',
    barcode: asset.barcode || '',
    category: asset.asset_categories?.name || '',
    status: asset.status,
    condition: asset.condition || '',
    location: asset.location || '',
    department: asset.department || '',
    vendor: asset.vendor || '',
    purchase_date: asset.purchase_date || '',
    purchase_value: asset.purchase_value || 0,
    current_value: asset.current_value || 0,
    warranty_end: asset.warranty_end || '',
  });

  const specs = [
    { label: language === 'ar' ? 'الفئة' : 'Category', value: asset.asset_categories?.name || '—' },
    { label: language === 'ar' ? 'الرقم التسلسلي' : 'Serial No.', value: asset.serial_number || '—' },
    { label: language === 'ar' ? 'الباركود' : 'Barcode', value: asset.barcode || '—' },
    { label: language === 'ar' ? 'الحالة' : 'Status', value: asset.status },
    { label: language === 'ar' ? 'الظرف' : 'Condition', value: asset.condition || '—' },
    { label: language === 'ar' ? 'الموقع' : 'Location', value: asset.location || '—' },
    { label: language === 'ar' ? 'القسم' : 'Department', value: asset.department || '—' },
    { label: language === 'ar' ? 'المورد' : 'Vendor', value: asset.vendor || '—' },
    { label: language === 'ar' ? 'تاريخ الشراء' : 'Purchase Date', value: asset.purchase_date ? format(new Date(asset.purchase_date), 'dd/MM/yyyy') : '—' },
    { label: language === 'ar' ? 'قيمة الشراء' : 'Purchase Value', value: asset.purchase_value ? `SAR ${asset.purchase_value.toLocaleString()}` : '—' },
    { label: language === 'ar' ? 'القيمة الحالية' : 'Current Value', value: asset.current_value ? `SAR ${asset.current_value.toLocaleString()}` : '—' },
    { label: language === 'ar' ? 'نهاية الضمان' : 'Warranty End', value: asset.warranty_end ? format(new Date(asset.warranty_end), 'dd/MM/yyyy') : '—' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{language === 'ar' ? 'طباعة QR الأصل' : 'Print Asset QR Label'}</span>
            <Button size="sm" onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="flex flex-col items-center p-6 bg-white text-black">
          <div className="border-2 border-black rounded-lg p-5 w-full max-w-[400px]">
            {/* Header */}
            <div className="text-center border-b border-black pb-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Asset Management</p>
              <p className="text-lg font-black mt-0.5">{asset.asset_code}</p>
            </div>

            {/* QR + Name */}
            <div className="flex gap-4 items-start mb-3">
              <QRCodeSVG
                value={qrData}
                size={120}
                level="H"
                includeMargin={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">{asset.name}</p>
                {asset.asset_categories?.name && (
                  <p className="text-[10px] text-gray-600 mt-0.5">{asset.asset_categories.name}</p>
                )}
                {asset.serial_number && (
                  <p className="text-[10px] mt-1 font-mono">S/N: {asset.serial_number}</p>
                )}
                {asset.barcode && (
                  <p className="text-[10px] font-mono">BC: {asset.barcode}</p>
                )}
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="border-t border-black pt-2">
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5">
                {language === 'ar' ? 'المواصفات' : 'Specifications'}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {specs.map((spec, i) => (
                  <div key={i} className="flex justify-between text-[9px] py-0.5 border-b border-gray-200">
                    <span className="text-gray-500 truncate mr-1">{spec.label}</span>
                    <span className="font-medium text-right truncate max-w-[100px]">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-2 pt-1 border-t border-gray-300">
              <p className="text-[8px] text-gray-400">
                {language === 'ar' ? 'امسح للتفاصيل الكاملة' : 'Scan QR for full asset details'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
