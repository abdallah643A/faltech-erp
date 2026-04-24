import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { SalesOrderContract } from '@/hooks/useSalesOrderContracts';
import { ContractPrintView } from './ContractPrintView';
import { SendWhatsAppDialog } from '@/components/whatsapp/SendWhatsAppDialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SalesOrderWhatsAppWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrderContract | null;
}

export function SalesOrderWhatsAppWrapper({ open, onOpenChange, order }: SalesOrderWhatsAppWrapperProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [whatsAppReady, setWhatsAppReady] = useState(false);

  // Fetch line items
  const { data: lines = [], isLoading: isLinesLoading, isFetching: isLinesFetching } = useQuery({
    queryKey: ['sales-order-lines-wa', order?.id],
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
  const { data: branch, isLoading: isBranchLoading, isFetching: isBranchFetching } = useQuery({
    queryKey: ['branch-name-wa', order?.branch_id],
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
  const { data: salesRep, isLoading: isSalesRepLoading, isFetching: isSalesRepFetching } = useQuery({
    queryKey: ['sales-rep-name-wa', order?.sales_rep_id],
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

  // Fallback total from posted incoming payments (for legacy orders with zero totals)
  const { data: postedPaymentsTotal = 0, isLoading: isPaymentsLoading, isFetching: isPaymentsFetching } = useQuery({
    queryKey: ['sales-order-payments-total-wa', order?.id],
    queryFn: async () => {
      if (!order?.id) return 0;
      const { data, error } = await supabase
        .from('incoming_payments')
        .select('total_amount')
        .eq('sales_order_id', order.id)
        .eq('status', 'posted');

      if (error) return 0;
      return (data ?? []).reduce((sum, payment: any) => sum + Number(payment.total_amount || 0), 0);
    },
    enabled: !!order?.id && open,
  });

  const waitForAssets = useCallback(async (container: HTMLDivElement) => {
    const docFonts = (document as Document & {
      fonts?: { ready: Promise<unknown>; load?: (font: string) => Promise<unknown> };
    }).fonts;

    if (docFonts) {
      if (typeof docFonts.load === 'function') {
        try {
          await Promise.all([
            docFonts.load("700 16px 'Noto Sans Arabic'"),
            docFonts.load("700 16px 'Noto Naskh Arabic'"),
            docFonts.load("700 16px Tahoma"),
          ]);
        } catch {
          // Ignore explicit font load failures and continue with available fonts
        }
      }

      await docFonts.ready;
    }

    const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise<void>((resolve) => {
          const done = () => {
            img.removeEventListener('load', done);
            img.removeEventListener('error', done);
            resolve();
          };

          img.addEventListener('load', done);
          img.addEventListener('error', done);
        });
      })
    );

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, []);

  const resolvedTotal = useMemo(() => {
    const orderTotal = Number(order?.total ?? 0);
    if (orderTotal > 0) return orderTotal;

    const linesTotal = lines.reduce((sum, line: any) => {
      const lineTotal = Number(line.line_total || 0);
      if (lineTotal > 0) return sum + lineTotal;

      const quantity = Number(line.quantity || 0);
      const unitPrice = Number(line.unit_price || 0);
      const discountPercent = Number(line.discount_percent || 0);
      const taxPercent = line.tax_percent != null ? Number(line.tax_percent) : (line.tax_code ? 15 : 0);
      const subtotal = quantity * unitPrice * (1 - discountPercent / 100);
      return sum + subtotal * (1 + taxPercent / 100);
    }, 0);
    if (linesTotal > 0) return linesTotal;

    const contractValue = Number(order?.contract_value ?? 0);
    if (contractValue > 0) return contractValue;

    const paidTotal = Number(postedPaymentsTotal || 0);
    if (paidTotal > 0) return paidTotal;

    return 0;
  }, [order?.total, order?.contract_value, lines, postedPaymentsTotal]);

  const normalizedOrder = useMemo(() => {
    if (!order) return null;

    const hasFinancials =
      Number(order.total ?? 0) > 0 ||
      Number(order.subtotal ?? 0) > 0 ||
      Number(order.tax_amount ?? 0) > 0;

    if (hasFinancials || resolvedTotal <= 0) {
      return order;
    }

    const subtotal = resolvedTotal / 1.15;
    const vatAmount = resolvedTotal - subtotal;

    return {
      ...order,
      subtotal,
      tax_amount: vatAmount,
      total: resolvedTotal,
      contract_value: Number(order.contract_value ?? 0) > 0 ? order.contract_value : resolvedTotal,
    };
  }, [order, resolvedTotal]);

  const generatePdf = useCallback(async () => {
    if (!printRef.current || generating) return;
    setGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const root = printRef.current;
      await waitForAssets(root);

      const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]'));
      const renderTargets = sections.length > 0 ? sections : [root];

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let sectionIndex = 0; sectionIndex < renderTargets.length; sectionIndex += 1) {
        const target = renderTargets[sectionIndex];
        const canvas = await html2canvas(target, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (sectionIndex > 0) {
          pdf.addPage();
        }

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0.01) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const base64 = pdf.output('datauristring').split(',')[1];
      setPdfBase64(base64);
      setWhatsAppReady(true);
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar'
          ? 'فشل في إنشاء ملف PDF'
          : 'Failed to generate PDF',
        variant: 'destructive',
      });
      // Still open dialog without PDF
      setWhatsAppReady(true);
    } finally {
      setGenerating(false);
    }
  }, [generating, language, toast, waitForAssets]);

  // Generate PDF when all data and assets are ready
  useEffect(() => {
    const isDataReady =
      open &&
      !!order &&
      !isLinesLoading &&
      !isLinesFetching &&
      !isBranchLoading &&
      !isBranchFetching &&
      !isSalesRepLoading &&
      !isSalesRepFetching &&
      !isPaymentsLoading &&
      !isPaymentsFetching;

    if (isDataReady && !whatsAppReady && !generating) {
      const timer = setTimeout(() => {
        generatePdf();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [
    open,
    order,
    whatsAppReady,
    generating,
    generatePdf,
    isLinesLoading,
    isLinesFetching,
    isBranchLoading,
    isBranchFetching,
    isSalesRepLoading,
    isSalesRepFetching,
    isPaymentsLoading,
    isPaymentsFetching,
  ]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPdfBase64(null);
      setWhatsAppReady(false);
      setGenerating(false);
    }
  }, [open]);

  if (!order) return null;

  return (
    <>
      {/* Hidden render area for PDF generation */}
      {open && (
        <div
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <ContractPrintView
            ref={printRef}
            order={normalizedOrder || order}
            lines={lines}
            branchName={branch?.name}
            salesRepName={salesRep?.full_name}
            fallbackTotal={resolvedTotal}
          />
        </div>
      )}

      {/* Loading state */}
      {open && !whatsAppReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'جاري إنشاء ملف PDF...' : 'Generating PDF...'}
            </p>
          </div>
        </div>
      )}

      {/* WhatsApp Dialog - opens after PDF is ready */}
      {whatsAppReady && (
        <SendWhatsAppDialog
          open={true}
          onOpenChange={(val) => {
            if (!val) onOpenChange(false);
          }}
          documentType="sales_order"
          documentId={order.id}
          documentNumber={`SO-${order.doc_num}`}
          customerName={order.customer_name}
          total={resolvedTotal}
          sapDocEntry={order.sap_doc_entry}
          preGeneratedPdfBase64={pdfBase64}
        />
      )}
    </>
  );
}
