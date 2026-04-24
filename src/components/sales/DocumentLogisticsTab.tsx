import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentHeaderData } from './DocumentHeader';

interface Props {
  data: DocumentHeaderData;
  onChange: (data: DocumentHeaderData) => void;
  isReadOnly?: boolean;
}

export function DocumentLogisticsTab({ data, onChange, isReadOnly }: Props) {
  const update = (key: string, val: any) => onChange({ ...data, [key]: val });

  return (
    <div className="bg-white rounded border border-[#d0d5dd] p-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Ship To</h3>
          <textarea
            className="w-full h-24 border border-[#d0d5dd] rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
            value={data.shipToAddress || ''}
            onChange={e => update('shipToAddress', e.target.value)}
            readOnly={isReadOnly}
          />
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Shipping Method</Label>
            <Select value={data.shippingMethod || ''} onValueChange={v => update('shippingMethod', v)} disabled={isReadOnly}>
              <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ground">Ground</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="air">Air Freight</SelectItem>
                <SelectItem value="sea">Sea Freight</SelectItem>
                <SelectItem value="pickup">Customer Pickup</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Tracking Number</Label>
            <Input value={data.trackingNumber || ''} onChange={e => update('trackingNumber', e.target.value)} className="h-8 text-sm border-[#d0d5dd]" readOnly={isReadOnly} />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Bill To</h3>
          <textarea
            className="w-full h-24 border border-[#d0d5dd] rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0066cc]"
            value={data.billToAddress || ''}
            onChange={e => update('billToAddress', e.target.value)}
            readOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
