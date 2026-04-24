import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYMENT_TERMS_OPTIONS } from './IncotermConstants';

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export function PaymentTermsSelect({ value, onValueChange, className, placeholder = 'Select payment terms' }: Props) {
  return (
    <Select value={value || 'none'} onValueChange={(v) => onValueChange(v === 'none' ? '' : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {PAYMENT_TERMS_OPTIONS.map(t => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
