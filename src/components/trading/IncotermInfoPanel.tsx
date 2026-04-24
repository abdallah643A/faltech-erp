import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { INCOTERM_LABELS, INCOTERM_DETAILS } from './IncotermConstants';

interface Props {
  incoterm: string;
  className?: string;
}

export function IncotermInfoPanel({ incoterm, className = '' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const details = INCOTERM_DETAILS[incoterm];
  const label = INCOTERM_LABELS[incoterm];

  if (!details || !incoterm) return null;

  return (
    <div className={`border rounded-lg bg-muted/30 ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors rounded-lg"
      >
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span className="font-medium">
          Incoterm: {incoterm} ({label})
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="font-semibold text-foreground mb-1.5">Seller Responsibilities</h4>
            <ul className="space-y-1">
              {details.sellerResponsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1.5">Buyer Responsibilities</h4>
            <ul className="space-y-1">
              {details.buyerResponsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <X className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2 border-t pt-2">
            <span className="font-semibold">Risk transfers: </span>
            <span className="text-muted-foreground">{details.riskTransfer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
