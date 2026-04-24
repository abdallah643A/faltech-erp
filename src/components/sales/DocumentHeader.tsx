import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { VendorSearchDialog } from '@/components/purchasing/VendorSearchDialog';
import { CustomerSearchDialog } from '@/components/sales/CustomerSearchDialog';

export interface DocumentHeaderData {
  customerCode?: string;
  customerName?: string;
  contactPerson?: string;
  customerRefNo?: string;
  currency?: string;
  postingDate?: Date;
  dueDate?: Date;
  documentDate?: Date;
  series?: string;
  branch?: string;
  shipToAddress?: string;
  billToAddress?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  bpBankAccount?: string;
  project?: string;
  costCenter?: string;
  remarks?: string;
  salesEmployee?: string;
  [key: string]: any;
}

interface Props {
  data: DocumentHeaderData;
  onChange: (data: DocumentHeaderData) => void;
  isReadOnly?: boolean;
  partnerType?: 'customer' | 'vendor';
}

function DateField({ label, value, onChange, disabled }: { label: string; value?: Date; onChange: (d: Date | undefined) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" disabled={disabled} className={cn("w-full justify-start text-left text-sm h-8 border-[#d0d5dd]", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, 'yyyy-MM-dd') : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DocumentHeader({ data, onChange, isReadOnly, partnerType = 'customer' }: Props) {
  const update = (key: string, val: any) => onChange({ ...data, [key]: val });
  const isVendor = partnerType === 'vendor';
  const partnerCodeLabel = isVendor ? 'Vendor Code' : 'Customer Code';
  const partnerNameLabel = isVendor ? 'Vendor Name' : 'Customer Name';
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const handleSearchClick = () => {
    if (isReadOnly) return;
    if (isVendor) {
      setVendorDialogOpen(true);
    } else {
      setCustomerDialogOpen(true);
    }
  };

  return (
    <>
      <div className="bg-white rounded border border-[#d0d5dd] p-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">{partnerCodeLabel}</Label>
              <div className="relative">
                <Input
                  value={data.customerCode || ''}
                  onChange={e => update('customerCode', e.target.value)}
                  className="h-8 text-sm border-[#d0d5dd] pr-8"
                  readOnly={isReadOnly}
                  onClick={handleSearchClick}
                />
                <Search
                  className="absolute right-2 top-1.5 h-4 w-4 text-gray-400 cursor-pointer"
                  onClick={handleSearchClick}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">{partnerNameLabel}</Label>
              <Input
                value={data.customerName || ''}
                readOnly
                className="h-8 text-sm bg-[#f0f2f4] border-[#d0d5dd]"
                onClick={handleSearchClick}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Contact Person</Label>
              <Input
                value={data.contactPerson || ''}
                onChange={e => update('contactPerson', e.target.value)}
                className="h-8 text-sm border-[#d0d5dd]"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">{isVendor ? 'Vendor Ref. No.' : 'Customer Ref. No.'}</Label>
              <Input
                value={data.customerRefNo || ''}
                onChange={e => update('customerRefNo', e.target.value)}
                className="h-8 text-sm border-[#d0d5dd]"
                readOnly={isReadOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Currency</Label>
              <Select value={data.currency || 'SAR'} onValueChange={v => update('currency', v)} disabled={isReadOnly}>
                <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <DateField label="Posting Date" value={data.postingDate} onChange={d => update('postingDate', d)} disabled={isReadOnly} />
            <DateField label="Due Date" value={data.dueDate} onChange={d => update('dueDate', d)} disabled={isReadOnly} />
            <DateField label="Document Date" value={data.documentDate} onChange={d => update('documentDate', d)} disabled={isReadOnly} />
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Series</Label>
              <Select value={data.series || 'Primary'} onValueChange={v => update('series', v)} disabled={isReadOnly}>
                <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary">Primary</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-600">Branch</Label>
              <Input
                value={data.branch || ''}
                onChange={e => update('branch', e.target.value)}
                className="h-8 text-sm border-[#d0d5dd]"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>

        {/* Ship To / Bill To */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#d0d5dd]">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Ship To</Label>
            <textarea
              className="w-full h-16 border border-[#d0d5dd] rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              value={data.shipToAddress || ''}
              onChange={e => update('shipToAddress', e.target.value)}
              readOnly={isReadOnly}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Bill To</Label>
            <textarea
              className="w-full h-16 border border-[#d0d5dd] rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
              value={data.billToAddress || ''}
              onChange={e => update('billToAddress', e.target.value)}
              readOnly={isReadOnly}
            />
          </div>
        </div>
      </div>

      {isVendor && (
        <VendorSearchDialog
          open={vendorDialogOpen}
          onOpenChange={setVendorDialogOpen}
          onSelect={(vendor) => {
            onChange({
              ...data,
              customerCode: vendor.card_code,
              customerName: vendor.card_name,
            });
          }}
        />
      )}

      {!isVendor && (
        <CustomerSearchDialog
          open={customerDialogOpen}
          onOpenChange={setCustomerDialogOpen}
          onSelect={(customer) => {
            onChange({
              ...data,
              customerCode: customer.card_code,
              customerName: customer.card_name,
            });
          }}
        />
      )}
    </>
  );
}
