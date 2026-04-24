import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INCOTERMS, INCOTERM_LABELS } from './IncotermConstants';

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export function IncotermSelect({ value, onValueChange, className, placeholder = 'Select incoterm' }: Props) {
  return (
    <Select value={value || 'none'} onValueChange={(v) => onValueChange(v === 'none' ? '' : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {INCOTERMS.map(t => (
          <SelectItem key={t} value={t}>
            {t} — {INCOTERM_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
