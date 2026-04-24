import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import { MaterialRequest, MaterialRequestLine } from '@/hooks/useMaterialRequests';
import { MaterialRequestPrintView } from './MaterialRequestPrintView';
import { useLanguage } from '@/contexts/LanguageContext';

interface MaterialRequestPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialRequest: MaterialRequest | null;
  lines: MaterialRequestLine[];
}

export function MaterialRequestPrintDialog({
  open,
  onOpenChange,
  materialRequest,
  lines,
}: MaterialRequestPrintDialogProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Material_Request_${materialRequest?.mr_number || 'New'}`,
  });

  if (!materialRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{language === 'ar' ? 'معاينة الطباعة' : 'Print Preview'}</span>
            <Button onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden bg-white">
          <MaterialRequestPrintView
            ref={printRef}
            materialRequest={materialRequest}
            lines={lines}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
