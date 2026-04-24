import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  freight: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  balanceDue?: number;
  onFreightChange?: (val: number) => void;
  onDiscountPercentChange?: (val: number) => void;
  isReadOnly?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DocumentFooterTotals({
  subtotal, discountPercent, discountAmount, freight, taxAmount, total,
  paidAmount, balanceDue, onFreightChange, onDiscountPercentChange, isReadOnly,
}: Props) {
  return (
    <div className="flex justify-end">
      <div className="w-80 bg-white rounded border border-[#d0d5dd] p-4 space-y-2" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-mono">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Discount</span>
            {!isReadOnly && onDiscountPercentChange ? (
              <Input
                type="number"
                value={discountPercent}
                onChange={e => onDiscountPercentChange(parseFloat(e.target.value) || 0)}
                className="h-6 w-14 text-xs border-[#d0d5dd]"
              />
            ) : (
              <span className="text-xs text-gray-400">{discountPercent}%</span>
            )}
          </div>
          <span className="font-mono text-red-600">-{fmt(discountAmount)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Freight</span>
          {!isReadOnly && onFreightChange ? (
            <Input
              type="number"
              value={freight}
              onChange={e => onFreightChange(parseFloat(e.target.value) || 0)}
              className="h-6 w-24 text-xs border-[#d0d5dd] text-right font-mono"
            />
          ) : (
            <span className="font-mono">{fmt(freight)}</span>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="font-mono">{fmt(taxAmount)}</span>
        </div>
        <div className="border-t border-[#d0d5dd] pt-2 flex justify-between text-base font-bold">
          <span>Total (SAR)</span>
          <span className="font-mono">{fmt(total)}</span>
        </div>
        {paidAmount !== undefined && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount</span>
              <span className="font-mono text-green-700">{fmt(paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[#0066cc]">
              <span>Balance Due</span>
              <span className="font-mono">{fmt(balanceDue || 0)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
