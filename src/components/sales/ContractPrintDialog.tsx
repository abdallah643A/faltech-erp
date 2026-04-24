import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { SalesOrderContract } from '@/hooks/useSalesOrderContracts';
import { ContractPrintView } from './ContractPrintView';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContractPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrderContract | null;
}

export function ContractPrintDialog({ open, onOpenChange, order }: ContractPrintDialogProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${order?.is_contract ? 'Contract' : 'SalesOrder'}_SO-${order?.doc_num || 'New'}`,
    pageStyle: `
      @page { size: A4; margin: 0; }
      @media print {
        html, body { margin: 0; padding: 0; }
        body * { visibility: visible !important; }
        [data-pdf-section] { break-inside: avoid; page-break-inside: avoid; }
        tr { break-inside: avoid; page-break-inside: avoid; }
      }
    `,
  });

  // Fetch line items
  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['sales-order-lines', order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from('sales_order_lines')
        .select('*')
        .eq('sales_order_id', order.id)
        .order('line_num');
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id && open,
  });

  // Fetch branch name
  const { data: branch } = useQuery({
    queryKey: ['branch-name', order?.branch_id],
    queryFn: async () => {
      if (!order?.branch_id) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('name')
        .eq('id', order.branch_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!order?.branch_id && open,
  });

  // Fetch sales rep name
  const { data: salesRep } = useQuery({
    queryKey: ['sales-rep-name', order?.sales_rep_id],
    queryFn: async () => {
      if (!order?.sales_rep_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', order.sales_rep_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!order?.sales_rep_id && open,
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{language === 'ar' ? 'معاينة الطباعة' : 'Print Preview'}</span>
            <Button onClick={() => handlePrint()} className="gap-2">
              <Printer className="h-4 w-4" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {linesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto bg-white">
            <div style={{ minWidth: '210mm' }}>
              <ContractPrintView
                ref={printRef}
                order={order}
                lines={lines}
                branchName={branch?.name}
                salesRepName={salesRep?.full_name}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
