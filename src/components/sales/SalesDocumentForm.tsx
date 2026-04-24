import { useState, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentHeader, type DocumentHeaderData } from './DocumentHeader';
import { DocumentLinesTable, type DocumentLine } from './DocumentLinesTable';
import { DocumentFooterTotals } from './DocumentFooterTotals';
import { DocumentLogisticsTab } from './DocumentLogisticsTab';
import { DocumentAccountingTab } from './DocumentAccountingTab';
import { DocumentAttachmentsTab } from './DocumentAttachmentsTab';
import { TransactionToolbar } from '@/components/shared/TransactionToolbar';
import {
  Plus, Copy, XCircle, Printer, Mail, Paperclip, ChevronDown, Save,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type DocumentStatus = 'Draft' | 'Open' | 'Closed' | 'Cancelled' | 'Partially Delivered' | 'Approved' | 'On Hold' | 'Terminated';

const statusColors: Record<DocumentStatus, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Open: 'bg-blue-100 text-blue-800',
  Closed: 'bg-gray-200 text-gray-600',
  Cancelled: 'bg-red-100 text-red-700 line-through',
  'Partially Delivered': 'bg-amber-100 text-amber-800',
  Approved: 'bg-green-100 text-green-800',
  'On Hold': 'bg-yellow-100 text-yellow-800',
  Terminated: 'bg-red-200 text-red-800',
};

export interface SalesDocumentFormProps {
  hideJournalTab?: boolean;
  title: string;
  docNumber?: string;
  status?: DocumentStatus;
  headerData: DocumentHeaderData;
  onHeaderChange: (data: DocumentHeaderData) => void;
  lines: DocumentLine[];
  onLinesChange: (lines: DocumentLine[]) => void;
  extraHeaderFields?: ReactNode;
  extraLineColumns?: { key: string; label: string; width?: string; render?: (line: DocumentLine, idx: number) => ReactNode }[];
  onSave?: () => void;
  onCancel?: () => void;
  onCopyTo?: (targetType: string) => void;
  onCopyFrom?: (sourceType: string) => void;
  onPrint?: () => void;
  onEmail?: () => void;
  copyToOptions?: string[];
  copyFromOptions?: string[];
  showPaymentSection?: boolean;
  paidAmount?: number;
  freight?: number;
  onFreightChange?: (val: number) => void;
  discountPercent?: number;
  onDiscountPercentChange?: (val: number) => void;
  extraTabs?: { key: string; label: string; content: ReactNode }[];
  extraToolbarButtons?: ReactNode;
  isReadOnly?: boolean;
  baseDocument?: { type: string; number: string };
  children?: ReactNode;
  partnerType?: 'customer' | 'vendor';
  onAdd?: () => void;
  onFind?: (query: string) => void;
}

export function SalesDocumentForm({
  title, docNumber, status = 'Draft', headerData, onHeaderChange,
  lines, onLinesChange, extraHeaderFields, extraLineColumns,
  onSave, onCancel, onCopyTo, onCopyFrom, onPrint, onEmail,
  copyToOptions = [], copyFromOptions = [], showPaymentSection,
  paidAmount = 0, freight = 0, onFreightChange, discountPercent = 0,
  onDiscountPercentChange, extraTabs = [], extraToolbarButtons,
  isReadOnly, baseDocument, children, partnerType = 'customer',
  onAdd, onFind, hideJournalTab = false,
}: SalesDocumentFormProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = lines.reduce((s, l) => {
    const lineTotal = l.quantity * l.unitPrice * (1 - (l.discountPercent || 0) / 100);
    return s + lineTotal * ((l.taxPercent || 15) / 100);
  }, 0);
  const total = afterDiscount + freight + taxAmount;
  const balanceDue = total - paidAmount;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</h1>
          {docNumber && <span className="text-sm opacity-80">{docNumber}</span>}
          {baseDocument && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
              Base: {baseDocument.type} {baseDocument.number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TransactionToolbar
            onAdd={onAdd}
            onFind={onFind}
            showAdd={!!onAdd}
            showFind={!!onFind}
            addLabel="Add New"
          />
          <Badge className={statusColors[status]}>{status}</Badge>
          {!isReadOnly && onSave && (
            <Button size="sm" variant="secondary" onClick={onSave} className="gap-1">
              <Save className="h-3.5 w-3.5" /> {isRTL ? 'حفظ' : 'Save'}
            </Button>
          )}
          {copyToOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copy To <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {copyToOptions.map(opt => (
                  <DropdownMenuItem key={opt} onClick={() => onCopyTo?.(opt)}>{opt}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {copyFromOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copy From <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {copyFromOptions.map(opt => (
                  <DropdownMenuItem key={opt} onClick={() => onCopyFrom?.(opt)}>{opt}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel} className="gap-1 border-red-300 text-red-600 hover:bg-red-50">
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
          {onPrint && (
            <Button size="icon" variant="ghost" onClick={onPrint} className="text-white hover:bg-white/10">
              <Printer className="h-4 w-4" />
            </Button>
          )}
          {onEmail && (
            <Button size="icon" variant="ghost" onClick={onEmail} className="text-white hover:bg-white/10">
              <Mail className="h-4 w-4" />
            </Button>
          )}
          {extraToolbarButtons}
        </div>
      </div>

      {/* Document Header */}
      <DocumentHeader data={headerData} onChange={onHeaderChange} isReadOnly={isReadOnly} partnerType={partnerType} />
      {extraHeaderFields}

      {/* Lines Table */}
      <DocumentLinesTable
        lines={lines}
        onChange={onLinesChange}
        isReadOnly={isReadOnly}
        extraColumns={extraLineColumns}
      />

      {/* Footer Totals */}
      <DocumentFooterTotals
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        freight={freight}
        taxAmount={taxAmount}
        total={total}
        paidAmount={showPaymentSection ? paidAmount : undefined}
        balanceDue={showPaymentSection ? balanceDue : undefined}
        onFreightChange={onFreightChange}
        onDiscountPercentChange={onDiscountPercentChange}
        isReadOnly={isReadOnly}
      />

      {/* Document Tabs */}
      <Tabs defaultValue="logistics" className="mt-4">
        <TabsList className="border-b border-[#d0d5dd]">
          <TabsTrigger value="logistics">{isRTL ? 'لوجستيات' : 'Logistics'}</TabsTrigger>
          <TabsTrigger value="accounting">{isRTL ? 'محاسبة' : 'Accounting'}</TabsTrigger>
          <TabsTrigger value="attachments">{isRTL ? 'مرفقات' : 'Attachments'}</TabsTrigger>
          <TabsTrigger value="remarks">{isRTL ? 'ملاحظات' : 'Remarks'}</TabsTrigger>
          {!hideJournalTab && (
            <TabsTrigger value="journal">{isRTL ? 'قيد يومية' : 'Journal Entry'}</TabsTrigger>
          )}
          {extraTabs.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="logistics">
          <DocumentLogisticsTab data={headerData} onChange={onHeaderChange} isReadOnly={isReadOnly} />
        </TabsContent>
        <TabsContent value="accounting">
          <DocumentAccountingTab data={headerData} onChange={onHeaderChange} isReadOnly={isReadOnly} />
        </TabsContent>
        <TabsContent value="attachments">
          <DocumentAttachmentsTab />
        </TabsContent>
        <TabsContent value="remarks">
          <div className="p-4 bg-white rounded border border-[#d0d5dd]">
            <textarea
              className="w-full h-32 border border-[#d0d5dd] rounded p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              placeholder={isRTL ? 'ملاحظات...' : 'Remarks...'}
              value={headerData.remarks || ''}
              onChange={e => onHeaderChange({ ...headerData, remarks: e.target.value })}
              readOnly={isReadOnly}
            />
          </div>
        </TabsContent>
        {!hideJournalTab && (
          <TabsContent value="journal">
            <div className="p-4 bg-[#f0f2f4] rounded border border-[#d0d5dd] text-sm text-muted-foreground text-center">
              {isRTL ? 'يظهر القيد بعد الترحيل' : 'Journal entry will be shown after posting'}
            </div>
          </TabsContent>
        )}
        {extraTabs.map(t => (
          <TabsContent key={t.key} value={t.key}>{t.content}</TabsContent>
        ))}
      </Tabs>

      {children}
    </div>
  );
}
