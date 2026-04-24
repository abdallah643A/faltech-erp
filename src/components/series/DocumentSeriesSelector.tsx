import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserDefaults } from '@/hooks/useUserDefaults';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Hash } from 'lucide-react';

/**
 * SAP Object Code mapping for document types.
 * These map to the `object_code` column in the `numbering_series` table.
 */
export const SAP_OBJECT_CODES = {
  BusinessPartners: '2',
  ARInvoices: '13',
  SalesOrders: '17',
  PurchaseAPInvoices: '18',
  GoodsReceiptsPO: '20',
  PurchaseOrders: '22',
  SalesQuotations: '23',
  IncomingPayments: '24',
  PurchaseRequests: '1470000113',
  PurchaseQuotations: '540000006',
} as const;

export type SAPObjectCode = (typeof SAP_OBJECT_CODES)[keyof typeof SAP_OBJECT_CODES];

interface NumberingSeriesRecord {
  id: string;
  series: number;
  series_name: string;
  prefix: string | null;
  first_no: number | null;
  next_no: number | null;
  last_no: number | null;
  object_code: string;
  document_sub_type: string | null;
  is_default: boolean;
  locked: boolean;
}

/**
 * Hook to fetch numbering series for a specific SAP object code.
 */
export function useDocumentSeries(objectCode: string) {
  return useQuery({
    queryKey: ['numbering-series', objectCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('numbering_series')
        .select('*')
        .eq('object_code', objectCode)
        .eq('locked', false)
        .order('series');
      if (error) throw error;
      return (data || []) as NumberingSeriesRecord[];
    },
  });
}

interface DocumentSeriesSelectorProps {
  /** SAP object code for the document type */
  objectCode: string;
  /** Currently selected series number (null = Primary/Auto) */
  value: number | null;
  /** Callback when series changes. Returns series number and next_no. */
  onChange: (series: number | null, nextNo: number | null) => void;
  /** Optional label override */
  label?: string;
  /** Compact mode for SAP-style forms */
  compact?: boolean;
  /** Optional document sub type filter */
  documentSubType?: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * Reusable Series selector for all transaction forms.
 * Shows a dropdown of available series and displays the next document number.
 */
export function DocumentSeriesSelector({
  objectCode,
  value,
  onChange,
  label = 'Series',
  compact = false,
  documentSubType,
  className = '',
}: DocumentSeriesSelectorProps) {
  const { data: seriesList = [] } = useDocumentSeries(objectCode);
  const { getDefaultSeries, loadingSeries: loadingUserSeries } = useUserDefaults();
  const appliedDefaultRef = useRef(false);

  const filteredSeries = documentSubType
    ? seriesList.filter(s => s.document_sub_type === documentSubType || !s.document_sub_type)
    : seriesList;

  // Auto-apply user default series when component mounts and no series is selected
  useEffect(() => {
    if (appliedDefaultRef.current || value != null || loadingUserSeries || filteredSeries.length === 0) return;
    const userDefault = getDefaultSeries(objectCode);
    if (userDefault) {
      const match = filteredSeries.find(s => s.series === userDefault);
      if (match) {
        appliedDefaultRef.current = true;
        onChange(match.series, match.next_no ?? null);
      }
    }
  }, [filteredSeries, value, loadingUserSeries, objectCode]);

  const selectedSeries = filteredSeries.find(s => s.series === value);
  const nextNo = selectedSeries?.next_no ?? null;
  const displayNo = selectedSeries
    ? `${selectedSeries.prefix || ''}${nextNo ?? '?'}`
    : 'Auto';

  if (filteredSeries.length === 0) return null;

  if (compact) {
    return (
      <div className={`grid grid-cols-[120px_1fr] items-center gap-2 ${className}`}>
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        <div className="flex gap-2">
          <Select
            value={value != null ? String(value) : 'auto'}
            onValueChange={(v) => {
              if (v === 'auto') {
                onChange(null, null);
              } else {
                const s = filteredSeries.find(s => s.series === Number(v));
                onChange(Number(v), s?.next_no ?? null);
              }
            }}
          >
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder="Primary" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Primary (Auto)</SelectItem>
              {filteredSeries.map(s => (
                <SelectItem key={s.id} value={String(s.series)}>
                  {s.series_name} {s.prefix ? `(${s.prefix})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={displayNo}
            disabled
            className="h-8 text-sm bg-muted/20 w-[120px] font-mono"
            title="Next document number"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-1.5">
        <Hash className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="flex gap-2">
        <Select
          value={value != null ? String(value) : 'auto'}
          onValueChange={(v) => {
            if (v === 'auto') {
              onChange(null, null);
            } else {
              const s = filteredSeries.find(s => s.series === Number(v));
              onChange(Number(v), s?.next_no ?? null);
            }
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Primary (Auto)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Primary (Auto)</SelectItem>
            {filteredSeries.map(s => (
              <SelectItem key={s.id} value={String(s.series)}>
                {s.series_name} {s.prefix ? `(${s.prefix})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={displayNo}
          disabled
          className="bg-muted/20 w-[120px] font-mono"
          title="Next document number"
        />
      </div>
    </div>
  );
}
